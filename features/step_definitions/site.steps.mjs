import { Given, Then, After, setDefaultTimeout } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { openBrowser } from '../../tests/support/dom.mjs';

setDefaultTimeout(30000);
const paths = ['/', '/about/', '/melampus/', '/posts/', '/posts/hello-world/', '/tags/meta/'];

After(async function () { await this.browser?.close(); });
Given('a browser {int} pixels wide with JavaScript {word}', async function (width, enabled) {
  this.browser = await openBrowser({ width, javaScriptEnabled: enabled === 'enabled' });
});

async function assertFits(page) {
  const measurements = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    bodySize: parseFloat(getComputedStyle(document.body).fontSize),
    paragraphs: [...document.querySelectorAll('main p')].map((el) => parseFloat(getComputedStyle(el).fontSize)),
  }));
  assert.ok(measurements.document <= measurements.viewport, `page overflow: ${JSON.stringify(measurements)}`);
  assert.ok(measurements.bodySize >= 16 && measurements.paragraphs.every((size) => size >= 16), `readable body text: ${JSON.stringify(measurements)}`);
}

Then('every public page fits the viewport with readable text and usable navigation', async function () {
  const { page, origin } = this.browser;
  for (const path of paths) {
    assert.equal((await page.goto(origin + path)).status(), 200);
    await assertFits(page);
    assert.equal(await page.locator('main#main').count(), 1, path);
    assert.equal(await page.locator('h1').count(), 1, path);
    assert.ok(await page.locator('main h1').isVisible());
    assert.equal(await page.locator('#cli-in, [data-cmd], [data-fill], pre.terminal, .cmdline').count(), 0, path);
    for (const name of ['Blog', 'About', 'Melampus']) {
      const link = page.locator('header nav').getByRole('link', { name, exact: true });
      assert.ok(await link.isVisible(), `${name} on ${path}`);
    }
    for (const control of await page.locator('header a, button').all()) {
      if (await control.isVisible()) {
        const box = await control.boundingBox();
        assert.ok(box.height >= 44 && box.width >= 44, `touch control ${await control.innerText()} on ${path}: ${JSON.stringify(box)}`);
      }
    }
  }
});

Then('a reader can browse from every page to the blog and read an article', async function () {
  const { page, origin } = this.browser;
  for (const path of paths) {
    await page.goto(origin + path);
    await page.locator('header nav').getByRole('link', { name: 'Blog', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/posts/');
    assert.equal(await page.locator('header nav [aria-current="page"]').getAttribute('href'), '/posts/');
    const article = page.locator('main a[href="/posts/hello-world/"]');
    assert.ok(await article.isVisible());
    await article.click();
    assert.equal(new URL(page.url()).pathname, '/posts/hello-world/');
    assert.equal(await page.locator('main h1').innerText(), 'starting this thing');
    await page.locator('main a[href="/tags/meta/"]').click();
    assert.equal(new URL(page.url()).pathname, '/tags/meta/');
    assert.ok(await page.locator('main a[href="/posts/hello-world/"]').isVisible());
    await page.locator('main a[href="/posts/"]').click();
    assert.equal(new URL(page.url()).pathname, '/posts/');
    await page.locator('main a[href="/posts/hello-world/"]').click();
    await page.locator('main a[href="/posts/"]').click();
    assert.equal(new URL(page.url()).pathname, '/posts/');
  }
});

Then('the homepage offers recent posts, Melampus, contact and RSS', async function () {
  const { page, origin } = this.browser;
  await page.goto(origin + '/');
  assert.ok(await page.locator('main a[href="/posts/hello-world/"]').isVisible());
  assert.ok(await page.locator('a[href="mailto:me@gregbishop.net"]').first().isVisible());
  assert.ok(await page.locator('a[href="/rss.xml"]').first().isVisible());
  await page.locator('main a[href="/melampus/"]').first().click();
  assert.equal(new URL(page.url()).pathname, '/melampus/');
  assert.match(await page.locator('main').innerText(), /The camera records the bird/);
  assert.match(await page.locator('main').innerText(), /Cloud inference is available as an explicit option/);
  assert.ok(await page.locator('main a[href="https://github.com/gregbishop/melampus"]').isVisible());
});

Then('the keyboard skip link and visible navigation focus work on every public page', async function () {
  const { page, origin } = this.browser;
  for (const path of paths) {
    await page.goto(origin + path);
    await page.keyboard.press('Tab');
    const skip = page.locator('a[href="#main"]');
    assert.ok(await skip.evaluate((el) => el === document.activeElement), `skip link is first on ${path}`);
    assert.ok(await skip.isVisible());
    const box = await skip.boundingBox();
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= page.viewportSize().width, 'focused skip link is onscreen');
    await page.keyboard.press('Enter');
    assert.ok(await page.locator('main#main').evaluate((el) => el === document.activeElement), `skip focuses main on ${path}`);
    await page.goto(origin + path);
    let reachedBlog = false;
    for (let count = 0; count < 8; count++) {
      await page.keyboard.press('Tab');
      reachedBlog = await page.locator('header nav a[href="/posts/"]').evaluate((el) => el === document.activeElement);
      if (reachedBlog) break;
    }
    assert.ok(reachedBlog, `Blog is keyboard reachable on ${path}`);
    const focus = await page.locator('header nav a[href="/posts/"]').evaluate((el) => {
      const style = getComputedStyle(el);
      return { visible: el.matches(':focus-visible'), outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), shadow: style.boxShadow };
    });
    assert.ok(focus.visible && ((focus.outlineStyle !== 'none' && focus.outlineWidth > 0) || focus.shadow !== 'none'), `visible focus indicator: ${JSON.stringify(focus)}`);
    await page.keyboard.press('Enter');
    await page.waitForURL(origin + '/posts/');
    assert.equal(new URL(page.url()).pathname, '/posts/');
  }
});

Then('ordinary pages serve HTML and explicit reading formats remain available', async function () {
  const { page, origin } = this.browser;
  for (const path of paths) {
    const response = await page.request.get(origin + path, { headers: { 'user-agent': 'curl/8.7.1' }, timeout: 5000 });
    assert.equal(response.status(), 200, path);
    assert.match(response.headers()['content-type'], /text\/html/);
  }
  for (const [path, expected] of [['/index.txt', /gregbishop\.net/], ['/posts.txt', /starting this thing/], ['/about.txt', /The plan is to be a homesteader/], ['/melampus.txt', /Lightroom Classic/]]) {
    const response = await page.request.get(origin + path, { timeout: 5000 });
    assert.equal(response.status(), 200, path);
    assert.match(response.headers()['content-type'], /text\/plain/);
    const body = await response.text();
    assert.match(body, expected);
    assert.ok(!body.includes(String.fromCharCode(27)), 'no ANSI escapes');
    assert.doesNotMatch(body, /[┌└│█]/);
  }
  for (const path of ['/rss.xml', '/posts/hello-world.md']) {
    const response = await page.request.get(origin + path, { timeout: 5000 });
    assert.equal(response.status(), 200, path);
  }
});
