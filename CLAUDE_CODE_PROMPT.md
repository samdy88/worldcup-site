# WorldCup2026 — Claude Code Master Build Prompt

## Context
You are building a FIFA World Cup 2026 betting intelligence system called WorldCup2026. The project is a personal tool for daily betting analysis, live odds tracking, and morning briefing reports during the 2026 World Cup (June 11 – July 19, 2026). The user bets small stakes ($1–20 straight bets, $1–5 parlays) on DraftKings and wants sharp, data-driven analysis.

This is a private GitHub repository already created at github.com/[USERNAME]/WorldCup2026. The following foundation files already exist in the repo — do not overwrite them:
- `.gitignore`
- `.env.example`
- `requirements.txt`
- `data/bets.json`
- `data/subscribers.json`
- `data/odds_cache.json`

A `.env` file exists locally (gitignored) with these keys already set:
- `THE_ODDS_API_KEY` — The Odds API (live DraftKings odds)
- `API_SPORTS_KEY` — API-Sports (scores, injuries, standings)
- `ANTHROPIC_API_KEY` — Claude API (claude-sonnet-4-20250514)
- `RESEND_API_KEY` — Resend email service
- `RESEND_TO_EMAIL` — personal test email address
- `STATS_API_KEY` — TheStatsAPI (xG, player stats, historical match data)

---

## Conventions (follow these strictly throughout)

- **Python version:** 3.12.1
- **File naming:** `snake_case.py` for Python, `kebab-case.html` for frontend
- **Python style:** type hints on all functions, `snake_case` functions, `PascalCase` classes, `ALL_CAPS` constants
- **JSON keys:** `snake_case` throughout
- **Report filenames:** `YYYY-MM-DD_morning_report.md` saved to `reports/`
- **Bet IDs:** `BET-YYYYMMDD-001` format (date + zero-padded daily sequence)
- **Odds format:** store both decimal (2.10) and American (+110) in all data
- **Model:** always use `claude-sonnet-4-20250514` for all Anthropic API calls
- **Error handling:** all API calls wrapped in try/except with informative error messages and graceful fallbacks
- **Env loading:** always use `python-dotenv` with `load_dotenv()` at module top

---

## Build Order

Work through these in sequence. Complete and verify each step before moving to the next. After each major file is created, confirm it runs without errors.

---

### STEP 1 — agent/system_prompt.md

Create `agent/system_prompt.md`. This is the persistent system prompt injected into every Claude API call. It must include:

- Role definition: elite sports betting strategist specializing in FIFA World Cup wagering
- Tournament context: 48-team format, 12 groups, top 2 + 8 best 3rd-place advance to Round of 32, June 11–July 19 2026, hosted USA/Mexico/Canada
- The full Opta model probabilities (baked in as permanent reference):
  - Spain 16.1%, France 13.0%, England 11.2%, Argentina 10.4%, Portugal 7.0%, Brazil 6.6%, Germany 5.1%, Netherlands 3.6%, Norway 3.5%
- Pre-tournament odds snapshot for reference (Spain +450, France +475, England +700, Portugal +800, Brazil +875, Argentina +950, Germany +1350, Netherlands +1800, Norway +3100, Colombia +3750, Japan +4000, Morocco +5000)
- Key pre-tournament intelligence: Yamal hamstring concern, Netherlands injury toll (Timber/Simons/De Ligt out), Brazil finished 5th in CONMEBOL qualifying, Argentina defending champion group-stage curse (3 of last 4 defending champs eliminated in groups), Ronaldo disciplinary situation, Netherlands 0-1 loss to Algeria in warmup
- IFAB rule changes to factor in: 8-second GK rule, 5-second countdowns, expanded VAR scope (expect more penalties), conduct red cards
- Conditions intelligence: heat risk in Miami/Houston/Dallas/Atlanta, altitude at Azteca (~7300ft) and Akron Guadalajara (~5100ft)
- Bet sizing guidance matching the user's stakes: straight bets $1–20, parlays $1–5, 2–3 leg parlays max
- Output format instructions: always structure recommendations with Bet / Odds / Edge Reasoning / Risk Level / Recommended Stake / Key Risk Factors
- Kelly Criterion framing: conservative (1–2 units = $1–5), standard (3–5 units = $5–10), high conviction (up to $20 straight)
- Sharp money signals to track: Spain and France handle >> ticket share, fade public sides (USA, Brazil at current prices)
- Historical patterns to apply: group stage favors draws for value, unders in high-heat venues, defending champs fade, knockout totals drop ~2.54 → ~2.11

