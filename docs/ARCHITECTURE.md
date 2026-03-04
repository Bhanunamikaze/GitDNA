# Architecture (GitHub-Only, 100% Free)

## Principles
1. No paid infrastructure.
2. No custom backend server.
3. Deterministic client-side scoring.
4. Graceful fallback when live API is constrained.
5. First-run experience must work without any API calls.

## Stack
1. Hosting: GitHub Pages
2. Build/Automation: GitHub Actions
3. Data Store: versioned JSON files in repo
4. Compute: browser runtime + scheduled GitHub Actions jobs
5. Community Input: GitHub Issue Forms + PR workflows

## High-Level Diagram
```text
User Browser
   |
   | 1) Load static app
   v
GitHub Pages (HTML/CSS/JS + static data/*.json)
   |
   | 2) Live analysis mode (optional)
   v
GitHub API (public endpoints)
   |
   | 3) Local scoring + rendering
   v
Result UI (DNA type, achievements, share card)

Nightly/On-demand:
GitHub Actions -> generate curated JSON packs -> commit to repo -> served by Pages
```

## Modes

### Mode A: Live Analysis (default)
1. Input username.
2. Fetch bounded GitHub data.
3. Compute metrics client-side.
4. Resolve type, achievements, and character.
5. Cache local result for 24h.

### Mode B: Snapshot Analysis (fallback)
1. When API requests fail/rate-limit, load precomputed snapshot from `data/profiles/*.json` if available.
2. Show banner: `Snapshot mode`.

### Mode C: Instant Demo (landing default)
1. Auto-load one curated profile on page open.
2. Play short reveal animation with no user input.
3. Offer "Analyze mine" CTA.

## Rate-Limit First UX
1. Optional PAT input is shown by default in the landing form.
2. Copy: `Paste a GitHub token for faster, higher-limit analysis (never stored).`
3. Provide one-click token creation link: `https://github.com/settings/tokens/new`.
4. PAT value is session memory only, never written to localStorage.
5. "Try Demo Profile" CTA is always visible for no-fail first run.
6. If rate-limited, app switches to snapshot mode automatically and surfaces a retry path.

## Request Budget (Per Analysis Target)
1. Repo list: 1-2 requests.
2. Languages: top 10 repos only.
3. Commits: bounded window per repo until confidence threshold is reached.
4. Hard ceiling: stop additional requests once enough signal is collected.
5. Fallback threshold: if confidence not reachable under budget, return "low confidence" result instead of hard failure.

## Repository Layout (Target)
```text
/
  index.html
  assets/
  src/
    api/
    analysis/
    ui/
    state/
    utils/
  data/
    dna/
      archetypes.json
      modifiers.json
      centroids.json
      types_100.json
    profiles/
      demo_torvalds.json
      demo_sindresorhus.json
      demo_tj.json
    cards/
      torvalds.svg
      sindresorhus.svg
    achievements/
      tracks.json
      combos.json
    hall_of_fame.json
  .github/
    workflows/
      build-pages.yml
      update-hall-of-fame.yml
      generate-data-packs.yml
      generate-readme-cards.yml
      generate-social-pages.yml
    ISSUE_TEMPLATE/
      hall_of_fame_submission.yml
  docs/
```

## API Strategy
1. Fetch only top `N` repositories by stars/activity.
2. Fetch only recent commit window (bounded).
3. Prefer aggregated fields and avoid per-commit deep calls unless needed.
4. Respect pagination and stop early once metric confidence threshold is reached.
5. Use optional session-only PAT to increase limits for power users.
6. Route all API failures through typed edge-case handlers documented in `./API_EDGE_CASES.md`.

## Caching Strategy
1. `localStorage` key per username + analysis version.
2. TTL defaults to 24h.
3. Invalidate cache on scoring version update.
4. Separate cache namespace for demo snapshots so curated examples are never blocked by stale user data.

## Data Contracts

### `types_100.json`
```json
{
  "version": "1.0.0",
  "types": [
    {
      "id": "architect_night",
      "name": "Night Architect",
      "archetype": "Architect",
      "modifier": "Night",
      "description": "Builds high-impact systems during late-hour focus blocks."
    }
  ]
}
```

### `analysis_result` (runtime)
```json
{
  "username": "example",
  "type_id": "architect_night",
  "type_name": "Night Architect",
  "confidence": 0.82,
  "top3": ["architect_night", "toolsmith_night", "architect_marathon"],
  "traits": ["High deep-work sessions", "Large-change commits"],
  "counter_traits": ["Lower daily cadence"],
  "achievements": ["impact_tier_2", "night_shift_tier_1"]
}
```

### `card_svg_manifest.json`
```json
{
  "version": "1.0.0",
  "cards": [
    {
      "username": "torvalds",
      "svg_path": "/data/cards/torvalds.svg",
      "updated_at": "2026-03-04T00:00:00Z"
    }
  ]
}
```

## README Badge / Widget Architecture
1. Pre-render profile SVG cards in GitHub Actions.
2. Commit generated SVGs to `data/cards/`.
3. Expose stable URL pattern for README embedding.
4. Refresh selected cards daily or on manual dispatch.

## Security and Privacy
1. Do not store PAT in persistent storage.
2. Never require OAuth for MVP.
3. Process only public GitHub data.
4. Do not collect personal PII beyond optional username input.
5. PAT input box must explicitly state scope guidance and local handling.

## Reliability
1. Feature flags via static config for fast rollback.
2. Fail-open UI states (partial charts still render).
3. Track error categories: network, rate-limit, parsing, scoring.
4. Guarantee at least one working demo flow from static data packs.

## Accessibility and UX Baseline
1. Keyboard-first navigation for all controls.
2. Color contrast AA minimum.
3. Touch-friendly controls on mobile.
4. Provide plain-language summary paragraph for each chart.
5. Provide tabular fallback for radar, heatmap, and timeline visualizations.
6. Include color-blind-safe palette option in settings.

## Source of Truth
1. `docs/` is canonical for product and technical decisions.
2. Original brainstorm is archived as `./ORIGINAL_BRAINSTORM.md`.
