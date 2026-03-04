# Product Requirements Document (PRD)

## Product Name
GitDNA

## Vision
Turn public GitHub activity into an interpretable "Developer DNA" profile that is fun to share and worth revisiting.

## Primary Goal
Grow repository stars by shipping a useful and viral developer-facing tool with zero-cost hosting.

## Users
1. Individual developers who want a coding persona summary.
2. Open source contributors who want a shareable identity card.
3. Hiring/community audiences who want quick behavior snapshots.

## Jobs To Be Done
1. "Analyze my GitHub behavior in under 30 seconds."
2. "Get a personality type I can share."
3. "See progress and unlock more badges over time."
4. "Compare my profile with someone else."

## Core Value Props
1. Deterministic and explainable results.
2. Zero login required for base analysis.
3. High visual polish and easy sharing.
4. Repeat engagement via progression (achievements + unlocks).
5. Works even under API pressure via demo profiles and snapshot fallback.

## Product Scope

### Must Have (MVP)
1. Username analysis.
2. 100 DNA type assignment (top type + top 3 nearest).
3. Explainability panel ("why this type").
4. Shareable image card.
5. Achievements with unlock progress.
6. DNA Codex browse page (all 100 types).
7. First-class optional PAT input UI with clear safety messaging.
8. "Try Demo Profile" button with precomputed result pack.
9. Landing page instant demo animation (no input required to see value).
10. Edge-case UI states for missing/partial/invalid data.

### Should Have (Post-MVP)
1. Compare mode (user A vs user B).
2. Time-range analysis (last 90/180/365 days).
3. Hall of Fame page from community submissions.
4. Embeddable GitHub profile README badge card.

### Not in Initial Scope
1. Private repository analysis.
2. Paid tiers or subscription features.
3. Real-time global leaderboard backed by custom server DB.

## Functional Requirements
1. Accept `github_username` input.
2. Fetch and aggregate repo, commit, and language data.
3. Compute normalized metrics vector.
4. Map to 1 of 100 DNA types and generate confidence.
5. Show top traits and counter-traits.
6. Award achievements and show progress-to-next.
7. Generate share image with type, character, and badges.
8. Cache recent analyses in browser for repeat speed.
9. Provide runtime edge-case classification:
   - user not found
   - insufficient public data
   - rate limited
   - partial profile data
10. Support demo mode with local JSON snapshots for known profiles.
11. Support static SVG badge output for profile README embedding.

## Non-Functional Requirements
1. 100% free infrastructure.
2. Works on desktop and mobile.
3. P95 analysis completion under 30 seconds for typical public profiles.
4. Graceful degradation under API rate limits.
5. No storage of personal secrets.
6. Accessibility: chart alternatives must include table/text summaries.
7. Share pages should have social metadata coverage (`og:*`, `twitter:*`) for cached profiles.

## Success Metrics
1. Activation: `% visitors who complete one analysis`.
2. Engagement: `avg pages per session`, `compare mode usage`, `codex visits`.
3. Virality: `share card exports / completed analyses`.
4. Retention proxy: `% users with repeat analysis in 7 days` (local estimate + voluntary submissions).
5. Star growth: `net new GitHub stars per week`.
6. Demo conversion: `% visitors who interact with instant demo or demo profile`.
7. PAT adoption: `% users who provide optional PAT after rate-limit warning`.

## Risks
1. API rate limiting for unauthenticated users.
2. Perceived inaccuracy of personality mapping.
3. One-time novelty without repeat loop.
4. Confusion from multiple specs if old docs are not archived.

## Mitigations
1. Tight fetch limits + cache + optional session PAT.
2. Explainability panel with transparent metric breakdown.
3. Achievements, compare mode, codex completion, and periodic character drops.
4. Single source of truth under `docs/` and archived brainstorm.
