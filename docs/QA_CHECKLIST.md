# QA Checklist

## Accessibility Checks
- [x] Skip link present (`Skip to analysis form`).
- [x] Keyboard-visible focus styles on form controls and links.
- [x] Text/table fallback for metric data.
- [x] Plain-language accessibility summary per result.
- [x] Error state uses readable messages and actions.

## Keyboard Navigation Checks
- [x] Full flow usable with Tab/Shift+Tab + Enter.
- [x] `/` focuses codex search.
- [x] `Ctrl+K` or `Cmd+K` focuses username input.
- [x] Action buttons (analyze, demo, share, copy snippet) keyboard-operable.

## Mobile Checks
- [x] Layout collapses to one-column on small screens.
- [x] Character block stacks above text on mobile.
- [x] Codex filters collapse to vertical controls on mobile.
- [x] Primary actions remain visible and tap-friendly.

## Regression Smoke
- [x] Demo profile loads on initial page view.
- [x] Live analysis path still handles rate-limit and fallback.
- [x] Share card export still works after UI updates.
