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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function truncate(text, length = 120) {
  const value = String(text || "").trim();
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, Math.max(0, length - 1)).trim()}…`;
}

function sanitizeBadgeChunk(value) {
  return encodeURIComponent(String(value || "").trim().replace(/\s+/g, " "));
}

function pickBadgeColor({ confidence = 0, impactScore = 0 } = {}) {
  const conf = clamp(Number(confidence || 0), 0, 1);
  const impact = Math.max(0, Number(impactScore || 0));
  if (conf >= 0.84 || impact >= 180) {
    return "06b6d4";
  }
  if (conf >= 0.68 || impact >= 120) {
    return "14b8a6";
  }
  if (conf >= 0.45 || impact >= 70) {
    return "f59e0b";
  }
  return "64748b";
}

function clarityLabel(confidence = 0) {
  const value = clamp(Number(confidence || 0), 0, 1);
  if (value >= 0.84) {
    return "High Clarity";
  }
  if (value >= 0.66) {
    return "Stable Clarity";
  }
  if (value >= 0.45) {
    return "Developing";
  }
  return "Emerging";
}

function formatCompactNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "--";
  }
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  }
  if (abs >= 1_000) {
    return `${(num / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  }
  return `${Math.round(num)}`;
}

const LANGUAGE_COLORS = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  Python: "#3776ab",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#f89820",
  C: "#a8b9cc",
  "C++": "#649ad2",
  CSharp: "#9b4f96",
  "C#": "#9b4f96",
  Ruby: "#cc342d",
  PHP: "#777bb4",
  Swift: "#f05138",
  Kotlin: "#7f52ff",
  Shell: "#89e051",
  HTML: "#e34f26",
  CSS: "#1572b6",
  Vue: "#42b883",
  Svelte: "#ff3e00",
  Dart: "#00b4ab",
};

function languageAccentColor(name) {
  return LANGUAGE_COLORS[name] || "#22d3ee";
}

function languageShortLabel(name) {
  const value = String(name || "").trim();
  if (!value) {
    return "--";
  }
  if (value.length <= 6) {
    return value;
  }
  const parts = value.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length > 1) {
    return parts.map((part) => part[0]).join("").toUpperCase().slice(0, 4);
  }
  return value.slice(0, 6);
}

