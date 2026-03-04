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
  { id: "bronze", label: "Bronze", min: 0.3, points: 10 },
  { id: "silver", label: "Silver", min: 0.5, points: 24 },
  { id: "gold", label: "Gold", min: 0.7, points: 42 },
  { id: "mythic", label: "Mythic", min: 0.85, points: 65 },
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
  const badges = [];

  for (const track of TRACKS) {
    const value = clamp01(metrics[track.metric] || 0);
    const tier = getTierForValue(value);
    const nextTier = getNextTier(value);

    if (tier) {
      const unlockedEntry = {
        id: `${track.id}_${tier.id}`,
        label: `${track.name} ${tier.label}`,
        track: track.name,
        tier: tier.label,
        points: tier.points,
        type: "track",
      };
      unlocked.push(unlockedEntry);
      badges.push(unlockedEntry);
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
    combos.push({
      id: "night_shift_pro",
      label: "Night Shift Pro",
      points: 58,
      tier: "Mythic",
      type: "combo",
    });
  }
  if ((metrics.impact_estimate || 0) > 0.7 && (metrics.cadence || 0) < 0.35) {
    combos.push({
      id: "quiet_titan",
      label: "Quiet Titan",
      points: 44,
      tier: "Gold",
      type: "combo",
    });
  }
  if ((metrics.language_entropy || 0) > 0.7 && (metrics.consistency || 0) > 0.65) {
    combos.push({
      id: "stable_polyglot",
      label: "Stable Polyglot",
      points: 36,
      tier: "Gold",
      type: "combo",
    });
  }
  if (resolvedType?.typeId?.includes("disciplined")) {
    combos.push({
      id: "release_monk",
      label: "Release Monk",
      points: 30,
      tier: "Silver",
      type: "combo",
    });
  }

  badges.push(...combos);
  badges.sort((left, right) => (right.points || 0) - (left.points || 0));

  const impactScore = badges.reduce((sum, item) => sum + (item.points || 0), 0);

  return {
    unlocked,
    progress,
    combos,
    badges,
    impactScore,
  };
}
