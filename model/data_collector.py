"""
data_collector.py — One-time bulk data pull from TheStatsAPI during trial period.

Run all phases during the 7-day trial. After that, daily operations use only
The Odds API and API-Sports — TheStatsAPI is NOT called in morning_report.py
or live_query.py, EXCEPT: pull_wc_prematch_odds() is called by morning_report.py
with a 3-day lookahead to progressively cache upcoming match Pinnacle odds.

Usage:
    python model/data_collector.py --teams-only     # pull team match history first
    python model/data_collector.py --players         # add player stats
    python model/data_collector.py --historical      # add 2018/2022 WC historical data
    python model/data_collector.py --wc-odds         # Pinnacle pre-match odds for WC 2026
    python model/data_collector.py --shotmaps        # shotmap data for matches with xG
    python model/data_collector.py --timelines       # event timelines for finished WC matches
    python model/data_collector.py --match-players   # per-match player stats
    python model/data_collector.py --resume          # skip already-cached files
    python model/data_collector.py --dry-run         # print plan, no API calls
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import warnings

import requests
from dotenv import load_dotenv
from tqdm import tqdm

warnings.filterwarnings("ignore", category=Warning, module="requests")

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
RAW_MATCHES_DIR        = ROOT / "data" / "raw" / "matches"
RAW_XG_DIR             = ROOT / "data" / "raw" / "xg"
RAW_PLAYERS_DIR        = ROOT / "data" / "raw" / "player_stats"
RAW_HISTORICAL_DIR     = ROOT / "data" / "raw" / "wc_historical"
RAW_WC_ODDS_DIR        = ROOT / "data" / "raw" / "wc_odds"
RAW_SHOTMAPS_DIR       = ROOT / "data" / "raw" / "shotmaps"
RAW_WC_TIMELINES_DIR   = ROOT / "data" / "raw" / "wc_timelines"
RAW_MATCH_PLAYERS_DIR  = ROOT / "data" / "raw" / "match_player_stats"
PROCESSED_DIR          = ROOT / "data" / "processed"
TEAM_ID_MAP_PATH       = PROCESSED_DIR / "team_id_map.json"

STATS_API_KEY  = os.getenv("STATS_API_KEY", "")
STATS_API_BASE = "https://api.thestatsapi.com/api"

# ── Confirmed WC 2026 IDs ──────────────────────────────────────────────────────
WC_COMPETITION_ID = "comp_6107"
WC_SEASON_ID      = "sn_118868"

# ── Confirmed Premier League season IDs (from API debug output) ───────────────
CLUB_SEASON_2425_ID = "sn_3057848"  # PL 2024/25 — most recent full season
CLUB_SEASON_2526_ID = "sn_6125938"  # PL 2025/26 — current season

# ── All 48 World Cup 2026 teams ────────────────────────────────────────────────
WC_2026_TEAMS = [
    # Group A
    "United States", "Panama", "Honduras", "Jamaica",
    # Group B
    "Mexico", "Ecuador", "Venezuela", "Bolivia",
    # Group C
    "Canada", "Uruguay", "Peru", "Chile",
    # Group D
    "Argentina", "Paraguay", "Colombia", "Costa Rica",
    # Group E
    "Brazil", "Trinidad and Tobago", "Suriname", "El Salvador",
    # Group F
    "Germany", "Austria", "Switzerland", "North Macedonia",
    # Group G
    "Spain", "Portugal", "Morocco", "Comoros",
    # Group H
    "France", "Belgium", "Tunisia", "Senegal",
    # Group I
    "England", "Netherlands", "Republic of Ireland", "Moldova",
    # Group J
    "Italy", "Croatia", "Albania", "Ukraine",
    # Group K
    "Norway", "Sweden", "Denmark", "Finland",
    # Group L
    "Japan", "South Korea", "Saudi Arabia", "Australia",
]


# ── Request helper ────────────────────────────────────────────────────────────
# Simple timestamp-based throttle: guarantees ≥0.6s between every request.

_last_request_time = 0.0


def stats_api_get(path: str, params: dict | None = None) -> dict:
    """GET to TheStatsAPI with minimum 0.6s gap and 429-retry logic."""
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < 0.6:
        time.sleep(0.6 - elapsed)
    _last_request_time = time.time()

    url = f"{STATS_API_BASE}{path}"
    headers = {"Authorization": f"Bearer {STATS_API_KEY}"}
    for attempt in range(3):
        resp = requests.get(url, headers=headers, params=params or {}, timeout=20)
        if resp.status_code == 429:
            if attempt < 2:
                print(f"  [WARN] 429 received, waiting 10s... (attempt {attempt + 1}/3)")
                time.sleep(10)
                continue
            resp.raise_for_status()
        resp.raise_for_status()
        return resp.json()
    return {}


def paginate_all(path: str, params: dict | None = None, max_pages: int = 10) -> list:
    """Fetch all pages for a paginated endpoint. Returns partial results on error."""
    all_results = []
    page = 1
    while page <= max_pages:
        p = {**(params or {}), "page": page}
        try:
            data = stats_api_get(path, p)
            results = data.get("data", [])
            all_results.extend(results)
            meta = data.get("meta", {})
            total_pages = int(meta.get("total_pages", 1))
            if page >= total_pages:
                break
            page += 1
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"  [WARN] paginate_all page {page} failed for {path!r}: {e}")
            break
    return all_results


# ── Phase 1: Build team ID map ─────────────────────────────────────────────────

def build_team_id_map(dry_run: bool = False) -> dict:
    """Search for each WC team by name and return name→ID mapping."""
    if TEAM_ID_MAP_PATH.exists():
        existing = json.loads(TEAM_ID_MAP_PATH.read_text(encoding="utf-8"))
        print(f"[INFO] Loaded existing team_id_map with {len(existing)} entries.")
        return existing

    print(f"\n[PHASE 0] Building team ID map for {len(WC_2026_TEAMS)} teams...")
    if dry_run:
        print("[DRY RUN] Would search for team IDs via GET /football/teams?search=<name>")
        return {}

    team_map = {}
    for team_name in tqdm(WC_2026_TEAMS, desc="Team ID lookup"):
        try:
            # Try alternate search term first for known problem names
            search_names = ["USA", "United States"] if team_name == "United States" else [team_name]
            teams = []
            for search_name in search_names:
                results = stats_api_get("/football/teams", {"search": search_name})
                teams = results.get("data", [])
                if teams:
                    break
            if teams:
                team_map[team_name] = teams[0].get("id") or teams[0].get("team_id")
            else:
                print(f"  [WARN] No result for: {team_name}")
        except requests.RequestException as e:
            print(f"  [ERROR] {team_name}: {e}")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    TEAM_ID_MAP_PATH.write_text(json.dumps(team_map, indent=2), encoding="utf-8")
    print(f"[OK] team_id_map.json saved ({len(team_map)} teams mapped)")
    return team_map


# ── Phase 2: Pull team match histories ────────────────────────────────────────

def pull_team_matches(team_map: dict, resume: bool = False, dry_run: bool = False) -> None:
    today = datetime.now(timezone.utc).date()
    from_date = (today - timedelta(days=365)).isoformat()
    to_date = today.isoformat()

    print(f"\n[PHASE 1] Pulling match history for {len(team_map)} teams ({from_date} to {to_date})...")

    if dry_run:
        total_est = len(team_map) * 30
        print(f"[DRY RUN] Would fetch ~{total_est} matches via GET /football/matches?team_id=<id>&from=&to=")
        print(f"  Estimated API calls: {len(team_map)} team queries + pagination")
        return

    RAW_MATCHES_DIR.mkdir(parents=True, exist_ok=True)
    match_ids_seen: set[str] = set()

    for team_name, team_id in tqdm(team_map.items(), desc="Team match histories"):
        if not team_id:
            continue
        try:
            matches = paginate_all(
                "/football/matches",
                {"team_id": team_id, "from": from_date, "to": to_date},
            )
            for match in matches:
                match_id = str(match.get("id") or match.get("match_id", ""))
                if not match_id or match_id in match_ids_seen:
                    continue
                match_ids_seen.add(match_id)
                out_path = RAW_MATCHES_DIR / f"{match_id}.json"
                if resume and out_path.exists():
                    continue
                out_path.write_text(json.dumps(match, indent=2), encoding="utf-8")
        except requests.RequestException as e:
            print(f"  [ERROR] Matches for {team_name}: {e}")

    print(f"[OK] Match history done. {len(list(RAW_MATCHES_DIR.glob('*.json')))} match files saved.")


# ── Phase 3: Pull xG for each match ──────────────────────────────────────────

def pull_xg_data(resume: bool = False, dry_run: bool = False) -> None:
    match_files = list(RAW_MATCHES_DIR.glob("*.json"))
    print(f"\n[PHASE 2] Checking xG availability for {len(match_files)} matches...")

    eligible = []
    for mf in match_files:
        try:
            match = json.loads(mf.read_text(encoding="utf-8"))
            if match.get("xg_available"):
                match_id = str(match.get("id") or match.get("match_id", ""))
                eligible.append(match_id)
        except (json.JSONDecodeError, OSError):
            pass

    print(f"  {len(eligible)} matches have xG available.")

    if dry_run:
        print(f"[DRY RUN] Would fetch xG for {len(eligible)} matches via GET /football/matches/<id>/stats")
        return

    RAW_XG_DIR.mkdir(parents=True, exist_ok=True)
    for match_id in tqdm(eligible, desc="xG data"):
        out_path = RAW_XG_DIR / f"{match_id}.json"
        if resume and out_path.exists():
            continue
        try:
            data = stats_api_get(f"/football/matches/{match_id}/stats")
            out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"  [ERROR] xG for match {match_id}: {e}")
            continue

    print(f"[OK] xG data done. {len(list(RAW_XG_DIR.glob('*.json')))} xG files saved.")


# ── Phase 4: Pull player stats (DEPRECATED) ───────────────────────────────────

def pull_player_stats(resume: bool = False, dry_run: bool = False) -> None:
    """DEPRECATED — season stats via player search has poor non-PL coverage.
    Use --match-players instead: it pulls per-match stats for every player
    in every cached match, giving full coverage with no search ambiguity.
    """
    print("\n[WARN] --players phase deprecated: use --match-players instead for better coverage")
    return


# ── Phase 5: Historical WC data ───────────────────────────────────────────────

def pull_historical_wc(resume: bool = False, dry_run: bool = False) -> None:
    print("\n[PHASE 4] Pulling 2018 and 2022 World Cup historical data...")

    if dry_run:
        print("[DRY RUN] Steps:")
        print(f"  1. GET /football/competitions/{WC_COMPETITION_ID}/seasons  →  find 2018/2022 season IDs")
        print(f"  2. GET /football/matches?competition_id={WC_COMPETITION_ID}&season_id=<id>")
        print("  3. GET /football/matches/<id>/stats for xG on each match")
        return

    RAW_HISTORICAL_DIR.mkdir(parents=True, exist_ok=True)

    # Find 2018/2022 season IDs for the WC competition (same comp, different seasons)
    try:
        seasons_data = stats_api_get(f"/football/competitions/{WC_COMPETITION_ID}/seasons")
        seasons = seasons_data.get("data", [])
        wc_seasons: dict[str, str] = {}
        for s in seasons:
            name = str(s.get("name", ""))
            sid = s.get("id") or s.get("season_id")
            for year in ("2018", "2022"):
                if year in name and sid:
                    wc_seasons[year] = str(sid)
        print(f"  Found historical WC season IDs: {wc_seasons}")
    except requests.RequestException as e:
        print(f"  [ERROR] Failed to fetch WC seasons: {e}")
        return

    for year, season_id in wc_seasons.items():
        try:
            matches = paginate_all(
                "/football/matches",
                {"competition_id": WC_COMPETITION_ID, "season_id": season_id},
            )
            print(f"  Found {len(matches)} matches for WC {year}")
            for match in tqdm(matches, desc=f"WC {year} matches"):
                match_id = str(match.get("id") or match.get("match_id", ""))
                if not match_id:
                    continue
                match_path = RAW_HISTORICAL_DIR / f"{year}_{match_id}.json"
                if not (resume and match_path.exists()):
                    match_path.write_text(json.dumps(match, indent=2), encoding="utf-8")

                if match.get("xg_available"):
                    xg_path = RAW_HISTORICAL_DIR / f"{year}_{match_id}_xg.json"
                    if not (resume and xg_path.exists()):
                        try:
                            xg_data = stats_api_get(f"/football/matches/{match_id}/stats")
                            xg_path.write_text(json.dumps(xg_data, indent=2), encoding="utf-8")
                        except KeyboardInterrupt:
                            raise
                        except Exception:
                            pass  # xG is best-effort; skip silently
        except requests.RequestException as e:
            print(f"  [ERROR] WC {year} pull failed: {e}")

    print(f"[OK] Historical data done. {len(list(RAW_HISTORICAL_DIR.glob('*.json')))} files saved.")


# ── Phase 6: WC 2026 pre-match odds (Pinnacle) ───────────────────────────────

def _parse_match_date(match: dict):
    """Return a date object from a match record, or None if unparseable."""
    raw = (
        match.get("date")
        or match.get("utc_date")
        or match.get("match_date")
        or match.get("kickoff")
        or match.get("datetime")
    )
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).date()
    except (ValueError, TypeError):
        return None


def pull_wc_prematch_odds(
    resume: bool = False,
    dry_run: bool = False,
    lookahead_days: int = 7,
) -> dict:
    """Fetch Pinnacle pre-match odds for WC fixtures within the lookahead window.

    Only requests odds for matches where the date is within the next
    `lookahead_days` days, or where status is 'live' or 'finished'.
    Pinnacle only publishes odds once a match is close; future fixtures
    silently return nothing. Run daily (or call from morning_report.py)
    to accumulate odds incrementally.

    Returns {"saved": N, "skipped": M}.
    """
    print(f"\n[PHASE 5] Pulling Pinnacle pre-match odds (lookahead={lookahead_days}d)...")
    print(f"  competition_id={WC_COMPETITION_ID}, season_id={WC_SEASON_ID}")

    if dry_run:
        print("[DRY RUN] Steps:")
        print(f"  1. GET /football/matches?competition_id={WC_COMPETITION_ID}&season_id={WC_SEASON_ID}&per_page=100")
        print(f"  2. Filter to matches within {lookahead_days}d or status=live/finished")
        print(f"  3. GET /football/matches/<match_id>/odds for each eligible fixture")
        print(f"  Save to data/raw/wc_odds/<match_id>.json")
        return {"saved": 0, "skipped": 0}

    RAW_WC_ODDS_DIR.mkdir(parents=True, exist_ok=True)

    try:
        all_matches = paginate_all(
            "/football/matches",
            {"competition_id": WC_COMPETITION_ID, "season_id": WC_SEASON_ID, "per_page": 100},
        )
        print(f"  Found {len(all_matches)} WC 2026 fixtures total")
    except Exception as e:
        print(f"  [ERROR] Failed to fetch WC fixtures: {e}")
        return {"saved": 0, "skipped": 0}

    today = datetime.now(timezone.utc).date()
    cutoff = today + timedelta(days=lookahead_days)

    saved = 0
    skipped = 0

    for match in tqdm(all_matches, desc="WC prematch odds"):
        match_id = str(match.get("id") or match.get("match_id", ""))
        if not match_id:
            continue

        out_path = RAW_WC_ODDS_DIR / f"{match_id}.json"
        if resume and out_path.exists():
            continue

        status = str(match.get("status", "")).lower()
        match_date = _parse_match_date(match)

        # Skip matches outside the lookahead window that aren't live/finished.
        # Pinnacle won't have odds for them yet; 404s waste quota.
        in_window = match_date is not None and today <= match_date <= cutoff
        is_active = status in ("live", "finished", "in_play", "halftime")
        if not in_window and not is_active:
            skipped += 1
            continue

        try:
            odds_data = stats_api_get(f"/football/matches/{match_id}/odds")
            out_path.write_text(json.dumps(odds_data, indent=2), encoding="utf-8")
            saved += 1
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"  [ERROR] Odds for {match_id}: {e}")
            continue

    print(f"[OK] WC pre-match odds: {saved} saved, {skipped} skipped (outside {lookahead_days}d window)")
    return {"saved": saved, "skipped": skipped}


# ── Phase 7: Shotmaps ─────────────────────────────────────────────────────────

def pull_shotmaps(dry_run: bool = False) -> None:
    match_files = list(RAW_MATCHES_DIR.glob("*.json"))
    eligible = []
    for mf in match_files:
        try:
            match = json.loads(mf.read_text(encoding="utf-8"))
            if match.get("xg_available"):
                match_id = str(match.get("id") or match.get("match_id", ""))
                if match_id:
                    eligible.append(match_id)
        except (json.JSONDecodeError, OSError):
            pass

    print(f"\n[PHASE 6] Pulling shotmaps for {len(eligible)} matches (xg_available=true)...")

    if dry_run:
        print(f"[DRY RUN] Would fetch {len(eligible)} shotmaps via GET /football/matches/<id>/shotmap")
        return

    RAW_SHOTMAPS_DIR.mkdir(parents=True, exist_ok=True)
    for match_id in tqdm(eligible, desc="Shotmaps"):
        out_path = RAW_SHOTMAPS_DIR / f"{match_id}.json"
        if out_path.exists():  # always resume-safe: skip if already fetched
            continue
        try:
            data = stats_api_get(f"/football/matches/{match_id}/shotmap")
            out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"  [ERROR] Shotmap for {match_id}: {e}")
            continue

    print(f"[OK] Shotmaps done. {len(list(RAW_SHOTMAPS_DIR.glob('*.json')))} files saved.")


# ── Phase 8: WC 2026 event timelines ─────────────────────────────────────────

def pull_wc_timelines(resume: bool = False, dry_run: bool = False) -> None:
    print("\n[PHASE 7] Pulling event timelines for finished WC 2026 matches...")

    if dry_run:
        print("[DRY RUN] Steps:")
        print(f"  1. GET /football/matches?competition_id={WC_COMPETITION_ID}&season_id={WC_SEASON_ID}&per_page=100  (paginate)")
        print("  2. Filter for status='finished'")
        print("  3. GET /football/matches/<id>/timeline  for each finished match")
        print("  Save to data/raw/wc_timelines/<match_id>.json")
        return

    RAW_WC_TIMELINES_DIR.mkdir(parents=True, exist_ok=True)

    try:
        all_matches = paginate_all(
            "/football/matches",
            {"competition_id": WC_COMPETITION_ID, "season_id": WC_SEASON_ID, "per_page": 100},
        )
        finished = [m for m in all_matches if str(m.get("status", "")).lower() == "finished"]
        print(f"  {len(finished)} finished WC matches (of {len(all_matches)} total)")
    except requests.RequestException as e:
        print(f"  [ERROR] Failed to fetch WC matches: {e}")
        return

    for match in tqdm(finished, desc="WC timelines"):
        match_id = str(match.get("id") or match.get("match_id", ""))
        if not match_id:
            continue
        out_path = RAW_WC_TIMELINES_DIR / f"{match_id}.json"
        if resume and out_path.exists():
            continue
        try:
            data = stats_api_get(f"/football/matches/{match_id}/timeline")
            out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"  [ERROR] Timeline for {match_id}: {e}")
            continue

    print(f"[OK] WC timelines done. {len(list(RAW_WC_TIMELINES_DIR.glob('*.json')))} files saved.")


# ── Phase 9: Player stats via lineup discovery ────────────────────────────────

def pull_match_player_stats(resume: bool = False, dry_run: bool = False) -> None:
    """
    Phase 1: Pull lineups from all cached matches to discover unique player IDs.
    Phase 2: Fetch WC 2026 season stats for each discovered player.

    TheStatsAPI has no per-match player stats endpoint at the trial tier.
    Lineups (GET /football/matches/{id}/lineups) give player IDs; we then fetch
    each player's WC season totals (goals/assists/shots/minutes) which are more
    predictive for WC props than club-season form anyway.

    Output: data/raw/match_player_stats/{player_id}.json (one file per player).
    """
    match_files = list(RAW_MATCHES_DIR.glob("*.json"))
    print(f"\n[PHASE 8] Pulling WC player stats (lineup discovery -> WC season stats)...")
    print(f"  {len(match_files)} match files to scan for player IDs")

    if dry_run:
        print(f"[DRY RUN] Would:")
        print(f"  1. GET /football/matches/<id>/lineups for {len(match_files)} matches -> extract player IDs")
        print(f"  2. GET /football/players/<id>/stats?season_id={WC_SEASON_ID} for each unique player")
        return

    # One-time cleanup: delete stale stats_pending files left by the deprecated --players phase.
    stale_deleted = 0
    for stale in RAW_PLAYERS_DIR.glob("*.json"):
        try:
            if json.loads(stale.read_text(encoding="utf-8")).get("stats_pending"):
                stale.unlink()
                stale_deleted += 1
        except (json.JSONDecodeError, OSError):
            pass
    if stale_deleted:
        print(f"  [CLEANUP] Deleted {stale_deleted} stale stats_pending file(s) from data/raw/player_stats/")

    RAW_MATCH_PLAYERS_DIR.mkdir(parents=True, exist_ok=True)

    # Phase 1: collect unique player IDs from lineups
    print("  Phase 1: Fetching lineups to discover player IDs...")
    player_ids: dict = {}  # player_id → name
    for mf in tqdm(match_files, desc="Lineups"):
        try:
            match = json.loads(mf.read_text(encoding="utf-8"))
            match_id = str(match.get("id") or match.get("match_id", ""))
            if not match_id:
                continue
            data = stats_api_get(f"/football/matches/{match_id}/lineups")
            d = data.get("data", {})
            for side in ["home", "away"]:
                for group in ["starting_xi", "bench"]:
                    for p in d.get(side, {}).get(group, []):
                        pid = str(p.get("id") or "")
                        name = str(p.get("name") or pid)
                        if pid:
                            player_ids[pid] = name
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"  [ERROR] Lineups for {mf.stem}: {e}")
            continue

    print(f"  Found {len(player_ids)} unique players across all matches")

    # Phase 2: fetch WC 2026 season stats for each discovered player
    print(f"  Phase 2: Fetching WC 2026 season stats (season_id={WC_SEASON_ID})...")
    saved = 0
    skipped = 0
    for pid, name in tqdm(player_ids.items(), desc="Player WC stats"):
        out_path = RAW_MATCH_PLAYERS_DIR / f"{pid}.json"
        if resume and out_path.exists():
            skipped += 1
            continue
        try:
            data = stats_api_get(f"/football/players/{pid}/stats", {"season_id": WC_SEASON_ID})
            out_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
            saved += 1
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"  [ERROR] WC stats for {name} ({pid}): {e}")
            continue

    total = len(list(RAW_MATCH_PLAYERS_DIR.glob("*.json")))
    print(f"[OK] Player WC stats done. {saved} saved, {skipped} skipped (resume). {total} total files.")


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="WC2026 Bulk Data Collector (TheStatsAPI — trial only)")
    parser.add_argument("--teams-only",    action="store_true", help="Pull team match history + xG")
    parser.add_argument("--players",       action="store_true", help="[DEPRECATED] Season stats via search — use --match-players instead")
    parser.add_argument("--historical",    action="store_true", help="Pull 2018/2022 WC historical data")
    parser.add_argument("--wc-odds",       action="store_true", help="Pull Pinnacle pre-match odds for WC 2026")
    parser.add_argument("--shotmaps",      action="store_true", help="Pull shotmap data for xG matches")
    parser.add_argument("--timelines",     action="store_true", help="Pull event timelines for finished WC matches")
    parser.add_argument("--match-players", action="store_true", help="Pull per-match player stats")
    parser.add_argument("--resume",        action="store_true", help="Skip already-cached files")
    parser.add_argument("--dry-run",       action="store_true", help="Print fetch plan without calling API")
    args = parser.parse_args()

    if not STATS_API_KEY and not args.dry_run:
        print("[ERROR] STATS_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    any_flag = args.teams_only or args.players or args.historical or args.wc_odds or args.shotmaps or args.timelines or args.match_players
    run_all          = not any_flag
    run_teams        = run_all or args.teams_only
    run_players      = run_all or args.players
    run_historical   = run_all or args.historical
    run_wc_odds      = run_all or args.wc_odds
    run_shotmaps     = run_all or args.shotmaps
    run_timelines    = run_all or args.timelines
    run_match_players = run_all or args.match_players

    if args.dry_run:
        print("=" * 60)
        print("DRY RUN — Fetch Plan")
        print("=" * 60)
        print(f"Teams:       {len(WC_2026_TEAMS)}")
        print(f"WC IDs:      competition={WC_COMPETITION_ID}, season={WC_SEASON_ID}")
        print(f"PL season:   2024/25={CLUB_SEASON_2425_ID}, 2025/26={CLUB_SEASON_2526_ID}")
        print(f"Phases:      teams={run_teams}, players={run_players}, historical={run_historical}")
        print(f"             wc_odds={run_wc_odds}, shotmaps={run_shotmaps}, timelines={run_timelines}")
        print(f"             match_players={run_match_players}")
        print()

    # Always build team map first (needed for match pulls)
    team_map = build_team_id_map(dry_run=args.dry_run)

    if run_teams:
        pull_team_matches(team_map, resume=args.resume, dry_run=args.dry_run)
        if not args.dry_run:
            pull_xg_data(resume=args.resume, dry_run=args.dry_run)

    if run_players:
        pull_player_stats(resume=args.resume, dry_run=args.dry_run)

    if run_historical:
        pull_historical_wc(resume=args.resume, dry_run=args.dry_run)

    if run_wc_odds:
        pull_wc_prematch_odds(resume=args.resume, dry_run=args.dry_run, lookahead_days=7)

    if run_shotmaps:
        pull_shotmaps(dry_run=args.dry_run)

    if run_timelines:
        pull_wc_timelines(resume=args.resume, dry_run=args.dry_run)

    if run_match_players:
        pull_match_player_stats(resume=args.resume, dry_run=args.dry_run)

    if args.dry_run:
        print("\n[DRY RUN COMPLETE] No API calls made.")
    else:
        print("\n[DONE] Data collection complete.")
        print(f"  Matches:       {len(list(RAW_MATCHES_DIR.glob('*.json')))}")
        print(f"  xG:            {len(list(RAW_XG_DIR.glob('*.json')))}")
        print(f"  Players:       {len(list(RAW_PLAYERS_DIR.glob('*.json')))}")
        print(f"  History:       {len(list(RAW_HISTORICAL_DIR.glob('*.json')))}")
        print(f"  WC odds:       {len(list(RAW_WC_ODDS_DIR.glob('*.json')))}")
        print(f"  Shotmaps:      {len(list(RAW_SHOTMAPS_DIR.glob('*.json')))}")
        print(f"  Timelines:     {len(list(RAW_WC_TIMELINES_DIR.glob('*.json')))}")
        print(f"  Match players: {len(list(RAW_MATCH_PLAYERS_DIR.glob('*.json')))}")


if __name__ == "__main__":
    main()
