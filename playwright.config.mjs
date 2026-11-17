import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',
  timeout:180000,
  expect:{timeout:10000},
  workers:1,
  use:{baseURL:'http://127.0.0.1:4173/iceberg-lab/',viewport:{width:1440,height:1050}},
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4173/',reuseExistingServer:!process.env.CI}
});
