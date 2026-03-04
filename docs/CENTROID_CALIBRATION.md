# Centroid Calibration

## Objective
Define and maintain centroid vectors so type assignment is stable, interpretable, and balanced.

## Inputs
1. Metric schema from `docs/DNA_SYSTEM.md`.
2. Seed profile list of 10-20 public GitHub accounts.
3. Current centroid file: `data/dna/centroids.json`.

## Calibration Method (Initial)
1. Collect normalized metric vectors for seed accounts.
2. Group each seed account by best-fit archetype and modifier manually.
3. Average grouped vectors to initialize centroid values.
4. Review output distribution across sample accounts.
5. Adjust outlier centroids by small deltas only.

## Seed Profile Criteria
1. Publicly active with enough commit history.
2. Diverse coding patterns across languages and cadence.
3. Mix of maintainers, tool builders, explorers, and specialists.

## Data and Versioning Rules
1. Every centroid edit must update:
   - `version`
   - `updated_at`
   - `notes`
2. Store calibration summary in this file under changelog.
3. Never edit centroid vectors without distribution check.

## Distribution Health Checks
1. No single type > 25% on test sample.
2. At least 60% of types represented across broad synthetic runs.
3. Confidence median should remain in moderate range, not always extreme.

## Drift Review Cadence
1. Weekly during early development.
2. Monthly after stable launch.
3. Ad-hoc after major metric/weight changes.

## Change Protocol
1. Open PR with:
   - before/after centroid diff
   - sample profile impact table
   - distribution histogram
2. Tag PR with `data-model`.
3. Require one reviewer approval before merge.

## Changelog
1. `v0.1.0` (2026-03-04): initial hand-tuned centroid placement for all 10 archetypes and 10 modifiers.
