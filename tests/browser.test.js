/* VoidWalkr — end-to-end browser check.
 *
 * Two suites run against the real pages in Chromium:
 *
 *   1. "project site" — served from a local static server at a sub-path
 *      (/VoidWalkr/), exercising the base-path handling that a
 *      github.io/VoidWalkr deployment depends on. YouTube refuses to embed
 *      on a non-public origin, so the player is expected to error here.
 *
 *   2. "custom domain" — requests to https://voidwalkr.com are intercepted
 *      and answered from this working tree. The origin is therefore
 *      identical to production, so the YouTube embed is expected to work
 *      exactly as it does on the live site.
 *
 * Run:  node tests/browser.test.js [localBaseUrl]
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('/tmp/vwtest/node_modules/playwright');

const SITE_ROOT = path.join(__dirname, '..');
const LOCAL_BASE = process.argv[2] || 'http://127.0.0.1:8792/VoidWalkr';
const DOMAIN_BASE = 'https://voidwalkr.com';
const VIDEO_ID = 'dQw4w9WgXcQ';

let passed = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log('  ok   ' + name);
  } else {
    failures.push(name + (detail ? ' — ' + detail : ''));
    console.log('  FAIL ' + name + (detail ? '\n       ' + detail : ''));
  }
}

function section(title) {
  console.log('\n' + title);
}

/* Locate a Chromium already in the Playwright cache so the suite does not
 * depend on a matching playwright package version. */
