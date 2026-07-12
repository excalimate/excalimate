import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://excalimate.com',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [react(), sitemap()],
  session: {
    // Sessions are not used; this prevents the adapter from provisioning KV.
    driver: sessionDrivers.lruCache(),
  },
  build: {
    assets: '_assets',
  },
});
