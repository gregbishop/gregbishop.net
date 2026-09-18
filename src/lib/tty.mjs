// Styled terminal text with one model and two renderers: HTML spans for the
// browser and ANSI escapes for curl. A line is an array of segments; a segment
// is { text, color, href? }. Widths assume one column per character, which
// holds for ASCII and the box-drawing and block characters used here.

const ANSI = { fg: 250, amber: 214, green: 114, cyan: 117, dim: 241, faint: 238, pink: 211 };

export const seg = (text, color = 'fg', href) => (href ? { text, color, href } : { text, color });
export const plain = (text) => seg(text, 'fg');
export const dim = (text) => seg(text, 'dim');
export const faint = (text) => seg(text, 'faint');
export const amber = (text, href) => seg(text, 'amber', href);
export const green = (text, href) => seg(text, 'green', href);
export const cyan = (text, href) => seg(text, 'cyan', href);
export const pink = (text, href) => seg(text, 'pink', href);

export const width = (line) => line.reduce((n, s) => n + s.text.length, 0);

export function pad(line, w) {
  const n = w - width(line);
  return n > 0 ? [...line, plain(' '.repeat(n))] : line;
}

// A titled box:  ┌─title──────┐ / │ content │ / └────────────┘
export function box(title, lines, minInner = 0) {
  const inner = Math.max(minInner, title.length + 2, ...lines.map(width));
  const blank = [faint('│ '), plain(' '.repeat(inner)), faint(' │')];
  return [
    [faint('┌─'), amber(title), faint('─'.repeat(inner + 1 - title.length) + '┐')],
    blank,
    ...lines.map((l) => [faint('│ '), ...pad(l, inner), faint(' │')]),
    blank,
    [faint('└' + '─'.repeat(inner + 2) + '┘')],
  ];
}

// Two blocks of lines side by side, left block padded to its widest line.
export function beside(a, b, gap = 1) {
  const wa = Math.max(...a.map(width));
  const n = Math.max(a.length, b.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const l = a[i] ? pad(a[i], wa) : [plain(' '.repeat(wa))];
    out.push([...l, plain(' '.repeat(gap)), ...(b[i] ?? [])]);
  }
  return out;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function toHtml(lines) {
  return lines
    .map((line) => {
      const inner = line
        .map((s) => (s.href
          ? `<a class="c-${s.color}" href="${esc(s.href)}">${esc(s.text)}</a>`
          : `<span class="c-${s.color}">${esc(s.text)}</span>`))
        .join('');
      return `<span class="ln">${inner}</span>`;
    })
    .join('\n');
}

export function toAnsi(lines) {
  return lines
    .map((line) => line.map((s) => `\x1b[38;5;${ANSI[s.color] ?? ANSI.fg}m${s.text}\x1b[0m`).join(''))
    .join('\n') + '\n';
}

// Word-wrap plain text to a column width; returns an array of strings.
export function wrap(text, w = 72) {
  const out = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + ' ' + word).length > w) { out.push(cur); cur = word; }
    else cur = cur ? cur + ' ' + word : word;
  }
  if (cur) out.push(cur);
  return out;
}
