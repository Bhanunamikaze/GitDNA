# Free-Tier Operations Plan

## Objective
Run and maintain GitDNA at zero infrastructure cost.

## Allowed Platform Components
1. GitHub Pages (static hosting)
2. GitHub Actions (automation)
3. Repository JSON files (data storage)
4. Issue Forms and Pull Requests (community submissions)

## Cost-Control Rules
1. Public repository only.
2. Avoid large artifacts and long-running workflows.
3. Keep generated JSON compact and versioned.
4. Bound API fetch windows in client.
5. Prefer scheduled jobs at low frequency (daily/weekly).
6. Precompute demo profiles to reduce live API dependence.

## Workflow Set

### `build-pages.yml`
Purpose:
- validate static data
- build frontend
- deploy to Pages

Triggers:
- push to `main`
- manual dispatch

### `generate-data-packs.yml`
Purpose:
- regenerate `types_100.json`
- regenerate optional curated profile snapshots
- regenerate `card_svg_manifest.json`

Triggers:
- weekly schedule
- manual dispatch

### `generate-readme-cards.yml`
Purpose:
- build static SVG cards for README embed links
- write cards to `data/cards/`

Triggers:
- daily schedule
- manual dispatch

### `update-hall-of-fame.yml`
Purpose:
- parse approved issue submissions
- output `data/hall_of_fame.json`

Triggers:
- issue labeled `approved-submission`
- manual dispatch

## Failure Modes and Fallbacks
1. Rate-limited API in browser:
   - show clear banner
   - offer retry and optional PAT input
   - load snapshot when available
2. Workflow failure:
   - preserve previous data pack
   - open issue automatically with error summary
3. Invalid submission payload:
   - reject with comment template

## PAT Handling Policy
1. PAT is optional but first-class in UX.
2. PAT is held in memory only for active session.
3. PAT is never committed, logged, or persisted.
4. UI links users to token creation instructions.

## Maintenance Checklist (Monthly)
1. Verify Pages deployment health.
2. Verify workflows pass.
3. Audit JSON size and prune stale snapshots.
4. Rebalance overrepresented DNA types if needed.
5. Review issue backlog and contributor docs.

## Versioning Policy
1. `analysisVersion` for scoring logic.
2. `dataPackVersion` for static JSON assets.
3. Breaking changes must include migration notes in release notes.