---

### STEP 2 — agent/morning_report.py

Create `agent/morning_report.py`. This is the core daily report generator. It must:

**Fetch data (in this order):**
1. Call The Odds API for current World Cup odds — endpoint: `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/` with params: `apiKey`, `regions=us`, `markets=h2h,totals,spreads`, `oddsFormat=american`
2. Call API-Sports for today's fixtures — endpoint: `https://v3.football.api-sports.io/fixtures` with header `x-apisports-key`, params: `league=1` (FIFA World Cup), `season=2026`, `date=YYYY-MM-DD`
3. Call API-Sports for recent results (last 3 days) — same endpoint with `from` and `to` date params
4. Call API-Sports for live injuries — endpoint: `https://v3.football.api-sports.io/injuries` with `league=1&season=2026`
5. Run a 3–5 minute web search via the Anthropic API with `web_search` tool enabled, searching for: "[today's date] World Cup 2026 news team form injury updates"

**Build the prompt:**
- Load `agent/system_prompt.md` as the system prompt
- Construct a detailed user message containing all fetched data, formatted cleanly
- Include today's date, today's fixtures with kickoff times (ET), recent results, current odds with implied probabilities calculated, notable line movements vs yesterday's cache, and injury news
- Ask the agent to produce: (a) overnight summary of what happened, (b) today's match previews, (c) 3–5 specific bet recommendations with full structured format, (d) 1–2 parlay suggestions ($1–5), (e) sharp money observations, (f) key watch items for the day

**Call Claude API:**
- Use `claude-sonnet-4-20250514`
- `max_tokens=4000`
- Parse and clean the response

**Save outputs:**
- Write report to `reports/YYYY-MM-DD_morning_report.md` with a header including generation timestamp and API quota remaining
- Update `data/odds_cache.json` with today's fetched odds (for tomorrow's line movement comparison)
- Git add + commit + push the new report file automatically using `subprocess` — commit message: `"report: YYYY-MM-DD morning briefing"`

**Send emails:**
- Load `data/subscribers.json`
- For each subscriber where `active: true`, send via Resend API
- Email subject: `⚽ WC2026 Morning Brief — [Weekday] [Date]`
- Email body: the markdown report converted to clean HTML (use a simple inline-style template, no external CSS)
- Use `RESEND_TO_EMAIL` env var as the from address for local testing; in production use a verified Resend domain sender

**CLI flags:**
- `--no-email` — skip sending emails (useful for testing)
- `--no-push` — skip git commit/push
- `--dry-run` — fetch data and build prompt but don't call Claude API, print prompt instead

---

### STEP 3 — agent/live_query.py

Create `agent/live_query.py`. This is the on-demand report trigger for use right before or during a match. It must:

- Accept an optional CLI argument: `--match "Brazil vs Morocco"` to focus the report on a specific match
- If no match specified, report on all matches happening today or in the next 6 hours
- Fetch fresh odds from The Odds API (same endpoint as morning report)
- Fetch live scores if match is in progress from API-Sports: `https://v3.football.api-sports.io/fixtures?live=all&league=1`
- Call Claude API with the system prompt + a live-focused user prompt asking for: current situation assessment, whether morning report recommendations still hold, any live betting angles, line movement since morning cache
- Print the report to stdout (formatted for terminal reading)
- Optionally save to `reports/YYYY-MM-DD_live_[HH-MM].md` with `--save` flag

---

### STEP 4 — .github/workflows/morning-report.yml

Create `.github/workflows/morning-report.yml`. GitHub Actions workflow that:

