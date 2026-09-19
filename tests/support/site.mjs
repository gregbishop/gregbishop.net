import assert from 'node:assert/strict';

// Expectations shared by the generated-site and browser boundary checks.
export const retiredTerminalSelector = '#cli-in, [data-cmd], [data-fill], pre.terminal, .cmdline, .typing';
export const textResources = [
  ['/index.txt', /gregbishop\.net/],
  ['/posts.txt', /starting this thing/],
  ['/about.txt', /The plan is to be a homesteader/],
  ['/melampus.txt', /Lightroom Classic/],
];

export function assertPlainText(body, expected) {
  assert.match(body, expected);
  assert.ok(!body.includes(String.fromCharCode(27)), 'no ANSI escapes');
  assert.doesNotMatch(body, /[┌└│█]|\$ (?:curl|whoami|cat)/);
}
