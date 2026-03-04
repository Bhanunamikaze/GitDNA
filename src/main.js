import { evaluateAchievements } from "./analysis/achievements.js";
import { computeMetrics } from "./analysis/metrics.js";
import { resolveType } from "./analysis/scoring.js";
import { fetchLiveProfile, hasInsufficientData } from "./api/github.js";
import { ANALYSIS_VERSION, DEMO_PROFILES } from "./config.js";
import { getCachedAnalysis, setCachedAnalysis } from "./state/cache.js";
import { createCodexController } from "./ui/codex.js";
import { createRenderer } from "./ui/render.js";
import { prettifyKey } from "./utils/format.js";

const state = {
  centroids: null,
  types: null,
  codex: null,
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
  ui.setStatus(note || `Showing demo profile: ${demo.username}`, "warning");
}

async function analyzeLive(username, token) {
  const cached = getCachedAnalysis(username, ANALYSIS_VERSION);
  if (cached) {
    ui.showResult(cached);
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

  ui.setLoading(false);
  await loadDemoProfile("torvalds", "Instant demo loaded. Run your own analysis above.");
}

init().catch((error) => {
  console.error(error);
  ui.setLoading(false);
  ui.showError("network_error", "Failed to initialize app data.");
});