- Triggers on cron: `'0 11 * * *'` (7:00 AM ET = 11:00 UTC, accounting for EDT)
- Also triggers on `workflow_dispatch` (manual button in GitHub UI)
- Uses `ubuntu-latest`, `python 3.12`
- Checkout repo, install dependencies from `requirements.txt`
- Set all env vars from GitHub Secrets (THE_ODDS_API_KEY, API_SPORTS_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_TO_EMAIL, STATS_API_KEY)
- Configure git user for the auto-commit: `name: WorldCup2026 Bot`, `email: actions@github.com`
- Run: `python agent/morning_report.py`
- On failure: send a simple failure notification email via curl to Resend API

---

### STEP 5 — .github/workflows/manual-trigger.yml

Create `.github/workflows/manual-trigger.yml`. Workflow that:

- Triggers ONLY on `workflow_dispatch` with an input field: `match_focus` (string, optional, description: "Focus on specific match e.g. 'Brazil vs Morocco'")
- Same setup as morning-report.yml
- Runs: `python agent/live_query.py --match "${{ github.event.inputs.match_focus }}" --save`
- Commits and pushes the saved live report

---

### STEP 6 — dashboard/index.html

Create `dashboard/index.html`. A single self-contained HTML file (all CSS and JS inline, no external dependencies except CDN). It must:

**Layout:** tabbed interface with 3 tabs:
- **Today** (default) — today's matches, live odds, active bets
- **Bet Tracker** — full bet log, P&L summary, ROI by bet type
- **Reports** — links to all saved morning reports in `reports/` folder

**Today tab must include:**
- Match schedule: kickoff time (ET), home team, away team, group, venue
- For each match: current DK odds (ML home / draw / away), total (over/under line + odds), implied probabilities
- Value flag: if implied probability is meaningfully lower than Opta model probability, highlight in amber
- Active bets panel: any bets from `data/bets.json` with status `pending` and today's match date
- Odds last-updated timestamp + API quota remaining display

**Bet Tracker tab must include:**
- Summary cards: Total bets placed, Record (W-L-P), Total staked, Total P&L, ROI %
- Full bet log table: sortable by date, filterable by status and bet type
- Each row: Bet ID, date, match, selection, odds, stake, status (color-coded), profit/loss
- Running bankroll chart (simple SVG line chart, no external library needed)

**Reports tab must include:**
- List of all `.md` files in `reports/` folder, newest first
- Each entry: date, link to raw file on GitHub, brief one-line preview (first non-header line of the file)

**Technical requirements:**
- Loads odds live from The Odds API on page load (user must have API key in a localStorage config or the page prompts for it once and stores it)
- Loads `data/bets.json` from the same repo via GitHub raw URL (hardcode the path pattern, user fills in their username)
- Auto-refreshes odds every 5 minutes with a countdown timer
- Mobile-responsive (works on phone for checking during a match)
- Color scheme: dark background (`#0f1117`), accent green (`#00c853`) for wins, red (`#ff1744`) for losses, amber (`#ffab00`) for pending/value flags
- No frameworks — vanilla JS only
- Tab switching with smooth transitions
- Loading states while fetching

---

### STEP 7 — dashboard/tournament.html

Create `dashboard/tournament.html`. A visual tournament tracker. It must:

**Group Stage view (default):**
- All 12 groups displayed in a responsive grid (3 columns on desktop, 1 on mobile)
- Each group card shows: group letter, all 4 teams with flags (use emoji flags), points table (P W D L GF GA GD Pts), current qualification status color-coded (green = qualified, amber = in contention, red = eliminated)
- Loads live standings from API-Sports

**Knockout Bracket view (toggle button):**
- Classic bracket visualization from Round of 32 → R16 → QF → SF → Final
- Shows confirmed teams or "TBD" for unplayed slots
- Winner of each match advances with a connecting line
- Champion slot at the top with a trophy emoji

**Technical:**
- Toggle button between Group Stage / Bracket views
- Data loaded from API-Sports fixtures and standings endpoints
- For group stage: hardcode the initial group assignments (all 48 teams already drawn) so the page works immediately even before matches are played
- All 48 teams with their correct group assignments must be pre-loaded as a JS constant
- Refresh button to pull latest standings
- Same color scheme as index.html

