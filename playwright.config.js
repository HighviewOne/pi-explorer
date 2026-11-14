// Browser tests for Pi Explorer. Run: npm test
// Uses the installed Google Chrome (present on GitHub's ubuntu runners), so no
// browser download is needed. Serves the repo with Python's static server under
// /pi-explorer/, the same path GitHub Pages uses.
const { defineConfig } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/pi-explorer/`,
    channel: 'chrome',
  },
  webServer: {
    command: `python3 tests/serve.py ${PORT}`,
    url: `http://127.0.0.1:${PORT}/pi-explorer/`,
    reuseExistingServer: !process.env.CI,
  },
});
