#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const archetypesPath = path.join(repoRoot, "data", "dna", "archetypes.json");
const modifiersPath = path.join(repoRoot, "data", "dna", "modifiers.json");
const outPath = path.join(repoRoot, "data", "dna", "types_100.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function rarityFromScore(score) {
  if (score >= 9) {
    return "Mythic";
  }
  if (score >= 8) {
    return "Legendary";
  }
  if (score >= 6) {
    return "Rare";
  }
  return "Common";
}

function buildType(arch, mod) {
  const id = `${arch.id}_${mod.id}`;
  const name = `${mod.name} ${arch.name}`;
  const aliasName = `The ${mod.alias_prefix} ${arch.alias_noun}`;
  const powerScore = Number(arch.power || 0) + Number(mod.intensity || 0);
  const rarity = rarityFromScore(powerScore);

  return {
    id,
    name,
    alias_name: aliasName,
    archetype: arch.name,
    modifier: mod.name,
    rarity_tier: rarity,
    flavor_text: `${arch.description} This profile ${mod.style_line}.`,
  };
}

function main() {
  const archetypes = readJson(archetypesPath).archetypes || [];
  const modifiers = readJson(modifiersPath).modifiers || [];

  if (archetypes.length !== 10 || modifiers.length !== 10) {
    throw new Error(
      `Expected 10 archetypes and 10 modifiers, got ${archetypes.length} and ${modifiers.length}.`
    );
  }

  const types = [];
  for (const arch of archetypes) {
    for (const mod of modifiers) {
      types.push(buildType(arch, mod));
    }
  }

  const out = {
    version: "0.1.0",
    generated_at: new Date().toISOString(),
    count: types.length,
    types,
  };

  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`Generated ${types.length} DNA types at ${outPath}`);
}

main();
