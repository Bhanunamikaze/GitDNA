import { FETCH_LIMITS, MIN_DATA_THRESHOLDS } from "../config.js";

const API_ROOT = "https://api.github.com";

function makeHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json",
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

function parseRateLimitReset(headers) {
  const resetHeader = headers.get("x-ratelimit-reset");
  if (!resetHeader) {
    return null;
  }
  const seconds = Number(resetHeader);
  if (!Number.isFinite(seconds)) {
    return null;
  }
  const delta = Math.max(0, seconds - Math.floor(Date.now() / 1000));
  return delta;
}

async function requestJson(path, token) {
  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      headers: makeHeaders(token),
    });

    if (response.status === 404) {
      return {
        ok: false,
        status: 404,
        data: null,
        errorType: "user_not_found",
        retryAfterSeconds: null,
      };
    }

    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      if (remaining === "0") {
        return {
          ok: false,
          status: 403,
          data: null,
          errorType: "rate_limited",
          retryAfterSeconds: parseRateLimitReset(response.headers),
        };
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        errorType: "network_error",
        retryAfterSeconds: null,
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: response.status,
      data,
      errorType: null,
      retryAfterSeconds: null,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      errorType: "network_error",
      retryAfterSeconds: null,
    };
  }
}

function sortRepos(repos) {
  return [...repos].sort((a, b) => {
    const aScore = a.stargazers_count * 2 + a.forks_count;
    const bScore = b.stargazers_count * 2 + b.forks_count;
    return bScore - aScore;
  });
}

function summarizeRepos(repos) {
  return repos.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    watchers: repo.watchers_count,
    language: repo.language || "Unknown",
    updatedAt: repo.updated_at,
  }));
}

export function hasInsufficientData(profileData) {
  return (
    profileData.repos.length < MIN_DATA_THRESHOLDS.minRepos ||
    profileData.commits.length < MIN_DATA_THRESHOLDS.minCommits
  );
}

export async function fetchLiveProfile(
  username,
  { token = "", limits = FETCH_LIMITS } = {}
) {
  const cleanUsername = (username || "").replace("@", "").trim();
  if (!cleanUsername) {
    return {
      ok: false,
      status: 0,
      data: null,
      errorType: "invalid_input",
      retryAfterSeconds: null,
    };
  }

  const userResult = await requestJson(`/users/${cleanUsername}`, token);
  if (!userResult.ok) {
    return userResult;
  }

  const reposResult = await requestJson(
    `/users/${cleanUsername}/repos?per_page=100&type=owner&sort=updated`,
    token
  );
  if (!reposResult.ok) {
    return reposResult;
  }

  const selectedRepos = sortRepos(reposResult.data).slice(0, limits.repoLimit);
  const partialErrors = [];
  const commits = [];
  const languageBytes = {};
  const commitCountByRepo = {};

  const requestJobs = [];

  for (const repo of selectedRepos) {
    const owner = repo.owner.login;
    const repoName = repo.name;

    requestJobs.push(
      (async () => {
        const commitResult = await requestJson(
          `/repos/${owner}/${repoName}/commits?per_page=${limits.commitsPerRepo}&author=${encodeURIComponent(cleanUsername)}`,
          token
        );

        if (commitResult.ok && Array.isArray(commitResult.data)) {
          commitCountByRepo[repoName] = commitResult.data.length;
          for (const commit of commitResult.data) {
            commits.push({
              sha: commit.sha,
              repo: repoName,
              date: commit.commit?.author?.date || null,
              message: commit.commit?.message || "",
            });
          }
        } else if (commitResult.errorType) {
          partialErrors.push(`commits:${repoName}:${commitResult.errorType}`);
        }

        const languageResult = await requestJson(
          `/repos/${owner}/${repoName}/languages`,
          token
        );
        if (languageResult.ok && languageResult.data) {
          for (const [language, bytes] of Object.entries(languageResult.data)) {
            languageBytes[language] = (languageBytes[language] || 0) + Number(bytes);
          }
        } else if (languageResult.errorType) {
          partialErrors.push(`languages:${repoName}:${languageResult.errorType}`);
        }
      })()
    );
  }

  await Promise.all(requestJobs);

  const dedupedCommits = Object.values(
    commits.reduce((acc, commit) => {
      acc[commit.sha] = commit;
      return acc;
    }, {})
  );

  const partialData = partialErrors.length > 0;
  const repoSummary = summarizeRepos(selectedRepos);

  return {
    ok: true,
    status: 200,
    data: {
      username: cleanUsername,
      user: {
        login: userResult.data.login,
        name: userResult.data.name || userResult.data.login,
        avatarUrl: userResult.data.avatar_url || "",
        followers: userResult.data.followers || 0,
        publicRepos: userResult.data.public_repos || 0,
      },
      repos: repoSummary,
      commits: dedupedCommits,
      languageBytes,
      commitCountByRepo,
      meta: {
        partialData,
        partialErrors,
        selectedRepos: repoSummary.length,
        totalCommits: dedupedCommits.length,
      },
    },
    errorType: partialData ? "partial_data" : null,
    retryAfterSeconds: null,
  };
}
