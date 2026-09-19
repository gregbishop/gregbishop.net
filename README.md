# gregbishop.net

Greg's personal website: a blog, an about page, and an introduction to Melampus.
Astro builds the pages from Markdown and shared content. Navigation and reading
work without JavaScript.

## writing a post

Create a file in `src/content/posts/`. The filename becomes the URL.

```markdown
---
title: "your title"
date: 2026-09-20
blurb: "one line for the post listing"
tags: ["agents", "homestead"]
draft: false
---

Body goes here.
```

`draft: true` excludes the post from pages, listings, Markdown exports and RSS.
Published posts appear newest first. The existing `hello-world.md` is a starter
post; edit it when there is a real first article to publish.

`draft-fixture.md` is synthetic, unpublished test data. The draft-exclusion tests
require that file to be present with `draft: true`.

## running it locally

```bash
npm install
npm run dev
```

The development server runs on localhost. Saves reload automatically.

```bash
npm run build      # output in dist/
npm run preview    # serve the production build locally
```

## appearance and content

- `src/styles/global.css` holds the dark Earth palette, serif headings,
  system-sans body text, spacing, and responsive rules.
- `src/layouts/Base.astro` owns the header, navigation, main landmark and footer.
- `src/components/post-list.astro` renders the same semantic article list on the
  homepage, blog index and tag pages.
- `src/lib/screens.mjs` holds shared copy, publication/date helpers and plain-text
  exports. The filename is retained from the earlier design.
- `src/content/posts/` contains the articles; `src/content.config.ts` defines
  their frontmatter schema.

The browser terminal, typing replay and ANSI artwork have been retired. Ordinary
routes return HTML for every client. Explicit `/index.txt`, `/posts.txt`,
`/about.txt`, `/melampus.txt` and `/posts/<slug>.md` resources remain available,
along with `/rss.xml`.

## tests and checks

This repo follows the standard named in `AGENTS.md`. `npm test` builds the site,
then runs unit tests for shared content, integration tests against the built HTML
and real local Cloudflare asset server, and Cucumber acceptance tests in Chromium.
Acceptance covers phone/desktop layouts, navigation with JavaScript enabled and
disabled, article reading, keyboard access and clear links.

Install the pinned browser once for local testing:

```bash
npx --no-install playwright install chromium
npm test
npm run lint
npm run audit
```

GitHub installs Chromium and its system dependencies in the acceptance job.
Every pull request runs build, unit, integration, acceptance, lint, audit and ticket
checks. Reviews and green required checks gate merges to main.

## deployment

Cloudflare Workers serves the static files in `dist/`; no custom request handler
is needed. `wrangler.jsonc` declares the assets and existing custom domain.
Workers Builds is connected to `gregbishop/gregbishop.net` and deploys main with:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Astro requires Node 22.12 or newer. `.node-version` pins Node 22.23.2 for GitHub CI
and Cloudflare Workers Builds.

The public site is https://www.gregbishop.net. The bare-domain redirect is managed
separately in Cloudflare; this repository does not change that configuration.
