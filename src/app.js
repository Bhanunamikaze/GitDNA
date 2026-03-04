import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { AnimatePresence, motion } from "https://esm.sh/framer-motion@11.11.17";
import htm from "https://esm.sh/htm@3.1.1";

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
import {
  buildNebulaProfileBadgeSvg,
  buildProfileUrl,
  buildReadmeEmbedSnippet,
  buildShieldsBadgeUrl,
} from "./ui/shareCard.js";

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
    detail: "Higher values indicate strong late-night coding windows.",
    angle: -80,
    orbit: 132,
    speed: 0.33,
  },
  {
    key: "burstiness",
    label: "Repo Bursts",
    description: "Tracks clustered shipping spikes across repositories.",
    detail: "Captures burst-style output waves instead of uniform pacing.",
    angle: -25,
    orbit: 170,
    speed: 0.27,
  },
  {
    key: "language_entropy",
    label: "Language Bias",
    description: "Represents language diversity across coding activity.",
    detail: "Lower values suggest specialization, higher values imply polyglot behavior.",
    angle: 25,
    orbit: 210,
    speed: 0.21,
  },
  {
    key: "impact_estimate",
    label: "Commit Impact",
    description: "Derived from contribution influence and repository signal.",
    detail: "Signals shipping weight across repositories, stars, and contribution breadth.",
    angle: 85,
    orbit: 140,
    speed: 0.31,
  },
  {
    key: "consistency",
    label: "Streak Engine",
    description: "Indicates contribution consistency over time.",
    detail: "Shows how steady your contribution rhythm remains week to week.",
    angle: 145,
    orbit: 180,
    speed: 0.24,
  },
  {
    key: "cadence",
    label: "Maintainer Mode",
    description: "Reflects sustained commit cadence and rhythm.",
    detail: "Represents long-run maintainership cadence and release discipline.",
    angle: -145,
    orbit: 226,
    speed: 0.19,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function NebulaDnaBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({
    x: 0,
    y: 0,
    active: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let dnaGroups = [];
    let starSeeds = [];

    const createDnaSeeds = (count, groupId) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${groupId}-${index}`,
        offset: Math.random() * 900 + index * 23,
        phase: Math.random() * Math.PI * 2,
        speed: 28 + Math.random() * 36,
        jitter: 4 + Math.random() * 6,
        lane: -0.5 + Math.random(),
        phase2: Math.random() * Math.PI * 2,
      }));

    const createDnaGroups = () => {
      const baseSpan = Math.min(width * 0.16, 150);
      const layout =
        width < 720
          ? [
              { x: 0.22, y: 0.26, angle: 0.95 },
              { x: 0.5, y: 0.56, angle: -0.75 },
              { x: 0.78, y: 0.34, angle: 0.42 },
            ]
          : [
              { x: 0.18, y: 0.24, angle: 0.86 },
              { x: 0.5, y: 0.5, angle: -0.62 },
              { x: 0.82, y: 0.74, angle: 0.58 },
            ];

      const seedsPerGroup = clamp(
        Math.floor(Math.min(width, height) / (width < 700 ? 30 : 24)),
        10,
        26
      );

      return layout.map((item, index) => {
        const directionX = Math.cos(item.angle);
        const directionY = Math.sin(item.angle);
        return {
          id: index,
          anchorXRatio: item.x,
          anchorYRatio: item.y,
          directionX,
          directionY,
          travelLength: Math.max(width, height) * (width < 700 ? 0.68 : 0.82),
          span: baseSpan * (0.82 + index * 0.08),
          orbitX: 24 + index * 10,
          orbitY: 20 + index * 12,
          orbitSpeedX: 0.2 + index * 0.07,
          orbitSpeedY: 0.26 + index * 0.05,
          seeds: createDnaSeeds(seedsPerGroup - (width < 900 && index !== 1 ? 2 : 0), index),
        };
      });
    };

    const createStarSeeds = (count) =>
      Array.from({ length: count }, (_, index) => ({
        id: index,
        xRatio: Math.random(),
        yRatio: Math.random(),
        twinkle: Math.random() * Math.PI * 2,
        size: 0.55 + Math.random() * 1.6,
        driftX: -0.018 + Math.random() * 0.036,
        driftY: -0.022 + Math.random() * 0.044,
      }));

    const resize = () => {
      dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const starsCount = clamp(
        Math.floor((width * height) / (width < 720 ? 12000 : 8800)),
        62,
        160
      );
      dnaGroups = createDnaGroups();
      starSeeds = createStarSeeds(starsCount);
    };

    const repel = (x, y, radius, force) => {
      const mouse = mouseRef.current;
      if (!mouse.active) {
        return { x, y };
      }
      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance >= radius) {
        return { x, y };
      }

      const intensity = ((radius - distance) / radius) ** 1.65;
      return {
        x: x + (dx / distance) * force * intensity,
        y: y + (dy / distance) * force * intensity,
      };
    };

    const draw = (timestamp) => {
      const time = timestamp * 0.001;
      context.clearRect(0, 0, width, height);

      const nebulaA = context.createRadialGradient(
        width * 0.2 + Math.sin(time * 0.24) * 40,
        height * 0.2 + Math.cos(time * 0.18) * 24,
        24,
        width * 0.2,
        height * 0.2,
        width * 0.58
      );
      nebulaA.addColorStop(0, "rgba(34,211,238,0.24)");
      nebulaA.addColorStop(1, "rgba(34,211,238,0)");
      context.fillStyle = nebulaA;
      context.fillRect(0, 0, width, height);

      const nebulaB = context.createRadialGradient(
        width * 0.8 + Math.cos(time * 0.2) * 38,
        height * 0.24 + Math.sin(time * 0.22) * 22,
        28,
        width * 0.8,
        height * 0.24,
        width * 0.52
      );
      nebulaB.addColorStop(0, "rgba(139,92,246,0.2)");
      nebulaB.addColorStop(1, "rgba(139,92,246,0)");
      context.fillStyle = nebulaB;
      context.fillRect(0, 0, width, height);

      context.globalCompositeOperation = "screen";
      for (const star of starSeeds) {
        const xShift = ((star.xRatio + time * star.driftX) % 1 + 1) % 1;
        const yShift = ((star.yRatio + time * star.driftY) % 1 + 1) % 1;
        let x = xShift * width + Math.sin(time * 0.8 + star.twinkle) * 8;
        let y = yShift * height + Math.cos(time * 0.75 + star.twinkle) * 7;
        const displaced = repel(x, y, 170, 30);
        x = displaced.x;
        y = displaced.y;
        const glow = 0.35 + Math.sin(time * 1.6 + star.twinkle) * 0.3;
        context.beginPath();
        context.fillStyle = `rgba(148,163,184,${0.22 + glow * 0.16})`;
        context.arc(x, y, star.size, 0, Math.PI * 2);
        context.fill();
      }

      for (const group of dnaGroups) {
        const anchorX =
          width * group.anchorXRatio +
          Math.sin(time * group.orbitSpeedX + group.id) * group.orbitX;
        const anchorY =
          height * group.anchorYRatio +
          Math.cos(time * group.orbitSpeedY + group.id * 1.7) * group.orbitY;
        const perpX = -group.directionY;
        const perpY = group.directionX;

        for (const seed of group.seeds) {
          const flow =
            ((time * seed.speed + seed.offset) % group.travelLength) - group.travelLength * 0.5;
          const wave = time * 1.7 + seed.phase + flow * 0.014;
          const centerX =
            anchorX +
            group.directionX * flow +
            perpX * seed.lane * 36 +
            Math.cos(time * 0.9 + seed.phase2) * seed.jitter;
          const centerY =
            anchorY +
            group.directionY * flow +
            perpY * seed.lane * 36 +
            Math.sin(time * 0.82 + seed.phase2) * seed.jitter;
          const ribbon = group.span * (0.52 + Math.sin(wave) * 0.31);

          let leftX = centerX - perpX * ribbon;
          let leftY = centerY - perpY * ribbon;
          let rightX = centerX + perpX * ribbon;
          let rightY = centerY + perpY * ribbon;

          const displacedLeft = repel(leftX, leftY, 175, 55);
          const displacedRight = repel(rightX, rightY, 175, 55);
          leftX = displacedLeft.x;
          leftY = displacedLeft.y;
          rightX = displacedRight.x;
          rightY = displacedRight.y;

          const rungAlpha = 0.06 + (Math.sin(wave + 0.8) + 1) * 0.1;
          context.strokeStyle = `rgba(125,211,252,${rungAlpha})`;
          context.lineWidth = 1.15;
          context.beginPath();
          context.moveTo(leftX, leftY);
          context.lineTo(rightX, rightY);
          context.stroke();

          const dotRadius = 1.4 + (Math.sin(wave * 1.3) + 1) * 0.72;
          context.fillStyle = "rgba(103,232,249,0.86)";
          context.beginPath();
          context.arc(leftX, leftY, dotRadius, 0, Math.PI * 2);
          context.fill();

          context.fillStyle = "rgba(196,181,253,0.78)";
          context.beginPath();
          context.arc(rightX, rightY, dotRadius * 0.9, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalCompositeOperation = "source-over";

      frameId = requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      mouseRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: true,
      };
    };

    const onPointerLeave = () => {
      mouseRef.current.active = false;
    };

    resize();
    frameId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
    };
  }, []);

  return html`<canvas ref=${canvasRef} className="primary-bg-canvas" aria-hidden="true"></canvas>`;
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

function estimateLocFromLanguageBytes(languageBytes = {}) {
  const totalBytes = Object.values(languageBytes || {}).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return null;
  }
  // Heuristic only: GitHub language API returns bytes, not physical lines.
  return Math.max(1, Math.round(totalBytes / 38));
}

function topLanguagesFromBytes(languageBytes = {}, limit = 5) {
  return Object.entries(languageBytes || {})
    .map(([name, bytes]) => ({
      name,
      bytes: Number(bytes || 0),
    }))
    .filter((item) => item.bytes > 0)
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, limit);
}

function buildProfileStats(profileData, metricsResult) {
  const repos = profileData?.repos || [];
  const totalStars = repos.reduce((sum, repo) => sum + Number(repo.stars || 0), 0);
  const totalForks = repos.reduce((sum, repo) => sum + Number(repo.forks || 0), 0);
  const followers = Number(profileData?.user?.followers || 0);

  return {
    commitCount: Number(metricsResult?.totalCommits || 0),
    repoCount: Number(metricsResult?.totalRepos || 0),
    languageCount: Number(metricsResult?.languageCount || 0),
    estimatedLoc: estimateLocFromLanguageBytes(profileData?.languageBytes || {}),
    totalStars,
    totalForks,
    followers,
    topLanguages: topLanguagesFromBytes(profileData?.languageBytes || {}, 5),
  };
}

function normalizeResult(profile, scoring, achievementData, metricsResult, options = {}) {
  const baseUrl = getBaseUrl();
  const summary = achievementSummary(achievementData);
  const confidence = options.lowConfidence
    ? Math.min(scoring.confidence, 0.35)
    : scoring.confidence;
  const profileStats = profile.profileStats || null;
  const profileUrl = buildProfileUrl(baseUrl, profile.username);
  const badgeImageUrl = buildShieldsBadgeUrl({
    typeName: scoring.typeName,
    confidence,
    impactScore: summary.impactScore,
    style: "for-the-badge",
  });
  const badgeCompactUrl = buildShieldsBadgeUrl({
    typeName: scoring.typeName,
    confidence,
    impactScore: summary.impactScore,
    style: "flat-square",
  });
  const nebulaBadgeSvg = buildNebulaProfileBadgeSvg({
    username: profile.username,
    typeName: scoring.typeName,
    aliasName: scoring.aliasName,
    description: scoring.flavorText,
    rarityTier: scoring.rarityTier,
    confidence,
    impactScore: summary.impactScore,
    profileStats,
  });

  return {
    username: profile.username,
    avatarUrl: profile.avatarUrl || `https://github.com/${profile.username}.png?size=160`,
    typeId: scoring.typeId,
    typeName: scoring.typeName,
    aliasName: scoring.aliasName,
    flavorText: scoring.flavorText,
    rarityTier: scoring.rarityTier || "Common",
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
    profileStats,
    sample: {
      totalCommits: metricsResult.totalCommits || 0,
      totalRepos: metricsResult.totalRepos || 0,
      languageCount: metricsResult.languageCount || 0,
    },
    profileUrl,
    badgeImageUrl,
    badgeCompactUrl,
    nebulaBadgeSvg,
    badgeMarkdown: buildReadmeEmbedSnippet(baseUrl, profile.username, {
      typeName: scoring.typeName,
      confidence,
      impactScore: summary.impactScore,
      style: "for-the-badge",
    }),
  };
}

function scoreFromDemoPayload(demoPayload) {
  const baseUrl = getBaseUrl();
  const impactScore =
    demoPayload.achievement_impact_score ||
    (demoPayload.achievements || []).length * 10;
  const demoStats =
    Number(demoPayload.total_commits || 0) > 0 || Number(demoPayload.total_repos || 0) > 0
      ? {
          commitCount: Number(demoPayload.total_commits || 0),
          repoCount: Number(demoPayload.total_repos || 0),
          languageCount: Number(demoPayload.language_count || 0),
          estimatedLoc: Number(demoPayload.estimated_loc || 0) || null,
          totalStars: Number(demoPayload.total_stars || 0),
          totalForks: Number(demoPayload.total_forks || 0),
          followers: Number(demoPayload.followers || 0),
          topLanguages: Array.isArray(demoPayload.top_languages)
            ? demoPayload.top_languages
                .map((entry) => {
                  if (typeof entry === "string") {
                    return { name: entry, bytes: 0 };
                  }
                  return {
                    name: entry?.name || "",
                    bytes: Number(entry?.bytes || 0),
                  };
                })
                .filter((entry) => entry.name)
                .slice(0, 5)
            : [],
        }
      : null;
  const profileUrl = buildProfileUrl(baseUrl, demoPayload.username);
  const badgeImageUrl = buildShieldsBadgeUrl({
    typeName: demoPayload.type_name,
    confidence: demoPayload.confidence,
    impactScore,
    style: "for-the-badge",
  });
  const badgeCompactUrl = buildShieldsBadgeUrl({
    typeName: demoPayload.type_name,
    confidence: demoPayload.confidence,
    impactScore,
    style: "flat-square",
  });
  const nebulaBadgeSvg = buildNebulaProfileBadgeSvg({
    username: demoPayload.username,
    typeName: demoPayload.type_name,
    aliasName: demoPayload.alias_name,
    description: demoPayload.flavor_text,
    rarityTier: demoPayload.rarity_tier || "Common",
    confidence: demoPayload.confidence,
    impactScore,
    profileStats: demoStats,
  });

  return {
    username: demoPayload.username,
    avatarUrl: `https://github.com/${demoPayload.username}.png?size=160`,
    typeId: demoPayload.type_id,
    typeName: demoPayload.type_name,
    aliasName: demoPayload.alias_name,
    flavorText: demoPayload.flavor_text,
    rarityTier: demoPayload.rarity_tier || "Common",
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
    achievementImpactScore: impactScore,
    achievementLabels: demoPayload.achievements || [],
    isDemo: true,
    partialData: false,
    profileStats: null,
    sample: null,
    profileUrl,
    badgeImageUrl,
    badgeCompactUrl,
    nebulaBadgeSvg,
    badgeMarkdown: buildReadmeEmbedSnippet(baseUrl, demoPayload.username, {
      typeName: demoPayload.type_name,
      confidence: demoPayload.confidence,
      impactScore,
      style: "for-the-badge",
    }),
  };
}

function useConstellation(metrics) {
  const [graph, setGraph] = useState({
    width: 980,
    height: 520,
    rings: [116, 164, 212, 260],
    nodes: [],
    links: [],
  });

  useEffect(() => {
    const width = 980;
    const height = 520;
    const centerX = width / 2;
    const centerY = height / 2;
    const rings = [116, 164, 212, 260];

    const seededSignals = SIGNAL_CONFIG.map((signal, index) => ({
      ...signal,
      index,
      phase: index * 0.95,
      baseAngle: (signal.angle * Math.PI) / 180,
    }));

    const links = [
      ...seededSignals.map((signal) => ({
        source: "core",
        target: signal.key,
        type: "core",
      })),
      ...seededSignals.map((signal, index) => ({
        source: signal.key,
        target: seededSignals[(index + 1) % seededSignals.length].key,
        type: "mesh",
      })),
    ];

    let raf = 0;
    let lastFrameAt = 0;

    const frame = (timestamp) => {
      if (timestamp - lastFrameAt < 33) {
        raf = requestAnimationFrame(frame);
        return;
      }
      lastFrameAt = timestamp;

      const seconds = timestamp / 1000;
      const nodes = [
        {
          id: "core",
          label: "DNA Core",
          core: true,
          x: centerX,
          y: centerY,
          value: 1,
          description: "Identity anchor built from your GitHub activity graph.",
        },
        ...seededSignals.map((signal) => {
          const value = clamp(Number(metrics?.[signal.key] || 0), 0, 1);
          const orbit = signal.orbit + Math.sin(seconds * 0.7 + signal.phase) * 7;
          const angle =
            signal.baseAngle +
            seconds * signal.speed +
            Math.sin(seconds * 0.45 + signal.phase) * 0.12;
          const driftX = Math.cos(seconds * 1.1 + signal.phase) * 5;
          const driftY = Math.sin(seconds * 1.25 + signal.phase) * 4;
          return {
            id: signal.key,
            label: signal.label,
            metric: signal.key,
            value,
            description: signal.description,
            detail: signal.detail,
            x: centerX + Math.cos(angle) * orbit + driftX,
            y: centerY + Math.sin(angle) * orbit + driftY,
            index: signal.index,
          };
        }),
      ];

      setGraph({
        width,
        height,
        rings,
        nodes,
        links,
      });

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [metrics]);

  return graph;
}

function ConstellationGraph({ metrics }) {
  const graph = useConstellation(metrics);
  const svgRef = useRef(null);
  const graphRef = useRef(graph);
  const dragRef = useRef({
    id: null,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
  });

  const [selected, setSelected] = useState(SIGNAL_CONFIG[0]?.key || null);
  const [hovered, setHovered] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [nodeOffsets, setNodeOffsets] = useState({});

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  const baseNodeById = useMemo(() => {
    const map = new Map();
    for (const node of graph.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [graph.nodes]);

  const displayNodes = useMemo(
    () =>
      graph.nodes.map((node) => {
        if (node.core) {
          return node;
        }
        const offset = nodeOffsets[node.id];
        if (!offset) {
          return node;
        }
        return {
          ...node,
          x: node.x + offset.dx,
          y: node.y + offset.dy,
        };
      }),
    [graph.nodes, nodeOffsets]
  );

  const displayNodeById = useMemo(() => {
    const map = new Map();
    for (const node of displayNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [displayNodes]);

  const signalNodes = useMemo(
    () => displayNodes.filter((node) => !node.core),
    [displayNodes]
  );

  const activeId = hovered || selected || signalNodes[0]?.id || null;
  const activeNode = activeId ? displayNodeById.get(activeId) : null;

  const rankedSignals = useMemo(
    () => [...signalNodes].sort((left, right) => (right.value || 0) - (left.value || 0)),
    [signalNodes]
  );

  const startDrag = (event, nodeId) => {
    const svg = svgRef.current;
    const graphNow = graphRef.current;
    const node = displayNodeById.get(nodeId);
    if (!svg || !graphNow || !node) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }

    const pointerX = ((event.clientX - rect.left) / rect.width) * graphNow.width;
    const pointerY = ((event.clientY - rect.top) / rect.height) * graphNow.height;

    dragRef.current = {
      id: nodeId,
      pointerId: event.pointerId,
      offsetX: node.x - pointerX,
      offsetY: node.y - pointerY,
    };
    setSelected(nodeId);
    setHovered(nodeId);
    setDraggingId(nodeId);
  };

  useEffect(() => {
    if (!draggingId) {
      return undefined;
    }

    const onMove = (event) => {
      const drag = dragRef.current;
      if (!drag.id) {
        return;
      }

      const svg = svgRef.current;
      const graphNow = graphRef.current;
      if (!svg || !graphNow || !graphNow.width || !graphNow.height) {
        return;
      }

      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const pointerX = ((event.clientX - rect.left) / rect.width) * graphNow.width;
      const pointerY = ((event.clientY - rect.top) / rect.height) * graphNow.height;
      const baseNode = (graphNow.nodes || []).find((node) => node.id === drag.id);
      if (!baseNode || baseNode.core) {
        return;
      }

      const radius = 24 + Math.round((baseNode.value || 0) * 10) + 14;
      const targetX = pointerX + drag.offsetX;
      const targetY = pointerY + drag.offsetY;
      const clampedX = clamp(targetX, radius, graphNow.width - radius);
      const clampedY = clamp(targetY, radius, graphNow.height - radius);
      const dx = clampedX - baseNode.x;
      const dy = clampedY - baseNode.y;

      setNodeOffsets((prev) => {
        const existing = prev[drag.id];
        if (
          existing &&
          Math.abs(existing.dx - dx) < 0.25 &&
          Math.abs(existing.dy - dy) < 0.25
        ) {
          return prev;
        }
        return {
          ...prev,
          [drag.id]: { dx, dy },
        };
      });
    };

    const stopDrag = () => {
      dragRef.current = {
        id: null,
        pointerId: null,
        offsetX: 0,
        offsetY: 0,
      };
      setDraggingId(null);
      setHovered(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [draggingId]);

  const resetOffsets = () => {
    setNodeOffsets({});
  };

  const releaseNodeOffset = (nodeId) => {
    setNodeOffsets((prev) => {
      if (!prev[nodeId]) {
        return prev;
      }
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
  };

  return html`
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 constellation-bg constellation-stars constellation-nebula">
        <div className="constellation-overlay"></div>
        <div className="absolute top-3 left-3 z-10 rounded-lg border border-cyan-400/35 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-cyan-100">
          Signal Orbit View
        </div>
        <button
          type="button"
          onClick=${resetOffsets}
          className="absolute top-3 right-3 z-10 rounded-lg border border-violet-300/35 bg-slate-950/72 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.11em] text-violet-100 hover:border-violet-200/50"
        >
          Reset Positions
        </button>

        <svg
          ref=${svgRef}
          viewBox=${`0 0 ${graph.width} ${graph.height}`}
          className=${`constellation-drag-surface relative z-[1] w-full h-[420px] md:h-[520px] ${
            draggingId ? "cursor-grabbing" : "cursor-default"
          }`}
        >
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="45%" r="58%">
              <stop offset="0%" stop-color="#67e8f9" />
              <stop offset="55%" stop-color="#14b8a6" />
              <stop offset="100%" stop-color="#0f766e" />
            </radialGradient>
            <radialGradient id="nodeAura" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stop-color="rgba(125,211,252,0.5)" />
              <stop offset="100%" stop-color="rgba(56,189,248,0.02)" />
            </radialGradient>
          </defs>

          ${(graph.rings || []).map(
            (ring, index) => html`<circle
              key=${`ring-${index}`}
              cx=${graph.width / 2}
              cy=${graph.height / 2}
              r=${ring}
              className="orbit-track"
            />`
          )}

          ${graph.links.map((link) => {
            const source = displayNodeById.get(link.source);
            const target = displayNodeById.get(link.target);
            if (!source || !target) {
              return null;
            }
            const active = activeId && (link.source === activeId || link.target === activeId);
            const className = link.type === "mesh" ? "link-mesh" : "link-glow";
            return html`<line
              key=${`${link.source}-${link.target}`}
              className=${className}
              x1=${source.x}
              y1=${source.y}
              x2=${target.x}
              y2=${target.y}
              style=${{ opacity: active ? 0.92 : link.type === "mesh" ? 0.28 : 0.62 }}
            />`;
          })}

          ${displayNodes.map((node) => {
            if (node.core) {
              return html`<g key="core">
                <circle cx=${node.x} cy=${node.y} r="74" className="core-aura" />
                <circle cx=${node.x} cy=${node.y} r="58" className="core-aura core-aura-2" />
                <circle cx=${node.x} cy=${node.y} r="50" fill="url(#coreGlow)" />
                <text
                  x=${node.x}
                  y=${node.y + 6}
                  text-anchor="middle"
                  fill="#ecfeff"
                  font-family="JetBrains Mono"
                  font-size="15"
                  font-weight="700"
                >
                  DNA Core
                </text>
              </g>`;
            }

            const pct = Math.round((node.value || 0) * 100);
            const isActive = activeId === node.id;
            const radius = 24 + Math.round((node.value || 0) * 10);
            return html`<g
              key=${node.id}
              style=${{ cursor: draggingId === node.id ? "grabbing" : "grab" }}
              onClick=${() => setSelected(node.id)}
              onPointerDown=${(event) => startDrag(event, node.id)}
              onMouseEnter=${() => setHovered(node.id)}
              onMouseLeave=${() => setHovered(null)}
              onDoubleClick=${() => releaseNodeOffset(node.id)}
            >
              <circle
                cx=${node.x}
                cy=${node.y}
                r=${radius + (isActive ? 12 : 10)}
                className="signal-pulse"
                style=${{
                  "--pulse-delay": `${(node.index || 0) * 0.16}s`,
                }}
              />
              <circle
                cx=${node.x}
                cy=${node.y}
                r=${radius + 4}
                fill="url(#nodeAura)"
                opacity=${isActive ? 0.95 : 0.6}
              />
              <circle
                cx=${node.x}
                cy=${node.y}
                r=${radius}
                fill=${isActive ? "rgba(15,23,42,0.95)" : "rgba(15,23,42,0.84)"}
                stroke=${isActive ? "rgba(253,224,71,0.9)" : "rgba(34,211,238,0.72)"}
                strokeWidth=${isActive ? 2.4 : 1.7}
              />
              <circle cx=${node.x} cy=${node.y} r="4.6" fill=${isActive ? "#fde68a" : "#22d3ee"} />
              <text
                x=${node.x}
                y=${node.y + 5}
                text-anchor="middle"
                fill=${isActive ? "#fef3c7" : "#a5f3fc"}
                font-size="14"
                font-family="JetBrains Mono"
                font-weight="700"
                stroke="rgba(2,6,23,0.88)"
                stroke-width="1.5"
                paint-order="stroke"
              >
                ${pct}%
              </text>
              <text
                x=${node.x}
                y=${node.y - radius - 16}
                text-anchor="middle"
                fill=${isActive ? "#fef3c7" : "#dbeafe"}
                font-size="12.5"
                font-family="IBM Plex Sans"
                font-weight=${isActive ? "700" : "600"}
                opacity=${isActive ? 1 : 0.9}
                stroke="rgba(2,6,23,0.82)"
                stroke-width="2"
                paint-order="stroke"
              >
                ${node.label}
              </text>
            </g>`;
          })}
        </svg>
      </div>

      <p className="text-xs text-slate-400">
        Click to select, drag to reposition within the field, double-click a node to return it to orbit.
      </p>

      <div className="flex flex-wrap gap-2">
        ${signalNodes.map((node) => {
          const pct = Math.round((node.value || 0) * 100);
          const active = node.id === activeId;
          return html`
            <button
              key=${node.id}
              onClick=${() => setSelected(node.id)}
              className=${`signal-pill ${active ? "is-active" : ""}`}
            >
              <span>${node.label}</span>
              <span className="font-mono text-xs">${pct}%</span>
            </button>
          `;
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
          ${activeNode
            ? html`
                <p className="text-lg font-semibold text-cyan-300">${activeNode.label}</p>
                <p className="text-slate-300 mt-1">${activeNode.description}</p>
                <p className="text-slate-400 text-sm mt-2">${activeNode.detail || ""}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Signal Strength</span>
                    <span className="font-mono text-cyan-200"
                      >${Math.round((activeNode.value || 0) * 100)}%</span
                    >
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-700/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-violet-400"
                      style=${{ width: `${Math.round((activeNode.value || 0) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              `
            : html`<p className="text-slate-300">Select any signal node to inspect its metric meaning.</p>`}
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-900/70 p-4">
          <p className="text-sm uppercase tracking-[0.1em] text-slate-300">Top Signal Strength</p>
          <div className="mt-3 space-y-3">
            ${rankedSignals.slice(0, 3).map((node) => {
              const pct = Math.round((node.value || 0) * 100);
              return html`
                <div key=${node.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">${node.label}</span>
                    <span className="font-mono text-cyan-200">${pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700/80 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"
                      style=${{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
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

function topSignals(metrics, limit = 3) {
  return [...SIGNAL_CONFIG]
    .map((signal) => ({
      key: signal.key,
      label: signal.label,
      description: signal.description,
      detail: signal.detail,
      value: clamp(Number(metrics?.[signal.key] || 0), 0, 1),
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
}

function confidenceMeta(confidence) {
  if (confidence >= 0.84) {
    return {
      label: "High Clarity",
      uiPercent: 88,
      hint: "Signal alignment is very strong across multiple behavioral traits.",
    };
  }
  if (confidence >= 0.66) {
    return {
      label: "Stable Clarity",
      uiPercent: 72,
      hint: "Most core signals align with this DNA profile and archetype style.",
    };
  }
  if (confidence >= 0.45) {
    return {
      label: "Developing",
      uiPercent: 58,
      hint: "Your signal pattern is forming with moderate consistency across activities.",
    };
  }
  return {
    label: "Emerging",
    uiPercent: 44,
    hint: "Your public signal set is still forming. More activity will sharpen this profile.",
  };
}

function buildRevealNarrative(profileResult, strongestSignals) {
  if (!profileResult) {
    return {
      primary: "",
      secondary: "",
    };
  }

  const first = strongestSignals[0]?.label || "Core Signal";
  const second = strongestSignals[1]?.label || "Identity Signal";
  const modeText = profileResult.isDemo ? "demo simulation" : "live GitHub activity";
  return {
    primary: `${profileResult.aliasName} emerged from ${modeText}, led by ${first} and reinforced by ${second}.`,
    secondary:
      "This profile card summarizes your coding rhythm, signal intensity, and likely long-run collaboration style.",
  };
}

function sampleSummary(sample) {
  if (!sample?.totalCommits || !sample?.totalRepos) {
    return null;
  }
  const commits = Number(sample.totalCommits);
  const repos = Number(sample.totalRepos);
  const languages = Number(sample.languageCount || 0);
  if (!Number.isFinite(commits) || !Number.isFinite(repos)) {
    return null;
  }
  if (languages > 0) {
    return `Analyzed ${commits} commits across ${repos} repos and ${languages} languages.`;
  }
  return `Analyzed ${commits} commits across ${repos} repos.`;
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
      const hasDetailedStats =
        cached?.profileStats &&
        Number.isFinite(Number(cached.profileStats.commitCount)) &&
        Number(cached.profileStats.commitCount) > 0 &&
        Number.isFinite(Number(cached.profileStats.repoCount)) &&
        Number(cached.profileStats.repoCount) > 0;
      if (hasDetailedStats || cached?.isDemo) {
        setStatus({ kind: "success", text: `Loaded cached DNA for @${cleanName}` });
        return cached;
      }
      localStorage.removeItem(getCacheKey(cleanName));
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
    const profileStats = buildProfileStats(live.data, metricsResult);

    const normalized = normalizeResult(
      {
        username: cleanName,
        avatarUrl: live.data.user.avatarUrl,
        profileStats,
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
    if (!effectiveBadgeMarkdown) {
      return;
    }
    try {
      await navigator.clipboard.writeText(effectiveBadgeMarkdown);
      setStatus({ kind: "success", text: "Markdown badge copied." });
    } catch {
      setStatus({ kind: "warning", text: "Clipboard blocked. Copy manually." });
    }
  };

  const copyBadgeUrl = async () => {
    if (!effectiveBadgeUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(effectiveBadgeUrl);
      setStatus({ kind: "success", text: "Badge URL copied." });
    } catch {
      setStatus({ kind: "warning", text: "Clipboard blocked. Copy manually." });
    }
  };

  const copySvgCode = async () => {
    if (!effectiveNebulaSvg) {
      return;
    }
    try {
      await navigator.clipboard.writeText(effectiveNebulaSvg);
      setStatus({ kind: "success", text: "SVG code copied." });
    } catch {
      setStatus({ kind: "warning", text: "Clipboard blocked. Copy manually." });
    }
  };

  const copyHtmlEmbed = async () => {
    if (!effectiveSvgEmbed) {
      return;
    }
    try {
      await navigator.clipboard.writeText(effectiveSvgEmbed);
      setStatus({ kind: "success", text: "HTML embed copied." });
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

  const revealSignals = useMemo(
    () => (result ? topSignals(result.metrics, 3) : []),
    [result]
  );
  const confidenceInfo = confidenceMeta(result?.confidence || 0);
  const confidenceUiPct = confidenceInfo.uiPercent || 50;
  const revealNarrative = buildRevealNarrative(result, revealSignals);
  const dnaSignature = String(result?.typeId || "unknown_type")
    .replace(/_/g, "-")
    .toUpperCase();
  const achievementPreview = (result?.achievementBadges || []).slice(0, 3);
  const analysisSample = sampleSummary(result?.sample);
  const effectiveProfileUrl = result?.profileUrl || buildProfileUrl(getBaseUrl(), result?.username || "");
  const effectiveBadgeUrl =
    result?.badgeImageUrl ||
    buildShieldsBadgeUrl({
      typeName: result?.typeName || "Developer DNA",
      confidence: result?.confidence || 0,
      impactScore: result?.achievementImpactScore || 0,
      style: "for-the-badge",
    });
  const effectiveBadgeMarkdown =
    result?.badgeMarkdown ||
    buildReadmeEmbedSnippet(getBaseUrl(), result?.username || "", {
      typeName: result?.typeName || "Developer DNA",
      confidence: result?.confidence || 0,
      impactScore: result?.achievementImpactScore || 0,
      style: "for-the-badge",
    });
  const effectiveNebulaSvg =
    result?.nebulaBadgeSvg ||
    buildNebulaProfileBadgeSvg({
      username: result?.username || "developer",
      typeName: result?.typeName || "Developer DNA",
      aliasName: result?.aliasName || "GitDNA Profile",
      description: result?.flavorText || "",
      rarityTier: result?.rarityTier || "Common",
      confidence: result?.confidence || 0,
      impactScore: result?.achievementImpactScore || 0,
      profileStats: result?.profileStats || null,
    });
  const effectiveSvgEmbed =
    `<a href="${effectiveProfileUrl}" target="_blank" rel="noopener noreferrer">\n${effectiveNebulaSvg}\n</a>`;
  const cardMarkdown = result
    ? `[![GitDNA Card](${getBaseUrl()}/data/cards/${result.username}.svg)](${effectiveProfileUrl})`
    : "";

  return html`
    <div className="relative min-h-screen overflow-x-clip">
      <${NebulaDnaBackground} />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 md:py-12 space-y-8">
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
                  <article className="glass-panel dna-reveal-shell rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-cyan-300/85">
                          DNA Reveal
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Developer identity profile generated from GitHub behavior.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className=${`reveal-chip ${result.isDemo ? "is-demo" : "is-live"}`}>
                          ${result.isDemo ? "Demo Analysis" : "Live Analysis"}
                        </span>
                        ${result.partialData
                          ? html`<span className="reveal-chip is-partial">Partial Data</span>`
                          : null}
                        <a
                          href="https://github.com"
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-sm font-semibold text-cyan-300"
                        >
                          Star on GitHub
                        </a>
                      </div>
                    </div>

                    <div className="dna-reveal-grid">
                      <div className="dna-id-card rounded-2xl p-4 md:p-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] uppercase tracking-[0.11em] text-slate-300">
                            Developer Identity Card
                          </p>
                          <p className="text-[11px] font-mono text-cyan-200">ID ${dnaSignature}</p>
                        </div>

                        <div className="relative mx-auto h-44 w-44 dna-avatar-shell">
                          <div
                            className="h-full w-full rounded-[2rem] overflow-hidden border border-cyan-300/45 shadow-glow"
                            dangerouslySetInnerHTML=${{
                              __html: buildCharacterSvg(result.typeId, result.typeName),
                            }}
                          ></div>
                          <img
                            src=${result.avatarUrl}
                            alt=${`${result.username} avatar`}
                            className="dna-user-avatar-badge absolute top-2 right-2 h-12 w-12 rounded-full border-2 border-cyan-300/70 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                          />
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm text-slate-300">@${result.username}</p>
                          <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
                            ${result.typeName}
                          </h2>
                          <p className="text-cyan-300 font-semibold">${result.aliasName}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="dna-mini-stat rounded-lg p-2">
                            <p className="text-[11px] uppercase tracking-[0.09em] text-slate-400">
                              Signal Clarity
                            </p>
                            <p className="text-sm font-semibold text-cyan-200">${confidenceInfo.label}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Model certainty</p>
                          </div>
                          <div className="dna-mini-stat rounded-lg p-2">
                            <p className="text-[11px] uppercase tracking-[0.09em] text-slate-400">
                              Impact
                            </p>
                            <p className="font-mono text-lg text-amber-300">
                              ${result.achievementImpactScore}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.12em] text-violet-200">
                            Profile Interpretation
                          </p>
                          <p className="text-slate-200 mt-2 leading-relaxed">${revealNarrative.primary}</p>
                          <p className="text-slate-300 mt-2 leading-relaxed">${result.flavorText}</p>
                          <p className="text-slate-400 mt-2 leading-relaxed">${revealNarrative.secondary}</p>
                          ${analysisSample
                            ? html`<p className="text-xs text-cyan-100/80 mt-2">${analysisSample}</p>`
                            : null}
                        </div>

                        <div className="rounded-xl border border-slate-700/70 bg-slate-900/72 p-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300">Signal Clarity</span>
                            <span className="font-mono text-cyan-200">${confidenceInfo.label}</span>
                          </div>
                          <div className="mt-2 h-3 rounded-full bg-slate-700/70 overflow-hidden">
                            <${motion.div}
                              initial=${{ width: 0 }}
                              animate=${{ width: `${confidenceUiPct}%` }}
                              transition=${{ duration: 1.2, ease: "easeOut" }}
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-amber-300"
                            />
                          </div>
                          <p className="mt-2 text-xs text-slate-400">${confidenceInfo.hint}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          ${revealSignals.map(
                            (signal) => html`
                              <div key=${signal.key} className="dna-signal-tile rounded-xl p-3">
                                <p className="text-[11px] uppercase tracking-[0.09em] text-slate-400">
                                  ${signal.label}
                                </p>
                                <p className="mt-1 font-mono text-2xl text-cyan-200">
                                  ${metricPercent(signal.value)}%
                                </p>
                                <p className="mt-1 text-xs text-slate-400">${signal.description}</p>
                              </div>
                            `
                          )}
                        </div>

                        ${achievementPreview.length > 0
                          ? html`
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs uppercase tracking-[0.11em] text-slate-400">
                                  Recent Unlocks
                                </span>
                                ${achievementPreview.map(
                                  (badge) =>
                                    html`<span
                                      key=${badge.id || badge.label}
                                      className="reveal-achievement-chip"
                                      >${badge.label}</span
                                    >`
                                )}
                              </div>
                            `
                          : null}
                      </div>
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

                  <article className="glass-panel badge-shell rounded-3xl p-6 md:p-8 space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-bold">Your GitHub DNA Badge</h3>
                        <p className="text-slate-300 mt-1">
                          Copy-paste snippets for README, plus Nebula SVG code with profile details.
                        </p>
                      </div>
                      <span className="badge-chip-live">Share-Ready</span>
                    </div>

                    <div className="badge-preview-wrap rounded-2xl p-4 md:p-5">
                      <div className="badge-preview-hero rounded-xl p-3">
                        <div
                          className="nebula-svg-preview nebula-svg-preview-large"
                          dangerouslySetInnerHTML=${{ __html: effectiveNebulaSvg }}
                        ></div>
                      </div>
                    </div>

                    <details className="badge-code-panel rounded-xl border border-slate-700/70 bg-slate-900/65 p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                        Show Embed Code And Copy Options
                      </summary>

                      <div className="space-y-3 mt-3">
                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-slate-200">Markdown (GitHub README)</p>
                          <pre className="badge-code">${effectiveBadgeMarkdown}</pre>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-slate-200">Direct Badge URL</p>
                          <pre className="badge-code">${effectiveBadgeUrl}</pre>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-slate-200">Nebula SVG Code (name + rank + impact)</p>
                          <pre className="badge-code badge-code-tall">${effectiveNebulaSvg}</pre>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-slate-200">HTML Embed (SVG + profile link)</p>
                          <pre className="badge-code badge-code-tall">${effectiveSvgEmbed}</pre>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-sm font-semibold text-slate-200">Profile Link</p>
                          <pre className="badge-code">${effectiveProfileUrl}</pre>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          <button
                            onClick=${copyBadgeMarkdown}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-gradient-to-r from-violet-500 to-cyan-500 text-slate-950"
                          >
                            Copy Markdown
                          </button>
                          <button
                            onClick=${copyBadgeUrl}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-cyan-400/45 bg-cyan-500/10 text-cyan-100"
                          >
                            Copy Badge URL
                          </button>
                          <button
                            onClick=${copySvgCode}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-violet-400/45 bg-violet-500/10 text-violet-100"
                          >
                            Copy SVG Code
                          </button>
                          <button
                            onClick=${copyHtmlEmbed}
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-indigo-400/45 bg-indigo-500/10 text-indigo-100"
                          >
                            Copy HTML Embed
                          </button>
                          <a
                            href=${effectiveBadgeUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-slate-500/60 bg-slate-900/70 text-slate-100"
                          >
                            Open Badge
                          </a>
                          <a
                            href=${effectiveProfileUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-emerald-400/45 bg-emerald-500/10 text-emerald-100"
                          >
                            Open DNA Profile
                          </a>
                        </div>

                        <details className="rounded-xl border border-slate-700/70 bg-slate-900/65 p-3">
                          <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                            Optional static card markdown
                          </summary>
                          <pre className="badge-code mt-3">${cardMarkdown}</pre>
                        </details>
                        <p className="text-xs text-slate-500">
                          GitHub README supports markdown/image embeds reliably. Inline SVG hover effects work best in personal sites and docs portals.
                        </p>
                      </div>
                    </details>
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
