// Render the actual production build in Chromium, served by Astro itself.
export async function openBrowser({ width = 390, javaScriptEnabled = true } = {}) {
  process.env.ASTRO_TELEMETRY_DISABLED = '1';
  const { preview } = await import('astro');
  const { chromium } = await import('playwright');
  const server = await preview({ root: new URL('../../', import.meta.url).pathname, server: { host: '127.0.0.1', port: 0 }, logLevel: 'silent' });
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height: 844 }, javaScriptEnabled, reducedMotion: 'reduce' });
    const origin = `http://127.0.0.1:${server.port}`;
    // Fonts and other external requests are deliberately absent from CI.
    await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    return { page, origin, close: async () => { try { await browser.close(); } finally { await server.stop(); } } };
  } catch (error) {
    try { await browser?.close(); } finally { await server.stop(); }
    throw error;
  }
}
