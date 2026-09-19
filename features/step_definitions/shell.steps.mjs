import { Given, When, Then, After, setDefaultTimeout } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { openHome, openBrowser } from '../../tests/support/dom.mjs';

setDefaultTimeout(30000);

Given('a visitor opens the home page', async function () { this.page = await openHome(); });
Given('a visitor at the live prompt', async function () { this.page = await openHome({ motion: false }); assert.ok(this.page.live()); });
When('the replay finishes', async function () { await this.page.waitLive(); });
Then('the prompt is live', function () { assert.ok(this.page.live()); });
Then('the bar offers help, home, the post listing, about, and back', function () {
  const cmds = [...this.page.bar().querySelectorAll('a[data-cmd]')].map((a) => a.dataset.cmd);
  assert.deepEqual(cmds, ['help', 'home', 'ls posts/', 'whoami --verbose', 'back']);
});
When('they run {string}', async function (cmd) { await this.page.run(cmd); });
When('they click the suggestion', async function () { await this.page.click('.out a[data-cmd]'); });
Then('the screen shows the help output', function () { assert.ok(this.page.text().includes('all clickable')); });
Then('the screen does not show the help output', function () { assert.ok(!this.page.text().includes('all clickable')); });
Then('the screen shows the opening screen', function () { assert.ok(this.page.text().includes('legend')); });
Then('the screen says {string}', function (s) { assert.ok(this.page.text().includes(s), s); });
Then('the screen shows the post\'s markdown', function () { assert.ok(this.page.text().includes('title: "starting this thing"')); });
Then('the screen shows the feed', function () { assert.ok(this.page.text().includes('<rss version="2.0">')); });

Then('the home page links to the Melampus explanation', function () {
  assert.ok(this.page.document.querySelector('.topnav a[href="/melampus/"]'));
  assert.ok(this.page.term.querySelector('a[href="/melampus/"]'));
});
Then('the terminal offers compact content with the same links', function () {
  const links = (layout) => [...new Set([...this.page.term.querySelectorAll(`[data-layout="${layout}"] a[href]`)].map((a) => a.getAttribute('href')))].sort();
  assert.ok(this.page.term.querySelector('[data-layout="narrow"]'));
  assert.deepEqual(links('narrow'), links('wide'));
});

After(async function () { await this.browser?.close(); });

Given('a browser {int} pixels wide with JavaScript {word}', async function (width, enabled) {
  this.browser = await openBrowser({ width, javaScriptEnabled: enabled === 'enabled' });
});

async function assertFits(page) {
  const measurements = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    panels: [...document.querySelectorAll('.terminal, pre.tty')].map((el) => ({ width: el.clientWidth, content: el.scrollWidth })),
  }));
  assert.ok(measurements.document <= measurements.viewport, `page overflow: ${JSON.stringify(measurements)}`);
  assert.ok(measurements.panels.every((p) => p.content <= p.width + 1), `terminal overflow: ${JSON.stringify(measurements)}`);
}

Then('every public page fits the viewport with usable navigation', async function () {
  const { page, origin } = this.browser;
  for (const path of ['/', '/about/', '/melampus/', '/posts/', '/posts/hello-world/', '/tags/meta/']) {
    assert.equal((await page.goto(origin + path)).status(), 200);
    await assertFits(page);
    const melampus = page.locator('.topnav a[href="/melampus/"]');
    assert.ok(await melampus.isVisible());
    if (page.viewportSize().width <= 650) {
      for (const link of await page.locator('.topnav a').all()) assert.ok((await link.boundingBox()).height >= 44);
    }
  }
  await page.locator('.topnav a[href="/melampus/"]').click();
  assert.equal(new URL(page.url()).pathname, '/melampus/');
  assert.match(await page.locator('article').innerText(), /The camera records the bird/);
  assert.equal(await page.locator('article a').getAttribute('href'), 'https://github.com/gregbishop/melampus');
});

Then('every public page links directly to the post archive and its articles', async function () {
  const { page, origin } = this.browser;
  const { posts } = JSON.parse(readFileSync(new URL('../../dist/cli.json', import.meta.url), 'utf8'));
  assert.ok(posts.length > 0);
  const articlePaths = posts.map((post) => `/posts/${post.id}/`);
  const tagPaths = [...new Set(posts.flatMap((post) => post.data.tags.map((tag) => `/tags/${tag}/`)))];
  for (const path of ['/', '/about/', '/melampus/', '/posts/', ...articlePaths, ...tagPaths]) {
    assert.equal((await page.goto(origin + path)).status(), 200);
    const postsLink = page.locator('.topnav a[href="/posts/"]');
    assert.ok(await postsLink.isVisible(), `direct posts link missing on ${path}`);
    await postsLink.click();
    assert.equal(new URL(page.url()).pathname, '/posts/');
    assert.equal(await postsLink.getAttribute('aria-current'), 'page');
    await assertFits(page);
    for (const post of posts) {
      const articlePath = `/posts/${post.id}/`;
      const articleLink = page.locator(`.screen a[href="${articlePath}"]`);
      assert.ok(await articleLink.isVisible());
      assert.equal(await articleLink.innerText(), post.data.title);
      await articleLink.click();
      assert.equal(new URL(page.url()).pathname, articlePath);
      assert.equal(await page.locator('article h1').innerText(), post.data.title);
      await assertFits(page);
      await page.locator('.topnav a[href="/posts/"]').click();
    }
  }
});

Then('terminal commands fit the viewport and navigation still works', async function () {
  const { page, origin } = this.browser;
  await page.goto(origin + '/');
  await page.locator('.cmdline.final.live').waitFor();
  for (const cmd of ['help', 'whoami --verbose', 'cat contact', 'cat melampus', 'ls posts/', 'cat posts/hello-world.md', 'rss', `echo ${'long'.repeat(90)}`, 'home']) {
    await page.locator('#cli-in').fill(cmd, { force: true });
    await page.locator('#cli-in').press('Enter');
    await page.waitForFunction((expected) => document.querySelector('.cmdline:not(.final) .typed')?.textContent === expected, cmd);
    if (cmd === 'whoami --verbose' || cmd === 'cat melampus') {
      const paragraphs = page.locator('.out .ln[data-layout="narrow"]:visible');
      assert.ok(await paragraphs.count() > 0, 'phone prose uses whole paragraphs');
      assert.ok((await paragraphs.allTextContents()).some((text) => text.length > 70), 'long paragraphs have no desktop hard breaks');
    }
    await assertFits(page);
  }
  for (const link of await page.locator('.bar a').all()) assert.ok((await link.boundingBox()).height >= 44);
  await page.locator('.bar a[data-cmd="help"]').click();
  await page.locator('text=commands, all clickable').waitFor();
  await page.locator('.bar a[data-cmd="back"]').click();
  await page.locator('.out a[href="/melampus/"]:visible').first().waitFor();
  await assertFits(page);
});