---

### STEP 8 — Final wiring and README

**Create README.md** with:
- Project overview (2–3 sentences)
- Prerequisites: Python 3.12, git, API accounts needed with links
- Setup instructions: clone, pip install, fill .env, run first report
- Usage: how to run morning report manually, how to trigger live query, how to open dashboard
- How to add a subscriber (edit subscribers.json)
- GitHub Actions setup: which secrets to add (THE_ODDS_API_KEY, API_SPORTS_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, RESEND_TO_EMAIL, STATS_API_KEY) and where
- How to run the one-time data collector during the TheStatsAPI trial: `python model/data_collector.py --teams-only` then `--players` then `--historical`
- File structure overview

**Create all required directories** (with .gitkeep files so they exist in git):
- `agent/`
- `model/`
- `dashboard/`
- `data/raw/matches/` — gitignored, populated by data_collector.py
- `data/raw/xg/` — gitignored
- `data/raw/player_stats/` — gitignored
- `data/raw/wc_historical/` — gitignored
- `data/processed/` — committed, contains computed model outputs
- `reports/` — committed, one .md file per day

**Verify the full system:**
- Run `pip install -r requirements.txt` and confirm no errors
- Run `python agent/morning_report.py --dry-run` and confirm it prints a valid prompt without errors
- Run `python agent/live_query.py` and confirm it runs
- Run `python model/data_collector.py --dry-run` and confirm it prints the fetch plan without errors
- Open `dashboard/index.html` in a browser and confirm the tabs work and it attempts to load data

---

## Important notes for Claude Code

- After creating each Python file, run it with `--dry-run` or equivalent to catch import errors immediately
- The Odds API World Cup sport key is `soccer_fifa_world_cup` — verify this is active during the tournament
- API-Sports World Cup league ID is `1` for FIFA World Cup — confirm with a test call
- Resend requires a verified sending domain in production; for development use their test mode or the onboarding domain they provide
- When doing the git auto-commit in morning_report.py, check if there are actually changes before committing to avoid empty commit errors
- The dashboard reads `data/bets.json` — make sure the path resolution works both when opened as a local file and when served
- All times should be stored and processed in UTC internally, displayed in ET (UTC-4 during EDT) for the user
- When calculating implied probability from American odds: positive odds → 100/(odds+100), negative odds → (-odds)/((-odds)+100)

---

## API Reference Quick Guide

**The Odds API:**
- Base: `https://api.the-odds-api.com/v4`
- World Cup odds: `GET /sports/soccer_fifa_world_cup/odds/?apiKey=KEY&regions=us&markets=h2h,totals&oddsFormat=american`
- Quota headers returned: `x-requests-remaining`, `x-requests-used`

**API-Sports:**
- Base: `https://v3.football.api-sports.io`
- Auth header: `x-apisports-key: KEY`
- Today's fixtures: `GET /fixtures?league=1&season=2026&date=YYYY-MM-DD`
- Live fixtures: `GET /fixtures?live=all&league=1`
- Standings: `GET /standings?league=1&season=2026`
- Injuries: `GET /injuries?league=1&season=2026`

**Anthropic API:**
- Model: `claude-sonnet-4-20250514`
- Web search tool: include `{"type": "web_search_20250305", "name": "web_search"}` in tools array
- Standard messages endpoint: `POST https://api.anthropic.com/v1/messages`

**Resend:**
- Send endpoint: `POST https://api.resend.com/emails`
- Auth header: `Authorization: Bearer KEY`
- Body: `{"from": "...", "to": ["..."], "subject": "...", "html": "..."}`

---

## ADDENDUM — Model Layer + TheStatsAPI Integration

This addendum supersedes any conflicting instructions above. Add the following to the build after completing Steps 1–8.

---

### CONVENTIONS ADDITIONS

