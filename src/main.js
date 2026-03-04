import { evaluateAchievements } from "./analysis/achievements.js";
import { computeMetrics } from "./analysis/metrics.js";
import { resolveType } from "./analysis/scoring.js";
import { fetchLiveProfile, hasInsufficientData } from "./api/github.js";
import {
  ANALYSIS_VERSION,
  DEMO_PROFILES,
  FETCH_LIMITS,
  UNAUTH_FETCH_LIMITS,
} from "./config.js";
import { getCachedAnalysis, setCachedAnalysis } from "./state/cache.js";
import { renderCharacter, setCharacterConfig } from "./ui/character.js";
import { createRenderer } from "./ui/render.js";
import {
  buildReadmeEmbedSnippet,
  buildShareCardSvg,
  downloadSvg,
} from "./ui/shareCard.js";

const state = {
  centroids: null,
  types: null,
  latestResult: null,
};

const ui = createRenderer();
const SESSION_PAT_KEY = "gitdna:session_pat";

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function normalizeResult(profile, scoring, achievementData, metricsResult, options = {}) {
  const basePath = window.location.pathname
    .replace(/\/index\.html$/, "")
    .replace(/\/$/, "");
  const baseUrl = `${window.location.origin}${basePath}`;
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
    achievement_badges: achievementData.badges,
    achievement_progress: achievementData.progress,
    achievement_impact_score: achievementData.impactScore,
    metrics: metricsResult.metrics,
    partial_data: options.partialData || false,
    is_demo: options.isDemo || false,
    embed_snippet: buildReadmeEmbedSnippet(baseUrl, profile.username),
    accessibility_summary: [
      `Primary type: ${scoring.typeName}.`,
      `Top strengths: ${scoring.drivers.join(", ")}.`,
      `Watch areas: ${scoring.suppressors.join(", ")}.`,
      `Confidence: ${Math.round((options.lowConfidence ? Math.min(scoring.confidence, 0.35) : scoring.confidence) * 100)}%.`,
    ].join(" "),
  };
}

function statusForError(errorType) {
  if (errorType === "rate_limited") {
    return "Rate limit reached for this IP. Paste a PAT above and retry, then you will get live analysis instead of fallback.";
  }
  if (errorType === "network_error") {
    return "Network issue detected. Showing a demo profile.";
  }
  return "";
}

function resolveFetchLimits(token) {
  return token && token.trim() ? FETCH_LIMITS : UNAUTH_FETCH_LIMITS;
}

function applyResultDecorations(result) {
  renderCharacter(ui.elements.characterPreview, result.type_id, result.type_name);
  if (ui.elements.codexLinkButton) {
    ui.elements.codexLinkButton.href = `./codex.html?type=${encodeURIComponent(result.type_id)}`;
  }
  state.latestResult = result;
}

async function loadDemoProfile(profileId = "torvalds", note = "", kind = "warning") {
  const demo = await loadJson(`./data/profiles/demo_${profileId}.json`);
  demo.is_demo = true;
  if (!Array.isArray(demo.achievement_badges) && Array.isArray(demo.achievements)) {
    demo.achievement_badges = demo.achievements.map((label) => ({
      label,
      tier: "Bronze",
      points: 10,
      type: "fallback",
    }));
  }
  if (typeof demo.achievement_impact_score !== "number") {
    demo.achievement_impact_score = (demo.achievement_badges || []).reduce(
      (sum, item) => sum + Number(item.points || 0),
      0
    );
  }
  ui.showResult(demo);
  applyResultDecorations(demo);
  ui.setStatus(note || `Showing demo profile: ${demo.username}`, kind);
}

async function analyzeLive(username, token) {
  const cached = getCachedAnalysis(username, ANALYSIS_VERSION);
  if (cached) {
    ui.showResult(cached);
    applyResultDecorations(cached);
    ui.setStatus(`Loaded cached analysis for @${username}`, "success");
    return;
  }

  ui.setLoading(true, "Fetching repositories");
  const liveResult = await fetchLiveProfile(username, {
    token,
    limits: resolveFetchLimits(token),
  });
  if (!liveResult.ok) {
    ui.setLoading(false);

    if (liveResult.errorType === "rate_limited") {
      await loadDemoProfile(
        "torvalds",
        statusForError(liveResult.errorType),
        "warning"
      );
      return;
    }

    ui.showError(
      liveResult.errorType,
      liveResult.errorType === "network_error"
        ? "Check network access or use demo mode."
        : "Try a demo profile or adjust input."
    );
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
  applyResultDecorations(normalized);
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

  const [centroids, types, shapeData, paletteData] = await Promise.all([
    loadJson("./data/dna/centroids.json"),
    loadJson("./data/dna/types_100.json"),
    loadJson("./data/characters/archetype_shapes.json"),
    loadJson("./data/characters/modifier_palettes.json"),
  ]);

  state.centroids = centroids;
  state.types = types;
  setCharacterConfig({
    archetypes: shapeData.archetypes,
    modifiers: paletteData.modifiers,
  });

  const form = document.querySelector("#analyze-form");
  const usernameInput = document.querySelector("#username-input");
  const patInput = document.querySelector("#pat-input");
  const demoButton = document.querySelector("#demo-button");
  const shareButton = ui.elements.shareButton;
  const copyEmbedButton = ui.elements.copyEmbedButton;

  const sessionPat = sessionStorage.getItem(SESSION_PAT_KEY) || "";
  if (sessionPat) {
    patInput.value = sessionPat;
    ui.setStatus("Session PAT loaded for higher API limits.", "info");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    ui.hideError();
    const username = usernameInput.value.trim();
    const token = patInput.value.trim();

    if (!username) {
      ui.showError("invalid_input");
      return;
    }

    if (token) {
      sessionStorage.setItem(SESSION_PAT_KEY, token);
    }

    await analyzeLive(username, token);
  });

  demoButton.addEventListener("click", async () => {
    ui.hideError();
    await loadDemoProfile(getSelectedDemoProfile(), "", "info");
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

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      usernameInput.focus();
      usernameInput.select();
    }
  });

  ui.setLoading(false);
  const queryUsername = new URLSearchParams(window.location.search).get("user");
  if (queryUsername) {
    usernameInput.value = queryUsername;
    await analyzeLive(queryUsername, sessionPat);
    return;
  }

  await loadDemoProfile(
    "torvalds",
    "Instant demo loaded. Run your own analysis above.",
    "info"
  );
}

init().catch((error) => {
  console.error(error);
  ui.setLoading(false);
  ui.showError("network_error", "Failed to initialize app data.");
});
