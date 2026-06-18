# WorldCup2026

Personal FIFA World Cup 2026 betting intelligence system — daily AI-generated reports, live odds tracking, Poisson model predictions, and a browser dashboard. Built for DraftKings with $1–20 straight bets and $1–5 parlays.

**Tournament:** June 11 – July 19, 2026 | USA / Mexico / Canada

---

## Prerequisites

- Python 3.12
- Git
- API accounts (all free tiers are sufficient):
  - [The Odds API](https://the-odds-api.com) — DraftKings live odds
  - [API-Sports](https://api-sports.io) — fixtures, scores, injuries, standings
  - [Anthropic](https://console.anthropic.com) — Claude API for report generation
  - [Resend](https://resend.com) — email delivery
  - [TheStatsAPI](https://www.thestatsapi.com) — xG and historical data (7-day trial, run data_collector.py once during trial)

---

## Setup

```bash
git clone https://github.com/levijb/WorldCup2026.git
cd WorldCup2026
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
# Edit .env with your keys
```

Also update `data/subscribers.json` with your email address.

---

## Usage

### Morning Report (manual run)

```bash
python agent/morning_report.py              # full run — fetches data, calls Claude, emails, git pushes
python agent/morning_report.py --no-email   # skip email
python agent/morning_report.py --no-push    # skip git commit/push
python agent/morning_report.py --dry-run    # print prompt only, no Claude call
```

### Live Query (before or during a match)

```bash
python agent/live_query.py                          # all matches today/next 6h
python agent/live_query.py --match "Brazil vs Morocco"  # specific match
python agent/live_query.py --match "Spain vs France" --save  # save to reports/
```

### Dashboard

Open `dashboard/index.html` in a browser. On first load, enter your The Odds API key (stored in localStorage). The page auto-refreshes odds every 5 minutes.

Open `dashboard/tournament.html` for the group stage table and knockout bracket.

### Add a Subscriber

Edit `data/subscribers.json`:

```json
{
  "subscribers": [
    { "name": "Me", "email": "you@example.com", "active": true },
    { "name": "Friend", "email": "friend@example.com", "active": true }
  ]
}
```

---

## GitHub Actions (Automated Daily Reports)

Add these secrets to your repo at **Settings → Secrets → Actions**:

| Secret | Source |
|--------|--------|
| `THE_ODDS_API_KEY` | The Odds API dashboard |
| `API_SPORTS_KEY` | API-Sports dashboard |
| `ANTHROPIC_API_KEY` | Anthropic console |
| `RESEND_API_KEY` | Resend dashboard |
| `RESEND_TO_EMAIL` | Your personal email |
| `STATS_API_KEY` | TheStatsAPI dashboard |

Once secrets are set, the morning report runs automatically at **7:00 AM ET** daily via `.github/workflows/morning-report.yml`. Trigger manually from the **Actions** tab at any time.

For on-demand live queries, use `.github/workflows/manual-trigger.yml` from the Actions tab — enter a match name in the input field.

---

## Model Layer (Poisson + Dixon-Coles)

The model uses xG data to predict match outcomes and compute edges vs. DraftKings lines.

### One-time data collection (run during TheStatsAPI 7-day trial)

TheStatsAPI is used **only during the 7-day trial** for bulk historical data collection. After that, daily operations use only The Odds API and API-Sports — `morning_report.py` and `live_query.py` do not call TheStatsAPI.

Confirmed WC 2026 IDs: `competition_id=comp_6107`, `season_id=sn_118868`.

```bash
# Step 1: Pull team match history (fastest, do this first)
python model/data_collector.py --teams-only

# Step 2: Pull player stats
python model/data_collector.py --players

# Step 3: Pull 2018/2022 WC historical data
python model/data_collector.py --historical

# Step 4: Pull Pinnacle pre-match odds for all WC 2026 fixtures
python model/data_collector.py --wc-odds

# Step 5: Pull shotmap data for matches with xG available
python model/data_collector.py --shotmaps

# Step 6: Pull event timelines for finished WC 2026 matches
python model/data_collector.py --timelines

# Step 7: Pull per-match player stats for all cached matches
python model/data_collector.py --match-players

# Use --resume to safely re-run without re-fetching already-cached files
python model/data_collector.py --teams-only --resume

# Dry-run to see the fetch plan without making any API calls
python model/data_collector.py --dry-run
```

### Build team ratings (after data collection)

```bash
python model/poisson_model.py
```

Ratings saved to `data/processed/team_ratings.json`.

### Run daily predictions

```bash
python model/predictions.py
```

Predictions saved to `data/processed/model_predictions.json` and automatically included in the next morning report.

---

## File Structure

```
WorldCup2026/
├── agent/
│   ├── system_prompt.md        # Claude system prompt (role, intelligence, formats)
│   ├── morning_report.py       # Daily report generator
│   └── live_query.py           # On-demand match query
├── model/
│   ├── data_collector.py       # One-time bulk data pull (TheStatsAPI)
│   ├── poisson_model.py        # xG Poisson + Dixon-Coles model
│   ├── player_props.py         # Player scorer/SOT/corners model
│   └── predictions.py          # Daily orchestrator
├── dashboard/
│   ├── index.html              # Odds, bets, reports dashboard
│   └── tournament.html         # Group table + knockout bracket
├── data/
│   ├── bets.json               # Bet log (edit manually)
│   ├── subscribers.json        # Email subscribers
│   ├── odds_cache.json         # Yesterday's odds cache (gitignored)
│   ├── raw/                    # Raw API data (gitignored, ~1GB after collection)
│   └── processed/              # Model outputs (committed)
├── reports/                    # Daily .md reports (auto-committed by Actions)
├── .github/workflows/
│   ├── morning-report.yml      # Cron: 7 AM ET daily
│   └── manual-trigger.yml      # workflow_dispatch with match_focus input
├── .env                        # Local secrets (gitignored)
├── .env.example                # Key template
└── requirements.txt
```
