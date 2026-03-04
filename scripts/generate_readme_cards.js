#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const profilesDir = path.join(repoRoot, "data", "profiles");
const cardsDir = path.join(repoRoot, "data", "cards");
const manifestPath = path.join(repoRoot, "data", "cards", "card_svg_manifest.json");

function escapeText(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildSimpleCard(profile) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="260" viewBox="0 0 820 260" role="img" aria-label="GitDNA README card">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="820" height="260" rx="18" fill="url(#bg)"/>
  <rect x="16" y="16" width="788" height="228" rx="14" fill="#0b1220" opacity="0.84"/>
  <text x="36" y="68" fill="#f8fafc" font-size="38" font-family="Space Grotesk, Arial, sans-serif" font-weight="700">GitDNA</text>
  <text x="36" y="108" fill="#93c5fd" font-size="24" font-family="IBM Plex Sans, Arial, sans-serif">@${escapeText(profile.username)}</text>
  <text x="36" y="152" fill="#f8fafc" font-size="30" font-family="Space Grotesk, Arial, sans-serif">${escapeText(profile.type_name)}</text>
  <text x="36" y="186" fill="#cbd5e1" font-size="20" font-family="IBM Plex Sans, Arial, sans-serif">${escapeText(profile.alias_name)}</text>
  <text x="36" y="220" fill="#facc15" font-size="20" font-family="IBM Plex Sans, Arial, sans-serif">Confidence ${Math.round((profile.confidence || 0) * 100)}%</text>
</svg>
`.trim();
}

function readProfileFiles() {
  if (!fs.existsSync(profilesDir)) {
    return [];
  }
  return fs
    .readdirSync(profilesDir)
    .filter((name) => name.startsWith("demo_") && name.endsWith(".json"))
    .map((name) => path.join(profilesDir, name));
}

function main() {
  fs.mkdirSync(cardsDir, { recursive: true });
  const profileFiles = readProfileFiles();
  const manifest = {
    version: "0.1.0",
    generated_at: new Date().toISOString(),
    cards: [],
  };

  for (const file of profileFiles) {
    const profile = JSON.parse(fs.readFileSync(file, "utf8"));
    const cardSvg = buildSimpleCard(profile);
    const outPath = path.join(cardsDir, `${profile.username}.svg`);
    fs.writeFileSync(outPath, `${cardSvg}\n`);

    manifest.cards.push({
      username: profile.username,
      svg_path: `/data/cards/${profile.username}.svg`,
      updated_at: new Date().toISOString(),
    });
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Generated ${manifest.cards.length} README cards.`);
}

main();
