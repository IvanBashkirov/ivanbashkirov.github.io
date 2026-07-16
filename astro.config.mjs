// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ivanbashkirov.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  server: { port: 4321 },
  vite: {
    // keep woff2 fonts as files so unicode-range subsetting works (perf budget §9.4)
    build: { assetsInlineLimit: 0 },
  },
});
