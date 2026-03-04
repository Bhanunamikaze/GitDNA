# SEO and Social Strategy

## Goal
Maximize discovery and click-through from GitHub, search, and social shares.

## Landing Page Metadata
1. Title: `GitDNA - Discover Your GitHub Developer DNA`
2. Description: concise value statement with deterministic scoring and 100 types.
3. Canonical URL for main site.
4. Open Graph defaults:
   - `og:title`
   - `og:description`
   - `og:image`
   - `og:type=website`
5. Twitter defaults:
   - `twitter:card=summary_large_image`
   - `twitter:title`
   - `twitter:description`
   - `twitter:image`

## Profile Share Pages
For cached/demo profiles, pre-generate static pages:
1. `/u/<username>/index.html`
2. profile-specific tags:
   - `og:title`: `<username> is The Midnight Mason | GitDNA`
   - `og:image`: `/data/cards/<username>.png` or `.svg`
   - `twitter:image`: same card asset

Generate these pages in GitHub Actions to stay fully static and free.

## README Embed Badge Strategy
Provide copy-paste snippet:
```markdown
![My GitDNA](https://<username>.github.io/GitDNA/data/cards/<username>.svg)
```

If user card does not exist yet:
1. show placeholder card URL
2. offer submission/refresh workflow

## Technical SEO Baseline
1. semantic headings in landing/result pages.
2. descriptive link text (no "click here").
3. sitemap.xml for static routes.
4. robots.txt allowing public indexing.

## Social Distribution Hooks
1. Share modal with platform-tailored text templates.
2. Use fun alias + rarity in share title.
3. Add deep-link back to compare mode.

## Measurement
Track:
1. social share clicks
2. card image loads
3. README badge embed traffic
4. landing-to-analysis conversion
