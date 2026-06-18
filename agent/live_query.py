"""
live_query.py — On-demand live match report generator.

Usage:
    python agent/live_query.py                               # all matches today/next 6h
    python agent/live_query.py --match "Brazil vs Morocco"  # specific match focus
    python agent/live_query.py --save                        # save report to reports/
    python agent/live_query.py --match "Spain vs France" --save
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
SYSTEM_PROMPT_PATH = ROOT / "agent" / "system_prompt.md"
ODDS_CACHE_PATH = ROOT / "data" / "odds_cache.json"
REPORTS_DIR = ROOT / "reports"
MODEL_PREDICTIONS_PATH = ROOT / "data" / "processed" / "model_predictions.json"

ODDS_API_KEY = os.getenv("THE_ODDS_API_KEY", "")
API_SPORTS_KEY = os.getenv("API_SPORTS_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

MODEL = "claude-sonnet-4-6"
ET_OFFSET = timedelta(hours=-4)  # EDT


def now_et() -> datetime:
    return datetime.now(timezone.utc).astimezone(timezone(ET_OFFSET))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def today_date_str() -> str:
    return now_et().strftime("%Y-%m-%d")


def implied_prob(american_odds: int) -> float:
    if american_odds > 0:
        return 100 / (american_odds + 100)
    else:
        return (-american_odds) / (-american_odds + 100)


# ── Data Fetchers ─────────────────────────────────────────────────────────────

def fetch_live_odds() -> dict:
    """Fetch current DraftKings odds from The Odds API."""
    try:
        url = "https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/"
        params = {
            "apiKey": ODDS_API_KEY,
            "regions": "us",
            "markets": "h2h,totals",
            "oddsFormat": "american",
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return {
            "data": resp.json(),
            "quota_remaining": resp.headers.get("x-requests-remaining", "unknown"),
            "fetched_at": now_utc().isoformat(),
        }
    except requests.RequestException as e:
        print(f"[WARN] Odds API fetch failed: {e}", file=sys.stderr)
        return {"data": [], "quota_remaining": "unknown", "fetched_at": now_utc().isoformat()}


def fetch_live_scores() -> list:
    """Fetch in-progress WC match scores."""
    try:
        url = "https://v3.football.api-sports.io/fixtures"
        headers = {"x-apisports-key": API_SPORTS_KEY}
        params = {"live": "all", "league": 1}
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("response", [])
    except requests.RequestException as e:
        print(f"[WARN] Live scores fetch failed: {e}", file=sys.stderr)
        return []


def fetch_upcoming_fixtures() -> list:
    """Fetch today's fixtures from API-Sports."""
    try:
        url = "https://v3.football.api-sports.io/fixtures"
        headers = {"x-apisports-key": API_SPORTS_KEY}
        params = {"league": 1, "season": 2026, "date": today_date_str()}
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("response", [])
    except requests.RequestException as e:
        print(f"[WARN] Fixtures fetch failed: {e}", file=sys.stderr)
        return []


def load_odds_cache() -> dict:
    if ODDS_CACHE_PATH.exists():
        try:
            return json.loads(ODDS_CACHE_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"last_updated": None, "matches": []}


