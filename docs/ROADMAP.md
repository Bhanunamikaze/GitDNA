# Phased Roadmap

## Phase 0: Foundation (3-4 days)
Goal: lock scope, scoring, and architecture before coding.

Deliverables:
1. Finalized docs in `docs/`.
2. JSON schemas for DNA types and analysis output.
3. Design tokens and visual direction.

Exit Criteria:
1. P0 docs approved.
2. Type generator produces 100 valid entries.
3. Team agrees on MVP acceptance criteria.

## Phase 1: Core Engine + MVP UI (5-7 days)
Goal: working end-to-end analysis flow.

Deliverables:
1. Username input + analysis trigger.
2. API module with bounded fetch strategy.
3. Metrics normalization and deterministic type resolution.
4. Result view: type, confidence, top traits, top 3 nearest.
5. Browser cache with TTL and version invalidation.

Exit Criteria:
1. Analyze known test profiles successfully.
2. Repeat run returns deterministic result.
3. Mobile and desktop baseline usable.

## Phase 2: Engagement Layer (4-6 days)
Goal: introduce repeat-use mechanics.

Deliverables:
1. Achievement engine (24 base + combo badges).
2. Character compositing system for 100 outcomes.
3. Share card export with character and badges.
4. DNA Codex page with filter/search over all 100 types.

Exit Criteria:
1. Achievements unlock correctly from metrics.
2. Share card export works across modern browsers.
3. Codex page loads and filters under acceptable latency.

## Phase 3: Social and Community Loops (4-5 days)
Goal: increase reach and repository stars.

Deliverables:
1. Compare mode (`user A vs user B`).
2. Hall of Fame submission via GitHub Issue Form.
3. Action workflow that compiles approved submissions to JSON.
4. Hall of Fame page on Pages.

Exit Criteria:
1. Compare mode stable for typical profiles.
2. Submission and publish loop works without manual JSON edits.
3. Pages deploy remains fully free and automated.

## Phase 4: Polish + Launch (3-4 days)
Goal: package product for visibility and growth.

Deliverables:
1. README with demo visuals and architecture summary.
2. Demo GIF/video + screenshots + sample cards.
3. Launch copy templates for X/LinkedIn/Reddit/Dev communities.
4. Post-launch issue labels and contributor onboarding.

Exit Criteria:
1. Launch assets ready.
2. Documentation complete for contributors.
3. Tracking dashboard for basic product metrics in place.

## Phase 5: Post-Launch Iteration (ongoing, weekly)
Goal: keep momentum and improve quality.

Weekly Cadence:
1. Review analytics and feedback issues.
2. Tune centroid balance and achievement thresholds.
3. Ship one visible improvement per week.
4. Run monthly "new badge drop" or "new character skin" release.
