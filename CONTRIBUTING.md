# Contributing to GitDNA

Thanks for contributing.

## Quick Start
1. Fork and clone the repository.
2. Create a feature branch from `main`.
3. Run local generators when relevant:
   - `node scripts/generate_types_json.js`
   - `node scripts/generate_readme_cards.js`
   - `node scripts/generate_profile_pages.js`
4. Validate:
   - `find src scripts -name '*.js' -print0 | xargs -0 -n1 node --check`
   - `find data -name '*.json' -print0 | xargs -0 -n1 jq empty`
5. Commit with clear scoped messages.
6. Open a pull request with rationale and screenshots for UI changes.

## Labels
- `good-first-issue`: beginner-friendly.
- `help-wanted`: ready for community implementation.
- `bug`: behavior mismatch/defect.
- `data-model`: centroid/type/achievement logic changes.
- `ui-polish`: styling, layout, and interaction improvements.

## Pull Request Rules
1. Keep PRs focused and small where possible.
2. Include test steps and expected behavior.
3. Do not commit secrets or private access tokens.
4. If you change scoring logic, update docs and data version metadata.

## Hall of Fame Submission
Use the Hall of Fame issue template. Approved submissions are compiled into `data/hall_of_fame.json` by workflow.
