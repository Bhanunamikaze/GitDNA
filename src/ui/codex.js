function rarityClass(rarityTier) {
  const key = (rarityTier || "Common").toLowerCase();
  return `rarity rarity-${key}`;
}

function matchesQuery(type, query) {
  if (!query) {
    return true;
  }
  const haystack = [
    type.name,
    type.alias_name,
    type.archetype,
    type.modifier,
    type.flavor_text,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function matchesRarity(type, rarity) {
  if (!rarity || rarity === "all") {
    return true;
  }
  return type.rarity_tier === rarity;
}

export function createCodexController(elements, typesData) {
  const allTypes = typesData?.types || [];

  function render(query = "", rarity = "all") {
    const filtered = allTypes.filter(
      (type) => matchesQuery(type, query) && matchesRarity(type, rarity)
    );

    elements.codexCount.textContent = `${filtered.length} of ${allTypes.length} types`;
    elements.codexGrid.innerHTML = "";

    for (const type of filtered) {
      const card = document.createElement("article");
      card.className = "codex-card";

      const title = document.createElement("h3");
      title.textContent = type.name;

      const alias = document.createElement("p");
      alias.className = "alias";
      alias.textContent = type.alias_name;

      const meta = document.createElement("p");
      meta.className = "meta";
      meta.textContent = `${type.archetype} | ${type.modifier}`;

      const flavor = document.createElement("p");
      flavor.className = "meta";
      flavor.textContent = type.flavor_text;

      const rarity = document.createElement("span");
      rarity.className = rarityClass(type.rarity_tier);
      rarity.textContent = type.rarity_tier;

      card.append(title, alias, meta, flavor, rarity);
      elements.codexGrid.appendChild(card);
    }
  }

  return {
    render,
  };
}
