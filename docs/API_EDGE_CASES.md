# API Edge Cases and Error Handling

## Goal
Guarantee that every visitor gets a meaningful outcome, even when GitHub API data is sparse or unavailable.

## Edge-Case Classification
1. `user_not_found`
   Condition: GitHub returns `404` for username.
2. `rate_limited`
   Condition: API returns `403` with rate-limit exhaustion signal.
3. `insufficient_data`
   Condition: public activity does not meet minimum threshold.
4. `partial_data`
   Condition: some API calls fail but enough signal remains to score.
5. `network_error`
   Condition: request timeout, DNS, or generic network failure.

## Minimum Data Threshold
Return full-confidence results only when both are true:
1. at least `3` public repos scanned
2. at least `10` valid commits aggregated

If thresholds are not met:
1. return `insufficient_data`
2. offer demo profile CTA
3. show low-confidence sample insights only

## UI States

### Loading State
1. Show skeleton cards for type, traits, and charts.
2. Show staged progress labels:
   - `Fetching repositories`
   - `Analyzing commits`
   - `Computing DNA profile`
3. Avoid spinner-only waits.

### `user_not_found`
1. Message: `We could not find this GitHub username.`
2. Actions:
   - retry input
   - open profile URL pattern hint
   - try demo profile

### `rate_limited`
1. Message: `GitHub API limit reached for this session.`
2. Actions:
   - optional PAT input
   - retry in snapshot mode
   - try demo profile

### `insufficient_data`
1. Message: `Not enough public activity to produce a reliable DNA profile yet.`
2. Actions:
   - explain minimum thresholds
   - suggest another public profile
   - try demo profile

### `partial_data`
1. Message: `We analyzed available data and generated a low-confidence profile.`
2. Actions:
   - show confidence badge
   - expose missing-data reasons
   - allow PAT retry for richer data

### `network_error`
1. Message: `Network issue while contacting GitHub.`
2. Actions:
   - retry request
   - switch to demo profile

## API Wrapper Contract
All fetch utilities return:
```json
{
  "ok": true,
  "status": 200,
  "data": {},
  "errorType": null,
  "retryAfterSeconds": null
}
```

or

```json
{
  "ok": false,
  "status": 403,
  "data": null,
  "errorType": "rate_limited",
  "retryAfterSeconds": 1200
}
```

## Logging Categories
1. `api_user_not_found`
2. `api_rate_limited`
3. `api_partial_data`
4. `api_network_error`
5. `analysis_insufficient_data`

## Acceptance Tests
1. Unknown username triggers `user_not_found` screen.
2. Mocked rate-limit response triggers PAT and demo options.
3. Profile with <3 repos triggers `insufficient_data`.
4. Partial failure still renders type with low-confidence badge.
