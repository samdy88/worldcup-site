"""
poisson_model.py — xG-based Poisson model with Dixon-Coles correction.
"""

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from scipy.stats import poisson
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
RAW_MATCHES_DIR = ROOT / "data" / "raw" / "matches"
RAW_XG_DIR = ROOT / "data" / "raw" / "xg"
RAW_WC_ODDS_DIR = ROOT / "data" / "raw" / "wc_odds"
PROCESSED_DIR = ROOT / "data" / "processed"
TEAM_RATINGS_PATH = PROCESSED_DIR / "team_ratings.json"

WC_COMPETITION_ID = "comp_6107"
WC_SEASON_ID = "sn_118868"

DIXON_COLES_RHO = -0.13
MAX_GOALS = 7  # compute scoreline probs for 0-0 through 6-6
MIN_MATCHES = 5       # minimum matches for a team to influence league means / normalization
RELIABLE_MATCHES = 20  # minimum matches for a team to be considered reliably rated

WC_2026_TEAMS = {
    "United States", "Panama", "Honduras", "Jamaica",
    "Mexico", "Ecuador", "Venezuela", "Bolivia",
    "Canada", "Uruguay", "Peru", "Chile",
    "Argentina", "Paraguay", "Colombia", "Costa Rica",
    "Brazil", "Trinidad and Tobago", "Suriname", "El Salvador",
    "Germany", "Austria", "Switzerland", "North Macedonia",
    "Spain", "Portugal", "Morocco", "Comoros",
    "France", "Belgium", "Tunisia", "Senegal",
    "England", "Netherlands", "Republic of Ireland", "Moldova",
    "Italy", "Croatia", "Albania", "Ukraine",
    "Norway", "Sweden", "Denmark", "Finland",
    "Japan", "South Korea", "Saudi Arabia", "Australia",
}


def _load_json(path: Path) -> dict | list | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None


# ── Rating Computation ─────────────────────────────────────────────────────────

