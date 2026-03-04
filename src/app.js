import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { AnimatePresence, motion } from "https://esm.sh/framer-motion@11.11.17";
import htm from "https://esm.sh/htm@3.1.1";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "https://esm.sh/d3-force@3.0.0";

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
import { setCharacterConfig, buildCharacterSvg } from "./ui/character.js";
import { buildReadmeEmbedSnippet } from "./ui/shareCard.js";

const html = htm.bind(React.createElement);

const SCAN_STAGES = [
  "Analyzing commit genome...",
  "Extracting activity signals...",
  "Building developer identity...",
];

const SIGNAL_CONFIG = [
  {
    key: "night_ratio",
    label: "Night Commits",
    description: "Measures late-hour contribution tendency.",
    angle: -80,
  },
  {
    key: "burstiness",
    label: "Repo Bursts",
    description: "Tracks clustered shipping spikes across repositories.",
    angle: -25,
  },
  {
    key: "language_entropy",
    label: "Language Bias",
    description: "Represents language diversity across coding activity.",
    angle: 25,
  },
  {
    key: "impact_estimate",
    label: "Commit Impact",
    description: "Derived from contribution influence and repository signal.",
    angle: 85,
  },
  {
    key: "consistency",
    label: "Streak Engine",
    description: "Indicates contribution consistency over time.",
    angle: 145,
  },
  {
    key: "cadence",
    label: "Maintainer Mode",
    description: "Reflects sustained commit cadence and rhythm.",
    angle: -145,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getBaseUrl() {
  const basePath = window.location.pathname
    .replace(/\/index\.html$/, "")
    .replace(/\/$/, "");
  return `${window.location.origin}${basePath}`;
}

function getCacheKey(username) {
  return `gitdna:react:${ANALYSIS_VERSION}:${String(username || "").toLowerCase()}`;
}

function getCachedResult(username) {
  try {
    const raw = localStorage.getItem(getCacheKey(username));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !parsed?.createdAt) {
      return null;
    }
    const age = Date.now() - parsed.createdAt;
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getCacheKey(username));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedResult(username, data) {
  try {
    localStorage.setItem(
      getCacheKey(username),
      JSON.stringify({
        createdAt: Date.now(),
        data,
      })
    );
  } catch {
    // ignore cache failure
  }
}

function getDemoId() {
  const day = new Date().getUTCDate();
  return DEMO_PROFILES[day % DEMO_PROFILES.length] || "torvalds";
}

function achievementSummary(achievementData) {
  const labels = [
    ...achievementData.unlocked.map((item) => item.label),
    ...achievementData.combos.map((item) => item.label),
  ];
  return {
    labels,
    badges: achievementData.badges,
    progress: achievementData.progress,
    impactScore: achievementData.impactScore,
  };
}

function normalizeResult(profile, scoring, achievementData, metricsResult, options = {}) {
  const baseUrl = getBaseUrl();
  const summary = achievementSummary(achievementData);
  const confidence = options.lowConfidence
    ? Math.min(scoring.confidence, 0.35)
    : scoring.confidence;

  return {
    username: profile.username,
    avatarUrl: profile.avatarUrl || `https://github.com/${profile.username}.png?size=160`,
    typeId: scoring.typeId,
    typeName: scoring.typeName,
    aliasName: scoring.aliasName,
    flavorText: scoring.flavorText,
    confidence,
    traits: scoring.drivers,
    counterTraits: scoring.suppressors,
    alternatives: scoring.alternatives,
    metrics: metricsResult.metrics,
    achievementBadges: summary.badges,
    achievementProgress: summary.progress,
    achievementImpactScore: summary.impactScore,
    achievementLabels: summary.labels,
    isDemo: options.isDemo || false,
    partialData: options.partialData || false,
    badgeMarkdown: buildReadmeEmbedSnippet(baseUrl, profile.username),
  };
}

function scoreFromDemoPayload(demoPayload) {
  return {
    username: demoPayload.username,
    avatarUrl: `https://github.com/${demoPayload.username}.png?size=160`,
    typeId: demoPayload.type_id,
    typeName: demoPayload.type_name,
    aliasName: demoPayload.alias_name,
    flavorText: demoPayload.flavor_text,
    confidence: demoPayload.confidence,
    traits: demoPayload.traits || [],
    counterTraits: demoPayload.counter_traits || [],
    alternatives: demoPayload.top3 || [],
    metrics: demoPayload.metrics || {},
    achievementBadges: Array.isArray(demoPayload.achievement_badges)
      ? demoPayload.achievement_badges
      : (demoPayload.achievements || []).map((label) => ({
          label,
          tier: "Bronze",
          points: 10,
          type: "fallback",
        })),
    achievementProgress: demoPayload.achievement_progress || [],
    achievementImpactScore:
      demoPayload.achievement_impact_score ||
      (demoPayload.achievements || []).length * 10,
    achievementLabels: demoPayload.achievements || [],
    isDemo: true,
    partialData: false,
    badgeMarkdown: buildReadmeEmbedSnippet(getBaseUrl(), demoPayload.username),
  };
}

function useConstellation(metrics) {
  const [graph, setGraph] = useState({ nodes: [], links: [] });

  useEffect(() => {
    const width = 880;
    const height = 360;
    const radius = 125;

    const nodes = [
      {
        id: "core",
        label: "DNA Core",
        core: true,
        x: width / 2,
        y: height / 2,
        fx: width / 2,
        fy: height / 2,
      },
      ...SIGNAL_CONFIG.map((signal) => {
        const rad = (signal.angle * Math.PI) / 180;
        return {
          id: signal.key,
          label: signal.label,
          metric: signal.key,
          value: clamp(Number(metrics?.[signal.key] || 0), 0, 1),
          description: signal.description,
          x: width / 2 + Math.cos(rad) * radius,
          y: height / 2 + Math.sin(rad) * radius,
        };
      }),
    ];

    const links = SIGNAL_CONFIG.map((signal) => ({
      source: "core",
      target: signal.key,
    }));

    const simulation = forceSimulation(nodes)
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "link",
        forceLink(links)
          .id((node) => node.id)
          .distance((link) =>
            link.target?.id === "core" || link.source?.id === "core" ? 120 : 140
          )
          .strength(0.78)
      )
      .force(
        "collision",
        forceCollide().radius((node) => (node.core ? 56 : 40))
      )
      .alpha(1)
      .alphaDecay(0.03);

    let raf = 0;
    const update = () => {
      setGraph({
        nodes: nodes.map((node) => ({ ...node })),
        links: links.map((link) => ({
          source: typeof link.source === "object" ? link.source.id : link.source,
          target: typeof link.target === "object" ? link.target.id : link.target,
        })),
      });
    };

    simulation.on("tick", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    });

    update();

    return () => {
      cancelAnimationFrame(raf);
      simulation.stop();
    };
  }, [metrics]);

  return graph;
}

