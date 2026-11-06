/* VoidWalkr — verify the GitHub Pages deployment at the production domain.
 *
 * The domain is mapped to GitHub's Pages IPs inside the browser
 * (--host-resolver-rules), so this test exercises the real deployment
 * without depending on DNS.
 *
 * This exercises the real deployment: the real Pages infrastructure, the
 * real CNAME routing, the real 404 handling and the real CSP.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('/tmp/vwtest/node_modules/playwright');

const PAGES_IP = '185.199.108.153';
const ID = 'dQw4w9WgXcQ';

let pass = 0;
const fail = [];

function ck(name, cond, detail) {
  if (cond) {
    pass++;
    console.log('  ok   ' + name);
  } else {
    const m = name + (detail ? ' — ' + detail : '');
    fail.push(m);
    console.log('  FAIL ' + m);
  }
}

function findChromium() {
  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  const dirs = fs.readdirSync(cache).filter((d) => d.startsWith('chromium-')).sort();
  for (const d of dirs) {
    const p = path.join(cache, d, 'chrome-linux64/chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: findChromium(),
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
      '--host-resolver-rules=MAP voidwalkr.com ' + PAGES_IP + ', MAP www.voidwalkr.com ' + PAGES_IP
    ]
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      ignoreHTTPSErrors: true
    });
    const page = await ctx.newPage();

    const csp = [];
    const errs = [];
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());
    });
    page.on('pageerror', (e) => errs.push(e.message));

    console.log('\nhome page on GitHub Pages');
    await page.goto('https://voidwalkr.com/', { waitUntil: 'networkidle', timeout: 30000 });
    ck('home renders the input', await page.isVisible('#url-input'));
    ck('four theme cards', (await page.locator('.vw-theme-card').count()) === 4);
    ck('no page errors', errs.length === 0, errs.join(' | '));
    ck('no CSP violations on home', csp.length === 0, csp.join(' | '));
    await page.screenshot({ path: '/tmp/vwtest/shot-prod-home.png' });

    console.log('\nviewer on GitHub Pages');
    csp.length = 0;
    await page.goto('https://voidwalkr.com/?v=' + ID + '&theme=neon', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    ck('viewer mounts', (await page.locator('.vw-viewer').count()) === 1);
    ck('youtube iframe created', (await page.locator('.vw-video-wrap iframe').count()) === 1);
    ck('no embed error', !page.url().includes('invalid.html'), page.url());
    ck('theme applied', await page.evaluate(() => document.body.classList.contains('theme-neon')));
    const href = await page.evaluate(() => {
      const el = document.querySelector('.vw-back-home');
      return el ? el.getAttribute('href') : null;
    });
    ck('back-home href resolves to /home', href === '/home', 'got ' + href);
    ck('no CSP violations on viewer', csp.length === 0, csp.join(' | '));
    await page.screenshot({ path: '/tmp/vwtest/shot-prod-viewer.png' });

    console.log('\nclean /home route');
    await page.goto('https://voidwalkr.com/home', { waitUntil: 'networkidle' });
    ck('/home renders the home UI', await page.isVisible('#url-input'));
    ck('/home URL preserved', page.url().endsWith('/home'), page.url());

    console.log('\n404 handling under GitHub Pages');
    const resp = await page.goto('https://voidwalkr.com/definitely-missing', { waitUntil: 'networkidle' });
    ck('missing page returns 404', resp.status() === 404, 'got ' + resp.status());
    const size = await page.evaluate(() => {
      const el = document.querySelector('.vw-invalid-title');
      return el ? getComputedStyle(el).fontSize : null;
    });
    ck('404 page is styled (CSS inlined, survives GitHub CSP)', size === '22px', 'font-size=' + size);

    console.log('\ncopy link');
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('https://voidwalkr.com/', { waitUntil: 'networkidle' });
    await page.fill('#url-input', 'https://youtu.be/' + ID);
    await page.click('#copy-link-btn');
    await page.waitForTimeout(600);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    ck('copied link uses the production domain', clip.includes('voidwalkr.com/?v=' + ID), clip);

    console.log('\nviewer.html route');
    await page.goto('https://voidwalkr.com/viewer.html?id=' + ID, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    ck('viewer.html embeds the video', (await page.locator('.vw-video-wrap iframe').count()) === 1);
    ck('viewer.html did not error out', !page.url().includes('invalid.html'), page.url());
  } finally {
    await browser.close();
  }

  console.log('\n' + pass + ' passed, ' + fail.length + ' failed\n');
  if (fail.length) {
    fail.forEach((f) => console.error('FAILED: ' + f));
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
