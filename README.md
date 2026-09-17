# gregbishop.net

A static blog that looks like a terminal, and answers like one:

```bash
curl www.gregbishop.net          # the home screen, in color
curl www.gregbishop.net/posts    # every post, newest first
```

Markdown in, HTML out. A browser gets the page; curl gets ANSI text.

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

## deploying to cloudflare

The site is a Cloudflare Worker that serves `dist/` as static assets.
`wrangler.jsonc` is the whole config, including the custom domain.

Cloudflare builds and deploys every push to `main` (Workers Builds, connected
to the GitHub repo `gregbishop/gregbishop.net`). Build settings:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Cloudflare's build image runs Node 22, which is what Astro 5 needs. No pin required.

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
  data/banner.txt    block-letter site name (node scripts/banner.mjs)
  lib/tty.mjs        colored-line model, HTML and ANSI renderers
  lib/screens.mjs    what the terminal screens say
  layouts/Base.astro shell: nav bar, masthead, footer
  pages/
    index.astro      home: the terminal, with typing replay
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
