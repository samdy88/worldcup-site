"""
morning_report.py — Daily betting intelligence report generator.

Usage:
    python agent/morning_report.py                # generate report, save to reports/, no email
    python agent/morning_report.py --no-push      # generate, skip git commit/push
    python agent/morning_report.py --dry-run      # print prompt, no Claude call
    python agent/morning_report.py --send-email   # send today's saved report (review first!)
    python agent/morning_report.py --send-email --send-date 2026-06-14  # send a past report
    python agent/morning_report.py --no-email     # (accepted but ignored; email never auto-sends)
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
SYSTEM_PROMPT_PATH = ROOT / "agent" / "system_prompt.md"
ODDS_CACHE_PATH = ROOT / "data" / "odds_cache.json"
BETS_PATH = ROOT / "data" / "bets.json"
SUBSCRIBERS_PATH = ROOT / "data" / "subscribers.json"
REPORTS_DIR = ROOT / "reports"

# ── Config ────────────────────────────────────────────────────────────────────
ODDS_API_KEY = os.getenv("THE_ODDS_API_KEY", "")
API_SPORTS_KEY = os.getenv("API_SPORTS_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
GMAIL_FROM = os.getenv("RESEND_TO_EMAIL", "")  # levijbdavis@gmail.com — reuses existing env var

MODEL = "claude-sonnet-4-6"
ET_OFFSET = timedelta(hours=-4)  # EDT (UTC-4)
# Set this to wherever the dashboard is actually served. A local file path
# (dashboard/index.html) is NOT clickable in email — use a hosted URL.
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://levijb.github.io/WorldCup2026/dashboard/tournament.html")


def now_et() -> datetime:
    return datetime.now(timezone.utc).astimezone(timezone(ET_OFFSET))


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def today_date_str() -> str:
    return now_et().strftime("%Y-%m-%d")


def implied_prob(american_odds: int) -> float:
    """Convert American odds integer to implied probability (0.0–1.0)."""
    if american_odds > 0:
        return 100 / (american_odds + 100)
    else:
        return (-american_odds) / (-american_odds + 100)


# ── Data Fetchers ─────────────────────────────────────────────────────────────

def fetch_odds() -> dict:
    """Fetch live DraftKings odds for WC 2026 from The Odds API."""
    try:
        url = "https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/"
        params = {
            "apiKey": ODDS_API_KEY,
            "regions": "us",
            "markets": "h2h,totals,spreads",
            "oddsFormat": "american",
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        quota_remaining = resp.headers.get("x-requests-remaining", "unknown")
        quota_used = resp.headers.get("x-requests-used", "unknown")
        return {
            "data": resp.json(),
            "quota_remaining": quota_remaining,
            "quota_used": quota_used,
            "fetched_at": now_utc().isoformat(),
        }
    except requests.RequestException as e:
        print(f"[WARN] Odds API fetch failed: {e}", file=sys.stderr)
        return {"data": [], "quota_remaining": "unknown", "quota_used": "unknown", "fetched_at": now_utc().isoformat(), "error": str(e)}


def fetch_fixtures_today() -> list:
    """Derive today's WC fixtures from the odds cache.
    API-Sports free tier doesn't cover 2026 season data, so we use
    the already-fetched Odds API cache which has home_team, away_team,
    and commence_time for every match."""
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


def fetch_fixtures_tomorrow() -> list:
    """Derive tomorrow's WC fixtures from the odds cache. Capped at 8 matches."""
    try:
        cache = json.loads(ODDS_CACHE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    tomorrow_et = now_et().date() + timedelta(days=1)
    fixtures = []
    for match in cache.get("matches", []):
        try:
            commence = match["commence_time"]
            kickoff_dt = datetime.fromisoformat(commence.replace("Z", "+00:00"))
            if kickoff_dt.astimezone(timezone(ET_OFFSET)).date() != tomorrow_et:
                continue
            fixtures.append({
                "home_team": match["home_team"],
                "away_team": match["away_team"],
                "commence_time": commence,
            })
        except (KeyError, ValueError):
            continue
    return fixtures[:8]


def fetch_recent_results_via_search(client) -> str:
    """Search for recent WC 2026 match results via web search."""
    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=600,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{
                "role": "user",
                "content": (
                    "Search for World Cup 2026 match results from the last 2 days. "
                    "Return completed match results as bullet points, each prefixed with the match date. "
                    "Format: 'YYYY-MM-DD: Team A score-score Team B (Group X)'. "
                    "Separate yesterday's matches from the day before — label each day clearly. No commentary."
                ),
            }],
        )
        text_parts = [b.text for b in resp.content if hasattr(b, "text")]
        return "\n".join(text_parts) if text_parts else "  No recent results found."
    except Exception as e:
        print(f"[WARN] Recent results search failed: {e}", file=sys.stderr)
        return f"  (recent results unavailable: {e})"