def compute_team_ratings(
    matches_dir: Path = RAW_MATCHES_DIR,
    xg_dir: Path = RAW_XG_DIR,
) -> dict:
    """
    Load cached match + xG data, apply exponential time-decay weighting,
    and compute attack/defense strength ratings per team via MLE.

    Returns ratings dict and saves to data/processed/team_ratings.json.
    """
    today = datetime.now(timezone.utc).date()

    # Build xG lookup: match_id -> {"home_xg": float, "away_xg": float}
    xg_lookup: dict[str, dict] = {}
    for xg_file in xg_dir.glob("*.json"):
        data = _load_json(xg_file)
        if not data:
            continue
        match_id = xg_file.stem
        home_xg = None
        away_xg = None
        # Structure: {"data": {"overview": {"expected_goals": {"all": {"home": X, "away": Y}}}}}
        stats = data.get("data", data) if isinstance(data, dict) else {}
        if isinstance(stats, dict):
            xg_all = (
                stats.get("overview", {}).get("expected_goals", {}).get("all", {})
            )
            h = xg_all.get("home")
            a = xg_all.get("away")
            if h is not None:
                home_xg = float(h)
            if a is not None:
                away_xg = float(a)
        xg_lookup[match_id] = {"home_xg": home_xg, "away_xg": away_xg}

    # Collect all match records
    records: list[dict] = []
    for match_file in matches_dir.glob("*.json"):
        data = _load_json(match_file)
        if not data:
            continue
        match_id = match_file.stem
        try:
            match_date_str = (
                data.get("date") or data.get("utc_date") or data.get("match_date")
                or data.get("fixture", {}).get("date", "")
            )
            if not match_date_str:
                continue
            match_date = datetime.fromisoformat(str(match_date_str).replace("Z", "+00:00")).date()
            days_ago = (today - match_date).days
            if days_ago < 0:
                continue
            weight = math.exp(-0.005 * days_ago)

            ht = data.get("home_team") or data.get("teams", {}).get("home", {})
            at = data.get("away_team") or data.get("teams", {}).get("away", {})
            home_team = ht.get("name", "") if isinstance(ht, dict) else str(ht)
            away_team = at.get("name", "") if isinstance(at, dict) else str(at)
            if not home_team or not away_team:
                continue

            score = data.get("score", {}) or {}
            home_goals = (
                data.get("home_goals")
                or data.get("goals", {}).get("home")
                or score.get("home")
            )
            away_goals = (
                data.get("away_goals")
                or data.get("goals", {}).get("away")
                or score.get("away")
            )

            xg = xg_lookup.get(match_id, {})
            home_xg = xg.get("home_xg")
            away_xg = xg.get("away_xg")

            # Fall back to actual goals if xG unavailable
            if home_xg is None and home_goals is not None:
                home_xg = float(home_goals)
            if away_xg is None and away_goals is not None:
                away_xg = float(away_goals)

            if home_xg is None or away_xg is None:
                continue

            records.append({
                "home_team": home_team,
                "away_team": away_team,
                "home_xg": home_xg,
                "away_xg": away_xg,
                "weight": weight,
                "days_ago": days_ago,
            })
        except (ValueError, KeyError, TypeError):
            continue

    if not records:
        print("[WARN] No match records found. Run data_collector.py first.")
        return {}

    # Gather all teams and pre-compute match counts
    teams: set[str] = set()
    match_counts: dict[str, int] = {}
    for r in records:
        teams.add(r["home_team"])
        teams.add(r["away_team"])
        match_counts[r["home_team"]] = match_counts.get(r["home_team"], 0) + 1
        match_counts[r["away_team"]] = match_counts.get(r["away_team"], 0) + 1

    # Compute league means using only records where both teams have enough data.
    # This prevents 1-2 freak results from low-sample/junk teams skewing the mean.
    stable_records = [
        r for r in records
        if match_counts.get(r["home_team"], 0) >= MIN_MATCHES
        and match_counts.get(r["away_team"], 0) >= MIN_MATCHES
    ] or records  # fall back to all records if nothing qualifies
    total_weight = sum(r["weight"] for r in stable_records)
    avg_home_xg = sum(r["home_xg"] * r["weight"] for r in stable_records) / total_weight
    avg_away_xg = sum(r["away_xg"] * r["weight"] for r in stable_records) / total_weight
    avg_xg = (avg_home_xg + avg_away_xg) / 2

    # Iterative MLE: attack and defense strengths
    # attack_i * defense_j * avg_xg = expected_xg for team i vs team j
    attack: dict[str, float] = {t: 1.0 for t in teams}
    defense: dict[str, float] = {t: 1.0 for t in teams}

    for _ in range(100):  # iterate to convergence
        # Update attack strengths
        for team in teams:
            home_records = [r for r in records if r["home_team"] == team]
            away_records = [r for r in records if r["away_team"] == team]
            numerator = (
                sum(r["home_xg"] * r["weight"] for r in home_records)
                + sum(r["away_xg"] * r["weight"] for r in away_records)
            )
            denominator = (
                sum(defense[r["away_team"]] * avg_home_xg * r["weight"] for r in home_records)
                + sum(defense[r["home_team"]] * avg_away_xg * r["weight"] for r in away_records)
            )
            if denominator > 0:
                attack[team] = numerator / denominator

        # Update defense strengths
        for team in teams:
            home_records = [r for r in records if r["home_team"] == team]
            away_records = [r for r in records if r["away_team"] == team]
            numerator = (
                sum(r["away_xg"] * r["weight"] for r in home_records)
                + sum(r["home_xg"] * r["weight"] for r in away_records)
            )
            denominator = (
                sum(attack[r["away_team"]] * avg_away_xg * r["weight"] for r in home_records)
                + sum(attack[r["home_team"]] * avg_home_xg * r["weight"] for r in away_records)
            )
            if denominator > 0:
                defense[team] = numerator / denominator

        # Normalize so mean attack = mean defense = 1.
        # Use only stable teams (>= MIN_MATCHES) so low-sample outliers don't skew the scale.
        stable_teams = {t for t in teams if match_counts.get(t, 0) >= MIN_MATCHES} or teams
        mean_attack = np.mean([attack[t] for t in stable_teams])
        mean_defense = np.mean([defense[t] for t in stable_teams])
        attack = {t: v / mean_attack for t, v in attack.items()}
        defense = {t: v / mean_defense for t, v in defense.items()}

    ratings = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "avg_home_xg": round(avg_home_xg, 4),
        "avg_away_xg": round(avg_away_xg, 4),
        "avg_xg": round(avg_xg, 4),
        "teams": {
            t: {
                "attack_strength": round(attack[t], 4),
                "defense_strength": round(defense[t], 4),
                "match_count": match_counts.get(t, 0),
                "reliable": match_counts.get(t, 0) >= RELIABLE_MATCHES,
                "low_sample_warning": match_counts.get(t, 0) < MIN_MATCHES,
            }
            for t in sorted(teams)
        },
    }

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    TEAM_RATINGS_PATH.write_text(json.dumps(ratings, indent=2), encoding="utf-8")
    print(f"[OK] Team ratings saved ({len(teams)} teams, {len(records)} weighted matches)")
    return ratings


