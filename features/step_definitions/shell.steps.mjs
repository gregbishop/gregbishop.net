import { Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import { openHome } from '../../tests/support/dom.mjs';

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