- `STATS_API_KEY` — TheStatsAPI key, added to `.env` and `.env.example`
- All raw API responses saved to `data/raw/` (gitignored)
- Computed model outputs saved to `data/processed/` (committed)
- Model files in `model/` directory
- Rate limiting: TheStatsAPI — use `_last_request_time` module-level float + `time.sleep()` to enforce ≥0.6s between requests; do NOT use the `ratelimit` library (causes crashes)
- All data stored with UTC timestamps; display in ET

---

### STEP 9 — model/data_collector.py

This is a ONE-TIME bulk data pull script to run during the 7-day TheStatsAPI trial. It must:

**Pull and cache all data needed for the Poisson model:**

1. **All 48 WC team IDs from TheStatsAPI** — search by team name, store mapping in `data/processed/team_id_map.json` (team name → TheStatsAPI team_id)

2. **Last 12 months of matches for every WC team** — endpoint: `GET /api/football/matches?team_id={id}&from={date_12mo_ago}&to={today}`. For each match returned, save raw JSON to `data/raw/matches/{match_id}.json`. Respect 120 req/min limit using `ratelimit` decorator.

3. **xG data for every collected match** — endpoint: `GET /api/football/matches/{match_id}/stats`. Save to `data/raw/xg/{match_id}.json`. Only pull if `xg_available: true` in the match record.

4. **Season player stats for all WC squad members** — endpoint: `GET /api/football/players/{player_id}/stats?season_id=sn_XXXXXX` (resolve club season ID via `get_club_season_id()`). Save to `data/raw/player_stats/{player_id}.json`. Start from the `PLAYER_METADATA` dict (43 key players). Resolve player IDs by searching with accent-stripped names and validating nationality + age against `PLAYER_METADATA`; paginate ALL search result pages before picking a match.

5. **2018 and 2022 World Cup match xG** — pull historical WC matches and their xG for tournament-specific calibration. Save to `data/raw/wc_historical/`.

**CLI flags:**
- `--teams-only` — only pull team match history (fastest, do this first)
- `--players` — add player stats pull
- `--historical` — add 2018/2022 WC historical data
- `--resume` — skip any match_id already present in `data/raw/`, allows safe re-run
- `--dry-run` — print what would be fetched, don't call API

**Progress display:** use `tqdm` progress bars for each phase. Print quota usage estimate before starting.

**Key player list to hardcode for initial player pull:**
Mbappé, Kane, Haaland, Messi, Ronaldo, Vinicius Jr, Raphinha, Lamine Yamal, Pedri, Oyarzabal, Álvarez, Bellingham, Saka, Salah, Dembélé, Olise, Ødegaard, Luis Díaz, Neymar, Bruno Fernandes, Gakpo, Depay, Son Heung-min, Mitoma (injured but include), Mané, Sané, Wirtz, Gnabry, Müller, Dybala, De Bruyne, Lukaku, De Ketelaere, Brozović, Modrić, İlkay Gündoğan, Griezmann, Thuram, Koundé, Szczesny (GK sample), Alisson, Ederson, Ter Stegen, Courtois

---

### STEP 10 — model/poisson_model.py

The xG-based Poisson model with Dixon-Coles correction. Must implement:

**`compute_team_ratings(matches_dir, xg_dir) -> dict`**

Loads all cached match + xG data. For each match:
- Assign `home_xg` and `away_xg` from the xG cache (fall back to actual goals if xG unavailable)
- Weight recent matches more heavily: apply exponential decay `weight = exp(-0.005 * days_ago)` so matches from 365 days ago have ~16% the weight of today's match
- Compute `attack_strength` and `defense_strength` per team using maximum likelihood estimation against the league average xG rate
- Save ratings to `data/processed/team_ratings.json`

**`dixon_coles_correction(home_xg, away_xg, score) -> float`**

Correction factor for low-scoring matches (0-0, 1-0, 0-1, 1-1). Uses `rho` parameter ≈ -0.13 (standard from the 1997 paper). Apply this correction to the raw Poisson probability for these four scorelines only.

**`predict_match(home_team, away_team, ratings) -> dict`**

