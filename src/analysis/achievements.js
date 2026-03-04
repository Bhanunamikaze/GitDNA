import { clamp01 } from "../utils/format.js";

const TRACKS = [
  { id: "cadence", name: "Cadence", metric: "cadence" },
  { id: "consistency", name: "Consistency", metric: "consistency" },
  { id: "impact", name: "Impact", metric: "impact_estimate" },
  { id: "polyglot", name: "Polyglot", metric: "language_entropy" },
  { id: "collaboration", name: "Collaboration", metric: "collaboration_signal" },
  { id: "longevity", name: "Longevity", metric: "longevity_signal" },
];

const TIERS = [
  { id: "bronze", label: "Bronze", min: 0.3 },
  { id: "silver", label: "Silver", min: 0.5 },
  { id: "gold", label: "Gold", min: 0.7 },
  { id: "mythic", label: "Mythic", min: 0.85 },
];

function getTierForValue(value) {
  let selected = null;
  for (const tier of TIERS) {
    if (value >= tier.min) {
      selected = tier;
    }
  }
  return selected;
}

function getNextTier(value) {
  return TIERS.find((tier) => value < tier.min) || null;
}

export function evaluateAchievements(metrics, resolvedType) {
  const unlocked = [];
  const progress = [];

  for (const track of TRACKS) {
    const value = clamp01(metrics[track.metric] || 0);
    const tier = getTierForValue(value);
    const nextTier = getNextTier(value);

    if (tier) {
      unlocked.push({
        id: `${track.id}_${tier.id}`,
        label: `${track.name} ${tier.label}`,
      });
    }

    progress.push({
      id: track.id,
      label: track.name,
      value,
      nextTier: nextTier?.label || "Maxed",
      nextThreshold: nextTier?.min ?? 1,
    });
  }

  const combos = [];
  if ((metrics.night_ratio || 0) > 0.55 && (metrics.cadence || 0) > 0.55) {
    combos.push({ id: "night_shift_pro", label: "Night Shift Pro" });
  }
  if ((metrics.impact_estimate || 0) > 0.7 && (metrics.cadence || 0) < 0.35) {
    combos.push({ id: "quiet_titan", label: "Quiet Titan" });
  }
  if ((metrics.language_entropy || 0) > 0.7 && (metrics.consistency || 0) > 0.65) {
    combos.push({ id: "stable_polyglot", label: "Stable Polyglot" });
  }
  if (resolvedType?.typeId?.includes("disciplined")) {
    combos.push({ id: "release_monk", label: "Release Monk" });
  }

  return {
    unlocked,
    progress,
    combos,
  };
}
