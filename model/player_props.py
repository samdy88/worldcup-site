"""
player_props.py — Player prop prediction model (scorer, shots on target, corners).
"""

import json
import math
from datetime import datetime, timezone
from pathlib import Path

from scipy.stats import poisson
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
RAW_MATCH_PLAYERS_DIR = ROOT / "data" / "raw" / "match_player_stats"
RAW_MATCHES_DIR = ROOT / "data" / "raw" / "matches"
PROCESSED_DIR = ROOT / "data" / "processed"
PLAYER_PROFILES_PATH = PROCESSED_DIR / "player_profiles.json"

EXPECTED_MINUTES = 90.0


def _load_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


def _per_90(value: float | None, minutes: float) -> float | None:
    if value is None or minutes is None or minutes < 1:
        return None
    return value / minutes * 90


# ── Player Profile Computation ─────────────────────────────────────────────────

def build_player_profiles_from_matches(
    match_players_dir: Path = RAW_MATCH_PLAYERS_DIR,
    matches_dir: Path = RAW_MATCHES_DIR,  # kept for signature compatibility
) -> dict:
    """
    Build player profiles from WC 2026 season stats files.
    Each file in match_players_dir is a per-player season stats JSON pulled by
    data_collector.py --match-players (one file per player_id, WC season totals).
    No time-decay needed — files are already tournament-scoped.
    """
    stats_files = list(match_players_dir.glob("*.json"))
    if not stats_files:
        print("[WARN] No player stats files found. Run: python model/data_collector.py --match-players")
        return {"generated_at": datetime.now(timezone.utc).isoformat(), "players": {}}

    profiles: dict[str, dict] = {}

    for sf in stats_files:
        data = _load_json(sf)
        if not data:
            continue

        # Season stats: {"data": {...}} or bare dict
        entry = data.get("data", data) if isinstance(data, dict) else None
        if not entry or not isinstance(entry, dict):
            continue

        pid = str(entry.get("player_id") or entry.get("id") or sf.stem)
        pname = str(entry.get("player_name") or entry.get("name") or pid)
        minutes = float(entry.get("minutes_played") or entry.get("minutes") or 0)
        if minutes < 1:
            continue

        profile: dict = {
            "name": pname,
            "player_id": pid,
            "weighted_minutes": round(minutes, 1),
        }
        for stat_key in ["goals", "assists", "shots", "shots_on_target", "key_passes", "yellow_cards", "xg"]:
            raw = entry.get(stat_key) or entry.get(stat_key.replace("_", ""))
            if raw is not None:
                p90 = _per_90(float(raw), minutes)
                if p90 is not None:
                    profile[f"{stat_key}_per_90"] = round(p90, 4)
        profiles[pname] = profile

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "wc_season_stats",
        "player_files_processed": len(stats_files),
        "players": profiles,
    }
    PLAYER_PROFILES_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"[OK] Player profiles saved ({len(profiles)} players from {len(stats_files)} stat files)")
    return output


def load_player_profiles() -> dict:
    if not PLAYER_PROFILES_PATH.exists():
        return {"players": {}}
    data = _load_json(PLAYER_PROFILES_PATH)
    return data if isinstance(data, dict) else {"players": {}}


# ── Anytime Scorer Prediction ──────────────────────────────────────────────────

