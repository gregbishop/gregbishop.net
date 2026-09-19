import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { ABOUT, MELAMPUS } from '../../src/lib/screens.mjs';

const read = (path) => readFileSync(new URL(`../../dist/${path}`, import.meta.url), 'utf8');
const documentAt = (path) => new JSDOM(read(path)).window.document;
const paths = ['index.html', 'about/index.html', 'melampus/index.html', 'posts/index.html', 'posts/hello-world/index.html', 'tags/meta/index.html'];

test('every public page has familiar navigation, one main heading and keyboard access without a terminal', () => {
  for (const path of paths) {
    const doc = documentAt(path);
    assert.equal(doc.querySelectorAll('main#main').length, 1, path);
    assert.equal(doc.querySelectorAll('h1').length, 1, path);
    assert.ok(doc.querySelector('main h1'), path);
    assert.equal(doc.querySelector('main').getAttribute('tabindex'), '-1', path);
    assert.ok(doc.querySelector('a[href="#main"]'), `skip link on ${path}`);
    assert.ok(doc.querySelector('header a[href="/"]'), `home brand on ${path}`);
    for (const [href, label] of [['/posts/', 'blog'], ['/about/', 'about'], ['/melampus/', 'melampus']]) {
      const link = doc.querySelector(`header nav a[href="${href}"]`);
      assert.ok(link, `${label} navigation on ${path}`);
      assert.equal(link.textContent.trim().toLowerCase(), label);
    }
    assert.equal(doc.querySelector('#cli-in, [data-cmd], [data-fill], pre.terminal, .cmdline, .typing'), null, path);
    assert.doesNotMatch(doc.querySelector('main').textContent, /\$ curl|the prompt is yours|[┌└│█]/, path);
  }
});

test('the blog index exposes the same published articles as RSS with dates and descriptions', () => {
  const rss = new JSDOM(read('rss.xml'), { contentType: 'text/xml' }).window.document;
  const items = [...rss.querySelectorAll('item')];
  assert.ok(items.length > 0);
  const doc = documentAt('posts/index.html');
  assert.equal(doc.querySelector('header nav [aria-current="page"]')?.getAttribute('href'), '/posts/');
  const links = [...doc.querySelectorAll('main a[href^="/posts/"]')].filter((link) => link.getAttribute('href') !== '/posts/');
  assert.deepEqual(links.map((link) => link.getAttribute('href')), items.map((item) => new URL(item.querySelector('link').textContent).pathname));
  assert.deepEqual(links.map((link) => link.textContent.trim()), items.map((item) => item.querySelector('title').textContent));
  assert.equal(doc.querySelectorAll('main time[datetime]').length, items.length);
  for (const item of items) assert.ok(doc.querySelector('main').textContent.includes(item.querySelector('description').textContent));
  for (const time of doc.querySelectorAll('main time')) {
    assert.ok(!Number.isNaN(Date.parse(time.getAttribute('datetime'))));
    assert.match(time.textContent, /[A-Z][a-z]+ \d{1,2}, \d{4}/);
  }
});

test('the homepage offers direct article, project and contact links', () => {
  const doc = documentAt('index.html');
  assert.ok(doc.querySelector('main a[href="/posts/hello-world/"]'));
  assert.ok(doc.querySelector('main a[href="/melampus/"]'));
  assert.ok(doc.querySelector('a[href="mailto:me@gregbishop.net"]'));
  assert.ok(doc.querySelector('a[href="/rss.xml"]'));
});

test('About and Melampus preserve the original prose, privacy details and project source', () => {
  const about = documentAt('about/index.html');
  for (const paragraph of ABOUT) assert.ok(about.querySelector('main').textContent.includes(paragraph), paragraph);
  assert.ok(about.querySelector('a[href="mailto:me@gregbishop.net"]'));
  const melampus = documentAt('melampus/index.html');
  for (const paragraph of [...MELAMPUS.intro, ...MELAMPUS.sections.flatMap((section) => section.paragraphs)]) assert.ok(melampus.querySelector('main').textContent.includes(paragraph), paragraph);
  assert.ok(melampus.querySelector('main a[href="https://github.com/gregbishop/melampus"]'));
});

test('articles and tags retain their reading paths and alternative formats', () => {
  const article = documentAt('posts/hello-world/index.html');
  assert.ok(article.querySelector('main a[href="/posts/"]'), 'back to blog within the article');
  assert.ok(article.querySelector('main a[href="/tags/meta/"]'));
  assert.ok(article.querySelector('main a[href="/posts/hello-world.md"]'));
  const tag = documentAt('tags/meta/index.html');
  assert.ok(tag.querySelector('main a[href="/posts/"]'), 'back to blog within tag results');
  assert.ok(tag.querySelector('main a[href="/posts/hello-world/"]'));
  assert.match(read('posts/hello-world.md'), /title: "starting this thing"/);
});

test('the real draft collection entry is absent from every built listing and reading format', () => {
  const fixture = readFileSync(new URL('../../src/content/posts/draft-fixture.md', import.meta.url), 'utf8');
  assert.match(fixture, /^draft: true$/m, 'the fixture must remain unpublished');
  assert.match(fixture, /unpublished-fixture-9a7c/);
  for (const path of ['index.html', 'posts/index.html', 'tags/meta/index.html', 'index.txt', 'posts.txt', 'rss.xml', 'sitemap-0.xml']) {
    assert.doesNotMatch(read(path), /unpublished-fixture-9a7c|draft-fixture/, path);
  }
});

test('article and shared post listings expose Topics as named navigation', () => {
  for (const path of ['index.html', 'posts/index.html', 'posts/hello-world/index.html', 'tags/meta/index.html']) {
    const doc = documentAt(path);
    const topics = doc.querySelector('main nav[aria-label="Topics"]');
    assert.ok(topics, `named Topics navigation on ${path}`);
    assert.ok(topics.querySelector('a[href="/tags/meta/"]'), path);
  }
});
