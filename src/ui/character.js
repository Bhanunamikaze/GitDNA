const DEFAULT_ARCHETYPE_SHAPES = {
  architect: "M20 92 L64 20 L108 92 Z",
  maintainer: "M20 28 H108 V92 H20 Z",
  sprinter: "M20 76 L52 20 L84 76 Z M84 76 L108 92 H52 Z",
  stabilizer: "M64 16 L112 52 L64 108 L16 52 Z",
  polyglot: "M24 24 H52 V52 H24 Z M76 24 H104 V52 H76 Z M24 76 H52 V104 H24 Z M76 76 H104 V104 H76 Z",
  refactorer: "M20 20 H108 V44 H20 Z M20 52 H108 V76 H20 Z M20 84 H108 V108 H20 Z",
  explorer: "M64 16 L104 56 L64 96 L24 56 Z",
  integrator: "M20 20 H44 V44 H20 Z M84 20 H108 V44 H84 Z M52 52 H76 V76 H52 Z M20 84 H44 V108 H20 Z M84 84 H108 V108 H84 Z",
  toolsmith: "M20 64 H108 V88 H20 Z M40 16 H64 V64 H40 Z M68 24 H88 V48 H68 Z",
  finisher: "M20 88 L52 16 H76 L108 88 Z",
};

const DEFAULT_MODIFIER_COLORS = {
  night: ["#0f172a", "#1d4ed8", "#93c5fd"],
  dawn: ["#b45309", "#f59e0b", "#fde68a"],
  weekend: ["#065f46", "#10b981", "#6ee7b7"],
  steady: ["#0f766e", "#14b8a6", "#99f6e4"],
  burst: ["#9f1239", "#e11d48", "#fda4af"],
  marathon: ["#4c1d95", "#7c3aed", "#c4b5fd"],
  minimal: ["#374151", "#6b7280", "#d1d5db"],
  maximal: ["#7c2d12", "#ea580c", "#fdba74"],
  experimental: ["#1e1b4b", "#4338ca", "#a5b4fc"],
  disciplined: ["#1f2937", "#475569", "#94a3b8"],
};

const characterConfig = {
  shapes: { ...DEFAULT_ARCHETYPE_SHAPES },
  palettes: { ...DEFAULT_MODIFIER_COLORS },
};

function parseType(typeId = "") {
  const [archetype = "architect", modifier = "steady"] = typeId.split("_");
  return { archetype, modifier };
}

function escapeText(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildCharacterSvg(typeId, label = "") {
  const { archetype, modifier } = parseType(typeId);
  const shape =
    characterConfig.shapes[archetype] || characterConfig.shapes.architect;
  const palette =
    characterConfig.palettes[modifier] || characterConfig.palettes.steady;
  const safeLabel = escapeText(label);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${safeLabel}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette[0]}" />
      <stop offset="100%" stop-color="${palette[1]}" />
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="120" height="120" rx="20" fill="url(#bg)" />
  <rect x="14" y="14" width="100" height="100" rx="14" fill="${palette[2]}" opacity="0.2" />
  <g fill="${palette[2]}">
    <path d="${shape}" />
  </g>
  <circle cx="100" cy="28" r="8" fill="${palette[1]}" />
</svg>
`.trim();
}

export function renderCharacter(container, typeId, label) {
  container.innerHTML = buildCharacterSvg(typeId, label);
}

export function setCharacterConfig({ archetypes = [], modifiers = [] } = {}) {
  if (Array.isArray(archetypes) && archetypes.length > 0) {
    characterConfig.shapes = { ...DEFAULT_ARCHETYPE_SHAPES };
    for (const item of archetypes) {
      if (item?.id && item?.shape) {
        characterConfig.shapes[item.id] = item.shape;
      }
    }
  }

  if (Array.isArray(modifiers) && modifiers.length > 0) {
    characterConfig.palettes = { ...DEFAULT_MODIFIER_COLORS };
    for (const item of modifiers) {
      if (item?.id && Array.isArray(item?.palette) && item.palette.length >= 3) {
        characterConfig.palettes[item.id] = item.palette.slice(0, 3);
      }
    }
  }
}
