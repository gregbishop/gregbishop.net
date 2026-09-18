import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plain, dim, amber, cyan, run, fill, box, beside, width, pad, wrap, toHtml, toAnsi } from '../../src/lib/tty.mjs';

test('toHtml renders segments as spans, links, and clickable commands', () => {
  const html = toHtml([[plain('a'), cyan('b', '/b/'), run('c', 'ls', 'green'), fill('d', 'cat ')], []]);
  assert.match(html, /<span class="ln"><span class="c-fg">a<\/span><a class="c-cyan" href="\/b\/">b<\/a><a class="c-green run" href="#" data-cmd="ls">c<\/a><a class="c-green run" href="#" data-fill="cat ">d<\/a><\/span>\n<span class="ln"><\/span>/);
});

test('toHtml escapes markup in text and attributes', () => {
  assert.equal(toHtml([[plain('<b>&'), cyan('x', '/"y')]]), '<span class="ln"><span class="c-fg">&lt;b&gt;&amp;</span><a class="c-cyan" href="/&quot;y">x</a></span>');
});

test('toAnsi colors each segment with 256-color escapes and ends with a newline', () => {
  assert.equal(toAnsi([[amber('hi'), dim('!')]]), '\x1b[38;5;214mhi\x1b[0m\x1b[38;5;241m!\x1b[0m\n');
});

test('box draws a titled frame padded to the widest line', () => {
  const lines = box('t', [[plain('ab')], [plain('abcd')]]);
  const text = lines.map((l) => l.map((s) => s.text).join(''));
  assert.deepEqual(text, ['┌─t────┐', '│      │', '│ ab   │', '│ abcd │', '│      │', '└──────┘']);
  assert.ok(text.every((l) => [...l].length === 8), 'every line the same width');
});

test('beside places two blocks side by side, padding the shorter one', () => {
  const out = beside([[plain('aa')], [plain('a')]], [[plain('b')]]);
  assert.deepEqual(out.map((l) => l.map((s) => s.text).join('')), ['aa b', 'a  ']);
});

test('width, pad and wrap', () => {
  assert.equal(width([plain('ab'), dim('c')]), 3);
  assert.equal(pad([plain('ab')], 4).map((s) => s.text).join(''), 'ab  ');
  assert.deepEqual(wrap('one two three four', 9), ['one two', 'three', 'four']);
});
