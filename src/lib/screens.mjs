// The content of the terminal screens, built once and rendered either to HTML
// (home page, tag pages) or to ANSI text (what curl gets).
import banner from '../data/banner.mjs';
import { seg, plain, dim, amber, green, cyan, run, box, beside, toAnsi, wrap } from './tty.mjs';

export const SITE_NAME = 'gregbishop.net';
export const HOST = 'www.gregbishop.net';
export const ORIGIN = `https://${HOST}`;
export const TAGLINE = 'on purpose, mostly';
export const EMAIL = 'me@gregbishop.net';

const iso = (d) => new Date(d).toISOString().slice(0, 10);

// The bio, one source for the about page and for whoami --verbose in the shell.
export const ABOUT = [
  "The plan is to be a homesteader. The current status is: software engineer.",
  "I've been writing code for twenty-some years and I'm currently spending most of that time on agentic AI tooling. Building it, then convincing several thousand coworkers to actually use it, which is the harder half. It's genuinely interesting work. It is also not homesteading.",
  "Meanwhile, on half an acre in Brevard County, the actual plan advances at its own pace. There's a food garden, which is real and has opinions about whether it wants to participate. A plant nursery is coming, natives mostly but not exclusively. Bees are coming after that. Aquaculture is coming after that. The timeline for \"coming\" is doing considerable work in all three of those sentences.",
  "So this site is the overlap: notes on building AI tools, notes on building a homestead, and the occasional observation that both are mostly the same activity, which is figuring out what a system actually needs versus what the documentation claims it needs.",
];

export function aboutLines(width = 70) {
  return ABOUT.flatMap((p, i) => [
    ...wrap(p, width).map((l) => [plain(l)]),
    ...(i < ABOUT.length - 1 ? [[]] : []),
  ]);
}

export function bannerLines() {
  return banner.replace(/\s+$/, '').split('\n').map((l) => [amber(l)]);
}

export function contactLines() {
  return box('contact', [
    [green('email   '), cyan(EMAIL, `mailto:${EMAIL}`)],
    [green('github  '), cyan('github.com/gregbishop', 'https://github.com/gregbishop')],
    [green('rss     '), cyan(`${HOST}/rss.xml`, '/rss.xml')],
  ]);
}

export function taglineLine() {
  return [plain('   '), plain(SITE_NAME), dim('  ·  '), plain(TAGLINE)];
}

export function introLines() {
  const about = box('about', [
    [plain('Software engineer by day,')],
    [plain('mostly on agentic AI tooling.')],
    [plain('Homesteader in progress on')],
    [plain('half an acre in Brevard County:')],
    [plain('garden, nursery, bees, fish.')],
    [plain('Eventually.')],
  ], 30);
  const links = box('links', [
    [green('about   '), cyan(`${HOST}/about`, '/about/')],
    [green('email   '), cyan(EMAIL, `mailto:${EMAIL}`)],
    [green('github  '), cyan('github.com/gregbishop', 'https://github.com/gregbishop')],
    [green('rss     '), cyan(`${HOST}/rss.xml`, '/rss.xml')],
  ]);
  return [
    [],
    ...beside(about, links),
    [],
    [dim('legend')],
    ...[
      ['', 'this page, in your terminal'],
      ['/posts', 'every post, newest first'],
      ['/about', 'who runs this place'],
      ['/rss.xml', 'the feed'],
    ].map(([path, what]) => {
      const cmd = `curl ${HOST}${path}`;
      return [run('$ curl', cmd, 'green'), run(` ${HOST}${path}`.padEnd(29), cmd, 'fg'), dim(what)];
    }),
  ];
}

export function listingLines(posts, { urls = false } = {}) {
  if (!posts.length) return [[dim('no posts yet.')]];
  const out = [];
  for (const p of posts) {
    const line = [dim(iso(p.data.date)), plain('  '), seg(p.data.title, 'amber', `/posts/${p.id}/`)];
    for (const t of p.data.tags) line.push(plain('  '), green(`#${t}`, `/tags/${t}/`));
    out.push(line);
    if (p.data.blurb) out.push([plain('            '), dim(p.data.blurb)]);
    if (urls) out.push([plain('            '), cyan(`${ORIGIN}/posts/${p.id}/`)]);
    out.push([]);
  }
  out.pop();
  return out;
}

export function homeBlocks(posts) {
  return [
    { cmd: `curl ${HOST}`, lines: [...bannerLines(), taglineLine(), ...introLines()] },
    { cmd: 'ls -lt posts/', lines: listingLines(posts) },
  ];
}

export function homeText(posts) {
  return toAnsi([
    ...bannerLines(), taglineLine(), ...introLines(), [],
    [dim('posts')], [],
    ...listingLines(posts, { urls: true }),
  ]);
}

export function postsText(posts) {
  return toAnsi(listingLines(posts, { urls: true }));
}

export function aboutText() {
  return toAnsi([[green('$ whoami --verbose')], [], ...aboutLines(), [], [green('$ cat contact')], [], ...contactLines()]);
}
