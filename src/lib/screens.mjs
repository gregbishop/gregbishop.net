// The content of the terminal screens, built once and rendered either to HTML
// (home page, tag pages) or to ANSI text (what curl gets).
import banner from '../data/banner.mjs';
import { seg, plain, dim, amber, green, cyan, run, box, beside, toAnsi, wrap, responsive } from './tty.mjs';

export const SITE_NAME = 'gregbishop.net';
export const HOST = 'www.gregbishop.net';
export const ORIGIN = `https://${HOST}`;
export const TAGLINE = 'on purpose, mostly';
export const EMAIL = 'me@gregbishop.net';
export const MELAMPUS_URL = 'https://github.com/gregbishop/melampus';
// One source for the project page, shell, and curl response.
export const MELAMPUS = {
  "tagline": "Species identification and photo triage for Lightroom Classic.",
  "intro": [
    "The camera records the bird. It does not record which bird. This leaves a surprising amount of clerical work for someone who thought they had gone outside.",
    "Melampus is an attempt to close that gap. It uses AI to identify species in photographs, assess technical quality, and bring the results into Adobe Lightroom Classic. Birds, mostly, though plants and other wildlife are also allowed to participate."
  ],
  "sections": [
    {
      "title": "What it does",
      "paragraphs": [
        "It looks at the photo and returns ranked species candidates with reasons for its choices. It can also check those candidates against occurrence data for the place and season. A plausible-looking bird still has to account for being in Florida.",
        "The quality checks measure sharpness on the subject. A beautifully resolved branch in front of a blurry bird is an achievement, but probably not the one you were after.",
        "The Lightroom plugin brings the results into the catalog for review, using keywords, ratings, flags, and color labels. Existing metadata is preserved. The years spent organizing a catalog do not need an AI-assisted sequel."
      ]
    },
    {
      "title": "Where it runs",
      "paragraphs": [
        "The default inference runs locally on an Apple Silicon Mac, using MLX. Your photos stay on your machine in that setup. Cloud inference is available as an explicit option, including for Windows; choosing it means sending images to the selected provider."
      ]
    },
    {
      "title": "How much to believe it",
      "paragraphs": [
        "It is a working project, with the emphasis distributed fairly evenly between those two words. The model can be wrong, and its confidence is not a promise. It can decline to identify something, which is a useful quality in both software and birders.",
        "The point is to make a large catalog easier to review. You still get the final say about the bird."
      ]
    },
    {
      "title": "The name",
      "paragraphs": [
        "Melampus was a Greek seer who could understand the speech of animals. This version reads JPEGs. Pronounced meh-LAM-pus."
      ]
    }
  ]
};

const iso = (d) => new Date(d).toISOString().slice(0, 10);

// The bio, one source for the about page and for whoami --verbose in the shell.
export const ABOUT = [
  "The plan is to be a homesteader. The current status is: software engineer.",
  "I've been writing code for twenty-some years and I'm currently spending most of that time on agentic AI tooling. Building it, then convincing several thousand coworkers to actually use it, which is the harder half. It's genuinely interesting work. It is also not homesteading.",
  "Meanwhile, on half an acre in Brevard County, the actual plan advances at its own pace. There's a food garden, which is real and has opinions about whether it wants to participate. A plant nursery is coming, natives mostly but not exclusively. Bees are coming after that. Aquaculture is coming after that. The timeline for \"coming\" is doing considerable work in all three of those sentences.",
  "So this site is the overlap: notes on building AI tools, notes on building a homestead, and the occasional observation that both are mostly the same activity, which is figuring out what a system actually needs versus what the documentation claims it needs.",
];

function paragraphLines(paragraphs, width) {
  const lines = (render) => paragraphs.flatMap((p, i) => [
    ...render(p), ...(i < paragraphs.length - 1 ? [[]] : []),
  ]);
  return responsive(lines((p) => wrap(p, width).map((line) => [plain(line)])), lines((p) => [[plain(p)]]));
}

export function aboutLines(width = 70) {
  return paragraphLines(ABOUT, width);
}

export function bannerLines() {
  return responsive(banner.replace(/\s+$/, '').split('\n').map((l) => [amber(l)]), [[amber('greg bishop')]]);
}

export function contactLines() {
  const links = [
    [green('email   '), cyan(EMAIL, `mailto:${EMAIL}`)],
    [green('github  '), cyan('github.com/gregbishop', 'https://github.com/gregbishop')],
    [green('rss     '), cyan(`${HOST}/rss.xml`, '/rss.xml')],
  ];
  return responsive(box('contact', links), links);
}

export function taglineLine() {
  return [plain('   '), plain(SITE_NAME), dim('  ·  '), plain(TAGLINE)];
}

export function introLines() {
  const bio = [
    [plain('Software engineer by day,')],
    [plain('mostly on agentic AI tooling.')],
    [plain('Homesteader in progress on')],
    [plain('half an acre in Brevard County:')],
    [plain('garden, nursery, bees, fish.')],
    [plain('Eventually.')],
  ];
  const links = [
    [green('about   '), cyan(`${HOST}/about`, '/about/')],
    [green('email   '), cyan(EMAIL, `mailto:${EMAIL}`)],
    [green('github  '), cyan('github.com/gregbishop', 'https://github.com/gregbishop')],
    [green('rss     '), cyan(`${HOST}/rss.xml`, '/rss.xml')],
    [green('project '), cyan(`${HOST}/melampus`, '/melampus/')],
  ];
  return [
    [],
    ...responsive(beside(box('about', bio, 30), box('links', links)), [
      [amber('about')],
      [plain(bio.flatMap((line) => line.map((s) => s.text)).join(' '))],
      [],
      [amber('links')],
      ...links,
    ]),
    [],
    [dim('legend')],
    ...[
      ['', 'this page, in your terminal'],
      ['/posts', 'every post, newest first'],
      ['/about', 'who runs this place'],
      ['/melampus', 'species ID for the photo backlog'],
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

export function melampusLines(width = 70) {
  return [
    [amber('Melampus')], [dim(MELAMPUS.tagline)], [],
    ...paragraphLines(MELAMPUS.intro, width), [],
    ...MELAMPUS.sections.flatMap((section) => [[amber(section.title)], [], ...paragraphLines(section.paragraphs, width), []]),
    [cyan(MELAMPUS_URL, MELAMPUS_URL)],
    [plain('Source, setup instructions, and evaluation notes live there.')],
  ];
}

export function melampusText() {
  return toAnsi(melampusLines());
}
