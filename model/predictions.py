"""
predictions.py — Daily prediction orchestrator.
Called by morning_report.py; can also be run standalone.

Usage:
    python model/predictions.py
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from model.poisson_model import load_ratings, generate_all_predictions, compute_edge
from model.player_props import load_player_profiles, predict_anytime_scorer, predict_shots_on_target

PROCESSED_DIR = ROOT / "data" / "processed"
TEAM_RATINGS_PATH = PROCESSED_DIR / "team_ratings.json"
ODDS_CACHE_PATH = ROOT / "data" / "odds_cache.json"
MODEL_PREDICTIONS_PATH = PROCESSED_DIR / "model_predictions.json"

ET_OFFSET = timedelta(hours=-4)

MODEL_ENABLED = False  # Re-enable after group stage when WC match data is available

EDGE_MILD = 3.0
EDGE_STRONG = 5.0
EDGE_SHARP = 8.0

TEAM_NAME_ALIASES: dict[str, str] = {
    "United States": "USA",
    "USA": "United States",
    "Republic of Ireland": "Ireland",
    "Ireland": "Republic of Ireland",
    "Korea Republic": "South Korea",
    "South Korea": "Korea Republic",
    "Iran": "IR Iran",
    "IR Iran": "Iran",
}


def _teams_match(a: str, b: str) -> bool:
    """Case-insensitive match with alias lookup and substring fallback."""
    al, bl = a.lower(), b.lower()
    if al == bl:
        return True
    alias = TEAM_NAME_ALIASES.get(a, TEAM_NAME_ALIASES.get(a.title(), "")).lower()
    if alias and alias == bl:
        return True
    alias_b = TEAM_NAME_ALIASES.get(b, TEAM_NAME_ALIASES.get(b.title(), "")).lower()
    if alias_b and alias_b == al:
        return True
    return al in bl or bl in al

# Top prop targets per match (player name + which team they play for)
PROP_PLAYERS: list[dict] = [
    {"name": "Kylian Mbappé", "team": "France"},
    {"name": "Harry Kane", "team": "England"},
    {"name": "Erling Haaland", "team": "Norway"},
    {"name": "Lionel Messi", "team": "Argentina"},
    {"name": "Vinícius Júnior", "team": "Brazil"},
    {"name": "Raphinha", "team": "Brazil"},
    {"name": "Lamine Yamal", "team": "Spain"},
    {"name": "Jude Bellingham", "team": "England"},
    {"name": "Bukayo Saka", "team": "England"},
    {"name": "Antoine Griezmann", "team": "France"},
    {"name": "Marcus Thuram", "team": "France"},
    {"name": "Florian Wirtz", "team": "Germany"},
    {"name": "Leroy Sané", "team": "Germany"},
    {"name": "Cody Gakpo", "team": "Netherlands"},
    {"name": "Son Heung-min", "team": "South Korea"},
    {"name": "Julián Álvarez", "team": "Argentina"},
    {"name": "Luis Díaz", "team": "Colombia"},
    {"name": "Bruno Fernandes", "team": "Portugal"},
]


def now_et() -> datetime:
    return datetime.now(timezone.utc).astimezone(timezone(ET_OFFSET))


def today_date_str() -> str:
    return now_et().strftime("%Y-%m-%d")


def fetch_fixtures_today() -> list:
    """Derive today's WC fixtures from the odds cache.
    API-Sports free tier doesn't cover 2026 season data."""
    try:
        cache = json.loads(ODDS_CACHE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    today_et = now_et().date()
    fixtures = []
    for match in cache.get("matches", []):
        try:
            commence = match["commence_time"]
            kickoff_dt = datetime.fromisoformat(commence.replace("Z", "+00:00"))
            kickoff_et = kickoff_dt.astimezone(timezone(ET_OFFSET))
            is_today = kickoff_et.date() == today_et
            is_late_night = (
                kickoff_et.date() == today_et + timedelta(days=1)
                and kickoff_et.hour < 3
            )
            if not is_today and not is_late_night:
                continue
            fixtures.append({
                "teams": {
                    "home": {"name": match["home_team"]},
                    "away": {"name": match["away_team"]},
                },
                "fixture": {"date": commence},
            })
        except (KeyError, ValueError):
            continue
    return fixtures


def load_odds_cache() -> dict:
    if ODDS_CACHE_PATH.exists():
        try:
            return json.loads(ODDS_CACHE_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"matches": []}


def extract_dk_odds(match_name_home: str, match_name_away: str, odds_cache: dict) -> dict | None:
    """Find DraftKings h2h and totals odds for a given match from the cache."""
    for match in odds_cache.get("matches", []):
        home = match.get("home_team", "")
        away = match.get("away_team", "")
        if not (_teams_match(home, match_name_home) and _teams_match(away, match_name_away)):
            continue
        for bm in match.get("bookmakers", []):
            if bm.get("key") != "draftkings":
                continue
            result: dict = {}
            for mkt in bm.get("markets", []):
                key = mkt.get("key")
                if key == "h2h":
                    for o in mkt.get("outcomes", []):
                        if o["name"].lower() in (home.lower(), "home"):
                            result["home_odds"] = o["price"]
                        elif o["name"].lower() == "draw":
                            result["draw_odds"] = o["price"]
                        elif o["name"].lower() in (away.lower(), "away"):
                            result["away_odds"] = o["price"]
                elif key == "totals":
                    for o in mkt.get("outcomes", []):
                        if o.get("point") == 2.5:
                            if o["name"].lower() == "over":
                                result["over_25_odds"] = o["price"]
                            elif o["name"].lower() == "under":
                                result["under_25_odds"] = o["price"]
            return result if result else None
    return None


def run_predictions(fixtures: list | None = None) -> list:
    """Run all predictions for today's fixtures. Returns list of prediction dicts."""
    if not MODEL_ENABLED:
        print("[MODEL] Disabled — run after group stage when WC match data is available.")
        return []
    if fixtures is None:
        fixtures = fetch_fixtures_today()

    ratings = load_ratings()
    if not ratings:
        print("[WARN] Team ratings not found. Run model/poisson_model.py first.")
        return []

    # Check rating freshness (warn if >7 days old)
    generated_at = ratings.get("generated_at", "")
    if generated_at:
        try:
            age_days = (datetime.now(timezone.utc) - datetime.fromisoformat(generated_at)).days
            if age_days > 7:
                print(f"[WARN] Team ratings are {age_days} days old — consider refreshing with data_collector.py")
        except ValueError:
            pass

    odds_cache = load_odds_cache()
    player_profiles = load_player_profiles()
    raw_preds = generate_all_predictions(fixtures, ratings)

    # Flag low-confidence predictions where either team lacks sufficient match history
    teams_data = ratings.get("teams", {})
    for pred in raw_preds:
        unreliable = [
            t for t in [pred["home_team"], pred["away_team"]]
            if not teams_data.get(t, {}).get("reliable", True)
        ]
        if unreliable:
            reasons = [
                f"{t} has only {teams_data.get(t, {}).get('match_count', 0)} matches"
                " -- ratings unreliable, weight qualitative factors heavily"
                for t in unreliable
            ]
            pred["low_confidence"] = True
            pred["low_confidence_reason"] = "; ".join(reasons)

    enriched: list[dict] = []

    for pred in raw_preds:
        home = pred["home_team"]
        away = pred["away_team"]

        # Add DK edges
        dk = extract_dk_odds(home, away, odds_cache)
        if dk:
            pred["dk_odds"] = dk
            if "home_odds" in dk:
                pred["home_edge"] = round(compute_edge(pred["home_win_pct"], dk["home_odds"]), 1)
                pred["home_edge_flag"] = _edge_flag(pred["home_edge"])
            if "draw_odds" in dk:
                pred["draw_edge"] = round(compute_edge(pred["draw_pct"], dk["draw_odds"]), 1)
                pred["draw_edge_flag"] = _edge_flag(pred["draw_edge"])
            if "away_odds" in dk:
                pred["away_edge"] = round(compute_edge(pred["away_win_pct"], dk["away_odds"]), 1)
                pred["away_edge_flag"] = _edge_flag(pred["away_edge"])
            if "over_25_odds" in dk:
                pred["over_25_edge"] = round(compute_edge(pred["over_2_5_pct"], dk["over_25_odds"]), 1)
                pred["over_25_edge_flag"] = _edge_flag(pred["over_25_edge"])
            if "under_25_odds" in dk:
                pred["under_25_edge"] = round(compute_edge(pred["under_2_5_pct"], dk["under_25_odds"]), 1)
                pred["under_25_edge_flag"] = _edge_flag(pred["under_25_edge"])
            if "over_25_odds" in dk:  # reuse for BTTS (no direct odds in cache yet)
                pred["btts_edge"] = None

        # Add player props for the top 3 relevant players in this match
        prop_preds = []
        for p_info in PROP_PLAYERS:
            p_team = p_info["team"]
            if p_team.lower() in (home.lower(), away.lower()):
                prop = predict_anytime_scorer(
                    player_name=p_info["name"],
                    home_team=home,
                    away_team=away,
                    team_ratings=ratings,
                    player_team=p_team,
                    profiles=player_profiles,
                )
                if prop.get("anytime_scorer_pct") is not None:
                    prop_preds.append(prop)
            if len(prop_preds) >= 3:
                break
        pred["player_props"] = prop_preds

        enriched.append(pred)

    # Save
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "date": today_date_str(),
        "predictions": enriched,
    }
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_PREDICTIONS_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"[OK] Predictions saved for {len(enriched)} matches.")
    return enriched


