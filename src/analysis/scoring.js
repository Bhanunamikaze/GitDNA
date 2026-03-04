import { METRIC_ORDER } from "../config.js";
import { clamp01, prettifyKey } from "../utils/format.js";

function weightedDistance(a, b, weights) {
  let sum = 0;
  for (let index = 0; index < a.length; index += 1) {
    const weight = weights[index] ?? 1;
    const delta = a[index] - b[index];
    sum += weight * delta * delta;
  }
  return Math.sqrt(sum);
}

function nearest(vector, centroids, weights) {
  const ranked = centroids
    .map((centroid) => ({
      id: centroid.id,
      label: centroid.label,
      vector: centroid.vector,
      distance: weightedDistance(vector, centroid.vector, weights),
    }))
    .sort((left, right) => left.distance - right.distance);

  return ranked;
}

function composeCombinedCentroids(archetypes, modifiers) {
  const combined = [];
  for (const archetype of archetypes) {
    for (const modifier of modifiers) {
      const vector = archetype.vector.map((value, index) =>
        clamp01((value + modifier.vector[index]) / 2)
      );
      combined.push({
        id: `${archetype.id}_${modifier.id}`,
        label: `${modifier.label} ${archetype.label}`,
        vector,
      });
    }
  }
  return combined;
}

function buildTypeMap(typeData) {
  const map = new Map();
  for (const entry of typeData?.types || []) {
    map.set(entry.id, entry);
  }
  return map;
}

function deriveExplainability(vector, targetVector) {
  const scored = METRIC_ORDER.map((metricKey, index) => {
    const delta = targetVector[index] - vector[index];
    const alignment = 1 - Math.abs(delta);
    return {
      metric: metricKey,
      alignment,
      delta,
      readable: prettifyKey(metricKey),
    };
  });

  const drivers = [...scored]
    .sort((left, right) => right.alignment - left.alignment)
    .slice(0, 3)
    .map((item) => item.readable);

  const suppressors = [...scored]
    .sort(
      (left, right) => Math.abs(right.delta) - Math.abs(left.delta)
    )
    .slice(0, 2)
    .map((item) => item.readable);

  return { drivers, suppressors };
}

export function resolveType(metricsVector, centroidData, typeData) {
  const weights = centroidData.metric_weights || new Array(METRIC_ORDER.length).fill(1);
  const archetypeRank = nearest(
    metricsVector,
    centroidData.archetype_centroids,
    weights
  );
  const modifierRank = nearest(
    metricsVector,
    centroidData.modifier_centroids,
    weights
  );

  const archetype = archetypeRank[0];
  const modifier = modifierRank[0];
  const typeId = `${archetype.id}_${modifier.id}`;

  const combined = composeCombinedCentroids(
    centroidData.archetype_centroids,
    centroidData.modifier_centroids
  );
  const combinedRank = nearest(metricsVector, combined, weights);
  const alternatives = combinedRank.slice(1, 4).map((item) => item.id);

  const firstDistance = combinedRank[0]?.distance ?? 1;
  const secondDistance = combinedRank[1]?.distance ?? firstDistance + 0.001;
  const confidence = clamp01(1 - firstDistance / (secondDistance + 1e-6));

  const typeMap = buildTypeMap(typeData);
  const metadata = typeMap.get(typeId) || {
    id: typeId,
    name: `${modifier.label} ${archetype.label}`,
    alias_name: `${modifier.label} ${archetype.label}`,
    flavor_text: "Deterministic profile generated from available GitHub activity.",
    rarity_tier: "Common",
  };

  const explainability = deriveExplainability(metricsVector, combinedRank[0].vector);

  return {
    typeId,
    typeName: metadata.name,
    aliasName: metadata.alias_name || metadata.name,
    flavorText: metadata.flavor_text || "",
    rarityTier: metadata.rarity_tier || "Common",
    confidence,
    alternatives,
    drivers: explainability.drivers,
    suppressors: explainability.suppressors,
  };
}
