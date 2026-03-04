import { CACHE_TTL_MS } from "../config.js";

function getCacheKey(username, version) {
  return `gitdna:${version}:${username.toLowerCase()}`;
}

export function getCachedAnalysis(username, version) {
  try {
    const key = getCacheKey(username, version);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed?.createdAt || !parsed?.data) {
      return null;
    }
    const age = Date.now() - parsed.createdAt;
    if (age > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setCachedAnalysis(username, version, data) {
  try {
    const key = getCacheKey(username, version);
    const payload = {
      createdAt: Date.now(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // localStorage can fail in privacy-restricted contexts.
  }
}