def predict_anytime_scorer(
    player_name: str,
    home_team: str,
    away_team: str,
    team_ratings: dict,
    player_team: str = "",
    minutes_expected: float = EXPECTED_MINUTES,
    profiles: dict | None = None,
) -> dict:
    """
    P(player scores) using per-90 rate adjusted for opponent defense and match xG context.
    """
    if profiles is None:
        profiles = load_player_profiles()

    players = profiles.get("players", {})
    player = players.get(player_name)
    if not player:
        return {"player": player_name, "anytime_scorer_pct": None, "first_scorer_pct": None, "error": "not in profiles"}

    goals_per_90 = player.get("goals_per_90", 0.0) or 0.0
    if goals_per_90 == 0:
        return {"player": player_name, "anytime_scorer_pct": 0.0, "first_scorer_pct": 0.0}

    # Get opponent's defense strength
    teams = team_ratings.get("teams", {})
    avg_away_xg = team_ratings.get("avg_away_xg", 1.05)
    avg_home_xg = team_ratings.get("avg_home_xg", 1.35)

    # Determine if player is on home or away team
    is_home = player_team.lower() in home_team.lower() if player_team else True
    opponent = away_team if is_home else home_team
    opp_data = teams.get(opponent, {"defense_strength": 1.0})
    opp_defense = opp_data.get("defense_strength", 1.0)
    avg_xg_base = avg_home_xg if is_home else avg_away_xg

    # Adjust rate: stronger opponent defense = fewer goals expected
    adjusted_rate = goals_per_90 * (1 / opp_defense) if opp_defense > 0 else goals_per_90

    # Scale by match context (proportion of minutes played)
    lambda_val = adjusted_rate * (minutes_expected / 90)

    p_score = 1 - math.exp(-lambda_val)
    p_first = p_score / max(22 * p_score, 1)  # simplified: roughly 1/n_scorers

    return {
        "player": player_name,
        "anytime_scorer_pct": round(p_score * 100, 1),
        "first_scorer_pct": round(p_first * 100, 1),
        "goals_per_90": round(goals_per_90, 3),
        "adjusted_lambda": round(lambda_val, 3),
    }


# ── Shots on Target Prediction ─────────────────────────────────────────────────

def predict_shots_on_target(
    player_name: str,
    home_team: str,
    away_team: str,
    team_ratings: dict,
    player_team: str = "",
    minutes_expected: float = EXPECTED_MINUTES,
    profiles: dict | None = None,
) -> dict:
    """
    Over/under probabilities for DraftKings common SOT lines (0.5, 1.5, 2.5).
    """
    if profiles is None:
        profiles = load_player_profiles()

    players = profiles.get("players", {})
    player = players.get(player_name)
    if not player:
        return {"player": player_name, "error": "not in profiles"}

    sot_per_90 = player.get("shots_on_target_per_90") or player.get("shots_per_90", 0.0) * 0.4
    if not sot_per_90:
        return {"player": player_name, "error": "no shots data"}

    teams = team_ratings.get("teams", {})
    is_home = player_team.lower() in home_team.lower() if player_team else True
    opponent = away_team if is_home else home_team
    opp_data = teams.get(opponent, {"defense_strength": 1.0})
    opp_defense = opp_data.get("defense_strength", 1.0)
    adjusted_rate = sot_per_90 * (1 / opp_defense) if opp_defense > 0 else sot_per_90
    lambda_val = adjusted_rate * (minutes_expected / 90)

    result = {"player": player_name, "sot_per_90": round(sot_per_90, 3), "expected_sot": round(lambda_val, 2)}
    for line in [0.5, 1.5, 2.5]:
        k = int(line + 0.5)
        p_over = 1 - poisson.cdf(k - 1, lambda_val)
        p_under = 1 - p_over
        result[f"over_{line}_pct"] = round(p_over * 100, 1)
        result[f"under_{line}_pct"] = round(p_under * 100, 1)

    return result


# ── Team Corners Prediction ────────────────────────────────────────────────────

def predict_team_corners(
    home_team: str,
    away_team: str,
    team_ratings: dict,
    avg_total_corners: float = 9.8,
) -> dict:
    """
    Predict total corners over/under using attack strength as a proxy for corner generation.
    Returns probabilities for common lines (8.5, 9.5, 10.5).
    """
    teams = team_ratings.get("teams", {})
    home_data = teams.get(home_team, {"attack_strength": 1.0})
    away_data = teams.get(away_team, {"attack_strength": 1.0})

    # Higher attack strength → more possession/pressure → more corners
    home_attack = home_data.get("attack_strength", 1.0)
    away_attack = away_data.get("attack_strength", 1.0)
    combined_factor = (home_attack + away_attack) / 2
    expected_corners = avg_total_corners * combined_factor

    result = {
        "home_team": home_team,
        "away_team": away_team,
        "expected_total_corners": round(expected_corners, 1),
    }
    for line in [8.5, 9.5, 10.5]:
        k = int(line + 0.5)
        p_over = 1 - poisson.cdf(k - 1, expected_corners)
        result[f"over_{line}_pct"] = round(p_over * 100, 1)
        result[f"under_{line}_pct"] = round((1 - p_over) * 100, 1)

    return result


if __name__ == "__main__":
    print("Building player profiles from match player stats...")
    profiles = build_player_profiles_from_matches()
    print(f"Profiles built for {len(profiles.get('players', {}))} players.")