def fetch_injuries() -> list:
    """Fetch live injury list for WC 2026."""
    try:
        url = "https://v3.football.api-sports.io/injuries"
        headers = {"x-apisports-key": API_SPORTS_KEY}
        params = {"league": 1, "season": 2026}
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("response", [])
    except requests.RequestException as e:
        print(f"[WARN] API-Sports injuries fetch failed: {e}", file=sys.stderr)
        return []


def fetch_news_via_claude(client, today_str: str) -> str:
    """Search for match-relevant WC news: injuries, lineups, suspensions."""
    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=1000,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{
                "role": "user",
                "content": (
                    f"Search for: '{today_str} World Cup 2026 news injuries lineup team form'. "
                    "Return a concise bullet-point summary focused on match-relevant news: "
                    "injuries, suspensions, confirmed lineups, and form heading into today's matches."
                ),
            }],
        )
        text_parts = [b.text for b in resp.content if hasattr(b, "text")]
        return "\n".join(text_parts) if text_parts else "(no news retrieved)"
    except Exception as e:
        print(f"[WARN] News search failed: {e}", file=sys.stderr)
        return f"(news search unavailable: {e})"


def fetch_atmosphere_via_claude(client, today_str: str) -> str:
    """Search for WC color stories, atmosphere, and tournament narrative beyond match results."""
    try:
        resp = client.messages.create(
            model=MODEL,
            max_tokens=800,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{
                "role": "user",
                "content": (
                    f"Search for: 'World Cup 2026 stories atmosphere fans goals moments {today_str}'. "
                    "Return 3-5 bullet points covering: crowd atmosphere, VAR controversies, "
                    "surprising performances, player milestones, human interest angles, "
                    "memorable goals, coach quotes, venue conditions. "
                    "No match result summaries — only color and narrative."
                ),
            }],
        )
        text_parts = [b.text for b in resp.content if hasattr(b, "text")]
        return "\n".join(text_parts) if text_parts else "(no atmosphere stories retrieved)"
    except Exception as e:
        print(f"[WARN] Atmosphere search failed: {e}", file=sys.stderr)
        return f"(atmosphere search unavailable: {e})"


# ── Odds Cache ─────────────────────────────────────────────────────────────────

def load_odds_cache() -> dict:
    if ODDS_CACHE_PATH.exists():
        try:
            return json.loads(ODDS_CACHE_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"last_updated": None, "matches": []}


def save_odds_cache(odds_data: list) -> None:
    cache = {
        "last_updated": now_utc().isoformat(),
        "matches": odds_data,
    }
    ODDS_CACHE_PATH.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def compute_line_movements(current_odds: list, previous_cache: dict) -> str:
    """Compare current odds to yesterday's cache and describe notable movements."""
    prev_matches = {m.get("id"): m for m in previous_cache.get("matches", [])}
    movements = []
    for match in current_odds:
        match_id = match.get("id")
        home = match.get("home_team", "")
        away = match.get("away_team", "")
        prev = prev_matches.get(match_id)
        if not prev:
            continue
        for bm in match.get("bookmakers", []):
            if bm.get("key") != "draftkings":
                continue
            for mkt in bm.get("markets", []):
                if mkt.get("key") != "h2h":
                    continue
                cur_outcomes = {o["name"]: o["price"] for o in mkt.get("outcomes", [])}
                prev_bm = next((b for b in prev.get("bookmakers", []) if b.get("key") == "draftkings"), None)
                if not prev_bm:
                    continue
                prev_mkt = next((m for m in prev_bm.get("markets", []) if m.get("key") == "h2h"), None)
                if not prev_mkt:
                    continue
                prev_outcomes = {o["name"]: o["price"] for o in prev_mkt.get("outcomes", [])}
                for team, cur_price in cur_outcomes.items():
                    prev_price = prev_outcomes.get(team)
                    if prev_price is None:
                        continue
                    movement = cur_price - prev_price
                    if abs(movement) >= 15:
                        direction = "shortened" if movement < 0 else "drifted"
                        movements.append(
                            f"  • {home} vs {away}: {team} {direction} from {prev_price:+d} to {cur_price:+d} ({movement:+d})"
                        )
    if not movements:
        return "  No significant line movements vs yesterday's cache."
    return "\n".join(movements)