def load_model_predictions_for_match(match_focus: str) -> str:
    """Return model prediction markdown for the specified match (or all if no focus)."""
    if not MODEL_PREDICTIONS_PATH.exists():
        return "(model predictions not available)"
    try:
        predictions = json.loads(MODEL_PREDICTIONS_PATH.read_text(encoding="utf-8"))
        matches = predictions.get("predictions", [])
        lines = []
        for pred in matches:
            home = pred.get("home_team", "")
            away = pred.get("away_team", "")
            if match_focus:
                # Simple fuzzy match
                focus_lower = match_focus.lower()
                if home.lower() not in focus_lower and away.lower() not in focus_lower:
                    continue
            lines.append(f"**{home} vs {away}**")
            lines.append(f"- xG: {home} {pred.get('home_xg_pred')} | {away} {pred.get('away_xg_pred')}")
            lines.append(
                f"- Model probs: {home} {pred.get('home_win_pct')}% | Draw {pred.get('draw_pct')}% | {away} {pred.get('away_win_pct')}%"
            )
            for edge_key, label in [
                ("home_edge", f"{home} edge"),
                ("draw_edge", "Draw edge"),
                ("away_edge", f"{away} edge"),
                ("over_25_edge", "Over 2.5 edge"),
                ("under_25_edge", "Under 2.5 edge"),
            ]:
                val = pred.get(edge_key)
                if val is not None:
                    lines.append(f"- {label}: {val:+.1f}%")
            lines.append("")
        return "\n".join(lines) if lines else "(no model predictions for this match)"
    except Exception:
        return "(error loading model predictions)"


# ── Prompt Builder ─────────────────────────────────────────────────────────────

def build_live_prompt(
    match_focus: str,
    live_scores: list,
    upcoming_fixtures: list,
    odds_result: dict,
    morning_cache_summary: str,
    model_predictions: str,
) -> str:
    et_now = now_et().strftime("%Y-%m-%d %H:%M ET")

    focus_clause = f'focused on: **{match_focus}**' if match_focus else "covering all matches today or starting within 6 hours"

    # Format live scores
    live_lines = []
    for f in live_scores:
        try:
            home = f["teams"]["home"]["name"]
            away = f["teams"]["away"]["name"]
            hg = f["goals"]["home"]
            ag = f["goals"]["away"]
            minute = f["fixture"]["status"].get("elapsed", "?")
            live_lines.append(f"  • LIVE {minute}' | {home} {hg}–{ag} {away}")
        except (KeyError, TypeError):
            pass
    live_text = "\n".join(live_lines) if live_lines else "  No matches currently live."

    # Format upcoming fixtures (next 6 hours)
    cutoff = now_utc() + timedelta(hours=6)
    upcoming_lines = []
    for f in upcoming_fixtures:
        try:
            kickoff_dt = datetime.fromisoformat(f["fixture"]["date"].replace("Z", "+00:00"))
            if kickoff_dt > cutoff:
                continue
            home = f["teams"]["home"]["name"]
            away = f["teams"]["away"]["name"]
            kickoff_et = kickoff_dt.astimezone(timezone(ET_OFFSET)).strftime("%I:%M %p ET")
            upcoming_lines.append(f"  • {kickoff_et} | {home} vs {away}")
        except (KeyError, ValueError):
            pass
    upcoming_text = "\n".join(upcoming_lines) if upcoming_lines else "  No upcoming matches in next 6 hours."

    # Format current odds
    odds_lines = []
    for match in odds_result.get("data", []):
        home = match.get("home_team", "")
        away = match.get("away_team", "")
        if match_focus:
            focus_lower = match_focus.lower()
            if home.lower() not in focus_lower and away.lower() not in focus_lower:
                continue
        for bm in match.get("bookmakers", []):
            if bm.get("key") != "draftkings":
                continue
            for mkt in bm.get("markets", []):
                if mkt.get("key") == "h2h":
                    parts = []
                    for o in mkt.get("outcomes", []):
                        price = o["price"]
                        imp = implied_prob(int(price))
                        parts.append(f"{o['name']} {price:+d} ({imp:.1%})")
                    odds_lines.append(f"  {home} vs {away} H2H: {' | '.join(parts)}")

    odds_text = "\n".join(odds_lines) if odds_lines else "  No odds available."

    return f"""## LIVE QUERY REPORT — {et_now}
Report {focus_clause}

### Live Scores (In Progress)
{live_text}

### Upcoming Matches (Next 6 Hours)
{upcoming_text}

### Current DraftKings Odds
{odds_text}

### Morning Report Odds Cache (For Movement Comparison)
{morning_cache_summary}

### Model Predictions
{model_predictions}

---

## REQUEST

Produce a live betting intelligence update {focus_clause}.

1. **CURRENT SITUATION** — If matches are live: what is happening, what changed since kickoff, is the score/flow surprising?

2. **MORNING REPORT CHECK** — Do the morning report's recommendations still stand? Have any odds or live events made those bets obsolete or improved them?

3. **LIVE BETTING ANGLES** — Any in-play opportunities given the current game state, score, and line movement since morning?

4. **LINE MOVEMENT SINCE MORNING** — Compare current odds to morning cache. Describe any meaningful shifts.

5. **UPDATED RECOMMENDATIONS** — Confirm, modify, or cancel morning bets. Add any new plays that have emerged.

Be specific, direct, and concise. Use exact odds and model edges where available.
"""


