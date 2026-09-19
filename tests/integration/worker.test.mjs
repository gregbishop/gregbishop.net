// The hosting boundary for real: wrangler serves the built assets locally.
// Ordinary browser and curl requests must receive identical HTML.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const ROOT = new URL('../../', import.meta.url).pathname;
let proc, base;

const freePort = () => new Promise((resolve, reject) => { const s = createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const get = (path, ua) => fetch(base + path, { headers: { 'user-agent': ua }, redirect: 'manual', signal: AbortSignal.timeout(5000) });

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
    try { if ((await get('/', 'Mozilla/5.0')).ok) return; } catch { /* not yet */ }
    if (proc.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`wrangler dev did not come up:\n${log.slice(-1500)}`);
}, { timeout: 120000 });

after(() => { if (proc && proc.exitCode === null) { proc.kill('SIGTERM'); setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* gone */ } }, 3000).unref(); } });

async function canonicalResponse(path, ua) {
  let response = await get(path, ua);
  if ([301, 302, 307, 308].includes(response.status)) {
    const destination = new URL(response.headers.get('location'), base);
    assert.equal(destination.origin, base, 'redirect remains on the local server');
    assert.equal(destination.pathname, path + '/', 'only canonical trailing-slash redirects');
    response = await get(destination.pathname, ua);
  }
  return response;
}

test('browsers and command-line clients get the same standard HTML on every public route', async () => {
  for (const path of ['/', '/posts', '/posts/', '/about', '/about/', '/melampus', '/melampus/', '/posts/hello-world/', '/tags/meta/']) {
    const bodies = [];
    for (const ua of ['curl/8.7.1', 'Mozilla/5.0 (Macintosh) Chrome/128', 'Wget/1.21']) {
      const response = await canonicalResponse(path, ua);
      assert.equal(response.status, 200, `${path} ${ua}`);
      assert.match(response.headers.get('content-type'), /text\/html/, `${path} ${ua}`);
      const body = await response.text();
      assert.match(body, /<main\b/);
      assert.doesNotMatch(body, /id="cli-in"|data-cmd=/);
      bodies.push(body);
    }
    assert.equal(bodies[0], bodies[1], path);
    assert.equal(bodies[1], bodies[2], path);
  }
});

test('explicit text resources remain readable without ANSI escapes or artwork', async () => {
  for (const [path, expected] of [['/index.txt', /gregbishop\.net/], ['/posts.txt', /starting this thing/], ['/about.txt', /The plan is to be a homesteader/], ['/melampus.txt', /Lightroom Classic/]]) {
    const response = await get(path, 'curl/8.7.1');
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/plain/);
    const body = await response.text();
    assert.match(body, expected);
    assert.ok(!body.includes(String.fromCharCode(27)), 'no ANSI escapes');
    assert.doesNotMatch(body, /[┌└│█]|\$ (?:curl|whoami|cat)/);
  }
});

test('RSS and raw Markdown survive while nonexistent pages and the retired CLI API return 404', async () => {
  const rss = await get('/rss.xml', 'curl/8.7.1');
  assert.equal(rss.status, 200);
  assert.match(await rss.text(), /<rss version="2.0">/);
  const markdown = await get('/posts/hello-world.md', 'curl/8.7.1');
  assert.equal(markdown.status, 200);
  assert.match(await markdown.text(), /title: "starting this thing"/);
  for (const path of ['/nope', '/cli.json']) assert.equal((await get(path, 'curl/8.7.1')).status, 404, path);
});