# ── Prompt Builder ─────────────────────────────────────────────────────────────

def build_static_context() -> str:
    """Static context block: never changes run to run (good candidate for caching)."""
    return """## STATIC CONTEXT (Pre-tournament baselines — loaded from system)

The Opta model win probabilities, pre-tournament odds snapshot, and key intelligence items
are detailed in the system prompt. Reference them for all baseline assessments.

Key sharp-money pre-tournament read:
- Spain and France: smart money handle far exceeds ticket share at current prices
- USA: massive public interest in home WC; expect significant overpricing throughout
- Brazil and Argentina: fade at current prices given underlying form
- Norway/Colombia/Japan/Morocco: value relative to Opta probabilities"""


def build_dynamic_content(
    today_str: str,
    fixtures: list,
    fixtures_tomorrow: list,
    recent_results: str,
    odds_result: dict,
    injuries: list,
    news: str,
    around_the_tournament: str,
    line_movements: str,
) -> str:
    """Dynamic content block: today's data — never cache this."""
    et_now = now_et().strftime("%Y-%m-%d %H:%M ET")

    # Format today's fixtures with multi-timezone kickoff times
    def _fmt_kickoff(kickoff_dt: datetime) -> str:
        def _t(hours_offset: int, label: str) -> str:
            t = kickoff_dt.astimezone(timezone(timedelta(hours=hours_offset)))
            return t.strftime("%I:%M %p").lstrip("0") + f" {label}"
        return f"{_t(-4, 'ET')} | {_t(-5, 'CT')} | {_t(-7, 'PT')} | {_t(1, 'BST')}"

    fixture_lines = []
    for f in fixtures:
        try:
            home = f["teams"]["home"]["name"]
            away = f["teams"]["away"]["name"]
            kickoff_utc = f["fixture"]["date"]
            kickoff_dt = datetime.fromisoformat(kickoff_utc.replace("Z", "+00:00"))
            times = _fmt_kickoff(kickoff_dt)
            venue = f["fixture"].get("venue", {}).get("name", "TBD")
            city = f["fixture"].get("venue", {}).get("city", "")
            fixture_lines.append(f"  • {home} vs {away} | {times} | {venue}, {city}")
        except (KeyError, ValueError):
            fixture_lines.append(f"  • {f}")
    fixtures_text = "\n".join(fixture_lines) if fixture_lines else "  No fixtures found for today."

    results_text = recent_results if recent_results else "  No recent results."

    # Format DraftKings odds with implied probabilities
    odds_lines = []
    for match in odds_result.get("data", []):
        home = match.get("home_team", "")
        away = match.get("away_team", "")
        for bm in match.get("bookmakers", []):
            if bm.get("key") != "draftkings":
                continue
            markets_text = []
            for mkt in bm.get("markets", []):
                key = mkt.get("key")
                outcomes = mkt.get("outcomes", [])
                if key == "h2h":
                    parts = []
                    for o in outcomes:
                        price = o["price"]
                        imp = implied_prob(int(price))
                        parts.append(f"{o['name']} {price:+d} ({imp:.1%})")
                    markets_text.append(f"H2H: {' | '.join(parts)}")
                elif key == "totals":
                    for o in outcomes:
                        imp = implied_prob(int(o["price"]))
                        markets_text.append(f"Total {o.get('point', '')} {o['name']} {o['price']:+d} ({imp:.1%})")
            if markets_text:
                odds_lines.append(f"  {home} vs {away}:\n    " + "\n    ".join(markets_text))
    odds_text = "\n".join(odds_lines) if odds_lines else "  No DraftKings odds available."

    # Format injuries
    inj_lines = []
    for inj in injuries[:30]:  # cap at 30 entries for prompt length
        try:
            player = inj["player"]["name"]
            team = inj["team"]["name"]
            reason = inj.get("injury", {}).get("reason", "unknown")
            inj_lines.append(f"  • {player} ({team}): {reason}")
        except (KeyError, TypeError):
            pass
    injuries_text = "\n".join(inj_lines) if inj_lines else "  No injury data available."

    # Format tomorrow's slate
    tomorrow_lines = []
    for f in fixtures_tomorrow:
        try:
            kickoff_dt = datetime.fromisoformat(f["commence_time"].replace("Z", "+00:00"))
            kickoff_et = kickoff_dt.astimezone(timezone(ET_OFFSET))
            time_str = kickoff_et.strftime("%I:%M %p").lstrip("0") + " ET"
            tomorrow_lines.append(f"  {time_str} — {f['home_team']} vs {f['away_team']}")
        except (KeyError, ValueError):
            continue
    tomorrow_text = "\n".join(tomorrow_lines) if tomorrow_lines else "  No matches scheduled for tomorrow."

    return f"""## LIVE DATA — {et_now}

### Today's Fixtures ({today_str})
{fixtures_text}

### Results (Last 2 Days — dated)
{results_text}

### Tomorrow's Fixtures
{tomorrow_text}

### Current DraftKings Odds
{odds_text}

Odds quota remaining: {odds_result.get('quota_remaining', 'unknown')}

### Line Movements vs Yesterday
{line_movements}

### Injury Report
{injuries_text}

### Today's News & Intelligence
{news}

### Around the Tournament (Color & Stories)
{around_the_tournament}

---

## REQUEST

Produce the full morning briefing report in this exact order:

1. **TOURNAMENT STATUS** — Current day/round, matches played, standings snapshot if relevant. 3–5 lines max.

2. **RESULTS** — Completed matches from the last two days. You MUST split them into two dated subsections and never combine them under one header:
   - **Yesterday — [Weekday, Month D]** — matches played the day before today
   - **Two Days Ago — [Weekday, Month D]** — matches played two days before today
   - One bullet per match: score, group, one-sentence note if significant.
   - Assign each match using the date in the provided results data. Do NOT output a single "YESTERDAY'S RESULTS" heading containing both days.
   - If a subsection has no matches, write "No matches." under it. If nothing has been played at all: "No matches played yet."

3. **TODAY'S MATCHES** — One paragraph per match (4–5 sentences). Kickoff time ET, venue, tactical setup, key injuries, one betting angle sentence. Today's matches only.

4. **NEWS & INJURIES** — 3–5 bullets, one line each. Only items relevant to today's matches.

5. **BET RECOMMENDATIONS** — 3–5 bets using the exact structured format from the system prompt. Do not include a MODEL EDGE line or any model/edge-percentage field — the allowed fields are BET, ODDS, EDGE REASONING, RISK LEVEL, RECOMMENDED STAKE, KEY RISK FACTORS only. Evaluate ALL matches in the Today's Fixtures list above for bet angles — including any late-night (midnight–3 AM ET) kickoffs. Do not skip or dismiss any match without specific analysis.

6. **AROUND THE TOURNAMENT** — 3–5 bullets on general WC atmosphere, color stories, and tournament narrative beyond today's matches. One line per bullet, two at most. No odds, no bet angles.

7. **PARLAYS** — 3–4 parlays, 2 sentences each, max 3 legs per parlay. Legs on separate matches or clearly correlated.

8. **SHARP MONEY** — 3 bullets max, or "Nothing notable."

9. **TOMORROW'S SLATE** — Use the fixture data provided above. One markdown bullet per match, each on its own line:
   "- HH:MM ET — Home vs Away"
   No analysis, no odds. Do not combine matches onto a single line.

Use specific American odds numbers. If no strong plays exist, say so explicitly.
"""


