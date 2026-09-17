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

## deploying to cloudflare pages

1. Push this repo to GitHub.
2. Cloudflare dashboard, Workers and Pages, Create, Pages, Connect to Git.
3. Pick the repo. Settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy. You get a `.pages.dev` URL immediately.
5. Custom domains tab, add `gregbishop.net` and `www.gregbishop.net`.
   DNS is already on Cloudflare, so the records get added automatically.

Every push to `main` rebuilds and deploys. Pull requests get their own preview URL.

## things to change before launch

- `src/layouts/Base.astro`: the GitHub link in the footer
- `src/pages/about.astro`: the email address and GitHub link
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