Given two team names and the ratings dict, returns:
```python
{
    "home_team": "Brazil",
    "away_team": "Morocco",
    "home_xg_pred": 1.82,
    "away_xg_pred": 0.94,
    "home_win_pct": 54.1,
    "draw_pct": 24.3,
    "away_win_pct": 21.6,
    "over_2_5_pct": 48.2,
    "under_2_5_pct": 51.8,
    "over_1_5_pct": 71.3,
    "under_1_5_pct": 28.7,
    "btts_yes_pct": 41.6,
    "btts_no_pct": 58.4,
    "home_clean_sheet_pct": 34.2,
    "away_clean_sheet_pct": 18.7,
    "top_scorelines": [
        {"score": "1-0", "pct": 13.2},
        {"score": "2-0", "pct": 11.4},
        {"score": "1-1", "pct": 10.8},
        {"score": "2-1", "pct": 9.9},
        {"score": "0-0", "pct": 8.1}
    ]
}
```

Compute scoreline probabilities for all scorelines 0-0 through 6-6 using the Poisson PMF, apply Dixon-Coles correction to the four low-score cases, then sum across scorelines to derive all the aggregate markets.

**`generate_all_predictions(upcoming_fixtures) -> list`**

Runs `predict_match` for every upcoming World Cup fixture. Saves full output to `data/processed/model_predictions.json` with a timestamp.

**`compute_edge(model_pct, american_odds) -> float`**

Converts American odds to implied probability, then returns `model_pct - implied_prob`. Positive = model thinks it's underpriced (value). Flag anything above 3% as a meaningful edge.

---

### STEP 11 — model/player_props.py

Player prop model. Must implement:

**`compute_player_profiles(player_stats_dir) -> dict`**

Loads all cached player stats. For each player computes per-90-minute rates:
- `goals_per_90`
- `shots_per_90`
- `shots_on_target_per_90` (if available)
- `assists_per_90`
- `key_passes_per_90`
- `xg_per_90` (if available from match-level xG joined to lineup data)
- `yellow_cards_per_90`

Weight recent matches more heavily (same exponential decay as team model). Save to `data/processed/player_profiles.json`.

**`predict_anytime_scorer(player_name, home_team, away_team, team_ratings) -> dict`**

Estimates P(player scores) using:
- Player's `goals_per_90` rate as base
- Adjusted by opponent's `defense_strength` from team ratings
- Adjusted by expected match xG (higher-xG matches = more scoring opportunities)
- Formula: `p_score = 1 - exp(-goals_per_90 * minutes_expected/90 * (away_defense_adj))`

Returns: `{"player": "Kane", "anytime_scorer_pct": 38.4, "first_scorer_pct": 12.1}`

**`predict_shots_on_target(player_name, ...) -> dict`**

Same approach using `shots_on_target_per_90`. Returns over/under probabilities for common DraftKings lines (0.5, 1.5, 2.5 shots on target).

**`predict_team_corners(home_team, away_team, team_ratings) -> dict`**

Uses team-level corners data from match stats cache to predict total corners. Returns over/under probabilities for common lines (8.5, 9.5, 10.5).

---

### STEP 12 — model/predictions.py

Daily orchestrator that ties the model together. Run by `morning_report.py` automatically. Must:

1. Load `data/processed/team_ratings.json` — if missing or >7 days old, print warning (ratings need refresh)
2. Load today's upcoming fixtures from API-Sports (already fetched by morning report)
3. Run `generate_all_predictions()` for today's matches
4. For each prediction, load corresponding DraftKings odds from `data/odds_cache.json`
5. Compute edges for: home win, draw, away win, over 2.5, under 2.5, BTTS yes
6. Run player prop predictions for the top 3 prop-relevant players per match
7. Save everything to `data/processed/model_predictions.json`
8. Return a formatted markdown summary string for inclusion in the morning report

**Edge threshold flags:**
- `> 3%` — mild edge, worth noting
- `> 5%` — strong edge, recommend
- `> 8%` — sharp edge, high conviction

---

### UPDATES TO EXISTING STEPS

