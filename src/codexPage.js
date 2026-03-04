import { buildCharacterSvg, setCharacterConfig } from "./ui/character.js";

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function rarityClass(rarityTier) {
  return `rarity-${(rarityTier || "Common").toLowerCase()}`;
}

function matchesQuery(type, query) {
  if (!query) {
    return true;
  }
  const search = [
    type.name,
    type.alias_name,
    type.archetype,
    type.modifier,
    type.flavor_text,
    type.rarity_tier,
  ]
    .join(" ")
    .toLowerCase();
  return search.includes(query.toLowerCase());
}

function matchesRarity(type, rarity) {
  if (!rarity || rarity === "all") {
    return true;
  }
  return type.rarity_tier === rarity;
}

function setDetail(elements, type) {
  elements.detailName.textContent = type.name;
  elements.detailAlias.textContent = type.alias_name;
  elements.detailMeta.textContent = `${type.archetype} archetype with ${type.modifier} style`;
  elements.detailFlavor.textContent = type.flavor_text;
  elements.detailRarity.textContent = type.rarity_tier;
  elements.detailRarity.className = `rarity-pill ${rarityClass(type.rarity_tier)}`;
  elements.detailCharacter.innerHTML = buildCharacterSvg(type.id, type.name);
}

function renderGrid(elements, types, onSelect) {
  elements.codexGrid.innerHTML = "";

  for (const type of types) {
    const card = document.createElement("article");
    card.className = "codex-card";

    const head = document.createElement("div");
    head.className = "head";

    const mini = document.createElement("div");
    mini.className = "mini-char";
    mini.innerHTML = buildCharacterSvg(type.id, `${type.name} icon`);

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = type.name;
    const alias = document.createElement("p");
    alias.className = "alias";
    alias.textContent = type.alias_name;
    titleWrap.append(title, alias);

    head.append(mini, titleWrap);

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = `${type.archetype} | ${type.modifier} | ${type.rarity_tier}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "view-btn";
    button.textContent = "View type details";
    button.addEventListener("click", () => onSelect(type));

    card.append(head, meta, button);
    elements.codexGrid.appendChild(card);
  }
}

async function init() {
  const elements = {
    search: document.querySelector("#codex-search"),
    rarity: document.querySelector("#codex-rarity"),
    count: document.querySelector("#codex-count"),
    codexGrid: document.querySelector("#codex-grid"),
    detailName: document.querySelector("#detail-name"),
    detailAlias: document.querySelector("#detail-alias"),
    detailCharacter: document.querySelector("#detail-character"),
    detailMeta: document.querySelector("#detail-meta"),
    detailFlavor: document.querySelector("#detail-flavor"),
    detailRarity: document.querySelector("#detail-rarity"),
  };

  const [types, shapeData, paletteData] = await Promise.all([
    loadJson("./data/dna/types_100.json"),
    loadJson("./data/characters/archetype_shapes.json"),
    loadJson("./data/characters/modifier_palettes.json"),
  ]);

  setCharacterConfig({
    archetypes: shapeData.archetypes,
    modifiers: paletteData.modifiers,
  });

  const all = types.types || [];

  const selectType = (type) => setDetail(elements, type);

  const update = () => {
    const query = elements.search.value.trim();
    const rarity = elements.rarity.value;
    const filtered = all.filter(
      (type) => matchesQuery(type, query) && matchesRarity(type, rarity)
    );

    elements.count.textContent = `${filtered.length} of ${all.length} types`;
    renderGrid(elements, filtered, selectType);

    if (filtered.length > 0) {
      setDetail(elements, filtered[0]);
    } else {
      elements.detailName.textContent = "No matching type";
      elements.detailAlias.textContent = "";
      elements.detailCharacter.innerHTML = "";
      elements.detailMeta.textContent = "Try a broader search.";
      elements.detailFlavor.textContent = "";
      elements.detailRarity.textContent = "";
      elements.detailRarity.className = "rarity-pill";
    }
  };

  elements.search.addEventListener("input", update);
  elements.rarity.addEventListener("change", update);

  const queryType = new URLSearchParams(window.location.search).get("type");
  if (queryType) {
    const type = all.find((item) => item.id === queryType);
    if (type) {
      elements.search.value = type.name;
    }
  }

  update();
}

init().catch((error) => {
  console.error(error);
});
