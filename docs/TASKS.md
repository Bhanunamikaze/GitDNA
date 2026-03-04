# GitDNA Execution Tasks

Status legend:
- `[ ]` not started
- `[-]` in progress
- `[x]` done

## Phase 0: Foundation
- [x] Archive brainstorm and establish `docs/` as source of truth.
- [x] Add critical planning docs (`API_EDGE_CASES`, `CENTROID_CALIBRATION`, `DESIGN_SYSTEM`, `SEO_SOCIAL`).
- [x] Add initial centroid vectors (`data/dna/centroids.json`).
- [x] Define JSON schema files for runtime analysis payloads.
- [ ] Add contributor docs (`CONTRIBUTING.md`, issue labels strategy).

## Phase 1: Core Product (Build Now)
- [x] Create static app scaffold (`index.html`, `styles.css`, `src/` modules).
- [x] Implement API client with typed edge-case handling.
- [x] Implement optional PAT flow (session only, no persistence).
- [x] Add loading skeletons and staged progress states.
- [x] Add live analysis flow with bounded fetch budget.
- [x] Add insufficient-data, rate-limit, and partial-data UX states.
- [x] Implement cache layer (`analysisVersion` aware).

## Phase 2: DNA Engine
- [x] Add 10 archetype and 10 modifier metadata files.
- [x] Create generator for `types_100.json` with:
  - technical name
  - alias name
  - flavor text
  - rarity tier
- [x] Implement centroid distance scorer and confidence logic.
- [x] Implement top-3 nearest alternative types.
- [x] Implement explainability drivers/suppressors output.

## Phase 3: Engagement Layer
- [x] Implement achievements engine (24 base tiers + combo badges).
- [-] Render achievements with progress-to-next thresholds.
- [ ] Add DNA Codex page for all 100 types (search/filter).
- [ ] Add character placeholder system (type-based mapping).
- [ ] Add share card export v1 (PNG or SVG-based).

## Phase 4: Demo, Social, and Growth
- [x] Add instant demo on landing (auto-play sample analysis).
- [x] Add demo profile snapshots (`torvalds`, `tj`, `sindresorhus`).
- [x] Add "Try Demo Profile" UX and no-API fallback path.
- [ ] Add README embed card URL strategy (static SVG assets).
- [ ] Add OG/Twitter metadata strategy for profile pages.
- [x] Add one-click "Star on GitHub" CTA in UI.

## Phase 5: Automation and GitHub-Native Ops
- [ ] Add GitHub Actions: `build-pages.yml`.
- [ ] Add GitHub Actions: `generate-data-packs.yml`.
- [ ] Add GitHub Actions: `generate-readme-cards.yml`.
- [ ] Add GitHub Actions: `update-hall-of-fame.yml`.
- [ ] Add Hall of Fame Issue Form and JSON compiler.

## Phase 6: Quality and Launch
- [ ] Add accessibility fallbacks (chart summaries + table views).
- [ ] Add mobile polish and keyboard navigation checks.
- [ ] Add README launch assets and embed snippets.
- [ ] Add launch checklist and week-1 shipping plan.
