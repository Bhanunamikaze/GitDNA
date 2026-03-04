import { METRIC_LABELS } from "../config.js";
import { humanizeError, toPercent } from "../utils/format.js";

function setHidden(element, hidden) {
  if (!element) {
    return;
  }
  if (hidden) {
    element.classList.add("hidden");
  } else {
    element.classList.remove("hidden");
  }
}

function renderList(element, items) {
  element.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    element.appendChild(li);
  }
}

function normalizeTier(tier = "") {
  return String(tier).trim().toLowerCase();
}

function renderAchievementBadges(container, badges = [], fallback = []) {
  container.innerHTML = "";

  const source = badges.length
    ? badges
    : fallback.map((label) => ({
        label,
        tier: "bronze",
        points: 10,
        type: "fallback",
      }));

  for (const badge of source) {
    const article = document.createElement("article");
    const tierClass =
      badge.type === "combo" ? "badge-combo" : `badge-${normalizeTier(badge.tier) || "bronze"}`;
    article.className = `achievement-badge ${tierClass}`;

    const title = document.createElement("p");
    title.className = "title";
    title.textContent = badge.label || "Achievement";

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent =
      badge.type === "combo"
        ? "Combo Badge"
        : `${badge.track || "Track"} • ${badge.tier || "Tier"}`;

    const points = document.createElement("p");
    points.className = "points";
    points.textContent = `Impact +${badge.points ?? 0}`;

    article.append(title, meta, points);
    container.appendChild(article);
  }
}