**Update Step 1 (system_prompt.md):**
Add a section explaining the model layer to the agent:
- The agent will receive model predictions alongside odds
- Edge = model probability minus market implied probability
- Instruct the agent: edges are a starting signal, not a final answer. The agent must assess whether qualitative factors (injuries, rotation risk, conditions, motivation) support or undermine each edge before recommending.
- Instruct the agent to always state: "Model edge: +X%" or "No model edge" for each recommendation
- For player props, the agent should cross-reference player profile rates with current injury/lineup news

**Update Step 2 (morning_report.py):**
After fetching odds and fixtures, call `model/predictions.py` to generate fresh predictions. Include the model output in the Claude prompt as a structured section:

```
## MODEL PREDICTIONS

### Brazil vs Morocco
- Model xG: Brazil 1.82 — Morocco 0.94
- Win probabilities: Brazil 54.1% | Draw 24.3% | Morocco 21.6%
- DraftKings implied: Brazil 58.8% | Draw 23.8% | Morocco 20.8%
- Edges: Brazil -4.7% (overpriced) | Draw +0.5% | Morocco +0.8%
- Over 2.5: Model 48.2% vs DK 44.4% → +3.8% EDGE
- BTTS Yes: Model 41.6% vs DK 38.5% → +3.1% EDGE
- Top scorelines: 1-0 (13.2%), 2-0 (11.4%), 1-1 (10.8%)

### Player props — Brazil vs Morocco
- Raphinha: anytime scorer 31.2% (DK +240 = 29.4%) → +1.8% edge
- Kane: 1.5+ shots on target — Model 58.4% (DK -125 = 55.6%) → +2.8% edge
```

**Update Step 6 (dashboard/index.html):**
Add a "Model" column to the match odds table showing:
- Model win/draw/loss percentages
- Edge vs DK for each outcome (color-coded: green for positive edge, red for negative)
- Small badge: "🎯 +4.2% edge" for any edge above 3%

**Update Step 7 (dashboard/tournament.html):**
No changes needed for model layer.

---

### API REFERENCE ADDITIONS

**TheStatsAPI (trial-only — bulk data collection during 7-day trial; NOT used in morning_report.py or live_query.py):**
- Base: `https://api.thestatsapi.com/api`
- Auth header: `Authorization: Bearer KEY`
- All matches for a team: `GET /football/matches?team_id={id}&from=YYYY-MM-DD&to=YYYY-MM-DD`
- Match stats + xG: `GET /football/matches/{match_id}/stats`
- Match timeline: `GET /football/matches/{match_id}/timeline`
- Match shotmap: `GET /football/matches/{match_id}/shotmap`
- Match odds: `GET /football/matches/{match_id}/odds`
- Match lineups (player IDs + positions, NO per-player stats): `GET /football/matches/{match_id}/lineups`
- Player season stats: `GET /football/players/{player_id}/stats?season_id=sn_XXXXXX`
- NOTE: there is NO per-match player stats endpoint at the trial tier. `--match-players` uses lineups to discover player IDs then fetches WC season totals via the season stats endpoint.
- Player search: `GET /football/players?search={accent-stripped name}` (paginate ALL pages)
- WC fixtures: `GET /football/matches?competition_id=comp_6107&season_id=sn_118868&per_page=100`
- WC seasons list: `GET /football/competitions/comp_6107/seasons`
- Competition search: `GET /football/competitions?search=world+cup`
- Club season list: `GET /football/competitions/{comp_id}/seasons`
- Pagination: all endpoints return `meta.total_pages` — always paginate fully
- Rate limit: maintain ≥0.6s between every request using `_last_request_time` timestamp tracker (no decorator); retry on 429 with 10s backoff, 3 attempts max

**Confirmed WC 2026 IDs:**
- `WC_COMPETITION_ID = "comp_6107"`
- `WC_SEASON_ID = "sn_118868"`