def _edge_flag(edge: float | None) -> str:
    if edge is None:
        return "none"
    if edge >= EDGE_SHARP:
        return "sharp"
    if edge >= EDGE_STRONG:
        return "strong"
    if edge >= EDGE_MILD:
        return "mild"
    return "none"


def format_predictions_markdown(predictions: list) -> str:
    """Format predictions as a markdown section for the morning report prompt."""
    if not predictions:
        return "## MODEL PREDICTIONS\n\n(No predictions available for today)"

    lines = ["## MODEL PREDICTIONS\n"]
    for pred in predictions:
        home = pred["home_team"]
        away = pred["away_team"]
        lines.append(f"### {home} vs {away}")
        lines.append(f"- Model xG: {home} {pred['home_xg_pred']} — {away} {pred['away_xg_pred']}")
        lines.append(
            f"- Win probabilities: {home} {pred['home_win_pct']}% | "
            f"Draw {pred['draw_pct']}% | {away} {pred['away_win_pct']}%"
        )

        dk = pred.get("dk_odds", {})
        if dk:
            for market, model_key, label in [
                ("home_odds", "home_win_pct", f"{home} ML"),
                ("draw_odds", "draw_pct", "Draw"),
                ("away_odds", "away_win_pct", f"{away} ML"),
                ("over_25_odds", "over_2_5_pct", "Over 2.5"),
                ("under_25_odds", "under_2_5_pct", "Under 2.5"),
            ]:
                if market in dk:
                    from model.poisson_model import compute_edge as _ce
                    edge = _ce(pred[model_key], dk[market])
                    flag = "<< EDGE" if edge >= EDGE_STRONG else ("<< mild edge" if edge >= EDGE_MILD else "")
                    lines.append(f"- {label}: Model {pred[model_key]}% vs DK {dk[market]:+d} -> {edge:+.1f}% {flag}")

        top = pred.get("top_scorelines", [])[:3]
        if top:
            sl_str = " | ".join(f"{s['score']} ({s['pct']}%)" for s in top)
            lines.append(f"- Top scorelines: {sl_str}")

        props = pred.get("player_props", [])
        if props:
            lines.append("- Player props:")
            for p in props:
                pct = p.get("anytime_scorer_pct")
                if pct is not None:
                    lines.append(f"  • {p['player']}: anytime scorer {pct}%")

        if pred.get("low_confidence"):
            lines.append(f"- LOW CONFIDENCE: {pred.get('low_confidence_reason', 'small sample')}")

        if pred.get("warnings"):
            for w in pred["warnings"]:
                lines.append(f"- NOTE: {w}")

        lines.append("")

    return "\n".join(lines)


if __name__ == "__main__":
    print(f"Running predictions for {today_date_str()}...")
    preds = run_predictions()
    if preds:
        print("\n" + format_predictions_markdown(preds))
