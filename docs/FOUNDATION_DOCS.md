# Foundation Docs (Write First)

These are the minimum docs that must be finalized before implementation.

## Priority 0 (Blockers)
1. Product Requirements
   File: [PRD.md](./PRD.md)
   Why: Defines scope and what "done" means.
2. Technical Architecture
   File: [ARCHITECTURE.md](./ARCHITECTURE.md)
   Why: Prevents rework and keeps the stack 100% free.
3. DNA Scoring System
   File: [DNA_SYSTEM.md](./DNA_SYSTEM.md)
   Why: Core logic; all UI and sharing depends on this.

## Priority 1 (Core Engagement)
1. Achievement and Character Design
   File: [ACHIEVEMENTS_CHARACTERS.md](./ACHIEVEMENTS_CHARACTERS.md)
   Why: Main retention and shareability hooks.
2. Delivery Plan
   File: [ROADMAP.md](./ROADMAP.md)
   Why: Keeps build sequence realistic and measurable.

## Priority 2 (Launch and Scale)
1. Free-tier Operations
   File: [OPERATIONS_FREE_TIER.md](./OPERATIONS_FREE_TIER.md)
   Why: Ensures no paid infra creep.
2. Star Growth Plan
   File: [LAUNCH_STAR_STRATEGY.md](./LAUNCH_STAR_STRATEGY.md)
   Why: Converts product quality into visibility and repository stars.

## Definition of "Ready to Build"
All checks below must be true:
- All P0 docs approved and versioned.
- 100 DNA types can be generated from deterministic inputs.
- API limits/fallback behavior documented.
- MVP phase has exit criteria and test checklist.
