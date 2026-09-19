// The shell behind the home page prompt. Pure: no DOM. `run` takes a line of
// input and returns { lines } (segment lines for toHtml), { clear: true },
// { back: true } or { navigate: url }. Data comes in through the constructor
// so this can be exercised in Node.
import {
  HOST, ORIGIN, EMAIL, bannerLines, taglineLine, introLines, listingLines, contactLines, aboutLines, melampusLines,
} from '../lib/screens.mjs';
import { plain, dim, amber, green, cyan, run, fill } from '../lib/tty.mjs';

export const COMMANDS = ['help', 'home', 'back', 'ls', 'cat', 'open', 'whoami', 'about', 'grep', 'tags', 'rss', 'curl', 'clear', 'pwd', 'cd', 'echo', 'date', 'history', 'exit', 'sudo'];
const ALIASES = { '?': 'help', ll: 'ls', dir: 'ls', less: 'cat', more: 'cat', 'xdg-open': 'open', start: 'open', rg: 'grep', find: 'grep', wget: 'curl', cls: 'clear', logout: 'exit', quit: 'exit', mail: 'email', prev: 'back', '..': 'back' };
const FILES = ['posts/', 'tags/', 'about', 'contact', 'rss.xml', 'melampus'];

const postName = (arg = '') => arg.replace(/^\.?\/?/, '').replace(/^posts\//, '').replace(/\.md$/, '').replace(/\/$/, '');

// Every error ends with a way out.
const hint = (...extra) => [dim('# try '), run('help', 'help', 'dim'), ...extra.flatMap((x) => [dim(', '), x]), dim('.')];
const err = (text, ...extra) => [[plain(text)], hint(...extra)];

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

export function suggest(word) {
  let best = null, bestD = 3;
  for (const c of COMMANDS) { const d = distance(word, c); if (d < bestD) { bestD = d; best = c; } }
  return best;
}

// The feed is one long line of xml; show it the way a person would want to read it.
function xmlLines(src) {
  const out = [];
  let depth = 0;
  for (const raw of src.replace(/>\s*</g, '>\n<').split('\n')) {
    const t = raw.trim();
    if (!t) continue;
    const closing = /^<\//.test(t);
    const leaf = /^<\?/.test(t) || /^<!/.test(t) || /\/>$/.test(t) || /^<[^/!?][^>]*>[^<]*<\/[^>]+>$/.test(t);
    if (closing) depth = Math.max(0, depth - 1);
    const line = [plain('  '.repeat(depth))];
    for (const piece of t.split(/(<[^>]+>)/).filter(Boolean)) {
      if (piece.startsWith('<')) line.push(dim(piece));
      else if (/^https?:\/\/\S+$/.test(piece)) line.push(cyan(piece, piece));
      else line.push(plain(piece));
    }
    out.push(line);
    if (!closing && !leaf && /^<[^/!?]/.test(t)) depth++;
  }
  return out;
}

export function createShell({ posts, fetchText }) {
  const history = [];
  const byId = new Map(posts.map((p) => [p.id, p]));
  const tagCounts = new Map();
  for (const p of posts) for (const t of p.data.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tags = [...tagCounts.keys()].sort();
  const firstPost = posts[0]?.id ?? 'hello-world';

  function help() {
    const rows = [
      [run('help', 'help'), 'this'],
      [run('home', 'home'), 'the opening screen'],
      [run('back', 'back'), 'the previous screen (also Escape, or cd ..)'],
      [run('ls posts/', 'ls posts/'), 'every post'],
      [fill('cat posts/<name>.md', `cat posts/${firstPost}.md`), 'print a post, raw markdown'],
      [fill('open <post|about|melampus|rss>', 'open '), 'leave the terminal and read it properly'],
      [run('whoami --verbose', 'whoami --verbose'), 'who runs this place'],
      [fill('grep <#tag|word>', 'grep #'), 'find posts'],
      [run('tags', 'tags'), 'every tag'],
      [run('rss', 'rss'), 'the feed'],
      [fill('curl <url>', `curl ${HOST}/`), 'what a real terminal sees'],
      [run('clear', 'clear'), 'wipe the screen'],
    ];
    const w = Math.max(...rows.map(([c]) => c.text.length));
    return [
      [dim('commands, all clickable')],
      ...rows.map(([c, d]) => [plain('  '), c, plain(' '.repeat(w + 2 - c.text.length)), dim(d)]),
      [],
      [dim('tab completes. up and down walk history. titles are links. the bar below never goes away.')],
    ];
  }

  const feed = async () => [
    ...xmlLines(await fetchText('/rss.xml')),
    [],
    [dim('# that is the feed. its address for a reader: '), cyan(`${ORIGIN}/rss.xml`, '/rss.xml')],
  ];
  const home = () => [...bannerLines(), taglineLine(), ...introLines(), [], [dim('posts')], [], ...listingLines(posts)];

  function ls(arg) {
    const a = (arg ?? '').replace(/\/$/, '');
    if (!a || a === '.' || a === '~') {
      return [[
        run('posts/', 'ls posts/', 'cyan'), plain('  '), run('tags/', 'ls tags/', 'cyan'), plain('  '),
        run('about', 'cat about', 'fg'), plain('  '), run('contact', 'cat contact', 'fg'), plain('  '), run('rss.xml', 'rss', 'fg'),
        plain('  '), run('melampus', 'cat melampus', 'fg'),
      ], [], [dim('# click one, or cat it')]];
    }
    if (a === 'posts') return listingLines(posts);
    if (a === 'tags') return tags.length ? [tags.map((t) => run(`#${t}  `, `grep #${t}`))] : [[dim('no tags yet.')]];
    if (byId.has(postName(a))) return [[run(`posts/${postName(a)}.md`, `cat posts/${postName(a)}.md`, 'fg')]];
    if (FILES.includes(a)) return [[plain(a)]];
    return err(`ls: ${arg}: No such file or directory`, run('ls', 'ls', 'dim'));
  }

  async function cat(arg) {
    if (!arg) return err('cat: which file?', run(`cat posts/${firstPost}.md`, `cat posts/${firstPost}.md`, 'dim'));
    if (arg === 'about') return aboutLines();
    if (arg === 'melampus') return melampusLines();
    if (arg === 'contact') return contactLines();
    if (arg === 'rss.xml') return feed();
    const id = postName(arg);
    if (!byId.has(id)) return err(`cat: ${arg}: No such file or directory`, run('ls posts/', 'ls posts/', 'dim'));
    const src = await fetchText(`/posts/${id}.md`);
    let fm = false, fence = false;
    const lines = src.replace(/\s+$/, '').split('\n').map((l, i) => {
      if (l === '---' && (i === 0 || fm)) { fm = !fm; return [dim(l)]; }
      if (fm) return [dim(l)];
      if (l.startsWith('```')) { fence = !fence; return [green(l)]; }
      if (fence) return [green(l)];
      if (/^#{1,6} /.test(l)) return [amber(l)];
      if (/^> /.test(l)) return [dim(l)];
      return [plain(l)];
    });
    return [...lines, [], [dim('# '), run(`open ${id}`, `open ${id}`, 'dim'), dim(' reads it on its own page')]];
  }

  function open(arg) {
    if (!arg) return err('open: what? a post name, about, melampus, or rss', run('ls posts/', 'ls posts/', 'dim'));
    if (arg === 'about') return { navigate: '/about/' };
    if (arg === 'melampus') return { navigate: '/melampus/' };
    if (arg === 'rss' || arg === 'rss.xml') return { navigate: '/rss.xml' };
    if (arg.startsWith('#') && tagCounts.has(arg.slice(1))) return { navigate: `/tags/${arg.slice(1)}/` };
    const id = postName(arg);
    if (byId.has(id)) return { navigate: `/posts/${id}/` };
    return err(`open: ${arg}: not found`, run('ls posts/', 'ls posts/', 'dim'));
  }

  function grep(arg) {
    if (!arg) return err('grep: what for? a #tag or a word', run('tags', 'tags', 'dim'));
    const q = arg.toLowerCase();
    const hits = q.startsWith('#')
      ? posts.filter((p) => p.data.tags.includes(q.slice(1)))
      : posts.filter((p) => (p.data.title + ' ' + p.data.blurb + ' ' + p.data.tags.join(' ')).toLowerCase().includes(q));
    return hits.length ? listingLines(hits) : err(`grep: no posts match ${arg}`, run('ls posts/', 'ls posts/', 'dim'));
  }

  // curl <url>: what a real terminal gets from the site, for the same paths.
  async function curl(arg = '') {
    const raw = arg.replace(/^https?:\/\//, '');
    const slash = raw.indexOf('/');
    const host = slash === -1 ? raw : raw.slice(0, slash);
    const path = (slash === -1 ? '/' : raw.slice(slash)).replace(/\/+$/, '') || '/';
    if (host && !host.includes('gregbishop')) return err(`curl: (6) Could not resolve host: ${host}. only ${HOST} lives here.`, run(`curl ${HOST}`, `curl ${HOST}`, 'dim'));
    if (path === '/') return home();
    if (path === '/about') return [...aboutLines(), [], ...contactLines()];
    if (path === '/melampus') return melampusLines();
    if (path === '/posts') return listingLines(posts);
    if (path === '/rss.xml') return feed();
    const post = path.match(/^\/posts\/([^/]+?)(?:\.md)?$/);
    if (post && byId.has(post[1])) return cat(`posts/${post[1]}.md`);
    const tag = path.match(/^\/tags\/([^/]+)$/);
    if (tag && tagCounts.has(tag[1])) return grep(`#${tag[1]}`);
    return err(`curl: (22) The requested URL returned error: 404 for ${path}`, run(`curl ${HOST}`, `curl ${HOST}`, 'dim'));
  }

  async function run_(input) {
    const line = input.trim();
    if (!line) return { lines: [] };
    history.push(line);
    const [word, ...rest] = line.split(/\s+/);
    const cmd = ALIASES[word] ?? word;
    const arg = rest.join(' ');
    switch (cmd) {
      case 'help': return { lines: help() };
      case 'home': return { lines: home() };
      case 'back': return { back: true };
      case 'ls': return { lines: ls(rest[0]) };
      case 'cat': return { lines: await cat(rest[0]) };
      case 'open': { const r = open(rest[0]); return Array.isArray(r) ? { lines: r } : r; }
      case 'whoami': return { lines: rest[0] === '--verbose' || rest[0] === '-v' ? aboutLines() : [[plain('guest')], [dim('# the owner: '), run('whoami --verbose', 'whoami --verbose', 'dim')]] };
      case 'about': return { lines: aboutLines() };
      case 'grep': return { lines: grep(rest[0]) };
      case 'tags': return { lines: tags.length ? tags.map((t) => [run(`#${t}`, `grep #${t}`), dim(`  ${tagCounts.get(t)}`)]) : [[dim('no tags yet.')]] };
      case 'rss': return { lines: await feed() };
      case 'curl': return { lines: await curl(rest[0]) };
      case 'clear': return { clear: true };
      case 'pwd': return { lines: [[plain('/home/guest')]] };
      case 'cd': return rest[0] === '..' || rest[0] === '-' ? { back: true } : { lines: err(`cd: ${arg || '~'}: this is as far as it goes`, run('ls', 'ls', 'dim')) };
      case 'echo': return { lines: [[plain(arg)]] };
      case 'date': return { lines: [[plain(new Date().toString())]] };
      case 'history': return { lines: history.map((h, i) => [dim(String(i + 1).padStart(4) + '  '), run(h, h, 'fg')]) };
      case 'exit': return { lines: err('exit: nowhere else to go', run('home', 'home', 'dim')) };
      case 'sudo': return { lines: err('guest is not in the sudoers file. This incident will be reported.') };
      case 'email': return { lines: [[cyan(EMAIL, `mailto:${EMAIL}`)]] };
      default: {
        const s = suggest(cmd);
        return { lines: s
          ? [[plain(`sh: ${word}: command not found. did you mean `), run(s, [s, ...rest].join(' '), 'green'), plain('?')], hint()]
          : err(`sh: ${word}: command not found`) };
      }
    }
  }

  // Tab completion: returns { text } for a unique match or { options } for several.
  function complete(input) {
    const parts = input.split(/\s+/);
    const last = parts[parts.length - 1] ?? '';
    let pool;
    if (parts.length <= 1) pool = COMMANDS;
    else if (parts[0] === 'grep') pool = tags.map((t) => `#${t}`);
    else if (parts[0] === 'open') pool = [...byId.keys(), 'about', 'melampus', 'rss', ...tags.map((t) => `#${t}`)];
    else if (parts[0] === 'curl') pool = ['/', '/posts', '/about', '/melampus', '/rss.xml', ...[...byId.keys()].map((id) => `/posts/${id}`)].map((p) => `${HOST}${p}`);
    else pool = [...FILES, ...[...byId.keys()].map((id) => `posts/${id}.md`)];
    const hits = pool.filter((x) => x.startsWith(last));
    if (hits.length === 1) return { text: [...parts.slice(0, -1), hits[0]].join(' ') + (hits[0].endsWith('/') ? '' : ' ') };
    if (hits.length > 1) {
      let common = hits[0];
      for (const h of hits) while (!h.startsWith(common)) common = common.slice(0, -1);
      return { text: common.length > last.length ? [...parts.slice(0, -1), common].join(' ') : input, options: hits };
    }
    return { text: input };
  }

  return { run: run_, complete, history };
}
