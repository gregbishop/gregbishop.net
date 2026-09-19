import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as content from '../../src/lib/screens.mjs';

const posts = [
  { id: 'older', data: { title: 'An older note', date: new Date('2025-01-01'), blurb: 'Earlier thoughts.', tags: ['garden'], draft: false } },
  { id: 'draft', data: { title: 'Unpublished note', date: new Date('2026-09-19'), blurb: 'Not ready.', tags: [], draft: true } },
  { id: 'newer', data: { title: 'A newer note', date: new Date('2026-09-17'), blurb: 'Recent thoughts.', tags: ['software'] } },
];

test('published posts exclude drafts, sort newest first and preserve their source collection', () => {
  const input = [...posts];
  assert.deepEqual(content.publishedPosts(input), [posts[2], posts[0]]);
  assert.deepEqual(input, posts);
  assert.deepEqual(content.publishedPosts([]), []);
});

test('readable dates use English and UTC even near a local date boundary', () => {
  assert.equal(typeof content.formatDate, 'function');
  assert.equal(content.formatDate(new Date('2026-09-17T00:30:00Z')), 'September 17, 2026');
  assert.equal(content.formatDate('2026-09-17T23:30:00-04:00'), 'September 18, 2026');
});

test('explicit text resources preserve content and links without terminal controls or artwork', () => {
  const published = content.publishedPosts(posts);
  for (const text of [content.homeText(published), content.postsText(published), content.aboutText(), content.melampusText()]) {
    assert.ok(!text.includes(String.fromCharCode(27)), 'no ANSI escapes');
    assert.doesNotMatch(text, /[┌└│█]|\$ (?:curl|whoami|cat)|<[^>]+>/);
    assert.ok(text.endsWith('\n'), 'plain text ends with a newline');
  }
  const listing = content.postsText(published);
  assert.ok(listing.indexOf('A newer note') < listing.indexOf('An older note'));
  assert.match(listing, /September 17, 2026/);
  assert.match(listing, /https:\/\/www\.gregbishop\.net\/posts\/newer\//);
  assert.doesNotMatch(listing, /Unpublished note/);
  assert.match(content.homeText(published), /https:\/\/www\.gregbishop\.net\/melampus\//);
  assert.match(content.homeText(published), /https:\/\/www\.gregbishop\.net\/posts\//);
  assert.match(content.aboutText(), /me@gregbishop\.net/);
  assert.match(content.melampusText(), /https:\/\/github\.com\/gregbishop\/melampus/);
  for (const paragraph of content.ABOUT) assert.ok(content.aboutText().includes(paragraph));
  for (const paragraph of [...content.MELAMPUS.intro, ...content.MELAMPUS.sections.flatMap((section) => section.paragraphs)]) assert.ok(content.melampusText().includes(paragraph));
});

test('an empty collection still yields a useful plain-text post listing', () => {
  assert.match(content.postsText([]), /no posts|nothing published/i);
});
