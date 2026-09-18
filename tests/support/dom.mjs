// A real DOM for the home page: the built index.html in jsdom, the actual
// browser script mounted, and helpers that type, click, and read the terminal.
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';

const DIST = new URL('../../dist/', import.meta.url);

export async function openHome({ motion = true } = {}) {
  const html = readFileSync(new URL('index.html', DIST), 'utf8');
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/navigation/i.test(String(e.message || e))) throw e; });
  const dom = new JSDOM(html, { url: 'http://127.0.0.1/', runScripts: 'outside-only', virtualConsole: vc, pretendToBeVisual: true });
  const { window } = dom;
  for (const k of ['window', 'HTMLElement', 'Element', 'KeyboardEvent', 'Event', 'MouseEvent', 'Node']) globalThis[k] = window[k] ?? window;
  globalThis.document = window.document;
  globalThis.location = window.location;
  window.Element.prototype.scrollIntoView = () => {};
  globalThis.fetch = async (url) => {
    const p = new URL(url, 'http://x/').pathname;
    const f = new URL('.' + p, DIST);
    return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(f, 'utf8')), text: async () => readFileSync(f, 'utf8') };
  };
  if (motion) document.documentElement.classList.add('anim');
  const { mount } = await import('../../src/scripts/cli.js');
  const term = document.getElementById('term');
  mount(term);
  const input = document.getElementById('cli-in');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const page = {
    window, document, term, input, sleep,
    text: () => term.textContent,
    live: () => !!term.querySelector('.cmdline.final.live'),
    bar: () => term.querySelector('.bar'),
    mirror: () => document.getElementById('cli-line').textContent,
    key: (k, o = {}) => input.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o })),
    type: (s) => { input.value = s; input.dispatchEvent(new window.Event('input', { bubbles: true })); },
    run: async (cmd) => { page.type(cmd); page.key('Enter'); await sleep(200); },
    click: async (selector) => { const a = term.querySelector(selector); if (!a) throw new Error(`nothing matches ${selector}`); a.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); await sleep(200); },
    waitLive: async (limit = 15000) => { let t = 0; while (!page.live() && t < limit) { await sleep(100); t += 100; } return t; },
  };
  return page;
}
