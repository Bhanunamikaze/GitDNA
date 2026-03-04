export function clamp01(value) {
  if (Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function toPercent(value) {
  return `${Math.round(clamp01(value) * 100)}%`;
}

export function prettifyKey(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function humanizeError(errorType) {
  switch (errorType) {
    case "user_not_found":
      return "This GitHub username does not exist.";
    case "rate_limited":
      return "GitHub API rate limit reached. Use a token or try demo mode.";
    case "insufficient_data":
      return "Not enough public activity to produce a reliable profile.";
    case "partial_data":
      return "Some data could not be fetched. Showing low-confidence results.";
    case "network_error":
      return "Network issue while contacting GitHub.";
    case "invalid_input":
      return "Enter a valid GitHub username.";
    default:
      return "Could not complete analysis.";
  }
}