function hashSeed(input) {
  const text = String(input || "gitdna");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function buildNebulaProfileBadgeSvg({
  username = "developer",
  typeName = "Developer DNA",
  aliasName = "GitDNA Profile",
  description = "",
  rarityTier = "Common",
  confidence = 0,
  impactScore = 0,
  profileStats = null,
} = {}) {
  const safeUser = escapeText(String(username || "").replace(/^@/, ""));
  const safeType = escapeText(typeName || "Developer DNA");
  const safeAlias = escapeText(aliasName || "GitDNA Profile");
  const safeDesc = escapeText(
    truncate(description || "Deterministic profile generated from GitHub activity.", 132)
  );
  const safeRarity = escapeText(rarityTier || "Common");
  const safeClarity = escapeText(clarityLabel(confidence));
  const confidencePct = Math.round(clamp(Number(confidence || 0), 0, 1) * 100);
  const safeImpact = Math.max(0, Math.round(Number(impactScore || 0)));
  const stats = profileStats || {};
  const safeCommits = formatCompactNumber(stats.commitCount);
  const safeRepos = formatCompactNumber(stats.repoCount);
  const safeLoc = formatCompactNumber(stats.estimatedLoc);
  const safeStars = formatCompactNumber(stats.totalStars);
  const safeForks = formatCompactNumber(stats.totalForks);
  const safeFollowers = formatCompactNumber(stats.followers);
  const topLanguages = Array.isArray(stats.topLanguages) ? stats.topLanguages.slice(0, 5) : [];
  const hasDetailedStats =
    Number(stats.commitCount || 0) > 0 || Number(stats.repoCount || 0) > 0;

  const rand = seededRandom(hashSeed(`${safeUser}:${safeType}:${safeImpact}`));
  const stars = Array.from({ length: 30 }, (_, index) => {
    const x = Math.round(20 + rand() * 860);
    const y = Math.round(16 + rand() * 306);
    const r = (0.6 + rand() * 1.9).toFixed(2);
    const opacity = (0.2 + rand() * 0.7).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#bfdbfe" opacity="${opacity}" />`;
  }).join("");

  const languageChips = topLanguages.length
    ? topLanguages
        .map((language, index) => {
          const chipX = 34 + index * 106;
          const safeName = escapeText(languageShortLabel(language.name));
          const accent = languageAccentColor(language.name);
          return `
            <g class="lang-chip">
              <rect x="${chipX}" y="309" width="98" height="22" rx="11" fill="#0b1e35" stroke="#2a4364"/>
              <circle cx="${chipX + 12}" cy="320" r="4.5" fill="${accent}" />
              <text x="${chipX + 22}" y="324" fill="#dbeafe" font-size="11" font-weight="600">${safeName}</text>
            </g>
          `.trim();
        })
        .join("")
    : `<text x="34" y="324" fill="#64748b" font-size="11" letter-spacing="1.2">LANGUAGES: --</text>`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="340" viewBox="0 0 900 340" role="img" aria-label="GitDNA Nebula badge for ${safeUser}">
  <defs>
    <linearGradient id="nebulaBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#051326"/>
      <stop offset="55%" stop-color="#102540"/>
      <stop offset="100%" stop-color="#1f1d55"/>
    </linearGradient>
    <radialGradient id="auraA" cx="20%" cy="25%" r="68%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="auraB" cx="80%" cy="30%" r="66%">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <style>
      .root { font-family: 'IBM Plex Sans', Arial, sans-serif; }
      .dna-core { transform-origin: 734px 170px; transform-box: fill-box; transition: transform 240ms ease, filter 260ms ease; }
      .helix { transform-origin: 734px 170px; transform-box: fill-box; transition: transform 320ms ease, opacity 320ms ease; }
      .scanline { transform: translateX(-22px); transition: transform 380ms ease; }
      .lang-chip { transition: transform 260ms ease; transform-box: fill-box; transform-origin: center; }
      .root:hover .dna-core { transform: scale(1.08); filter: drop-shadow(0 0 14px rgba(34,211,238,0.45)); }
      .root:hover .helix { transform: scale(1.04); opacity: 0.95; }
      .root:hover .scanline { transform: translateX(24px); }
      .root:hover .lang-chip { transform: translateY(-1px); }
    </style>
  </defs>

  <rect width="900" height="340" rx="20" fill="url(#nebulaBg)"/>
  <rect width="900" height="340" rx="20" fill="url(#auraA)"/>
  <rect width="900" height="340" rx="20" fill="url(#auraB)"/>
  ${stars}

  <g class="root">
    <rect x="14" y="14" width="872" height="312" rx="16" fill="#061425" opacity="0.72" stroke="#1e3a5f" />
    <text x="34" y="46" fill="#67e8f9" font-size="12" letter-spacing="1.8" font-weight="700">GITDNA PROFILE CARD</text>
    <text x="34" y="74" fill="#e2e8f0" font-size="24" font-weight="700">@${safeUser}</text>
    <text x="34" y="108" fill="#f8fafc" font-size="34" font-family="Space Grotesk, Arial, sans-serif" font-weight="700">${safeType}</text>
    <text x="34" y="134" fill="#a5f3fc" font-size="18" font-weight="600">${safeAlias}</text>
    <text x="34" y="163" fill="#cbd5e1" font-size="14">${safeDesc}</text>

    <rect x="34" y="186" width="152" height="58" rx="10" fill="#0b1e35" stroke="#233a59"/>
    <text x="46" y="206" fill="#94a3b8" font-size="11" letter-spacing="1.2">RANK</text>
    <text x="46" y="229" fill="#fef3c7" font-size="19" font-weight="700">${safeRarity}</text>

    <rect x="196" y="186" width="170" height="58" rx="10" fill="#0b1e35" stroke="#233a59"/>
    <text x="208" y="206" fill="#94a3b8" font-size="11" letter-spacing="1.2">SIGNAL CLARITY</text>
    <text x="208" y="229" fill="#99f6e4" font-size="18" font-weight="700">${safeClarity} · ${confidencePct}%</text>

    <rect x="376" y="186" width="128" height="58" rx="10" fill="#0b1e35" stroke="#233a59"/>
    <text x="388" y="206" fill="#94a3b8" font-size="11" letter-spacing="1.2">IMPACT</text>
    <text x="388" y="229" fill="#fde68a" font-size="22" font-weight="700">${safeImpact}</text>

    <rect x="34" y="246" width="126" height="54" rx="10" fill="#0b1e35" stroke="#233a59"/>
    <text x="46" y="264" fill="#94a3b8" font-size="10.5" letter-spacing="1.1">COMMITS</text>
    <text x="46" y="286" fill="#bae6fd" font-size="20" font-weight="700">${safeCommits}</text>

    <rect x="170" y="246" width="126" height="54" rx="10" fill="#0b1e35" stroke="#233a59"/>
    <text x="182" y="264" fill="#94a3b8" font-size="10.5" letter-spacing="1.1">EST LOC</text>
    <text x="182" y="286" fill="#c4b5fd" font-size="20" font-weight="700">${safeLoc}</text>

    <rect x="306" y="246" width="126" height="54" rx="10" fill="#0b1e35" stroke="#233a59"/>
    <text x="318" y="264" fill="#94a3b8" font-size="10.5" letter-spacing="1.1">REPOS</text>
    <text x="318" y="286" fill="#99f6e4" font-size="20" font-weight="700">${safeRepos}</text>

    <rect x="442" y="246" width="172" height="54" rx="10" fill="#0b1e35" stroke="#233a59"/>
    <text x="454" y="264" fill="#94a3b8" font-size="10.5" letter-spacing="1.1">STARS · FORKS · FOLLOWERS</text>
    <text x="454" y="286" fill="#fde68a" font-size="16.5" font-weight="700">${safeStars} · ${safeForks} · ${safeFollowers}</text>

    ${languageChips}
    ${
      hasDetailedStats
        ? ""
        : `<text x="34" y="337" fill="#7dd3fc" fill-opacity="0.88" font-size="10.5" letter-spacing="1.2">LIVE API DATA REQUIRED FOR DETAILED STATS (ADD GITHUB TOKEN)</text>`
    }

    <g class="helix" opacity="0.82">
      <path d="M646 78 C 688 108, 780 110, 824 78" fill="none" stroke="#22d3ee" stroke-width="2.2" stroke-opacity="0.75"/>
      <path d="M646 262 C 688 232, 780 230, 824 262" fill="none" stroke="#a78bfa" stroke-width="2.2" stroke-opacity="0.75"/>
      <path d="M655 95 L 815 245" stroke="#7dd3fc" stroke-opacity="0.25"/>
      <path d="M655 245 L 815 95" stroke="#c4b5fd" stroke-opacity="0.24"/>
    </g>

    <g class="dna-core">
      <circle cx="734" cy="170" r="62" fill="#0b2038" stroke="#2dd4bf" stroke-opacity="0.52"/>
      <circle cx="734" cy="170" r="46" fill="#10344d" />
      <circle cx="734" cy="170" r="32" fill="#1dcad4" fill-opacity="0.9"/>
      <text x="734" y="174" text-anchor="middle" fill="#ecfeff" font-size="12" font-family="JetBrains Mono, monospace" font-weight="700">DNA</text>
    </g>

    <rect x="664" y="274" width="136" height="20" rx="10" fill="#1e293b" opacity="0.78"/>
    <rect class="scanline" x="664" y="274" width="72" height="20" rx="10" fill="#22d3ee" opacity="0.72"/>
    <text x="810" y="289" text-anchor="end" fill="#bae6fd" font-size="10" letter-spacing="1.1">NEBULA DNA</text>
  </g>
</svg>
`.trim();
}

export function buildShieldsBadgeUrl({
  typeName = "Developer DNA",
  confidence = 0,
  impactScore = 0,
  style = "for-the-badge",
} = {}) {
  const label = sanitizeBadgeChunk("GitDNA");
  const message = sanitizeBadgeChunk(typeName || "Developer DNA");
  const color = pickBadgeColor({ confidence, impactScore });
  const badgeStyle = sanitizeBadgeChunk(style || "for-the-badge");
  return `https://img.shields.io/badge/${label}-${message}-${color}?style=${badgeStyle}&logo=github&logoColor=white&labelColor=0b1220`;
}

export function buildProfileUrl(baseUrl, username) {
  const clean = (username || "").trim().replace(/^@/, "");
  if (!clean) {
    return baseUrl;
  }
  return `${baseUrl}/?user=${encodeURIComponent(clean)}`;
}

export function buildReadmeEmbedSnippet(baseUrl, username, options = {}) {
  const clean = (username || "").trim().replace(/^@/, "");
  const profileUrl = buildProfileUrl(baseUrl, clean);

  if (options?.typeName) {
    const badgeUrl = buildShieldsBadgeUrl({
      typeName: options.typeName,
      confidence: options.confidence,
      impactScore: options.impactScore,
      style: options.style || "for-the-badge",
    });
    return `[![GitDNA · ${options.typeName}](${badgeUrl})](${profileUrl})`;
  }

  return `![My GitDNA](${baseUrl}/data/cards/${clean}.svg)`;
}
