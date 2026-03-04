# Design System

## Goal
Define a coherent visual language for product UI, charts, and character assets.

## Brand Direction
1. Theme: `Developer Guild Lab`.
2. Tone: precise, playful, technical.
3. Style balance: readable UI first, expressive identity second.

## Typography
1. Headline font: `Space Grotesk`.
2. Body font: `IBM Plex Sans`.
3. Mono font: `JetBrains Mono`.

## Color Tokens
1. Primary: `#0F766E`
2. Accent: `#F59E0B`
3. Surface: `#F8FAFC`
4. Ink: `#0F172A`
5. Positive: `#16A34A`
6. Warning: `#D97706`
7. Critical: `#DC2626`

## Chart Palette
1. Use color-blind-safe sequential palette for heatmaps.
2. Reserve accent color for current selection or highlight only.
3. Always pair color with label or pattern.

## Components
1. Input + PAT helper block.
2. Analyze CTA and Demo CTA.
3. Result card with confidence meter.
4. Trait chips and counter-trait chips.
5. Achievement grid with lock/progress states.
6. Type codex cards with rarity badge.

## Motion
1. Result reveal: staged fade/slide sequence under 500ms.
2. Chart animation: one-time entrance only.
3. Avoid continuous idle motion outside key interactions.

## Character Art Direction
1. Archetype base: unique silhouette and tool prop.
2. Modifier overlays: palette/effect/secondary prop.
3. Keep face area readable in 128x128 cards.
4. SVG-only in MVP for low payload and easy theming.

## Accessibility Rules
1. Minimum text contrast AA.
2. Focus rings visible for keyboard users.
3. Every chart requires text summary and data table fallback.
4. Avoid color-only status communication.

## Asset Pipeline
1. Source folder: `assets/design/source/`.
2. Export folder: `assets/design/dist/`.
3. Optimize SVG in CI before deploy.