def load_ratings() -> dict:
    """Load team ratings from disk."""
    if not TEAM_RATINGS_PATH.exists():
        return {}
    data = _load_json(TEAM_RATINGS_PATH)
    return data if isinstance(data, dict) else {}


# ── Dixon-Coles Correction ─────────────────────────────────────────────────────

def dixon_coles_correction(home_goals: int, away_goals: int, rho: float = DIXON_COLES_RHO) -> float:
    """
    Correction factor for low-score outcomes (Dixon & Coles 1997).
    Only applies when both scores are 0 or 1.
    """
    if home_goals == 0 and away_goals == 0:
        return 1 - rho
    elif home_goals == 1 and away_goals == 0:
        return 1 + rho
    elif home_goals == 0 and away_goals == 1:
        return 1 + rho
    elif home_goals == 1 and away_goals == 1:
        return 1 - rho
    else:
        return 1.0


# ── Match Prediction ───────────────────────────────────────────────────────────

def predict_match(home_team: str, away_team: str, ratings: dict) -> dict:
    """
    Predict match outcome probabilities using Poisson model with Dixon-Coles correction.
    """
    teams = ratings.get("teams", {})
    avg_home_xg = ratings.get("avg_home_xg", 1.35)
    avg_away_xg = ratings.get("avg_away_xg", 1.05)

    DEFAULT_ATTACK = 1.0
    DEFAULT_DEFENSE = 1.0
    MIN_LAMBDA = 0.4  # floor prevents near-zero xG collapse for weak/unrated nations

    home_data = teams.get(home_team, {"attack_strength": DEFAULT_ATTACK, "defense_strength": DEFAULT_DEFENSE})
    away_data = teams.get(away_team, {"attack_strength": DEFAULT_ATTACK, "defense_strength": DEFAULT_DEFENSE})

    # Expected goals using Dixon-Coles MLE formula
    home_lambda = home_data["attack_strength"] * away_data["defense_strength"] * avg_home_xg
    away_lambda = away_data["attack_strength"] * home_data["defense_strength"] * avg_away_xg

    home_lambda = max(home_lambda, MIN_LAMBDA)
    away_lambda = max(away_lambda, MIN_LAMBDA)

    if home_lambda + away_lambda < 1.2:
        print(f"[WARN] Suspiciously low total xG for {home_team} vs {away_team}: "
              f"{home_lambda:.3f} + {away_lambda:.3f} = {home_lambda + away_lambda:.3f}")

    home_xg = home_lambda
    away_xg = away_lambda

    warnings = []
    if home_data.get("low_sample_warning"):
        warnings.append(f"{home_team}: <5 matches in ratings data")
    if away_data.get("low_sample_warning"):
        warnings.append(f"{away_team}: <5 matches in ratings data")
    if home_team not in teams:
        warnings.append(f"{home_team}: not in ratings — using league average")
    if away_team not in teams:
        warnings.append(f"{away_team}: not in ratings — using league average")

    # Build scoreline probability matrix
    score_probs: dict[tuple[int, int], float] = {}
    total_mass = 0.0
    for h in range(MAX_GOALS):
        for a in range(MAX_GOALS):
            p = poisson.pmf(h, home_xg) * poisson.pmf(a, away_xg)
            correction = dixon_coles_correction(h, a)
            p *= correction
            score_probs[(h, a)] = p
            total_mass += p

    # Normalize (correction shifts probabilities slightly off 1.0)
    score_probs = {k: v / total_mass for k, v in score_probs.items()}

    # Aggregate markets
    home_win = sum(p for (h, a), p in score_probs.items() if h > a)
    draw = sum(p for (h, a), p in score_probs.items() if h == a)
    away_win = sum(p for (h, a), p in score_probs.items() if a > h)

    over_25 = sum(p for (h, a), p in score_probs.items() if h + a > 2)
    under_25 = 1 - over_25
    over_15 = sum(p for (h, a), p in score_probs.items() if h + a > 1)
    under_15 = 1 - over_15
    btts_yes = sum(p for (h, a), p in score_probs.items() if h > 0 and a > 0)
    btts_no = 1 - btts_yes
    home_cs = sum(p for (h, a), p in score_probs.items() if a == 0)
    away_cs = sum(p for (h, a), p in score_probs.items() if h == 0)

    # Top scorelines
    top_scorelines = sorted(score_probs.items(), key=lambda x: x[1], reverse=True)[:5]
    top_scorelines_fmt = [
        {"score": f"{h}-{a}", "pct": round(p * 100, 1)}
        for (h, a), p in top_scorelines
    ]

    return {
        "home_team": home_team,
        "away_team": away_team,
        "home_xg_pred": round(home_xg, 2),
        "away_xg_pred": round(away_xg, 2),
        "home_win_pct": round(home_win * 100, 1),
        "draw_pct": round(draw * 100, 1),
        "away_win_pct": round(away_win * 100, 1),
        "over_2_5_pct": round(over_25 * 100, 1),
        "under_2_5_pct": round(under_25 * 100, 1),
        "over_1_5_pct": round(over_15 * 100, 1),
        "under_1_5_pct": round(under_15 * 100, 1),
        "btts_yes_pct": round(btts_yes * 100, 1),
        "btts_no_pct": round(btts_no * 100, 1),
        "home_clean_sheet_pct": round(home_cs * 100, 1),
        "away_clean_sheet_pct": round(away_cs * 100, 1),
        "top_scorelines": top_scorelines_fmt,
        "warnings": warnings,
    }


