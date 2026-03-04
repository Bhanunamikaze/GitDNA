# Architecture (GitHub-Only, 100% Free)

## Principles
1. No paid infrastructure.
2. No custom backend server.
3. Deterministic client-side scoring.
4. Graceful fallback when live API is constrained.

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
    achievements/
      tracks.json
      combos.json
    hall_of_fame.json
  .github/
    workflows/
      build-pages.yml
      update-hall-of-fame.yml
      generate-data-packs.yml
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

## Caching Strategy
1. `localStorage` key per username + analysis version.
2. TTL defaults to 24h.
3. Invalidate cache on scoring version update.

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

## Security and Privacy
1. Do not store PAT in persistent storage.
2. Never require OAuth for MVP.
3. Process only public GitHub data.
4. Do not collect personal PII beyond optional username input.

## Reliability
1. Feature flags via static config for fast rollback.
2. Fail-open UI states (partial charts still render).
3. Track error categories: network, rate-limit, parsing, scoring.

## Accessibility and UX Baseline
1. Keyboard-first navigation for all controls.
2. Color contrast AA minimum.
3. Touch-friendly controls on mobile.