function renderAchievementProgress(container, progress = []) {
  container.innerHTML = "";
  for (const item of progress) {
    const row = document.createElement("article");
    row.className = "progress-row";

    const head = document.createElement("div");
    head.className = "progress-head";

    const label = document.createElement("span");
    label.textContent = item.label || "Track";

    const next = document.createElement("span");
    if (item.nextTier === "Maxed") {
      next.textContent = "Maxed";
    } else {
      const target = Math.round((item.nextThreshold || 1) * 100);
      next.textContent = `${item.nextTier} at ${target}%`;
    }

    head.append(label, next);

    const track = document.createElement("div");
    track.className = "progress-track";

    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${Math.round((item.value || 0) * 100)}%`;
    track.appendChild(fill);

    row.append(head, track);
    container.appendChild(row);
  }
}

const SIGNAL_META = [
  {
    metric: "night_ratio",
    label: "Night Commits",
    x: "18%",
    y: "28%",
    delay: "0s",
    description: "Late-night coding tendency.",
  },
  {
    metric: "burstiness",
    label: "Repo Bursts",
    x: "82%",
    y: "28%",
    delay: "0.2s",
    description: "Frequency of intense commit sessions.",
  },
  {
    metric: "language_entropy",
    label: "Language Bias",
    x: "20%",
    y: "72%",
    delay: "0.4s",
    description: "Diversity across programming languages.",
  },
  {
    metric: "consistency",
    label: "Streak Engine",
    x: "80%",
    y: "72%",
    delay: "0.6s",
    description: "Consistency over active days.",
  },
  {
    metric: "impact_estimate",
    label: "Commit Impact",
    x: "50%",
    y: "14%",
    delay: "0.8s",
    description: "Influence based on repo and contribution signal.",
  },
  {
    metric: "cadence",
    label: "Maintainer Mode",
    x: "50%",
    y: "86%",
    delay: "1s",
    description: "Overall contribution cadence.",
  },
];

function renderConstellation(mapElement, detailElement, metrics = {}) {
  mapElement.innerHTML = "";

  const core = document.createElement("div");
  core.className = "dna-core";
  core.textContent = "DNA Core";
  mapElement.appendChild(core);

  for (const signal of SIGNAL_META) {
    const value = Number(metrics[signal.metric] || 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "signal-node";
    button.style.setProperty("--x", signal.x);
    button.style.setProperty("--y", signal.y);
    button.style.setProperty("--delay", signal.delay);
    button.textContent = `${signal.label} ${Math.round(value * 100)}%`;
    button.addEventListener("click", () => {
      detailElement.textContent = `${signal.label}: ${Math.round(value * 100)}% — ${signal.description}`;
    });
    mapElement.appendChild(button);
  }

  detailElement.textContent = "Select any signal node to inspect details.";
}

function renderMetricsTable(metricsTableBody, metrics) {
  metricsTableBody.innerHTML = "";
  for (const [key, value] of Object.entries(metrics)) {
    const row = document.createElement("tr");
    const labelCell = document.createElement("td");
    const valueCell = document.createElement("td");
    labelCell.textContent = METRIC_LABELS[key] || key;
    valueCell.textContent = toPercent(value);
    row.append(labelCell, valueCell);
    metricsTableBody.appendChild(row);
  }
}

export function createRenderer() {
  const elements = {
    status: document.querySelector("#status-banner"),
    loadingPanel: document.querySelector("#loading-panel"),
    loadingStage: document.querySelector("#loading-stage"),
    errorPanel: document.querySelector("#error-panel"),
    errorTitle: document.querySelector("#error-title"),
    errorMessage: document.querySelector("#error-message"),
    resultPanel: document.querySelector("#result-panel"),
    resultMode: document.querySelector("#result-mode"),
    username: document.querySelector("#result-username"),
    characterPreview: document.querySelector("#character-preview"),
    typeName: document.querySelector("#result-type-name"),
    aliasName: document.querySelector("#result-alias-name"),
    flavor: document.querySelector("#result-flavor"),
    confidenceMeter: document.querySelector("#confidence-meter"),
    confidenceLabel: document.querySelector("#confidence-label"),
    traits: document.querySelector("#traits-list"),
    counterTraits: document.querySelector("#counter-traits-list"),
    alternatives: document.querySelector("#alternatives-list"),
    achievementBadgeGrid: document.querySelector("#achievement-badge-grid"),
    achievementProgressGrid: document.querySelector("#achievement-progress-grid"),
    impactScoreLabel: document.querySelector("#impact-score-label"),
    impactScoreFill: document.querySelector("#impact-score-fill"),
    badgeCountLabel: document.querySelector("#badge-count-label"),
    constellationMap: document.querySelector("#constellation-map"),
    constellationDetail: document.querySelector("#constellation-detail"),
    metricsTableBody: document.querySelector("#metrics-table tbody"),
    shareButton: document.querySelector("#share-card-button"),
    copyEmbedButton: document.querySelector("#copy-embed-button"),
    codexLinkButton: document.querySelector("#codex-link-button"),
    embedSnippet: document.querySelector("#embed-snippet"),
    a11ySummary: document.querySelector("#a11y-summary-text"),
  };

  function setStatus(text, kind = "info") {
    if (!text) {
      setHidden(elements.status, true);
      return;
    }
    elements.status.className = `status ${kind}`;
    elements.status.textContent = text;
    setHidden(elements.status, false);
  }

  function setLoading(active, stage = "") {
    if (!active) {
      setHidden(elements.loadingPanel, true);
      return;
    }
    elements.loadingStage.textContent = stage || "Preparing analysis engine";
    setHidden(elements.loadingPanel, false);
  }

  function setLoadingStage(stage) {
    elements.loadingStage.textContent = stage;
  }

  function showError(errorType, message = "") {
    const readable = humanizeError(errorType);
    elements.errorTitle.textContent = readable;
    elements.errorMessage.textContent = message || "Try a demo profile or adjust input.";
    setHidden(elements.errorPanel, false);
    setHidden(elements.resultPanel, true);
  }

  function hideError() {
    setHidden(elements.errorPanel, true);
  }

  function showResult(payload) {
    elements.username.textContent = `@${payload.username}`;
    elements.typeName.textContent = payload.type_name;
    elements.aliasName.textContent = payload.alias_name;
    elements.flavor.textContent = payload.flavor_text || "";
    elements.confidenceMeter.value = Math.round(payload.confidence * 100);
    elements.confidenceLabel.textContent = toPercent(payload.confidence);

    const modeText = payload.is_demo
      ? "Demo Snapshot"
      : payload.partial_data
        ? "Live Analysis (Partial Data)"
        : "Live Analysis";
    elements.resultMode.textContent = modeText;
    elements.resultMode.className = payload.partial_data ? "pill warning" : "pill";

    renderList(elements.traits, payload.traits || []);
    renderList(elements.counterTraits, payload.counter_traits || []);
    renderList(
      elements.alternatives,
      payload.top3?.map((entry) => entry.replace(/_/g, " ")) || []
    );
    renderAchievementBadges(
      elements.achievementBadgeGrid,
      payload.achievement_badges || [],
      payload.achievements || []
    );
    renderAchievementProgress(elements.achievementProgressGrid, payload.achievement_progress || []);
    renderConstellation(
      elements.constellationMap,
      elements.constellationDetail,
      payload.metrics || {}
    );
    renderMetricsTable(elements.metricsTableBody, payload.metrics || {});
    elements.embedSnippet.textContent = payload.embed_snippet || "";
    elements.a11ySummary.textContent = payload.accessibility_summary || "";
    const impact = Number(payload.achievement_impact_score || 0);
    const count = (payload.achievement_badges || []).length || (payload.achievements || []).length;
    elements.impactScoreLabel.textContent = `${impact}`;
    elements.badgeCountLabel.textContent = `${count} badges`;
    elements.impactScoreFill.style.width = `${Math.min(100, Math.round((impact / 500) * 100))}%`;

    setHidden(elements.resultPanel, false);
    setHidden(elements.errorPanel, true);
    elements.resultPanel.classList.remove("result-reveal");
    requestAnimationFrame(() => {
      elements.resultPanel.classList.add("result-reveal");
    });
  }

  return {
    setStatus,
    setLoading,
    setLoadingStage,
    showError,
    hideError,
    showResult,
    elements,
  };
}
