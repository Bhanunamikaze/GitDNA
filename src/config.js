export const ANALYSIS_VERSION = "0.1.2";
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const FETCH_LIMITS = {
  repoLimit: 6,
  commitsPerRepo: 30,
};

export const UNAUTH_FETCH_LIMITS = {
  repoLimit: 3,
  commitsPerRepo: 20,
};

export const MIN_DATA_THRESHOLDS = {
  minRepos: 3,
  minCommits: 10,
};

export const METRIC_ORDER = [
  "cadence",
  "consistency",
  "burstiness",
  "night_ratio",
  "weekend_ratio",
  "impact_estimate",
  "language_entropy",
  "repo_focus",
  "collaboration_signal",
  "longevity_signal",
];

export const METRIC_LABELS = {
  cadence: "Cadence",
  consistency: "Consistency",
  burstiness: "Burstiness",
  night_ratio: "Night Activity",
  weekend_ratio: "Weekend Activity",
  impact_estimate: "Impact Estimate",
  language_entropy: "Language Diversity",
  repo_focus: "Repo Focus",
  collaboration_signal: "Collaboration Signal",
  longevity_signal: "Longevity Signal",
};

export const DEMO_PROFILES = ["torvalds", "sindresorhus", "tj"];
