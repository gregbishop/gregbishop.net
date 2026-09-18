// Home page terminal: replays the two commands with a typing effect, then hands
// the prompt to the visitor. Output rendering and command logic live in
// shell.mjs and the shared tty/screens modules; this file is only DOM.
import { createShell } from './shell.mjs';
import { toHtml } from '../lib/tty.mjs';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function mount(term) {
  const root = document.documentElement;
  const final = term.querySelector('.cmdline.final');
  const lineEl = final.querySelector('.typed');
  const input = document.getElementById('cli-in');
  if (!final || !lineEl || !input) return;

  let shell = null;
  let ready = false;
  let busy = false;
  let hist = -1;
  let draft = '';

  const insert = (html) => final.insertAdjacentHTML('beforebegin', html + '\n');
  const say = (lines) => insert(`<span class="out on">${toHtml(lines).replace(/class="ln"/g, 'class="ln on"')}</span>`);
  const echo = (cmd) => insert(`<span class="cmdline on"><span class="prompt">$ </span><span class="typed">${esc(cmd)}</span></span>`);
  const settle = () => final.scrollIntoView({ block: 'nearest' });

  async function load() {
    if (shell) return shell;
    const res = await fetch('/cli.json');
    const { posts } = await res.json();
    shell = createShell({
      posts,
      fetchText: async (url) => {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.text();
      },
    });
    return shell;
  }

  async function submit() {
    if (busy) return;
    const cmd = input.value;
    input.value = '';
    lineEl.textContent = '';
    hist = -1; draft = '';
    echo(cmd);
    if (!cmd.trim()) { settle(); return; }
    busy = true;
    try {
      const sh = await load();
      const out = await sh.run(cmd);
      if (out.clear) {
        for (const el of term.querySelectorAll('code > .cmdline:not(.final), code > .out, code > .ln')) el.remove();
        term.querySelector('code').childNodes.forEach((n) => { if (n.nodeType === 3 && n.nextSibling !== final) n.remove(); });
      } else if (out.navigate) {
        say([[{ text: `opening ${out.navigate}`, color: 'dim' }]]);
        location.href = out.navigate;
      } else if (out.lines?.length) {
        say(out.lines);
      }
    } catch (e) {
      say([[{ text: `sh: ${e.message}`, color: 'dim' }]]);
    }
    busy = false;
    settle();
  }

  function onKey(e) {
    if (!ready) return;
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
    if ((e.ctrlKey && e.key === 'l')) { e.preventDefault(); input.value = 'clear'; submit(); return; }
    if ((e.ctrlKey && e.key === 'c') || e.key === 'Escape') { e.preventDefault(); input.value = ''; lineEl.textContent = ''; return; }
  }

  input.addEventListener('input', () => { lineEl.textContent = input.value; });
  input.addEventListener('keydown', onKey);
  term.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    input.focus({ preventScroll: true });
  });

  function enable() {
    ready = true;
    insert('<span class="ln on"><span class="c-dim"># the prompt is yours. type help, or click a title.</span></span>');
    final.classList.add('on', 'live');
    load().catch(() => {});
  }

  // Replay, unless the visitor prefers reduced motion (then everything is
  // already visible and the prompt is live at once).
  if (!root.classList.contains('anim')) { enable(); return; }
  const items = term.querySelectorAll('.cmdline:not(.final), .out');
  let i = 0;
  function next() {
    if (i >= items.length) { root.classList.remove('anim'); enable(); return; }
    const el = items[i++];
    el.classList.contains('cmdline') ? typeCmd(el, next) : reveal(el, next);
  }
  function typeCmd(el, cb) {
    el.classList.add('on');
    const t = el.querySelector('.typed');
    const full = t.textContent; let k = 0;
    t.textContent = '';
    el.classList.add('typing');
    (function step() {
      if (k < full.length) { t.textContent += full[k++]; setTimeout(step, 55); }
      else { el.classList.remove('typing'); setTimeout(cb, 220); }
    })();
  }
  function reveal(el, cb) {
    el.classList.add('on');
    const lns = el.querySelectorAll('.ln'); let k = 0;
    (function step() {
      if (k < lns.length) { lns[k++].classList.add('on'); setTimeout(step, 12); }
      else setTimeout(cb, 450);
    })();
  }
  setTimeout(next, 500);
}