def generate_all_predictions(upcoming_fixtures: list, ratings: dict | None = None) -> list:
    """Run predict_match for every fixture. Save to model_predictions.json."""
    if ratings is None:
        ratings = load_ratings()
    if not ratings:
        print("[WARN] No ratings available — run compute_team_ratings() first")
        return []

    predictions = []
    for fixture in upcoming_fixtures:
        try:
            home = fixture.get("home_team") or fixture.get("teams", {}).get("home", {}).get("name")
            away = fixture.get("away_team") or fixture.get("teams", {}).get("away", {}).get("name")
            if home and away:
                pred = predict_match(home, away, ratings)
                predictions.append(pred)
        except Exception as e:
            print(f"[WARN] Prediction failed for fixture {fixture}: {e}")

    return predictions


def compute_vig_free_prob(home_odds: int, draw_odds: int, away_odds: int) -> dict:
    """
    Remove Pinnacle vig from 3-way match odds.
    Divide each raw implied probability by the sum of all three to get vig-free fair probs.
    Returns decimal probabilities (0–1) for each outcome.
    """
    def implied(american: int) -> float:
        if american > 0:
            return 100 / (american + 100)
        return (-american) / (-american + 100)

    raw_home = implied(home_odds)
    raw_draw = implied(draw_odds)
    raw_away = implied(away_odds)
    total = raw_home + raw_draw + raw_away
    return {
        "home": round(raw_home / total, 6),
        "draw": round(raw_draw / total, 6),
        "away": round(raw_away / total, 6),
        "vig": round(total - 1.0, 6),
    }


def compute_edge(
    model_pct: float,
    american_odds: int,
    pinnacle_odds: float | None = None,
) -> float:
    """
    Edge = model probability - market implied probability (percentage points).
    Positive = model thinks market is underpricing this outcome.

    If pinnacle_odds is provided (vig-free decimal probability from compute_vig_free_prob),
    it is used as the market benchmark instead of the raw American odds implied probability.
    """
    if pinnacle_odds is not None:
        implied = pinnacle_odds
    elif american_odds > 0:
        implied = 100 / (american_odds + 100)
    else:
        implied = (-american_odds) / (-american_odds + 100)
    return round(model_pct / 100 - implied, 4) * 100  # return as percentage points


if __name__ == "__main__":
    print("Computing team ratings from cached data...")
    ratings = compute_team_ratings()
    if ratings:
        all_teams = ratings.get("teams", {})
        print(f"Ratings computed for {len(all_teams)} teams.")

        wc_rated = [
            (name, data) for name, data in all_teams.items()
            if name in WC_2026_TEAMS and data.get("match_count", 0) >= MIN_MATCHES
        ]
        wc_ranked = sorted(wc_rated, key=lambda x: x[1]["attack_strength"], reverse=True)[:10]
        print(f"\nTop 10 WC 2026 teams by attack strength (>= {MIN_MATCHES} matches):")
        for i, (name, data) in enumerate(wc_ranked, 1):
            print(
                f"  {i:2}. {name:<28} "
                f"attack={data['attack_strength']:.3f}  "
                f"defense={data['defense_strength']:.3f}  "
                f"matches={data['match_count']}"
            )
