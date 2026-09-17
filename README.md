# gregbishop.net

A static blog. Markdown in, HTML out.

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

- `src/pages/about.astro`: the email address
- `src/content/posts/hello-world.md`: delete it

## structure

```
src/
  content/posts/     your markdown posts
  content.config.ts  frontmatter schema
  layouts/Base.astro shell: masthead, nav, footer, theme toggle
  components/        post row for the index and tag pages
  pages/
    index.astro      homepage, ls -lt listing
    about.astro
    posts/[...slug]  one page per post
    tags/[tag]       one page per tag
    rss.xml.js       feed
  styles/global.css  all styling, tokens at the top
public/              favicon, robots.txt, any images
```

Colors live as CSS variables at the top of `global.css`. Change `--amber`
and the whole accent shifts.
