/* VoidWalkr — shared test helpers.
 *
 * Resolves Playwright from wherever it happens to be installed, so the test
 * suites work after a plain `npm install playwright` in the repository root
 * and do not depend on a hard-coded path.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function loadPlaywright() {
  const candidates = [
    'playwright',
    path.join(__dirname, '..', 'node_modules', 'playwright')
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) {
      /* try the next candidate */
    }
  }
  throw new Error(
    'Playwright not found. Run "npm install playwright" in the repository root.'
  );
}

/* Path to the Chromium binary Playwright downloaded, if there is one. */
function findChromium() {
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(cache)) return undefined;
  const dirs = fs.readdirSync(cache)
    .filter((d) => d.startsWith('chromium-'))
    .sort();
  for (const d of dirs) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const p = path.join(cache, d, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

module.exports = { loadPlaywright, findChromium };
