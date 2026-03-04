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
    achievements: document.querySelector("#achievement-list"),
    achievementProgress: document.querySelector("#achievement-progress-list"),
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
    renderList(elements.achievements, payload.achievements || []);
    renderList(
      elements.achievementProgress,
      (payload.achievement_progress || []).map((item) => {
        if (item.nextTier === "Maxed") {
          return `${item.label}: Maxed`;
        }
        const current = Math.round(item.value * 100);
        const target = Math.round(item.nextThreshold * 100);
        return `${item.label}: ${current}% -> ${item.nextTier} at ${target}%`;
      })
    );
    renderMetricsTable(elements.metricsTableBody, payload.metrics || {});
    elements.embedSnippet.textContent = payload.embed_snippet || "";
    elements.a11ySummary.textContent = payload.accessibility_summary || "";

    setHidden(elements.resultPanel, false);
    setHidden(elements.errorPanel, true);
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
