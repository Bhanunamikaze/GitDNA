# Achievements and Characters

## Purpose
Create repeat engagement and shareability beyond one-time analysis.

## Achievement Framework

### Tracks (6)
1. Cadence
2. Consistency
3. Impact
4. Polyglot
5. Collaboration
6. Longevity

### Tiers (4 each)
1. Bronze
2. Silver
3. Gold
4. Mythic

Total base badges: `6 x 4 = 24`.

## Unlock Logic Pattern
Use threshold-based deterministic rules per track.

Example:
```text
Cadence Bronze: cadence >= 0.30
Cadence Silver: cadence >= 0.50
Cadence Gold: cadence >= 0.70
Cadence Mythic: cadence >= 0.85
```

## Combo Achievements
Add 10 cross-track combos to create "surprise" moments.

Examples:
1. Night Shift Pro: `night_ratio high + cadence high`
2. Quiet Titan: `impact high + cadence low`
3. Stable Polyglot: `language_entropy high + consistency high`
4. Release Monk: `finisher archetype + disciplined modifier`

## Progress UX
For locked achievements, show:
1. current value
2. next threshold
3. progress bar
4. metric hint ("Increase consistency by committing on 4+ distinct weekdays")

## Character System (100 Variants)

### Construction
1. 10 base archetype characters (SVG)
2. 10 style overlays (palette/effects/props)
3. Runtime composite -> 100 character outcomes

### Asset Design Rules
1. Keep all characters as lightweight SVG layers.
2. Use one consistent skeleton for easy compositing.
3. Use color tokens so theme can update globally.

## Share Card Content
1. Username
2. DNA type name
3. Character render
4. Top 3 achievements
5. Confidence score
6. Generated date
7. Link/QR to profile page

## Repeat-Use Loops
1. "Re-analyze after 7 days" prompt.
2. "Unlock next badge" callout.
3. "Collect all modifiers for one archetype" mini quest.
4. "Compare with a friend" deep link.

## Data Files
1. `data/achievements/tracks.json`
2. `data/achievements/combos.json`
3. `assets/characters/base/*.svg`
4. `assets/characters/modifiers/*.svg`