# ── WC Odds Caching ───────────────────────────────────────────────────────────

def cache_upcoming_wc_odds() -> None:
    """Cache Pinnacle pre-match odds for WC matches in the next 3 days.

    Requires STATS_API_KEY. Silently skips if the key is absent or if the
    import fails. Never raises — a caching failure must not block the report.
    """
    if not os.getenv("STATS_API_KEY", ""):
        return
    try:
        import sys as _sys
        _sys.path.insert(0, str(ROOT / "model"))
        from data_collector import pull_wc_prematch_odds  # noqa: PLC0415
        result = pull_wc_prematch_odds(resume=True, lookahead_days=3)
        if result.get("saved"):
            print(f"[ODDS CACHE] Saved {result['saved']} Pinnacle odds file(s) for upcoming WC matches")
    except Exception as e:
        print(f"[WARN] WC odds caching skipped: {e}", file=sys.stderr)


# ── Claude API ─────────────────────────────────────────────────────────────────

def call_claude(system_prompt: str, static_context: str, dynamic_content: str) -> str:
    """Call Claude with prompt caching on system prompt and static context."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=MODEL,
            max_tokens=4000,
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
                            "text": dynamic_content,
                        },
                    ],
                }
            ],
        )
        return response.content[0].text
    except Exception as e:
        print(f"[ERROR] Claude API call failed: {e}", file=sys.stderr)
        raise


# ── Report Saving ─────────────────────────────────────────────────────────────

def save_report(report_text: str, today_str: str, quota_remaining: str) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"{today_str}_morning_report.md"
    generated_at = now_et().strftime("%Y-%m-%d %H:%M ET")
    header = (
        f"# WC2026 Morning Report — {today_str}\n\n"
        f"_Generated: {generated_at} | API quota remaining: {quota_remaining}_\n\n"
        f"[📊 Open the live dashboard →]({DASHBOARD_URL})\n\n"
        f"---\n\n"
    )
    report_path.write_text(header + report_text, encoding="utf-8")
    print(f"[OK] Report saved to {report_path}")
    return report_path


# ── Git Push ───────────────────────────────────────────────────────────────────

def git_commit_and_push(report_path: Path, today_str: str) -> None:
    try:
        # Only add the report file (safe — avoids accidentally staging secrets)
        result = subprocess.run(
            ["git", "status", "--porcelain", str(report_path)],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
        )
        if not result.stdout.strip():
            print("[INFO] No changes to commit for report file.")
            return
        subprocess.run(["git", "add", str(report_path)], cwd=str(ROOT), check=True)
        commit_msg = f"report: {today_str} morning briefing"
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=str(ROOT), check=True)
    except subprocess.CalledProcessError as e:
        print(f"[WARN] Git operation failed: {e}", file=sys.stderr)
        return

    branch = (
        subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=str(ROOT), capture_output=True, text=True,
        ).stdout.strip()
        or "main"
    )

    # The commit above is safe locally regardless of what happens below — push
    # collisions must never lose the report, only fail to publish it.
    for attempt in (1, 2):
        subprocess.run(["git", "fetch", "origin"], cwd=str(ROOT), check=True)
        behind = subprocess.run(
            ["git", "rev-list", "--count", f"HEAD..origin/{branch}"],
            cwd=str(ROOT), capture_output=True, text=True,
        )
        if int(behind.stdout.strip() or "0") > 0:
            print(f"[GIT] Local is behind origin/{branch}; rebasing before push.")
            rebase = subprocess.run(
                ["git", "pull", "--rebase", "origin", branch],
                cwd=str(ROOT), capture_output=True, text=True,
            )
            if rebase.returncode != 0:
                subprocess.run(["git", "rebase", "--abort"], cwd=str(ROOT))
                print(
                    f"[ERROR] Rebase conflict syncing with origin/{branch}. "
                    f"Report '{commit_msg}' was generated and committed locally but NOT "
                    f"pushed. Manual resolution required: git pull --rebase origin {branch}",
                    file=sys.stderr,
                )
                return
            print(f"[GIT] Rebase onto origin/{branch} succeeded.")

        push = subprocess.run(["git", "push"], cwd=str(ROOT), capture_output=True, text=True)
        if push.returncode == 0:
            print(f"[OK] Committed and pushed: {commit_msg}")
            return

        if attempt == 1:
            print(
                f"[GIT] Push rejected, retrying fetch/rebase/push once: {push.stderr.strip()}",
                file=sys.stderr,
            )
        else:
            print(
                f"[ERROR] Push failed after retry. Report '{commit_msg}' is committed "
                f"locally but NOT pushed to origin/{branch}: {push.stderr.strip()}",
                file=sys.stderr,
            )


# ── Email Sending ─────────────────────────────────────────────────────────────

def markdown_to_html(md_text: str) -> str:
    """Minimal markdown-to-HTML converter using inline styles — no external CSS."""
    import re
    lines = md_text.split("\n")
    html_lines = []
    bold_re = re.compile(r"\*\*(.+?)\*\*")
    bold_repl = r'<strong style="color:#ffffff">\1</strong>'
    link_re = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
    link_repl = r'<a href="\2" style="color:#58a6ff;text-decoration:none">\1</a>'

    def inline(s: str) -> str:
        return bold_re.sub(bold_repl, link_re.sub(link_repl, s))

    for line in lines:
        if line.startswith("### "):
            line = f'<h3 style="color:#e0e0e0;margin:16px 0 4px">{inline(line[4:])}</h3>'
        elif line.startswith("## "):
            line = f'<h2 style="color:#ffffff;margin:20px 0 6px;border-bottom:1px solid #333;padding-bottom:4px">{inline(line[3:])}</h2>'
        elif line.startswith("# "):
            line = f'<h1 style="color:#ffffff;margin:0 0 16px">{inline(line[2:])}</h1>'
        elif line.strip() == "---":
            line = '<hr style="border:none;border-top:1px solid #333;margin:16px 0">'
        elif line.startswith("- ") or line.startswith("• "):
            line = f'<li style="margin:2px 0">{inline(line[2:])}</li>'
        elif line.strip() == "":
            line = "<br>"
        else:
            line = f'<p style="margin:4px 0">{inline(line)}</p>'
        html_lines.append(line)

    body_content = "\n".join(html_lines)
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0f1117;color:#c0c0c0;font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:24px;line-height:1.6;font-size:15px">
{body_content}
<hr style="border:none;border-top:1px solid #333;margin:24px 0">
<p style="color:#555;font-size:12px">WorldCup2026 — automated morning briefing</p>
</body>
</html>"""