**New CLI flags in data_collector.py:**
- `--wc-odds` — Pull Pinnacle pre-match odds for all 104 WC 2026 fixtures → `data/raw/wc_odds/`
- `--shotmaps` — Pull shotmap data for matches with `xg_available=true` → `data/raw/shotmaps/`
- `--timelines` — Pull event timelines for finished WC 2026 matches → `data/raw/wc_timelines/`
- `--match-players` — Pull per-match player stats for all cached matches → `data/raw/match_player_stats/`

**Data flow summary:**
```
TheStatsAPI (trial: bulk pull once — data_collector.py only)
    → data/raw/ (cached locally, gitignored)
    → model/poisson_model.py (processes raw into ratings)
    → data/processed/team_ratings.json (committed)

The Odds API + API-Sports (daily operations — morning_report.py and live_query.py ONLY)
    → model/predictions.py (daily run)
    → data/processed/model_predictions.json
    → agent/morning_report.py (reads predictions + calls Claude)
```

**Important notes for Claude Code:**
- TheStatsAPI uses `Bearer` token auth, not an API key query param
- WC 2026 competition ID is `comp_6107`, season ID is `sn_118868` — use these constants, do not search for them
- Team IDs are strings like `tm_50` — build the team_id_map.json lookup first before any bulk pulling
- The `xg_available` field on a match record tells you whether to bother calling the stats endpoint
- `home_team` and `away_team` in match records are objects `{"id": "tm_XXX", "name": "..."}` not plain strings
- Player search returns results by nationality and age fields — validate both before accepting a match
- Always strip accents from player names before searching: `unicodedata.normalize('NFD', name)` then filter non-Mn chars
- Correct player stats endpoint: `GET /football/players/{player_id}/stats?season_id=sn_XXXXXX` (NOT `?player_id=X&season=2025`)
- Exponential decay weight formula: `import math; weight = math.exp(-0.005 * days_ago)` where `days_ago = (today - match_date).days`
- For Dixon-Coles, the correction only applies to scorelines where both scores are 0 or 1. The standard rho value of -0.13 works well; no need to estimate it from data for this project.
- `scipy.stats.poisson.pmf(k, mu)` is the core function for Poisson probabilities
- The model needs at least 5 matches of data per team to produce meaningful ratings — flag teams with fewer matches
- `compute_vig_free_prob(home_odds, draw_odds, away_odds)` removes Pinnacle vig from 3-way lines; pass the `home`/`draw`/`away` decimal result as `pinnacle_odds` to `compute_edge()`

---

## ADDENDUM — Prompt Caching Optimization

Add prompt caching to all Anthropic API calls in `morning_report.py` and `live_query.py`.

**What it does:** The system prompt and static context (Opta model probabilities, pre-tournament intelligence, betting framework) never changes between calls. Anthropic's prompt caching lets you mark this content once and pay 90% less to reprocess it on every subsequent call. The cached portion is also returned faster since it skips reprocessing.

**How to implement it:**

In every `client.messages.create()` call, add `cache_control` to the static portions of the messages array:

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=4000,
    system=[
        {
            "type": "text",
            "text": system_prompt_text,
            "cache_control": {"type": "ephemeral"}  # cache this block
        }
    ],
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": static_context_text,        # Opta probs, historical intel
                    "cache_control": {"type": "ephemeral"}  # cache this too
                },
                {
                    "type": "text",
                    "text": dynamic_content_text        # today's odds, scores, news
                    # no cache_control — this changes every call
                }
            ]
        }
    ]
)
```

**Rules:**
- Only mark content that is identical across multiple calls as `ephemeral`
- The system prompt qualifies — it never changes
- The static context block (Opta model, pre-tournament report summary) qualifies
- Today's odds, scores, injuries, and model predictions are dynamic — never cache these
- Cache TTL is 5 minutes by default; for the morning report that's fine since it runs once
- The `anthropic` Python SDK >= 0.28.0 supports this natively — no extra dependencies

**Cost impact at 39 days of daily reports:**
- Without caching: ~$0.048/report × 39 days ≈ $1.87 total
- With caching: ~$0.020/report × 39 days ≈ $0.78 total
- Savings: roughly 60% on the static input portion

Apply this pattern to every `client.messages.create()` call across the entire codebase.