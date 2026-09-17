import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gregbishop.net',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'vesper',
      wrap: false,
    },
  },
});