def send_emails(report_text: str, today_str: str) -> None:
    import smtplib
    import ssl
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    if not GMAIL_APP_PASSWORD:
        print("[WARN] GMAIL_APP_PASSWORD not set, skipping email.", file=sys.stderr)
        return
    if not GMAIL_FROM:
        print("[WARN] RESEND_TO_EMAIL (Gmail sender address) not set, skipping email.", file=sys.stderr)
        return

    try:
        subscribers = json.loads(SUBSCRIBERS_PATH.read_text(encoding="utf-8")).get("subscribers", [])
    except (json.JSONDecodeError, OSError) as e:
        print(f"[WARN] Could not load subscribers: {e}", file=sys.stderr)
        return

    active = [s for s in subscribers if s.get("active")]
    if not active:
        print("[INFO] No active subscribers.")
        return

    et_now = now_et()
    weekday = et_now.strftime("%A")
    date_display = et_now.strftime("%B %d").replace(" 0", " ").lstrip()
    subject = f"World Cup 2026 Morning Brief — {weekday} {date_display}"
    html_body = markdown_to_html(report_text)

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(GMAIL_FROM, GMAIL_APP_PASSWORD)
            for sub in active:
                to_email = sub.get("email", "")
                if not to_email or to_email == "REPLACE_WITH_YOUR_EMAIL":
                    print(f"[SKIP] Subscriber '{sub.get('name')}' has no valid email.")
                    continue
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = GMAIL_FROM
                    msg["To"] = to_email
                    msg.attach(MIMEText(html_body, "html"))
                    server.sendmail(GMAIL_FROM, to_email, msg.as_string())
                    print(f"[OK] Email sent to {to_email}")
                except smtplib.SMTPException as e:
                    print(f"[WARN] Email send failed for {to_email}: {e}", file=sys.stderr)
    except smtplib.SMTPAuthenticationError:
        print("[WARN] Gmail authentication failed — check GMAIL_APP_PASSWORD in .env", file=sys.stderr)
    except smtplib.SMTPException as e:
        print(f"[WARN] SMTP connection failed: {e}", file=sys.stderr)


