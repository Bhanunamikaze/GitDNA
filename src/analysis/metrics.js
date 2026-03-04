import { METRIC_ORDER } from "../config.js";
import { clamp01 } from "../utils/format.js";

function getCommitDate(commit) {
  if (!commit?.date) {
    return null;
  }
  const date = new Date(commit.date);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function normalizedEntropy(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total || values.length <= 1) {
    return 0;
  }

  let entropy = 0;
  for (const value of values) {
    const probability = value / total;
    entropy -= probability * Math.log2(probability);
  }

  const maxEntropy = Math.log2(values.length);
  return clamp01(entropy / maxEntropy);
}

function computeCommitCadence(totalCommits) {
  return clamp01(totalCommits / 200);
}

function computeConsistency(dates) {
  if (dates.length === 0) {
    return 0;
  }

  const daySet = new Set(
    dates.map((date) =>
      `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`
    )
  );

  const sorted = [...dates].sort((a, b) => a - b);
  const spanDays = Math.max(
    1,
    Math.round((sorted.at(-1) - sorted[0]) / (24 * 60 * 60 * 1000))
  );

  return clamp01(daySet.size / spanDays);
}

function computeBurstiness(dates) {
  if (dates.length === 0) {
    return 0;
  }
  const buckets = {};
  for (const date of dates) {
    const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}-${date.getUTCHours()}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  const values = Object.values(buckets);
  const burstEvents = values.filter((count) => count >= 5).length;
  const maxPerHour = Math.max(...values);

  return clamp01((burstEvents * 3 + maxPerHour) / 20);
}

function computeNightRatio(dates) {
  if (dates.length === 0) {
    return 0;
  }
  const nightCommits = dates.filter((date) => {
    const hour = date.getUTCHours();
    return hour >= 0 && hour < 5;
  }).length;
  return clamp01(nightCommits / dates.length);
}

function computeWeekendRatio(dates) {
  if (dates.length === 0) {
    return 0;
  }
  const weekendCommits = dates.filter((date) => {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }).length;
  return clamp01(weekendCommits / dates.length);
}

function computeImpactEstimate(profile) {
  const repos = profile.repos || [];
  if (repos.length === 0) {
    return 0;
  }

  const avgStars =
    repos.reduce((sum, repo) => sum + Number(repo.stars || 0), 0) / repos.length;
  const avgForks =
    repos.reduce((sum, repo) => sum + Number(repo.forks || 0), 0) / repos.length;
  const commitSignal = clamp01((profile.commits?.length || 0) / 150);

  const starsScore = clamp01(avgStars / 2000);
  const forksScore = clamp01(avgForks / 600);

  return clamp01(starsScore * 0.45 + forksScore * 0.25 + commitSignal * 0.3);
}

function computeRepoFocus(commitCountByRepo, totalCommits) {
  if (!totalCommits) {
    return 0;
  }
  const topRepoCommits = Math.max(0, ...Object.values(commitCountByRepo || {}));
  return clamp01(topRepoCommits / totalCommits);
}

function computeCollaborationSignal(profile) {
  const repos = profile.repos || [];
  if (repos.length === 0) {
    return 0;
  }
  const avgWatchers =
    repos.reduce((sum, repo) => sum + Number(repo.watchers || 0), 0) / repos.length;
  const avgOpenIssues =
    repos.reduce((sum, repo) => sum + Number(repo.openIssues || 0), 0) / repos.length;
  return clamp01((clamp01(avgWatchers / 200) + clamp01(avgOpenIssues / 80)) / 2);
}

function computeLongevitySignal(dates) {
  if (dates.length < 2) {
    return 0;
  }
  const sorted = [...dates].sort((a, b) => a - b);
  const spanDays = Math.max(
    1,
    Math.round((sorted.at(-1) - sorted[0]) / (24 * 60 * 60 * 1000))
  );
  return clamp01(spanDays / (365 * 3));
}

export function computeMetrics(profile) {
  const commits = profile.commits || [];
  const dates = commits.map(getCommitDate).filter(Boolean);
  const totalCommits = dates.length;

  const languageValues = Object.values(profile.languageBytes || {}).map(Number);

  const metrics = {
    cadence: computeCommitCadence(totalCommits),
    consistency: computeConsistency(dates),
    burstiness: computeBurstiness(dates),
    night_ratio: computeNightRatio(dates),
    weekend_ratio: computeWeekendRatio(dates),
    impact_estimate: computeImpactEstimate(profile),
    language_entropy: normalizedEntropy(languageValues),
    repo_focus: computeRepoFocus(profile.commitCountByRepo || {}, totalCommits),
    collaboration_signal: computeCollaborationSignal(profile),
    longevity_signal: computeLongevitySignal(dates),
  };

  const vector = METRIC_ORDER.map((key) => metrics[key] || 0);

  return {
    metrics,
    vector,
    totalCommits,
    totalRepos: (profile.repos || []).length,
    languageCount: languageValues.length,
  };
}