function findChromium() {
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(cache)) return undefined;
  const dirs = fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort();
  for (const d of dirs) {
    for (const rel of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const p = path.join(cache, d, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

/* Resolve a request path the way GitHub Pages does. */
function resolveSite(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  else if (!path.extname(p)) p += '.html';

  const direct = path.join(SITE_ROOT, p);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return { file: direct, status: 200 };
  }
  const fallback = path.join(SITE_ROOT, '404.html');
  if (fs.existsSync(fallback)) return { file: fallback, status: 404 };
  return { file: null, status: 404 };
}

function isNoise(msg) {
  return /favicon|net::ERR_|Failed to load resource/i.test(msg);
}

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await ctx.newPage();
  const errors = [];

  page.on('console', (m) => {
    if (m.type() === 'error' && !isNoise(m.text())) errors.push('console: ' + m.text());
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  /* YouTube refuses to embed on a non-public origin, which turns the
   * player into an embed error and bounces the app to invalid.html. In the
   * project-site suite the network to youtube.com is cut so the app's own
   * behaviour can be asserted without that interference. */
  if (opts.blockYouTube) {
    await page.route(
      (url) => /youtube\.com|ytimg\.com|googlevideo\.com/.test(url.hostname),
      (route) => route.abort()
    );
  }

  /* Only the site's own origin is intercepted; YouTube and ko-fi still
   * come from the real network. */
  await page.route(
    (url) => url.hostname === 'voidwalkr.com',
    async (route) => {
      const { file, status } = resolveSite(new URL(route.request().url()).pathname);
      if (!file) return route.fulfill({ status: 404, body: '' });
      const ext = path.extname(file).toLowerCase();
      return route.fulfill({
        status,
        contentType: MIME[ext] || 'application/octet-stream',
        body: fs.readFileSync(file)
      });
    }
  );

  page.errors = errors;
  return page;
}

/* ------------------------------------------------------------------ */
/* Suite 1 — project-site deployment (served at a sub-path)           */
/* ------------------------------------------------------------------ */
async function suiteProjectSite(browser) {
  section('project site — sub-path deployment (' + LOCAL_BASE + ')');

  const page = await newPage(browser, { blockYouTube: true });
  await page.goto(LOCAL_BASE + '/', { waitUntil: 'networkidle' });
  check('home renders the input', await page.isVisible('#url-input'));
  check('four theme cards', (await page.locator('.vw-theme-card').count()) === 4);
  check('no JS errors on home', page.errors.length === 0, page.errors.join(' | '));
  await page.screenshot({ path: '/tmp/vwtest/shot-home.png' });
  await page.context().close();

  const page2 = await newPage(browser, { blockYouTube: true });
  const resp = await page2.goto(LOCAL_BASE + '/home', { waitUntil: 'networkidle' });
  check('/home returns 200', resp.status() === 200, 'got ' + resp.status());
  check('/home renders the input', await page2.isVisible('#url-input'));
  check('/home URL preserved', page2.url().endsWith('/home'), page2.url());
  await page2.context().close();

  const page3 = await newPage(browser, { blockYouTube: true });
  await page3.goto(LOCAL_BASE + '/?v=' + VIDEO_ID + '&theme=neon', { waitUntil: 'domcontentloaded' });
  await page3.waitForTimeout(2000);
  check('viewer route hides the home UI', !(await page3.isVisible('#home-ui')));
  check('viewer route applies the theme',
    await page3.evaluate(() => document.body.classList.contains('theme-neon')));
  const href = await page3.evaluate(() => {
    const el = document.querySelector('.vw-back-home');
    return el ? el.getAttribute('href') : null;
  });
  check('back-home href stays inside the sub-path', href === '/VoidWalkr/home', 'got ' + href);
  await page3.context().close();

  const page4 = await newPage(browser, { blockYouTube: true });
  await page4.goto(LOCAL_BASE + '/', { waitUntil: 'networkidle' });
  await page4.fill('#url-input', 'https://www.youtube.com/watch?v=' + VIDEO_ID);
  await page4.click('#load-btn');
  await page4.waitForURL(/\?v=/, { timeout: 10000 });
  check('load button navigates to the short link', page4.url().includes('?v=' + VIDEO_ID), page4.url());
  check('short link keeps the sub-path', page4.url().includes('/VoidWalkr/?v='), page4.url());
  await page4.context().close();

  const page5 = await newPage(browser, { blockYouTube: true });
  await page5.goto(LOCAL_BASE + '/', { waitUntil: 'networkidle' });
  await page5.fill('#url-input', 'https://youtu.be/' + VIDEO_ID);
  await page5.click('#copy-link-btn');
  await page5.waitForTimeout(600);
  const clip = await page5.evaluate(() => navigator.clipboard.readText());
  check('clipboard holds the short link', clip.includes('?v=' + VIDEO_ID), clip);
  check('copied link keeps the sub-path', clip.includes('/VoidWalkr/'), clip);
  check('copy status confirms', (await page5.textContent('#copy-link-status')).trim() === 'Copied!');
  await page5.context().close();

  const page6 = await newPage(browser, { blockYouTube: true });
  await page6.goto(LOCAL_BASE + '/definitely/missing/page', { waitUntil: 'networkidle' });
  /* Wait for the stylesheet to be applied before measuring — reading the
   * computed style before the CSS lands reports the bare h1 default. */
  await page6.waitForFunction(() => {
    const el = document.querySelector('.vw-invalid-title');
    return el && getComputedStyle(el).fontSize === '22px';
  }, { timeout: 5000 }).catch(() => {});
  const titleSize = await page6.evaluate(() => {
    const el = document.querySelector('.vw-invalid-title');
    return el ? getComputedStyle(el).fontSize : null;
  });
  check('404 stylesheet is applied (inlined)', titleSize === '22px', 'font-size=' + titleSize);

  /* GitHub Pages blocks external resources on 404 responses, so the error
   * page has to carry everything it needs inline. */
  const external = await page6.evaluate(() =>
    [...document.querySelectorAll('link[rel="stylesheet"], script[src], img[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src'))
  );
  check('404 page has no external resources', external.length === 0, JSON.stringify(external));
  const redirect = await page6.evaluate(() => {
    const m = document.querySelector('meta[http-equiv="refresh"]');
    return m ? m.getAttribute('content') : null;
  });
  check('404 redirect targets the absolute site root',
    redirect === '5;url=' + (await page6.evaluate(() => document.querySelector('a[href]').getAttribute('href'))),
    redirect);
  await page6.context().close();

  const page7 = await newPage(browser, { blockYouTube: true });
  await page7.goto(LOCAL_BASE + '/?v=not-a-real-id', { waitUntil: 'domcontentloaded' });
  await page7.waitForTimeout(1200);
  check('bad id routes to invalid.html', page7.url().includes('invalid.html'), page7.url());
  const t1 = parseInt(await page7.textContent('#countdown-num'), 10);
  await page7.waitForTimeout(1300);
  const t2 = parseInt(await page7.textContent('#countdown-num'), 10);
  check('countdown ticks down', t2 < t1, t1 + ' -> ' + t2);
  await page7.context().close();

  const page8 = await newPage(browser, { blockYouTube: true });
  await page8.goto(LOCAL_BASE + '/', { waitUntil: 'networkidle' });
  await page8.click('.vw-theme-card:has(input[value="neon"])');
  await page8.waitForTimeout(200);
  check('theme applies on click', await page8.evaluate(() => document.body.classList.contains('theme-neon')));
  check('theme persisted to localStorage',
    await page8.evaluate(() => localStorage.getItem('voidwalkr.theme')) === 'neon');
  await page8.reload({ waitUntil: 'networkidle' });
  check('theme restored after reload',
    await page8.evaluate(() => document.body.classList.contains('theme-neon')));
  await page8.context().close();
}

/* ------------------------------------------------------------------ */
/* Suite 2 — custom-domain deployment (real production origin)        */
/* ------------------------------------------------------------------ */
async function suiteCustomDomain(browser) {
  section('custom domain — production origin (' + DOMAIN_BASE + ')');

  const page = await newPage(browser);
  const csp = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());
  });
  await page.goto(DOMAIN_BASE + '/', { waitUntil: 'networkidle' });
  check('home renders the input', await page.isVisible('#url-input'));
  check('ko-fi widget renders', (await page.locator('a.kofi-button').count()) >= 1,
    'ko-fi button not found — external widget script may be unreachable');
  check('no CSP violations on home', csp.length === 0, csp.join(' | '));
  await page.screenshot({ path: '/tmp/vwtest/shot-domain-home.png' });
  await page.context().close();

  const page2 = await newPage(browser);
  const csp2 = [];
  page2.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) csp2.push(m.text());
  });
  await page2.goto(DOMAIN_BASE + '/?v=' + VIDEO_ID + '&theme=neon', { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(6000);
  check('viewer mounts on the real origin', (await page2.locator('.vw-viewer').count()) === 1);
  check('youtube iframe is created', (await page2.locator('.vw-video-wrap iframe').count()) === 1);
  check('no embed error', !page2.url().includes('invalid.html'), page2.url());
  check('no CSP violations on the viewer', csp2.length === 0, csp2.join(' | '));
  await page2.screenshot({ path: '/tmp/vwtest/shot-domain-viewer.png' });
  await page2.context().close();

  const page3 = await newPage(browser);
  await page3.goto(DOMAIN_BASE + '/viewer.html?id=' + VIDEO_ID, { waitUntil: 'domcontentloaded' });
  await page3.waitForTimeout(6000);
  check('viewer.html embeds the video', (await page3.locator('.vw-video-wrap iframe').count()) === 1);
  check('viewer.html did not error out', !page3.url().includes('invalid.html'), page3.url());
  await page3.context().close();

  const page4 = await newPage(browser);
  await page4.goto(DOMAIN_BASE + '/', { waitUntil: 'networkidle' });
  await page4.fill('#url-input', 'https://youtu.be/' + VIDEO_ID);
  await page4.click('#copy-link-btn');
  await page4.waitForTimeout(600);
  const clip = await page4.evaluate(() => navigator.clipboard.readText());
  check('copied link uses the real origin', clip.startsWith('https://voidwalkr.com/?v='), clip);
  await page4.context().close();

  const page5 = await newPage(browser);
  await page5.goto(DOMAIN_BASE + '/privacy.html', { waitUntil: 'networkidle' });
  check('privacy page renders', (await page5.locator('h1').textContent()).includes('Privacy'));
  await page5.context().close();
}

(async () => {
  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  try {
    await suiteProjectSite(browser);
    await suiteCustomDomain(browser);
  } finally {
    await browser.close();
  }

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed\n');
  if (failures.length) {
    failures.forEach((f) => console.error('FAILED: ' + f));
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
