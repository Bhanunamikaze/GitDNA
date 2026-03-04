import { buildCharacterSvg } from "./character.js";

function escapeText(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function listToLines(items, x, startY) {
  return items
    .slice(0, 4)
    .map((item, index) => {
      const y = startY + index * 30;
      return `<text x="${x}" y="${y}" fill="#cbd5e1" font-family="IBM Plex Sans, Arial, sans-serif" font-size="22">- ${escapeText(item)}</text>`;
    })
    .join("");
}

export function buildShareCardSvg(result) {
  const charSvg = buildCharacterSvg(
    result.type_id,
    `${result.type_name} character`
  ).replace('width="128" height="128"', 'width="180" height="180"');

  const traits = listToLines(result.traits || [], 360, 378);
  const achievements = listToLines(result.achievements || [], 360, 530);
  const today = new Date().toISOString().slice(0, 10);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="GitDNA share card">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="55%" stop-color="#0f766e"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="28" y="28" width="1144" height="574" rx="24" fill="#0b1220" opacity="0.84"/>
  <text x="56" y="92" fill="#f8fafc" font-size="46" font-family="Space Grotesk, Arial, sans-serif" font-weight="700">GitDNA</text>
  <text x="56" y="138" fill="#93c5fd" font-size="30" font-family="IBM Plex Sans, Arial, sans-serif">@${escapeText(result.username)}</text>
  <text x="56" y="204" fill="#f8fafc" font-size="54" font-family="Space Grotesk, Arial, sans-serif" font-weight="700">${escapeText(result.type_name)}</text>
  <text x="56" y="246" fill="#cbd5e1" font-size="28" font-family="IBM Plex Sans, Arial, sans-serif">${escapeText(result.alias_name)}</text>
  <text x="56" y="292" fill="#facc15" font-size="24" font-family="IBM Plex Sans, Arial, sans-serif">Confidence ${Math.round((result.confidence || 0) * 100)}%</text>
  <g transform="translate(110,318)">
    ${charSvg}
  </g>
  <text x="360" y="336" fill="#f8fafc" font-size="30" font-family="Space Grotesk, Arial, sans-serif" font-weight="600">Traits</text>
  ${traits}
  <text x="360" y="488" fill="#f8fafc" font-size="30" font-family="Space Grotesk, Arial, sans-serif" font-weight="600">Achievements</text>
  ${achievements}
  <text x="56" y="582" fill="#94a3b8" font-size="18" font-family="JetBrains Mono, monospace">Generated ${today} | github.com</text>
</svg>
`.trim();
}

export function downloadSvg(filename, svgString) {
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildReadmeEmbedSnippet(baseUrl, username) {
  const clean = (username || "").trim();
  return `![My GitDNA](${baseUrl}/data/cards/${clean}.svg)`;
}
