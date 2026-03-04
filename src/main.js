import { evaluateAchievements } from "./analysis/achievements.js";
import { computeMetrics } from "./analysis/metrics.js";
import { resolveType } from "./analysis/scoring.js";
import { fetchLiveProfile, hasInsufficientData } from "./api/github.js";
import { ANALYSIS_VERSION, DEMO_PROFILES } from "./config.js";
import { getCachedAnalysis, setCachedAnalysis } from "./state/cache.js";
import { renderCharacter } from "./ui/character.js";
import { createCodexController } from "./ui/codex.js";
import { createRenderer } from "./ui/render.js";
import {
  buildReadmeEmbedSnippet,
  buildShareCardSvg,
  downloadSvg,
} from "./ui/shareCard.js";

const state = {
  centroids: null,
  types: null,
  codex: null,
  latestResult: null,
};

const ui = createRenderer();

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function normalizeResult(profile, scoring, achievementData, metricsResult, options = {}) {
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, "");
  const achievementLabels = [
    ...achievementData.unlocked.map((item) => item.label),
    ...achievementData.combos.map((item) => item.label),
  ];

  return {
    username: profile.username,
    type_id: scoring.typeId,
    type_name: scoring.typeName,
    alias_name: scoring.aliasName,
    flavor_text: scoring.flavorText,
    rarity_tier: scoring.rarityTier,
    confidence: options.lowConfidence ? Math.min(scoring.confidence, 0.35) : scoring.confidence,
    top3: scoring.alternatives,
    traits: scoring.drivers.map((key) => `${key} Alignment`),
    counter_traits: scoring.suppressors.map((key) => `${key} Gap`),
    achievements: achievementLabels,
    achievement_progress: achievementData.progress,
    metrics: metricsResult.metrics,
    partial_data: options.partialData || false,
    is_demo: options.isDemo || false,
    embed_snippet: buildReadmeEmbedSnippet(baseUrl, profile.username),
  };
}

function statusForError(errorType) {
  if (errorType === "rate_limited") {
    return "Rate limit reached. Falling back to demo profile.";
  }
  if (errorType === "network_error") {
    return "Network issue detected. Showing a demo profile.";
  }
  return "";
}

async function loadDemoProfile(profileId = "torvalds", note = "") {
  const demo = await loadJson(`./data/profiles/demo_${profileId}.json`);
  demo.is_demo = true;
  ui.showResult(demo);
  renderCharacter(ui.elements.characterPreview, demo.type_id, demo.type_name);
  state.latestResult = demo;
  ui.setStatus(note || `Showing demo profile: ${demo.username}`, "warning");
}

async function analyzeLive(username, token) {
  const cached = getCachedAnalysis(username, ANALYSIS_VERSION);
  if (cached) {
    ui.showResult(cached);
    renderCharacter(ui.elements.characterPreview, cached.type_id, cached.type_name);
    state.latestResult = cached;
    ui.setStatus(`Loaded cached analysis for @${username}`, "success");
    return;
  }

  ui.setLoading(true, "Fetching repositories");
  const liveResult = await fetchLiveProfile(username, { token });
  if (!liveResult.ok) {
    ui.setLoading(false);
    ui.showError(liveResult.errorType);
    const note = statusForError(liveResult.errorType);
    if (note) {
      await loadDemoProfile("torvalds", note);
    }
    return;
  }

  ui.setLoadingStage("Computing metrics");
  const metricsResult = computeMetrics(liveResult.data);
  const insufficientData = hasInsufficientData(liveResult.data);

  ui.setLoadingStage("Resolving DNA type");
  const scoring = resolveType(metricsResult.vector, state.centroids, state.types);
  const achievementData = evaluateAchievements(metricsResult.metrics, scoring);
  const normalized = normalizeResult(
    liveResult.data,
    scoring,
    achievementData,
    metricsResult,
    {
      lowConfidence: insufficientData,
      partialData: liveResult.data.meta.partialData,
    }
  );

  ui.setLoading(false);
  ui.showResult(normalized);
  renderCharacter(
    ui.elements.characterPreview,
    normalized.type_id,
    normalized.type_name
  );
  state.latestResult = normalized;
  setCachedAnalysis(username, ANALYSIS_VERSION, normalized);

  if (insufficientData) {
    ui.setStatus(
      "Insufficient data for high-confidence results. Showing low-confidence profile.",
      "warning"
    );
    return;
  }

  if (liveResult.data.meta.partialData) {
    ui.setStatus(
      "Partial data fetched. Result is usable but confidence may be lower.",
      "warning"
    );
    return;
  }

  ui.setStatus(`Analysis complete for @${username}`, "success");
}

function getSelectedDemoProfile() {
  const currentDay = new Date().getUTCDate();
  const index = currentDay % DEMO_PROFILES.length;
  return DEMO_PROFILES[index];
}

async function init() {
  ui.setLoading(true, "Loading DNA model");

  const [centroids, types] = await Promise.all([
    loadJson("./data/dna/centroids.json"),
    loadJson("./data/dna/types_100.json"),
  ]);

  state.centroids = centroids;
  state.types = types;
  state.codex = createCodexController(ui.elements, types);
  state.codex.render();

  const form = document.querySelector("#analyze-form");
  const usernameInput = document.querySelector("#username-input");
  const patInput = document.querySelector("#pat-input");
  const demoButton = document.querySelector("#demo-button");
  const codexSearch = ui.elements.codexSearch;
  const codexRarity = ui.elements.codexRarity;
  const shareButton = ui.elements.shareButton;
  const copyEmbedButton = ui.elements.copyEmbedButton;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    ui.hideError();
    const username = usernameInput.value.trim();
    const token = patInput.value.trim();

    if (!username) {
      ui.showError("invalid_input");
      return;
    }

    await analyzeLive(username, token);
  });

  demoButton.addEventListener("click", async () => {
    ui.hideError();
    await loadDemoProfile(getSelectedDemoProfile());
  });

  codexSearch.addEventListener("input", () => {
    state.codex.render(codexSearch.value.trim(), codexRarity.value);
  });

  codexRarity.addEventListener("change", () => {
    state.codex.render(codexSearch.value.trim(), codexRarity.value);
  });

  shareButton.addEventListener("click", () => {
    if (!state.latestResult) {
      ui.setStatus("Run an analysis first to export a share card.", "warning");
      return;
    }
    const svg = buildShareCardSvg(state.latestResult);
    const filename = `gitdna-${state.latestResult.username}.svg`;
    downloadSvg(filename, svg);
    ui.setStatus("Share card downloaded.", "success");
  });

  copyEmbedButton.addEventListener("click", async () => {
    if (!state.latestResult?.embed_snippet) {
      ui.setStatus("Run an analysis first to copy embed code.", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(state.latestResult.embed_snippet);
      ui.setStatus("README embed snippet copied.", "success");
    } catch {
      ui.setStatus("Clipboard access failed. Copy from the snippet text.", "warning");
    }
  });

  ui.setLoading(false);
  const queryUsername = new URLSearchParams(window.location.search).get("user");
  if (queryUsername) {
    usernameInput.value = queryUsername;
    await analyzeLive(queryUsername, "");
    return;
  }

  await loadDemoProfile("torvalds", "Instant demo loaded. Run your own analysis above.");
}

init().catch((error) => {
  console.error(error);
  ui.setLoading(false);
  ui.showError("network_error", "Failed to initialize app data.");
});
