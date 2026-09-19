# gregbishop.net

A static blog that looks like a terminal, and answers like one:

```bash
curl www.gregbishop.net          # the home screen, in color
curl www.gregbishop.net/posts    # every post, newest first
```

Markdown in, HTML out. A browser gets the page; curl gets ANSI text. And the
prompt on the home page is real: type `help`.

## writing a post

Create a file in `src/content/posts/`. The filename becomes the URL.

```markdown
---
title: "your title"
date: 2026-09-20
blurb: "one line for the homepage listing"
tags: ["agents", "homestead"]
draft: false
---

Body goes here.
```

`draft: true` hides it from the site, the RSS feed, and tag pages.
Everything else is standard markdown.

## running it locally

```bash
npm install
npm run dev
```

Opens on http://localhost:4321. Saves reload instantly.

```bash
npm run build      # outputs to dist/
npm run preview    # serve the built site
```

## how the terminal works

- `src/lib/tty.mjs` is the one text model: lines of colored segments, rendered
  to HTML spans for the browser and to ANSI escapes for curl.
- `src/lib/screens.mjs` holds the content of the screens: banner, about and
  links panels, legend, and the post listing.
- `src/pages/index.txt.js` and `posts.txt.js` write the curl versions at build.
- `worker/index.mjs` runs in front of the static files for `/` and `/posts`
  only. A curl-like user agent gets the text file; anything else gets the page.
- `src/data/banner.txt` is the block-letter name. Regenerate it with
  `node scripts/banner.mjs` (figlet, ANSI Shadow font).
- The home page replays its screen with a typing effect. Everything is in the
  HTML; the script only reveals it, so it reads fine without JavaScript and
  respects reduced-motion.

## the shell

After the replay, the home page prompt is live. Each command takes over the
screen. Commands: `help`, `home`, `back`, `ls`, `cat posts/<name>.md` (the raw
markdown), `open <post|about|melampus|rss>`, `whoami`, `grep <#tag|word>`, `tags`, `rss`,
`curl <url>` (the same paths as the real site), `clear`. Tab completes, up and
down walk history, Escape clears the line or, on an empty line, goes back.

Nobody should end up nowhere: a bar of clickable commands sits above the
prompt and survives every wipe; `back` steps through the last thirty screens
and goes home when there is nothing left; typos get a "did you mean" that is
itself clickable; every error ends with a hint; commands in `help`, the
legend and listings run or fill the prompt when clicked.

It is static: the build writes `/cli.json` (post frontmatter) and
`/posts/<name>.md` (the source), and the shell fetches those.

- `src/scripts/shell.mjs` is the shell itself, with no DOM, so it runs in Node.
- `src/scripts/cli.js` is the browser glue: the replay, the hidden input, the
  live prompt, the bar, screen history, and printing output through the same
  renderer as everything else.

## tests and checks

This repo follows the standard in `~/on-purpose` (see `AGENTS.md`). `npm test` builds
the site, then runs:

- unit tests (`tests/unit/`): the text renderer and the shell logic, in Node;
- integration tests (`tests/integration/`): the real browser script in a jsdom document
  against the built home page, and the real Worker on wrangler's local runtime,
  asked as curl and as a browser;
- acceptance (`features/`): the ticket's Done-when scenarios, run with Cucumber.

The acceptance suite also renders the production build in Chromium at phone and
desktop widths, with JavaScript enabled and disabled, and checks that pages and
shell output fit the viewport. Install its pinned browser once with
`npx --no-install playwright install chromium` before running `npm test` locally.
GitHub installs the browser and its system dependencies in the acceptance job.

`npm run lint` and `npm run audit` are the other two checks. CI runs all of them on
every pull request, plus a check that the PR body names its ticket. Main only takes
pull requests with green checks and a review.

## deploying to cloudflare

The site is a Cloudflare Worker that serves `dist/` as static assets.
`wrangler.jsonc` is the whole config, including the custom domain.

Cloudflare builds and deploys every push to `main` (Workers Builds, connected
to the GitHub repo `gregbishop/gregbishop.net`). Build settings:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The build requires Node 22.12 or newer for Astro 7. GitHub CI uses Node 22;
Cloudflare's build image also uses Node 22.

Addresses:

- https://www.gregbishop.net is the site. It is the custom domain declared in `wrangler.jsonc`.
- https://gregbishop.net redirects to www. That redirect predates this site and lives
  in Cloudflare, not in this repo. The bare domain still carries its old DNS records,
  so it cannot be a custom domain yet. To make it serve the site directly: delete the
  bare domain's A/AAAA records in the Cloudflare DNS tab, add
  `{ "pattern": "gregbishop.net", "custom_domain": true }` to `routes`, and change
  `site` in `astro.config.mjs` back to the bare domain.
- https://gregbishop-net.greg-bishop-dev.workers.dev is Cloudflare's auto address.

Manual deploy from this machine, if ever needed:

```bash
npx wrangler login     # once
npm run build && npx wrangler deploy
```

## things to change before launch

- `src/content/posts/hello-world.md`: delete it

## structure

```
src/
  content/posts/     your markdown posts
  content.config.ts  frontmatter schema
  data/banner.mjs    block-letter site name (node scripts/banner.mjs)
  lib/tty.mjs        colored-line model, HTML and ANSI renderers
  lib/screens.mjs    what the terminal screens say
  layouts/Base.astro shell: nav bar, masthead, footer
  scripts/shell.mjs  the in-page shell, pure logic
  scripts/cli.js     the in-page shell, browser side
  pages/
    index.astro      home: the terminal, replay, then a live prompt
    cli.json.js      post index the shell loads
    posts/[slug].md  each post's markdown source, for cat
    index.txt.js     home, as curl sees it
    posts.txt.js     post list, as curl sees it
    about.astro
    posts/[...slug]  one page per post
    tags/[tag]       one page per tag
    rss.xml.js       feed
  styles/global.css  all styling, tokens at the top
worker/index.mjs     serves text to curl, pages to browsers
wrangler.jsonc       Cloudflare config: worker, assets, custom domain
public/              favicon, robots.txt, any images
```

Colors live as CSS variables at the top of `global.css`, and their ANSI
equivalents at the top of `tty.mjs`.