def build_static_context() -> str:
    return """## STATIC CONTEXT

Pre-tournament baselines and intelligence are in the system prompt.
This is a live query — focus on current match state, line movements since morning, and in-play dynamics.
"""


# ── Claude API ─────────────────────────────────────────────────────────────────

def call_claude(system_prompt: str, static_context: str, live_prompt: str) -> str:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=MODEL,
            max_tokens=3000,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": static_context,
                            "cache_control": {"type": "ephemeral"},
                        },
                        {
                            "type": "text",
                            "text": live_prompt,
                        },
                    ],
                }
            ],
        )
        return response.content[0].text
    except Exception as e:
        print(f"[ERROR] Claude API call failed: {e}", file=sys.stderr)
        raise


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    # Ensure stdout handles Unicode/emoji on Windows terminals
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="WC2026 Live Match Query")
    parser.add_argument("--match", type=str, default="", help="Focus on a specific match, e.g. 'Brazil vs Morocco'")
    parser.add_argument("--save", action="store_true", help="Save report to reports/ directory")
    args = parser.parse_args()

    match_focus = args.match.strip()
    print(f"[START] Live query{f' — {match_focus}' if match_focus else ' — all matches'}")

    if not SYSTEM_PROMPT_PATH.exists():
        print("[ERROR] agent/system_prompt.md not found.", file=sys.stderr)
        sys.exit(1)
    system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")

    print("[FETCH] Live odds...")
    odds_result = fetch_live_odds()

    print("[FETCH] Live scores...")
    live_scores = fetch_live_scores()

    print("[FETCH] Upcoming fixtures...")
    upcoming_fixtures = fetch_upcoming_fixtures()

    # Morning cache summary for movement comparison
    cache = load_odds_cache()
    cache_time = cache.get("last_updated", "not cached")
    morning_cache_summary = f"Morning cache last updated: {cache_time}\n(Full movement delta computed from cache data)"

    model_predictions = load_model_predictions_for_match(match_focus)

    static_context = build_static_context()
    live_prompt = build_live_prompt(
        match_focus=match_focus,
        live_scores=live_scores,
        upcoming_fixtures=upcoming_fixtures,
        odds_result=odds_result,
        morning_cache_summary=morning_cache_summary,
        model_predictions=model_predictions,
    )

    print("[CLAUDE] Generating live report...")
    report_text = call_claude(system_prompt, static_context, live_prompt)

    print("\n" + "=" * 70)
    print(report_text)
    print("=" * 70)

    if args.save:
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        et_now = now_et()
        timestamp = et_now.strftime("%H-%M")
        today_str = et_now.strftime("%Y-%m-%d")
        report_path = REPORTS_DIR / f"{today_str}_live_{timestamp}.md"
        header = f"# WC2026 Live Query — {today_str} {timestamp} ET\n\n"
        if match_focus:
            header += f"_Focus: {match_focus}_\n\n"
        report_path.write_text(header + report_text, encoding="utf-8")
        print(f"\n[OK] Live report saved to {report_path}")


if __name__ == "__main__":
    main()
