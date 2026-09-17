// The content of the terminal screens, built once and rendered either to HTML
// (home page, tag pages) or to ANSI text (what curl gets).
import banner from '../data/banner.txt?raw';
import { seg, plain, dim, amber, green, cyan, box, beside, toAnsi } from './tty.mjs';

export const SITE_NAME = 'gregbishop.net';
export const HOST = 'www.gregbishop.net';
export const ORIGIN = `https://${HOST}`;
export const TAGLINE = 'on purpose, mostly';
export const EMAIL = 'me@gregbishop.net';

const iso = (d) => d.toISOString().slice(0, 10);

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
    [green('$ curl'), plain(` ${HOST}          `), dim('this page, in your terminal')],
    [green('$ curl'), plain(` ${HOST}/posts    `), dim('every post, newest first')],
    [green('$ curl'), plain(` ${HOST}/rss.xml  `), dim('the feed')],
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
