// The real browser script in a real DOM, against the built home page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openHome } from '../support/dom.mjs';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('Melampus is linked from the home page and has a readable project page', async () => {
  const p = await openHome({ motion: false });
  assert.ok(p.document.querySelector('.topnav a[href="/melampus/"]'));
  assert.ok(p.term.querySelector('a[href="/melampus/"]'));
  const doc = new JSDOM(readFileSync(new URL('../../dist/melampus/index.html', import.meta.url), 'utf8')).window.document;
  assert.equal(doc.querySelector('.topnav [aria-current="page"]').textContent, 'melampus');
  assert.match(doc.querySelector('article').textContent, /Lightroom Classic/);
  assert.match(doc.querySelector('article').textContent, /Apple Silicon/);
  assert.ok(doc.querySelector('article a[href="https://github.com/gregbishop/melampus"]'));
  await p.run('open melampus');
  assert.match(p.text(), /opening \/melampus\//);
});

test('compact layout survives home, help and back without hiding output', async () => {
  const p = await openHome({ motion: false });
  const assertCompact = () => {
    const lines = [...p.term.querySelectorAll('.ln[data-layout="narrow"]')];
    assert.ok(lines.length > 0);
    assert.ok(!p.document.documentElement.classList.contains('anim') || lines.every((line) => line.classList.contains('on')));
    assert.ok(p.term.querySelector('[data-layout="narrow"] a[href="/melampus/"]'));
  };
  assertCompact();
  await p.run('home');
  assertCompact();
  await p.run('help');
  await p.run('back');
  assertCompact();
});

test('the replay hands over a live prompt, with the bar and a hint', async () => {
  const p = await openHome();
  assert.equal(p.live(), false, 'not live during the replay');
  const t = await p.waitLive();
  assert.ok(p.live() && t < 15000, `live after ${t}ms`);
  assert.equal(p.document.documentElement.classList.contains('anim'), false);
  assert.equal(p.term.querySelectorAll('.ln:not(.on)').length, 0, 'nothing left hidden');
  assert.ok(p.text().includes('the prompt is yours'));
  assert.ok(p.bar(), 'bar present');
  assert.equal(p.bar().querySelectorAll('a[data-cmd]').length, 5);
  assert.ok(p.term.querySelector('a[data-cmd="curl www.gregbishop.net/about"]'), 'legend is clickable');
});

test('typing mirrors, enter runs, and each command takes over the screen', async () => {
  const p = await openHome({ motion: false });
  assert.ok(p.live(), 'live at once without motion');
  p.type('he'); assert.equal(p.mirror(), 'he');
  await p.run('help'); assert.ok(p.text().includes('all clickable'));
  await p.run('ls posts/');
  assert.ok(p.term.querySelector('a[href="/posts/hello-world/"]'), 'listing shown');
  assert.ok(!p.text().includes('all clickable'), 'help replaced');
  assert.equal(p.term.querySelectorAll('.cmdline').length, 2, 'the echoed command and the prompt');
  await p.run('cat posts/hello-world.md');
  assert.ok(p.text().includes('title: "starting this thing"'));
  assert.ok(!p.term.querySelector('a[href="/posts/hello-world/"]'), 'listing replaced');
  p.type(''); p.key('Enter'); await p.sleep(100);
  assert.ok(p.text().includes('title: "starting this thing"'), 'empty enter keeps the screen');
});

test('tab, history, escape, ctrl-l', async () => {
  const p = await openHome({ motion: false });
  await p.run('help'); await p.run('ls posts/');
  p.type('cat po'); p.key('Tab'); await p.sleep(200);
  assert.equal(p.input.value, 'cat posts/'); assert.equal(p.mirror(), 'cat posts/');
  assert.ok(p.text().includes('posts/hello-world.md  '), 'options printed');
  p.type(''); p.key('ArrowUp'); assert.equal(p.input.value, 'ls posts/');
  p.key('ArrowUp'); assert.equal(p.input.value, 'help');
  p.key('ArrowDown'); assert.equal(p.input.value, 'ls posts/');
  p.key('Escape'); assert.equal(p.input.value, ''); assert.equal(p.mirror(), '');
  p.key('l', { ctrlKey: true }); await p.sleep(200);
  assert.equal(p.term.querySelectorAll('.ln').length, p.bar().querySelectorAll('.ln').length, 'cleared to the bar and prompt');
});

test('back walks screens, escape on an empty line is back, and back from the first screen goes home', async () => {
  const p = await openHome({ motion: false });
  await p.click('.bar a[data-cmd="help"]');
  await p.click('a[data-cmd="ls posts/"]');
  await p.run('back'); assert.ok(p.text().includes('all clickable'), 'help restored');
  await p.run('back'); assert.ok(p.text().includes('legend'), 'opening screen restored');
  p.key('Escape'); await p.sleep(200);
  assert.ok(p.text().includes('legend') && p.term.querySelector('.cmdline:not(.final) .typed')?.textContent === 'home', 'went home');
  for (let i = 0; i < 40; i++) await p.run(`echo ${i}`);
  await p.run('back'); assert.ok(p.text().includes('echo 38'), 'history capped but working');
});

test('typos suggest, suggestions run on click, fills put text on the prompt, errors carry hints', async () => {
  const p = await openHome({ motion: false });
  await p.run('caat posts/hello-world.md');
  assert.ok(p.text().includes('did you mean cat'));
  await p.click('a[data-cmd="cat posts/hello-world.md"]');
  assert.ok(p.text().includes('title: "starting this thing"'));
  assert.ok(p.term.querySelector('a[data-cmd="open hello-world"]'), 'open link offered after cat');
  await p.run('help'); await p.click('a[data-fill="open "]');
  assert.equal(p.input.value, 'open '); assert.equal(p.mirror(), 'open ');
  p.type(''); await p.run('ls nope');
  assert.ok(p.text().includes('No such file') && p.term.querySelector('.out a[data-cmd="help"]'));
});

test('open prints where it is going; rss prints the feed', async () => {
  const p = await openHome({ motion: false });
  await p.run('rss'); assert.ok(p.text().includes('<rss version="2.0">') && p.text().includes('starting this thing'));
  await p.run('open hello-world'); assert.ok(p.text().includes('opening /posts/hello-world/'));
});

test('a click during the replay ends it at once and runs the command', async () => {
  const p = await openHome();
  await p.sleep(900);
  assert.equal(p.live(), false, 'still replaying');
  await p.click('a[data-cmd="curl www.gregbishop.net/rss.xml"]');
  assert.ok(p.live() && !p.document.documentElement.classList.contains('anim'), 'replay finished');
  assert.equal(p.term.querySelectorAll('.ln:not(.on)').length, 0);
  assert.ok(p.text().includes('that is the feed'), 'command ran');
  await p.sleep(1500);
  assert.equal(p.term.querySelectorAll('.ln:not(.on)').length, 0, 'no leftover replay timers');
  assert.equal(p.term.querySelector('.typing'), null);
});