function ConstellationGraph({ metrics }) {
  const graph = useConstellation(metrics);
  const [selected, setSelected] = useState(null);

  const nodeById = useMemo(() => {
    const map = new Map();
    for (const node of graph.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [graph.nodes]);

  const selectedNode = selected ? nodeById.get(selected) : null;

  return html`
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 constellation-bg constellation-stars">
        <svg viewBox="0 0 880 360" className="w-full h-[340px] md:h-[360px]">
          ${graph.links.map((link) => {
            const source = nodeById.get(link.source);
            const target = nodeById.get(link.target);
            if (!source || !target) {
              return null;
            }
            return html`<line
              key=${`${link.source}-${link.target}`}
              className="link-glow"
              x1=${source.x}
              y1=${source.y}
              x2=${target.x}
              y2=${target.y}
            />`;
          })}

          ${graph.nodes.map((node) => {
            if (node.core) {
              return html`<g key="core">
                <circle cx=${node.x} cy=${node.y} r="48" fill="rgba(20,184,166,0.35)" />
                <circle cx=${node.x} cy=${node.y} r="40" fill="url(#coreGlow)" />
                <text
                  x=${node.x}
                  y=${node.y + 6}
                  text-anchor="middle"
                  fill="#ecfeff"
                  font-family="JetBrains Mono"
                  font-size="13"
                  font-weight="700"
                >
                  DNA Core
                </text>
              </g>`;
            }

            const pct = Math.round((node.value || 0) * 100);
            return html`<g
              key=${node.id}
              style=${{ cursor: "pointer" }}
              onClick=${() => setSelected(node.id)}
            >
              <circle
                cx=${node.x}
                cy=${node.y}
                r="24"
                fill="rgba(15,23,42,0.78)"
                stroke="rgba(34,211,238,0.78)"
                stroke-width="1.5"
              />
              <circle cx=${node.x} cy=${node.y} r="4" fill="#22d3ee" />
              <text
                x=${node.x}
                y=${node.y - 30}
                text-anchor="middle"
                fill="#dbeafe"
                font-size="11"
                font-family="IBM Plex Sans"
                font-weight="600"
              >
                ${node.label}
              </text>
              <text
                x=${node.x}
                y=${node.y + 42}
                text-anchor="middle"
                fill="#fde68a"
                font-size="12"
                font-family="JetBrains Mono"
                font-weight="700"
              >
                ${pct}%
              </text>
            </g>`;
          })}

          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="45%" r="58%">
              <stop offset="0%" stop-color="#22d3ee" />
              <stop offset="100%" stop-color="#0f766e" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
        ${selectedNode
          ? html`
              <p className="text-lg font-semibold text-cyan-300">${selectedNode.label}</p>
              <p className="text-slate-300 mt-1">${selectedNode.description}</p>
            `
          : html`<p className="text-slate-300">Select any signal node to inspect its metric meaning.</p>`}
      </div>
    </div>
  `;
}

function TraitPill({ label, tone = "default" }) {
  const tones = {
    default: "bg-cyan-500/12 border-cyan-400/30 text-cyan-100",
    counter: "bg-amber-500/12 border-amber-400/30 text-amber-100",
    alt: "bg-violet-500/12 border-violet-400/30 text-violet-100",
  };

  return html`
    <span className=${`inline-flex rounded-full border px-3 py-1 text-sm font-medium ${
      tones[tone] || tones.default
    }`}>
      ${label}
    </span>
  `;
}

function formatTypeId(id) {
  return String(id || "").replace(/_/g, " ");
}

function tierTone(tier) {
  const value = String(tier || "").toLowerCase();
  if (value.includes("mythic")) {
    return "from-fuchsia-500/20 to-violet-500/10 border-fuchsia-300/40 text-fuchsia-100";
  }
  if (value.includes("gold")) {
    return "from-amber-500/20 to-amber-500/10 border-amber-300/40 text-amber-100";
  }
  if (value.includes("silver")) {
    return "from-slate-300/20 to-slate-500/10 border-slate-300/40 text-slate-100";
  }
  return "from-orange-500/20 to-amber-700/10 border-orange-300/40 text-orange-100";
}

function metricPercent(value) {
  return Math.round(clamp(Number(value || 0), 0, 1) * 100);
}

function App() {
  const [username, setUsername] = useState("");
  const [phase, setPhase] = useState("landing");
  const [scanStage, setScanStage] = useState(SCAN_STAGES[0]);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [modelReady, setModelReady] = useState(false);

  const dataRef = useRef({
    centroids: null,
    types: null,
  });

  useEffect(() => {
    async function boot() {
      try {
        const [centroids, types, shapeData, paletteData] = await Promise.all([
          fetch("./data/dna/centroids.json").then((r) => r.json()),
          fetch("./data/dna/types_100.json").then((r) => r.json()),
          fetch("./data/characters/archetype_shapes.json").then((r) => r.json()),
          fetch("./data/characters/modifier_palettes.json").then((r) => r.json()),
        ]);

        setCharacterConfig({
          archetypes: shapeData.archetypes,
          modifiers: paletteData.modifiers,
        });

        dataRef.current.centroids = centroids;
        dataRef.current.types = types;
        setModelReady(true);

        const queryUser = new URLSearchParams(window.location.search).get("user");
        if (queryUser) {
          setUsername(queryUser);
          runScan(queryUser, { skipReadyCheck: true });
        }
      } catch (error) {
        console.error(error);
        setStatus({
          kind: "error",
          text: "Failed to boot DNA model. Refresh and retry.",
        });
      }
    }

    boot();
  }, []);

  const promptToken = () => {
    const token = window.prompt(
      "Paste GitHub PAT for higher API limits (stored only in this tab)."
    );
    if (token && token.trim()) {
      sessionStorage.setItem("gitdna:session_pat", token.trim());
      setStatus({
        kind: "info",
        text: "Token stored for this tab. Scan again for live analysis.",
      });
    }
  };

  const loadDemo = async (demoId, message) => {
    const demoPayload = await fetch(`./data/profiles/demo_${demoId}.json`).then((r) => r.json());
    const demo = scoreFromDemoPayload(demoPayload);
    setResult(demo);
    setPhase("result");
    setStatus({ kind: "warning", text: message || `Showing demo profile: ${demo.username}` });
  };

  const runAnalysis = async (name) => {
    const cleanName = String(name || "").replace("@", "").trim();
    if (!cleanName) {
      throw new Error("Enter a GitHub username.");
    }

    const cached = getCachedResult(cleanName);
    if (cached) {
      setStatus({ kind: "success", text: `Loaded cached DNA for @${cleanName}` });
      return cached;
    }

    const token = sessionStorage.getItem("gitdna:session_pat") || "";
    const limits = token ? FETCH_LIMITS : UNAUTH_FETCH_LIMITS;

    const live = await fetchLiveProfile(cleanName, { token, limits });

    if (!live.ok) {
      if (live.errorType === "rate_limited") {
        if (!token) {
          await loadDemo(
            getDemoId(),
            "Rate limit reached for public API. Add a token for instant live results."
          );
          return null;
        }
        throw new Error("GitHub rate limit reached. Retry in a few minutes.");
      }

      if (live.errorType === "user_not_found") {
        throw new Error("GitHub username not found.");
      }

      throw new Error("Unable to fetch live profile right now.");
    }

    const metricsResult = computeMetrics(live.data);
    const lowConfidence = hasInsufficientData(live.data);
    const scoring = resolveType(
      metricsResult.vector,
      dataRef.current.centroids,
      dataRef.current.types
    );
    const achievements = evaluateAchievements(metricsResult.metrics, scoring);

    const normalized = normalizeResult(
      {
        username: cleanName,
        avatarUrl: live.data.user.avatarUrl,
      },
      scoring,
      achievements,
      metricsResult,
      {
        lowConfidence,
        partialData: live.data.meta.partialData,
      }
    );

    setCachedResult(cleanName, normalized);
    return normalized;
  };

  const runScan = async (forcedName = null, options = {}) => {
    if (!modelReady && !options.skipReadyCheck) {
      setStatus({ kind: "info", text: "Booting DNA model..." });
      return;
    }

    const name = (forcedName || username || "").trim();
    if (!name) {
      setStatus({ kind: "error", text: "Enter a GitHub username to scan." });
      return;
    }

    setPhase("scanning");
    setStatus(null);

    let stageIndex = 0;
    setScanStage(SCAN_STAGES[0]);
    const stageTimer = setInterval(() => {
      stageIndex = (stageIndex + 1) % SCAN_STAGES.length;
      setScanStage(SCAN_STAGES[stageIndex]);
    }, 1100);

    try {
      const minDelay = new Promise((resolve) => setTimeout(resolve, 2800));
      const resultPromise = runAnalysis(name);
      const [analysisResult] = await Promise.all([resultPromise, minDelay]);

      clearInterval(stageTimer);
      if (analysisResult) {
        setResult(analysisResult);
        setPhase("result");
        setStatus({ kind: "success", text: `DNA reveal complete for @${analysisResult.username}` });
      }
    } catch (error) {
      clearInterval(stageTimer);
      setPhase("landing");
      setStatus({ kind: "error", text: error.message || "Scan failed." });
    }
  };

  const copyBadgeMarkdown = async () => {
    if (!result?.badgeMarkdown) {
      return;
    }
    try {
      await navigator.clipboard.writeText(result.badgeMarkdown);
      setStatus({ kind: "success", text: "Markdown badge copied." });
    } catch {
      setStatus({ kind: "warning", text: "Clipboard blocked. Copy manually." });
    }
  };

  const statusClass =
    status?.kind === "error"
      ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
      : status?.kind === "warning"
        ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
        : status?.kind === "success"
          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
          : "border-cyan-400/40 bg-cyan-500/10 text-cyan-100";

  return html`
    <div className="relative">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12 space-y-8">
        <header className="glass-panel rounded-3xl p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-cyan-300/80">
                GitDNA Scanner
              </p>
              <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">
                Your GitHub commit history has a personality.
              </h1>
              <p className="text-slate-300 text-base md:text-lg max-w-xl">
                Scan your GitHub and reveal your developer DNA.
              </p>

              <div className="space-y-3 max-w-lg">
                <label htmlFor="username" className="text-sm font-semibold text-slate-300">
                  GitHub Username
                </label>
                <input
                  id="username"
                  type="text"
                  value=${username}
                  onInput=${(event) => setUsername(event.target.value)}
                  placeholder="torvalds"
                  className="w-full rounded-xl border border-slate-600/80 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none ring-0 focus:border-cyan-400"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick=${() => runScan()}
                    disabled=${!modelReady}
                    className="rounded-xl px-5 py-3 font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 disabled:opacity-45"
                  >
                    Scan My GitHub DNA
                  </button>
                  <button
                    onClick=${() => loadDemo(getDemoId(), "Demo profile loaded instantly.")}
                    className="rounded-xl px-4 py-3 font-semibold border border-slate-500/60 text-slate-100 bg-slate-900/60"
                  >
                    Try Demo
                  </button>
                  <button
                    onClick=${promptToken}
                    className="rounded-xl px-4 py-3 font-semibold border border-cyan-400/40 text-cyan-200 bg-cyan-400/10"
                  >
                    Add Token
                  </button>
                  <a href="./codex.html" className="rounded-xl px-4 py-3 font-semibold border border-violet-400/40 text-violet-200 bg-violet-500/10">
                    DNA Codex
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="core-shell">
                <div className="core-ring"></div>
                <div className="core-ring ring-2"></div>
                <div className="core-ring ring-3"></div>
                <div className="core-node">DNA Core</div>
                <div className="core-particles" aria-hidden="true">
                  ${[...new Array(14)].map(
                    (_, index) =>
                      html`<span
                        key=${index}
                        style=${{
                          "--x": `${10 + ((index * 13) % 80)}%`,
                          "--y": `${8 + ((index * 19) % 84)}%`,
                          "--delay": `${(index % 7) * 0.22}s`,
                        }}
                      ></span>`
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        ${status
          ? html`<div className=${`rounded-2xl border px-4 py-3 text-sm ${statusClass}`}>${status.text}</div>`
          : null}

        <${AnimatePresence}>
          ${phase === "scanning"
            ? html`
                <${motion.div}
                  key="scan-overlay"
                  initial=${{ opacity: 0 }}
                  animate=${{ opacity: 1 }}
                  exit=${{ opacity: 0 }}
                  className="fixed inset-0 z-50 grid place-items-center bg-slate-950/88 backdrop-blur-sm px-4"
                >
                  <${motion.div}
                    initial=${{ y: 20, opacity: 0 }}
                    animate=${{ y: 0, opacity: 1 }}
                    className="glass-panel w-full max-w-xl rounded-3xl p-8 text-center space-y-5"
                  >
                    <p className="text-sm uppercase tracking-[0.16em] text-cyan-300/85">GitHub DNA Scan In Progress</p>
                    <div className="scan-helix"></div>
                    <${motion.p}
                      key=${scanStage}
                      initial=${{ opacity: 0, y: 10 }}
                      animate=${{ opacity: 1, y: 0 }}
                      exit=${{ opacity: 0, y: -6 }}
                      className="text-2xl md:text-3xl font-display font-semibold text-cyan-100"
                    >
                      ${scanStage}
                    </${motion.p}>
                  </${motion.div}>
                </${motion.div}>
              `
            : null}
        </${AnimatePresence}>

        <${AnimatePresence}>
          ${result
            ? html`
                <${motion.section}
                  key="result"
                  initial=${{ opacity: 0, y: 18 }}
                  animate=${{ opacity: 1, y: 0 }}
                  exit=${{ opacity: 0, y: 12 }}
                  className="space-y-6"
                >
                  <article className="glass-panel rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-cyan-300/85">
                        DNA Reveal
                      </p>
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm font-semibold text-cyan-300"
                      >
                        Star on GitHub
                      </a>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[130px_1fr] items-center">
                      <div className="relative">
                        <div
                          className="h-28 w-28 rounded-[2rem] overflow-hidden border border-cyan-300/45 shadow-glow"
                          dangerouslySetInnerHTML=${{
                            __html: buildCharacterSvg(result.typeId, result.typeName),
                          }}
                        ></div>
                        <img
                          src=${result.avatarUrl}
                          alt=${`${result.username} avatar`}
                          className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full border border-cyan-300/50"
                        />
                      </div>

                      <div>
                        <p className="text-slate-300 text-sm">@${result.username}</p>
                        <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
                          ${result.typeName}
                        </h2>
                        <p className="text-cyan-300 text-lg font-semibold">${result.aliasName}</p>
                        <p className="text-slate-300 mt-2 max-w-3xl">${result.flavorText}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">Confidence</span>
                        <span className="font-mono text-cyan-200">${Math.round(result.confidence * 100)}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-700/70 overflow-hidden">
                        <${motion.div}
                          initial=${{ width: 0 }}
                          animate=${{ width: `${Math.round(result.confidence * 100)}%` }}
                          transition=${{ duration: 1.2, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-amber-300"
                        />
                      </div>
                    </div>

                    <div className="reveal-orbit" aria-hidden="true">
                      <span className="ring"></span>
                      <span className="ring ring-2"></span>
                    </div>
                  </article>

                  <article className="glass-panel rounded-3xl p-6 md:p-8 space-y-4">
                    <div>
                      <h3 className="font-display text-2xl font-bold">GitHub Signal Constellation</h3>
                      <p className="text-slate-300 mt-1">
                        Nodes orbit around your DNA core. Click any signal for insight.
                      </p>
                    </div>
                    <${ConstellationGraph} metrics=${result.metrics} />
                  </article>

                  <article className="glass-panel rounded-3xl p-6 md:p-8 space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-bold">Achievement Impact</h3>
                        <p className="text-slate-300 mt-1">
                          Unlock tiers and combo badges based on your GitHub signal quality.
                        </p>
                      </div>
                      <div className="signal-chip rounded-xl px-4 py-2 text-right">
                        <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Impact Score</p>
                        <p className="font-mono text-2xl text-amber-300">
                          ${result.achievementImpactScore}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      ${result.achievementBadges.length > 0
                        ? result.achievementBadges.slice(0, 6).map(
                            (badge) => html`
                              <div
                                key=${badge.id || badge.label}
                                className=${`rounded-xl border p-3 bg-gradient-to-r ${tierTone(badge.tier)}`}
                              >
                                <p className="text-sm font-semibold">${badge.label}</p>
                                <div className="mt-2 flex items-center justify-between text-xs">
                                  <span className="uppercase tracking-[0.09em]">${badge.tier || "Bronze"}</span>
                                  <span className="font-mono">${badge.points || 0} pts</span>
                                </div>
                              </div>
                            `
                          )
                        : html`
                            <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-slate-300 sm:col-span-2 lg:col-span-3">
                              No achievements unlocked yet. More activity unlocks higher tiers.
                            </div>
                          `}
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      ${result.achievementProgress.slice(0, 6).map(
                        (track) => html`
                          <div key=${track.id} className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-slate-100">${track.label}</span>
                              <span className="font-mono text-cyan-200">${metricPercent(track.value)}%</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-slate-700/70 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                                style=${{ width: `${metricPercent(track.value)}%` }}
                              ></div>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                              Next tier: ${track.nextTier}
                            </p>
                          </div>
                        `
                      )}
                    </div>
                  </article>

                  <article className="glass-panel rounded-3xl p-6 md:p-8 grid gap-6 lg:grid-cols-3">
                    <div>
                      <h4 className="text-sm uppercase tracking-[0.12em] text-cyan-300">Top Traits</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        ${result.traits.map((label) => html`<${TraitPill} key=${label} label=${label} />`)}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm uppercase tracking-[0.12em] text-amber-300">Counter Traits</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        ${result.counterTraits.map(
                          (label) => html`<${TraitPill} key=${label} label=${label} tone="counter" />`
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm uppercase tracking-[0.12em] text-violet-300">Alternative Personalities</h4>
                      <div className="mt-3 flex flex-wrap gap-2">
                        ${result.alternatives.map(
                          (label) =>
                            html`<${TraitPill}
                              key=${label}
                              label=${formatTypeId(label)}
                              tone="alt"
                            />`
                        )}
                      </div>
                    </div>
                  </article>

                  <article className="glass-panel rounded-3xl p-6 md:p-8 space-y-5">
                    <div>
                      <h3 className="font-display text-2xl font-bold">Your GitHub DNA Badge</h3>
                      <p className="text-slate-300 mt-1">
                        Add this badge to your profile README and link back to GitDNA.
                      </p>
                    </div>

                    <div className="badge-card rounded-2xl p-4 md:p-5 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-cyan-300">GitDNA Profile</p>
                        <p className="font-display text-2xl font-bold text-white">${result.typeName}</p>
                        <p className="text-cyan-200">${result.aliasName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-300">Impact Score</p>
                        <p className="font-mono text-2xl text-amber-300">${result.achievementImpactScore}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-200">Markdown</p>
                      <pre className="rounded-xl border border-slate-700 bg-slate-900/75 p-3 text-xs md:text-sm overflow-auto text-cyan-100">${result.badgeMarkdown}</pre>
                    </div>

                    <button
                      onClick=${copyBadgeMarkdown}
                      className="rounded-xl px-4 py-3 font-semibold bg-gradient-to-r from-violet-500 to-cyan-500 text-slate-950"
                    >
                      Copy Markdown Badge
                    </button>
                  </article>
                </${motion.section}>
              `
            : null}
        </${AnimatePresence}>
      </div>
    </div>
  `;
}

const root = createRoot(document.querySelector("#root"));
root.render(html`<${App} />`);