# ── Send Saved Report ──────────────────────────────────────────────────────────

def send_saved_report(date_str: str) -> None:
    """Read an already-saved report from disk and send it. Does NOT regenerate."""
    report_path = REPORTS_DIR / f"{date_str}_morning_report.md"
    if not report_path.exists():
        print(f"[ERROR] No report found for {date_str} at {report_path}")
        print("[ERROR] Generate it first with: python agent/morning_report.py")
        sys.exit(1)
    report_text = report_path.read_text(encoding="utf-8")
    print(f"[SEND] Sending report from {report_path}")
    send_emails(report_text, date_str)


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="WC2026 Morning Report Generator")
    parser.add_argument("--no-email", action="store_true", help="(ignored) Email never auto-sends")
    parser.add_argument("--no-push", action="store_true", help="Skip git commit/push")
    parser.add_argument("--dry-run", action="store_true", help="Print prompt, skip Claude API call")
    parser.add_argument("--send-email", action="store_true", help="Send today's saved report (no regeneration)")
    parser.add_argument("--send-date", metavar="YYYY-MM-DD", help="Date of report to send (default: today)")
    args = parser.parse_args()

    if args.send_email:
        date_str = args.send_date if args.send_date else today_date_str()
        send_saved_report(date_str)
        return

    today_str = today_date_str()
    print(f"[START] Generating morning report for {today_str}")

    # 1. Load system prompt
    if not SYSTEM_PROMPT_PATH.exists():
        print("[ERROR] agent/system_prompt.md not found.", file=sys.stderr)
        sys.exit(1)
    system_prompt = SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")

    # 2. Fetch data that doesn't require Anthropic
    print("[FETCH] Odds...")
    odds_result = fetch_odds()

    print("[FETCH] Today's fixtures (from odds cache)...")
    fixtures = fetch_fixtures_today()
    fixtures_tomorrow = fetch_fixtures_tomorrow()

    print("[FETCH] Injuries...")
    injuries = fetch_injuries()

    # 3. Cache upcoming Pinnacle odds for the next 3 days (optional — requires STATS_API_KEY)
    cache_upcoming_wc_odds()

    # 4. Load yesterday's cache for line movement comparison
    previous_cache = load_odds_cache()
    line_movements = compute_line_movements(odds_result["data"], previous_cache)

    # 5. Web searches: recent results + news (share one Anthropic client)
    if not args.dry_run:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            print("[FETCH] Recent results via web search...")
            recent_results = fetch_recent_results_via_search(client)
            print("[FETCH] News via web search...")
            news = fetch_news_via_claude(client, today_str)
            print("[FETCH] Around the tournament via web search...")
            around_the_tournament = fetch_atmosphere_via_claude(client, today_str)
        except Exception as e:
            recent_results = f"(recent results unavailable: {e})"
            news = f"(news search unavailable: {e})"
            around_the_tournament = f"(atmosphere search unavailable: {e})"
    else:
        recent_results = "(recent results skipped in dry-run mode)"
        news = "(news search skipped in dry-run mode)"
        around_the_tournament = "(atmosphere search skipped in dry-run mode)"

    # 6. Build prompt
    static_context = build_static_context()
    dynamic_content = build_dynamic_content(
        today_str=today_str,
        fixtures=fixtures,
        fixtures_tomorrow=fixtures_tomorrow,
        recent_results=recent_results,
        odds_result=odds_result,
        injuries=injuries,
        news=news,
        around_the_tournament=around_the_tournament,
        line_movements=line_movements,
    )

    if args.dry_run:
        print("\n" + "=" * 60)
        print("SYSTEM PROMPT (first 500 chars):")
        print(system_prompt[:500])
        print("\n" + "=" * 60)
        print("STATIC CONTEXT:")
        print(static_context)
        print("\n" + "=" * 60)
        print("DYNAMIC CONTENT (first 2000 chars):")
        print(dynamic_content[:2000])
        print("=" * 60)
        print("[DRY RUN] Skipping Claude API call, report save, git push, and email.")
        return

    # 8. Call Claude
    print("[CLAUDE] Generating report...")
    report_text = call_claude(system_prompt, static_context, dynamic_content)

    # 9. Save odds cache (before saving report so quota is current)
    save_odds_cache(odds_result["data"])

    # 10. Save report
    quota_remaining = odds_result.get("quota_remaining", "unknown")
    report_path = save_report(report_text, today_str, quota_remaining)

    # 11. Git commit and push
    if not args.no_push:
        git_commit_and_push(report_path, today_str)

    print(f"[DONE] Report saved to {report_path}")
    print(f"[NEXT] Review and edit the file, then send with:")
    print(f"       python agent/morning_report.py --send-email")


if __name__ == "__main__":
    main()
