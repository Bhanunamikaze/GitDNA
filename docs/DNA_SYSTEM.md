# DNA System (100 Types)

## Objective
Generate exactly 100 deterministic developer DNA types without manually writing 100 separate rule trees.

## Type Construction
1. 10 Core Archetypes (`who`)
2. 10 Style Modifiers (`how`)
3. Cartesian product gives 100 unique types.

`type_id = <archetype_slug>_<modifier_slug>`

## Core Archetypes (10)
1. Architect
2. Maintainer
3. Sprinter
4. Stabilizer
5. Polyglot
6. Refactorer
7. Explorer
8. Integrator
9. Toolsmith
10. Finisher

## Style Modifiers (10)
1. Night
2. Dawn
3. Weekend
4. Steady
5. Burst
6. Marathon
7. Minimal
8. Maximal
9. Experimental
10. Disciplined

## Metric Vector
Each user is represented as normalized metrics `M`:
- `cadence`
- `consistency`
- `burstiness`
- `night_ratio`
- `weekend_ratio`
- `impact_estimate`
- `language_entropy`
- `repo_focus`
- `collaboration_signal`
- `longevity_signal`

All values are normalized to `[0,1]`.

## Type Resolution Model

### Step 1: Archetype Score
Compute distance from `M` to each archetype centroid.
```text
archetype = argmin(distance(M, archetype_centroid[i]))
```

### Step 2: Modifier Score
Compute distance from `M` to each modifier centroid.
```text
modifier = argmin(distance(M, modifier_centroid[j]))
```

### Step 3: Compose Final Type
```text
type_id = archetype + "_" + modifier
```

### Step 4: Confidence
Use margin between best and second-best average distance:
```text
confidence = clamp(1 - (d1 / (d2 + eps)), 0, 1)
```

## Explainability Output
For each assigned type:
1. Top 3 positive drivers (`highest z-contribution metrics`)
2. Top 2 suppressors (`metrics pulling away from assigned centroid`)
3. Nearest alternative types (top 3)

## Deterministic Behavior Requirements
1. Same input window and scoring version must always return same output.
2. Scoring version must be included in output for reproducibility.
3. Randomness is not allowed in type assignment.

## Data Files
1. `data/dna/archetypes.json`
2. `data/dna/modifiers.json`
3. `data/dna/centroids.json`
4. `data/dna/types_100.json` (generated)

## Generator Workflow
1. Source archetype metadata and modifier metadata.
2. Generate 100 combined records.
3. Auto-generate:
   - name (`Night Architect`)
   - short flavor text
   - rarity tier (optional static mapping)
4. Commit output via Action or local script.

## Pseudocode
```javascript
function resolveType(metrics, centroids) {
  const archetype = nearest(metrics, centroids.archetypes);
  const modifier = nearest(metrics, centroids.modifiers);
  const typeId = `${archetype.id}_${modifier.id}`;

  const alternatives = nearestK(
    metrics,
    centroids.combinedTypes,
    3
  ).map(x => x.id);

  const confidence = confidenceFromMargin(
    metrics,
    centroids.combinedTypes
  );

  return { typeId, confidence, alternatives };
}
```

## Quality Guardrails
1. No type should dominate more than 25% of sampled profiles.
2. Distribution must be reviewed monthly against sample set.
3. If skewed, adjust centroids, not ad-hoc overrides.
