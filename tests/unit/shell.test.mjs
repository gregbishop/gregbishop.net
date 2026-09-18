import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShell, suggest, COMMANDS } from '../../src/scripts/shell.mjs';
import { toAnsi, toHtml } from '../../src/lib/tty.mjs';
import { stripAnsi } from '../support/ansi.mjs';

const posts = [
  { id: 'hello-world', data: { title: 'starting this thing', date: '2026-09-17', blurb: 'why a blog', tags: ['meta'] } },
  { id: 'second', data: { title: 'second post', date: '2026-09-18', blurb: '', tags: ['meta', 'garden'] } },
];
const files = { '/posts/hello-world.md': '---\ntitle: t\n---\n\n# body\n\n```js\ncode\n```\n', '/rss.xml': '<rss version="2.0"><channel><title>x</title><link>https://a.b/</link></channel></rss>' };
const shell = () => createShell({ posts, fetchText: async (u) => { if (!(u in files)) throw new Error(`${u}: 404`); return files[u]; } });
const text = (r) => stripAnsi(toAnsi(r.lines));

test('help lists every command and is clickable', async () => {
  const r = await shell().run('help');
  const t = text(r);
  for (const c of ['help', 'home', 'back', 'ls posts/', 'cat', 'open', 'whoami', 'grep', 'tags', 'rss', 'curl', 'clear']) assert.ok(t.includes(c), c);
  assert.ok((toHtml(r.lines).match(/data-(cmd|fill)=/g) || []).length >= 12);
});

test('ls lists what is here, posts, tags, and errors with a hint', async () => {
  const sh = shell();
  assert.match(text(await sh.run('ls')), /posts\/\s+tags\/\s+about\s+contact\s+rss\.xml/);
  assert.match(text(await sh.run('ls posts/')), /2026-09-18 {2}second post {2}#meta {2}#garden/);
  assert.match(text(await sh.run('ls tags/')), /#garden\s+#meta/);
  const err = text(await sh.run('ls nope'));
  assert.match(err, /No such file or directory/);
  assert.match(err, /# try help/);
});

test('cat prints a post with light coloring and ends with an open link; about and contact too', async () => {
  const sh = shell();
  const r = await sh.run('cat posts/hello-world.md');
  assert.match(text(r), /^---\ntitle: t\n---\n\n# body/);
  assert.ok(toHtml(r.lines).includes('data-cmd="open hello-world"'));
  assert.match(text(await sh.run('cat about')), /The plan is to be a homesteader/);
  assert.match(text(await sh.run('cat contact')), /me@gregbishop\.net/);
  assert.match(text(await sh.run('cat')), /which file/);
});

test('open navigates to posts, about, rss, and tags', async () => {
  const sh = shell();
  assert.deepEqual(await sh.run('open hello-world'), { navigate: '/posts/hello-world/' });
  assert.deepEqual(await sh.run('open about'), { navigate: '/about/' });
  assert.deepEqual(await sh.run('open rss'), { navigate: '/rss.xml' });
  assert.deepEqual(await sh.run('open #meta'), { navigate: '/tags/meta/' });
  assert.match(text(await sh.run('open nope')), /not found/);
});

test('grep by tag and by word; tags with counts', async () => {
  const sh = shell();
  assert.match(text(await sh.run('grep #garden')), /second post/);
  assert.doesNotMatch(text(await sh.run('grep #garden')), /starting this thing/);
  assert.match(text(await sh.run('grep starting')), /starting this thing/);
  assert.match(text(await sh.run('grep zzz')), /no posts match/);
  assert.match(text(await sh.run('tags')), /#garden {2}1\n#meta {2}2/);
});

test('curl resolves the site paths and 404s the rest', async () => {
  const sh = shell();
  assert.match(text(await sh.run('curl www.gregbishop.net')), /legend/);
  assert.match(text(await sh.run('curl gregbishop.net/about')), /The plan is to be a homesteader/);
  assert.match(text(await sh.run('curl gregbishop.net/posts')), /starting this thing/);
  assert.match(text(await sh.run('curl gregbishop.net/posts/hello-world')), /# body/);
  assert.match(text(await sh.run('curl gregbishop.net/tags/garden')), /second post/);
  assert.match(text(await sh.run('curl gregbishop.net/rss.xml')), /<rss version="2.0">/);
  assert.match(text(await sh.run('curl gregbishop.net/nope')), /404 for \/nope/);
  assert.match(text(await sh.run('curl example.com')), /Could not resolve host/);
});

test('rss prints the feed pretty-printed with links live', async () => {
  const r = await shell().run('rss');
  assert.match(text(r), /<rss version="2.0">\n {2}<channel>\n {4}<title>x<\/title>/);
  assert.ok(toHtml(r.lines).includes('href="https://a.b/"'));
});

test('home, back, cd .., clear, and the rest', async () => {
  const sh = shell();
  assert.match(text(await sh.run('home')), /legend/);
  assert.deepEqual(await sh.run('back'), { back: true });
  assert.deepEqual(await sh.run('cd ..'), { back: true });
  assert.deepEqual(await sh.run('clear'), { clear: true });
  assert.match(text(await sh.run('whoami')), /^guest/);
  assert.match(text(await sh.run('whoami --verbose')), /homesteader/);
  assert.match(text(await sh.run('sudo rm -rf /')), /not in the sudoers file/);
  assert.match(text(await sh.run('exit')), /nowhere else to go/);
  assert.match(text(await sh.run('echo hi there')), /^hi there/);
  assert.match(text(await sh.run('history')), /1 {2}home/);
});

test('unknown commands suggest the closest real one, clickable', async () => {
  const r = await shell().run('caat posts/hello-world.md');
  assert.match(text(r), /did you mean cat\?/);
  assert.ok(toHtml(r.lines).includes('data-cmd="cat posts/hello-world.md"'));
  assert.match(text(await shell().run('zzzzzz')), /command not found/);
  assert.equal(suggest('hlep'), 'help');
  assert.equal(suggest('qqqqqq'), null);
  for (const c of COMMANDS) assert.equal(suggest(c), c);
});

test('tab completion completes commands, files, tags, and curl paths', () => {
  const sh = shell();
  assert.deepEqual(sh.complete('he'), { text: 'help ' });
  assert.equal(sh.complete('cat po').text, 'cat posts/');
  assert.deepEqual(sh.complete('cat posts/he'), { text: 'cat posts/hello-world.md ' });
  assert.deepEqual(sh.complete('grep #g'), { text: 'grep #garden ' });
  assert.deepEqual(sh.complete('curl www.gregbishop.net/ab'), { text: 'curl www.gregbishop.net/about ' });
  assert.ok(sh.complete('open ').options.includes('#garden'));
});
