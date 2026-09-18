// The shell behind the home page prompt. Pure: no DOM. `run` takes a line of
// input and returns { lines } (segment lines for toHtml), { clear: true }, or
// { navigate: url }. Data comes in through the constructor so this can be
// exercised in Node.
import {
  HOST, ORIGIN, EMAIL, bannerLines, taglineLine, introLines, listingLines, contactLines, aboutLines,
} from '../lib/screens.mjs';
import { plain, dim, amber, green, cyan } from '../lib/tty.mjs';

export const COMMANDS = ['help', 'ls', 'cat', 'open', 'whoami', 'about', 'grep', 'tags', 'rss', 'curl', 'clear', 'pwd', 'cd', 'echo', 'date', 'history', 'exit', 'sudo'];
const FILES = ['posts/', 'tags/', 'about', 'contact', 'rss.xml'];

const err = (text) => [[plain(text)]];
const postName = (arg = '') => arg.replace(/^\.?\/?/, '').replace(/^posts\//, '').replace(/\.md$/, '').replace(/\/$/, '');

export function createShell({ posts, fetchText }) {
  const history = [];
  const byId = new Map(posts.map((p) => [p.id, p]));
  const tagCounts = new Map();
  for (const p of posts) for (const t of p.data.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const tags = [...tagCounts.keys()].sort();

  function help() {
    const rows = [
      ['help', 'this'],
      ['ls [posts/|tags/]', 'what is here'],
      ['cat <file>', 'print a file: posts/<name>.md, about, contact'],
      ['open <post|about|rss>', 'leave the terminal and read it properly'],
      ['whoami [--verbose]', 'who is here, and who runs this place'],
      ['grep <#tag|word>', 'find posts'],
      ['tags', 'every tag'],
      ['rss', 'the feed'],
      ['curl <host>', 'what a real terminal sees'],
      ['clear', 'wipe the screen'],
    ];
    const w = Math.max(...rows.map(([c]) => c.length));
    return [
      [dim('commands')],
      ...rows.map(([c, d]) => [plain('  '), green(c.padEnd(w + 2)), dim(d)]),
      [],
      [dim('tab completes. up and down walk history. titles are links.')],
    ];
  }

  function ls(arg) {
    const a = (arg ?? '').replace(/\/$/, '');
    if (!a || a === '.' || a === '~') return [FILES.map((f) => (f.endsWith('/') ? cyan(f + '  ') : plain(f + '  ')))];
    if (a === 'posts') return listingLines(posts);
    if (a === 'tags') return tags.length ? [tags.map((t) => green(`#${t}  `, `/tags/${t}/`))] : [[dim('no tags yet.')]];
    if (byId.has(postName(a))) return [[plain(`posts/${postName(a)}.md`)]];
    if (FILES.includes(a)) return [[plain(a)]];
    return err(`ls: ${arg}: No such file or directory`);
  }

  async function cat(arg) {
    if (!arg) return err('cat: which file? try: cat posts/hello-world.md');
    if (arg === 'about') return aboutLines();
    if (arg === 'contact') return contactLines();
    if (arg === 'rss.xml') return (await fetchText('/rss.xml')).split('\n').map((l) => [dim(l)]);
    const id = postName(arg);
    if (!byId.has(id)) return err(`cat: ${arg}: No such file or directory`);
    const src = await fetchText(`/posts/${id}.md`);
    let fm = false, fence = false;
    return src.replace(/\s+$/, '').split('\n').map((l, i) => {
      if (l === '---' && (i === 0 || fm)) { fm = !fm; return [dim(l)]; }
      if (fm) return [dim(l)];
      if (l.startsWith('```')) { fence = !fence; return [green(l)]; }
      if (fence) return [green(l)];
      if (/^#{1,6} /.test(l)) return [amber(l)];
      if (/^> /.test(l)) return [dim(l)];
      return [plain(l)];
    });
  }

  function open(arg) {
    if (!arg) return err('open: what? a post name, about, or rss');
    if (arg === 'about') return { navigate: '/about/' };
    if (arg === 'rss' || arg === 'rss.xml') return { navigate: '/rss.xml' };
    if (arg.startsWith('#') && tagCounts.has(arg.slice(1))) return { navigate: `/tags/${arg.slice(1)}/` };
    const id = postName(arg);
    if (byId.has(id)) return { navigate: `/posts/${id}/` };
    return err(`open: ${arg}: not found. try: ls posts/`);
  }

  function grep(arg) {
    if (!arg) return err('grep: what for? a #tag or a word');
    const q = arg.toLowerCase();
    const hits = q.startsWith('#')
      ? posts.filter((p) => p.data.tags.includes(q.slice(1)))
      : posts.filter((p) => (p.data.title + ' ' + p.data.blurb + ' ' + p.data.tags.join(' ')).toLowerCase().includes(q));
    return hits.length ? listingLines(hits) : err(`grep: no posts match ${arg}`);
  }

  // curl <url>: what a real terminal gets from the site, for the same paths.
  async function curl(arg = '') {
    const raw = arg.replace(/^https?:\/\//, '');
    const slash = raw.indexOf('/');
    const host = slash === -1 ? raw : raw.slice(0, slash);
    const path = (slash === -1 ? '/' : raw.slice(slash)).replace(/\/+$/, '') || '/';
    if (host && !host.includes('gregbishop')) return err(`curl: (6) Could not resolve host: ${host}. only ${HOST} lives here.`);
    if (path === '/') return [...bannerLines(), taglineLine(), ...introLines(), [], [dim('posts')], [], ...listingLines(posts)];
    if (path === '/about') return [...aboutLines(), [], ...contactLines()];
    if (path === '/posts') return listingLines(posts);
    if (path === '/rss.xml') return [[cyan(`${ORIGIN}/rss.xml`, '/rss.xml')], [dim('(that one is real xml. open rss reads it.)')]];
    const post = path.match(/^\/posts\/([^/]+?)(?:\.md)?$/);
    if (post && byId.has(post[1])) return cat(`posts/${post[1]}.md`);
    const tag = path.match(/^\/tags\/([^/]+)$/);
    if (tag && tagCounts.has(tag[1])) return grep(`#${tag[1]}`);
    return err(`curl: (22) The requested URL returned error: 404 for ${path}`);
  }

  async function run(input) {
    const line = input.trim();
    if (!line) return { lines: [] };
    history.push(line);
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    switch (cmd) {
      case 'help': case '?': return { lines: help() };
      case 'ls': case 'll': case 'dir': return { lines: ls(rest[0]) };
      case 'cat': case 'less': case 'more': return { lines: await cat(rest[0]) };
      case 'open': case 'xdg-open': case 'start': return open(rest[0]);
      case 'whoami': return { lines: rest[0] === '--verbose' || rest[0] === '-v' ? aboutLines() : [[plain('guest')], [dim('the owner: whoami --verbose')]] };
      case 'about': return { lines: aboutLines() };
      case 'grep': case 'rg': case 'find': return { lines: grep(rest[0]) };
      case 'tags': return { lines: tags.length ? tags.map((t) => [green(`#${t}`, `/tags/${t}/`), dim(`  ${tagCounts.get(t)}`)]) : [[dim('no tags yet.')]] };
      case 'rss': return { lines: [[cyan(`${ORIGIN}/rss.xml`, '/rss.xml')]] };
      case 'curl': case 'wget': return { lines: await curl(rest[0]) };
      case 'clear': case 'cls': return { clear: true };
      case 'pwd': return { lines: [[plain('/home/guest')]] };
      case 'cd': return { lines: err(`cd: ${arg || '~'}: this is as far as it goes`) };
      case 'echo': return { lines: [[plain(arg)]] };
      case 'date': return { lines: [[plain(new Date().toString())]] };
      case 'history': return { lines: history.map((h, i) => [dim(String(i + 1).padStart(4) + '  '), plain(h)]) };
      case 'exit': case 'logout': case 'quit': return { lines: err('exit: nowhere else to go. try help, or open about.') };
      case 'sudo': return { lines: err('guest is not in the sudoers file. This incident will be reported.') };
      case 'mail': case 'email': return { lines: [[cyan(EMAIL, `mailto:${EMAIL}`)]] };
      default: return { lines: err(`sh: ${cmd}: command not found. try help.`) };
    }
  }

  // Tab completion: returns { text } for a unique match or { options } for several.
  function complete(input) {
    const parts = input.split(/\s+/);
    const last = parts[parts.length - 1] ?? '';
    let pool;
    if (parts.length <= 1) pool = COMMANDS;
    else if (parts[0] === 'grep') pool = tags.map((t) => `#${t}`);
    else if (parts[0] === 'open') pool = [...byId.keys(), 'about', 'rss', ...tags.map((t) => `#${t}`)];
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

  return { run, complete, history };
}
