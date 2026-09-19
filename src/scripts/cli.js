// Home page terminal: replays the two commands with a typing effect, then hands
// the prompt to the visitor. Command logic lives in shell.mjs and rendering in
// the shared tty/screens modules; this file is only DOM. Each command takes
// over the screen; `back` restores the previous one; a bar of clickable
// commands sits above the prompt and never goes away.
import { createShell } from './shell.mjs';
import { toHtml, run, dim } from '../lib/tty.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const BAR = [
  [dim('# '), run('help', 'help', 'dim'), dim(' · '), run('home', 'home', 'dim'), dim(' · '), run('ls posts/', 'ls posts/', 'dim'),
   dim(' · '), run('about', 'whoami --verbose', 'dim'), dim(' · '), run('back', 'back', 'dim')],
];

export function mount(term) {
  const root = document.documentElement;
  const code = term.querySelector('code');
  const final = term.querySelector('.cmdline.final');
  const lineEl = final?.querySelector('.typed');
  const input = document.getElementById('cli-in');
  if (!code || !final || !lineEl || !input) return;

  // The bar lives just above the prompt, outside every wipe and snapshot.
  final.insertAdjacentHTML('beforebegin', `<span class="bar on">${toHtml(BAR).replace('class="ln"', 'class="ln on"')}</span>\n`);
  const bar = term.querySelector('.bar');

  let shell = null;
  let ready = false;
  let busy = false;
  let hist = -1;
  let draft = '';
  const screens = [];

  const insert = (html) => bar.insertAdjacentHTML('beforebegin', html + '\n');
  const say = (lines) => insert(`<span class="out on">${toHtml(lines).replace(/class="ln"/g, 'class="ln on"')}</span>`);
  const echo = (cmd) => insert(`<span class="cmdline on"><span class="prompt">$ </span><span class="typed">${esc(cmd)}</span></span>`);
  const settle = () => final.scrollIntoView({ block: 'nearest' });

  const before = () => { const out = []; for (const n of code.childNodes) { if (n === bar) break; out.push(n); } return out; };
  const snapshot = () => before().map((n) => (n.nodeType === 3 ? n.textContent : n.outerHTML)).join('');
  const wipe = () => { for (const n of before()) n.remove(); };
  const restore = (html) => { wipe(); bar.insertAdjacentHTML('beforebegin', html); };
  const remember = () => { const s = snapshot(); if (s.trim()) { screens.push(s); if (screens.length > 30) screens.shift(); } };

  async function load() {
    if (shell) return shell;
    const res = await fetch('/cli.json', { signal: AbortSignal.timeout(10000) });
    const { posts } = await res.json();
    shell = createShell({
      posts,
      fetchText: async (url) => {
        const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.text();
      },
    });
    return shell;
  }

  async function exec(cmd) {
    if (busy || !cmd.trim()) return;
    busy = true;
    input.value = '';
    lineEl.textContent = '';
    hist = -1; draft = '';
    try {
      const sh = await load();
      let out = await sh.run(cmd);
      // back from the first screen goes home: there is always somewhere to land.
      if (out.back && !screens.length) { cmd = 'home'; out = await sh.run(cmd); }
      if (out.back) {
        restore(screens.pop());
      } else {
        remember();
        wipe();
        if (out.clear) { /* just the prompt and the bar */ }
        else if (out.navigate) { echo(cmd); say([[dim(`opening ${out.navigate}`)]]); location.href = out.navigate; }
        else { echo(cmd); if (out.lines?.length) say(out.lines); }
      }
    } catch (e) {
      say([[dim(`sh: ${e.message}`)], [dim('# try '), run('home', 'home', 'dim'), dim('.')]]);
    } finally {
      busy = false;
    }
    settle();
  }

  const submit = () => exec(input.value);

  function onKey(e) {
    if (!ready) finishReplay();
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!shell) { load().then(() => onKey(e)); return; }
      const c = shell.complete(input.value);
      if (c.options) say([c.options.map((o) => ({ text: o + '  ', color: 'fg' }))]);
      input.value = c.text; lineEl.textContent = c.text; settle();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const h = shell?.history ?? [];
      if (!h.length) return;
      if (hist === -1) draft = input.value;
      hist = e.key === 'ArrowUp' ? Math.min(hist + 1, h.length - 1) : Math.max(hist - 1, -1);
      input.value = hist === -1 ? draft : h[h.length - 1 - hist];
      lineEl.textContent = input.value;
      return;
    }
    if (e.ctrlKey && e.key === 'l') { e.preventDefault(); exec('clear'); return; }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (input.value) { input.value = ''; lineEl.textContent = ''; } else exec('back');
      return;
    }
    if (e.ctrlKey && e.key === 'c') { e.preventDefault(); input.value = ''; lineEl.textContent = ''; }
  }

  input.addEventListener('input', () => { lineEl.textContent = input.value; });
  input.addEventListener('keydown', onKey);
  term.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a?.dataset.cmd !== undefined) { e.preventDefault(); finishReplay(); exec(a.dataset.cmd); return; }
    if (a?.dataset.fill !== undefined) { e.preventDefault(); finishReplay(); input.value = a.dataset.fill; lineEl.textContent = input.value; input.focus({ preventScroll: true }); return; }
    if (a) return;
    finishReplay();
    input.focus({ preventScroll: true });
  });

  let timer = 0;
  let replaying = false;
  const wait = (fn, ms) => { timer = setTimeout(fn, ms); };
  function finishReplay() {
    if (!replaying) return;
    replaying = false;
    clearTimeout(timer);
    for (const el of term.querySelectorAll('.cmdline, .ln')) el.classList.add('on');
    for (const el of term.querySelectorAll('.cmdline.typing')) el.classList.remove('typing');
    for (const el of term.querySelectorAll('.cmdline:not(.final) .typed')) el.textContent = el.dataset.full ?? el.textContent;
    root.classList.remove('anim');
    enable();
  }

  function enable() {
    if (ready) return;
    ready = true;
    insert('<span class="ln on"><span class="c-dim"># the prompt is yours. type help, or click anything in the bar below.</span></span>');
    final.classList.add('on', 'live');
    load().catch(() => {});
  }

  // Replay, unless the visitor prefers reduced motion (then everything is
  // already visible and the prompt is live at once).
  if (!root.classList.contains('anim')) { enable(); return; }
  replaying = true;
  const items = term.querySelectorAll('.cmdline:not(.final), .out');
  let i = 0;
  function next() {
    if (i >= items.length) { replaying = false; root.classList.remove('anim'); enable(); return; }
    const el = items[i++];
    el.classList.contains('cmdline') ? typeCmd(el, next) : reveal(el, next);
  }
  function typeCmd(el, cb) {
    el.classList.add('on');
    const t = el.querySelector('.typed');
    const full = t.textContent; let k = 0;
    t.dataset.full = full;
    t.textContent = '';
    el.classList.add('typing');
    (function step() {
      if (k < full.length) { t.textContent += full[k++]; wait(step, 55); }
      else { el.classList.remove('typing'); wait(cb, 220); }
    })();
  }
  function reveal(el, cb) {
    el.classList.add('on');
    const lns = el.querySelectorAll('.ln'); let k = 0;
    (function step() {
      if (k < lns.length) { lns[k++].classList.add('on'); wait(step, 12); }
      else wait(cb, 450);
    })();
  }
  wait(next, 500);
}
