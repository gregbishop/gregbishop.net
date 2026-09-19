// The Worker for real: wrangler runs it locally on the workerd runtime with the
// built site, and curl-like and browser-like clients ask for the same paths.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { stripAnsi } from '../support/ansi.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
let proc, base;

const freePort = () => new Promise((resolve) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const get = (path, ua) => fetch(base + path, { headers: { 'user-agent': ua }, redirect: 'manual' });

before(async () => {
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(`${ROOT}node_modules/.bin/wrangler`, ['dev', '--ip', '127.0.0.1', '--port', String(port), '--log-level', 'warn'], {
    cwd: ROOT, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  proc.stdout.on('data', (d) => { log += d; }); proc.stderr.on('data', (d) => { log += d; });
  const started = Date.now();
  while (Date.now() - started < 90000) {
    try { if ((await fetch(base + '/', { headers: { 'user-agent': 'Mozilla/5.0' } })).ok) return; } catch { /* not yet */ }
    if (proc.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`wrangler dev did not come up:\n${log.slice(-1500)}`);
}, { timeout: 120000 });

after(() => { if (proc && proc.exitCode === null) { proc.kill('SIGTERM'); setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* gone */ } }, 3000).unref(); } });

test('a browser gets the page on /', async () => {
  const r = await get('/', 'Mozilla/5.0 (Macintosh) Chrome/128');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  const body = await r.text();
  assert.ok(body.includes('id="cli-in"'), 'the live prompt is in the page');
});

test('curl gets the text screen on /, with the banner', async () => {
  const r = await get('/', 'curl/8.7.1');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/plain; charset=utf-8/);
  assert.match(r.headers.get('vary'), /user-agent/i);
  const body = await r.text();
  assert.ok(body.includes('\x1b[38;5;214m'), 'ansi color present');
  assert.ok(stripAnsi(body).includes('gregbishop.net  ·  on purpose, mostly'));
});

test('curl gets the post list on /posts and the bio on /about; browsers are redirected or served', async () => {
  assert.match(stripAnsi(await (await get('/posts', 'curl/8.7.1')).text()), /starting this thing/);
  assert.match(stripAnsi(await (await get('/about', 'Wget/1.21')).text()), /The plan is to be a homesteader/);
  const posts = await get('/posts', 'Mozilla/5.0');
  assert.equal(posts.status, 302);
  assert.equal(new URL(posts.headers.get('location')).pathname, '/');
  const about = await get('/about/', 'Mozilla/5.0');
  assert.equal(about.status, 200);
  assert.match(about.headers.get('content-type'), /text\/html/);
});

test('everything else passes straight through to the static site', async () => {
  for (const p of ['/posts/hello-world/', '/tags/meta/', '/rss.xml', '/cli.json', '/posts/hello-world.md']) {
    const r = await get(p, 'curl/8.7.1');
    assert.equal(r.status, 200, p);
  }
  assert.equal((await get('/nope', 'curl/8.7.1')).status, 404);
});

test('Melampus has HTML for browsers and the same explanation as text for curl', async () => {
  for (const path of ['/melampus', '/melampus/']) {
    const text = await get(path, 'curl/8.7.1');
    assert.equal(text.status, 200);
    assert.match(text.headers.get('content-type'), /text\/plain/);
    const body = stripAnsi(await text.text());
    assert.match(body, /The camera records the bird/);
    assert.match(body, /Lightroom Classic/);
    assert.match(body, /github.com\/gregbishop\/melampus/);
  }
  const html = await get('/melampus/', 'Mozilla/5.0');
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /text\/html/);
  assert.match(await html.text(), /The camera records the bird/);
});
