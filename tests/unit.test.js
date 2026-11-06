/* VoidWalkr — unit tests for the browser helpers.
 *
 * Run with:  node tests/unit.test.js
 *
 * Covers the two pieces of logic that are easy to break when the site
 * moves between hosts: the site-base resolver (js/base.js) and the YouTube
 * id parser (js/parseId.js).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const ID = 'dQw4w9WgXcQ';

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok   ' + name);
  } catch (err) {
    failures.push({ name, err });
    console.log('  FAIL ' + name + '\n       ' + err.message);
  }
}

/* Load a browser script into a fake window so it can be unit tested. */
function loadScript(file, location) {
  const window = { location };
  const sandbox = { window, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return window;
}

function baseAt(pathname, origin) {
  const win = loadScript('js/base.js', {
    pathname,
    origin: origin || 'https://host',
    protocol: 'https:',
    host: 'host'
  });
  return win.VoidWalkrBase;
}

/* ------------------------------------------------------------------ */
/* js/base.js                                                         */
/* ------------------------------------------------------------------ */
console.log('\njs/base.js — site base resolution');

test('root site: pathname "/" resolves to base "/"', () => {
  assert.strictEqual(baseAt('/').base(), '/');
});

test('root site: "/home" resolves to base "/"', () => {
  assert.strictEqual(baseAt('/home').base(), '/');
});

test('root site: "/index.html" resolves to base "/"', () => {
  assert.strictEqual(baseAt('/index.html').base(), '/');
});

test('project site: "/VoidWalkr/" resolves to base "/VoidWalkr/"', () => {
  assert.strictEqual(baseAt('/VoidWalkr/').base(), '/VoidWalkr/');
});

test('project site: "/VoidWalkr/home" resolves to base "/VoidWalkr/"', () => {
  assert.strictEqual(baseAt('/VoidWalkr/home').base(), '/VoidWalkr/');
});

test('project site: "/VoidWalkr/viewer.html" resolves to base "/VoidWalkr/"', () => {
  assert.strictEqual(baseAt('/VoidWalkr/viewer.html').base(), '/VoidWalkr/');
});

test('project site: "/VoidWalkr/invalid.html" resolves to base "/VoidWalkr/"', () => {
  assert.strictEqual(baseAt('/VoidWalkr/invalid.html').base(), '/VoidWalkr/');
});

test('url() keeps links inside the site directory', () => {
  assert.strictEqual(baseAt('/VoidWalkr/').url('home'), '/VoidWalkr/home');
  assert.strictEqual(baseAt('/').url('home'), '/home');
});

test('url() strips stray leading slashes', () => {
  assert.strictEqual(baseAt('/VoidWalkr/').url('/invalid.html'), '/VoidWalkr/invalid.html');
});

test('homeUrl() points at the clean /home route', () => {
  assert.strictEqual(baseAt('/VoidWalkr/').homeUrl(), '/VoidWalkr/home');
  assert.strictEqual(baseAt('/').homeUrl(), '/home');
});

test('absolute() includes the origin for shareable links', () => {
  assert.strictEqual(
    baseAt('/VoidWalkr/', 'https://user.github.io').absolute('index.html'),
    'https://user.github.io/VoidWalkr/index.html'
  );
});

test('base() is stable across every page of a project site', () => {
  const pages = ['/VoidWalkr/', '/VoidWalkr/home', '/VoidWalkr/index.html', '/VoidWalkr/viewer.html', '/VoidWalkr/invalid.html'];
  const bases = pages.map((p) => baseAt(p).base());
  assert.deepStrictEqual(bases, ['/VoidWalkr/', '/VoidWalkr/', '/VoidWalkr/', '/VoidWalkr/', '/VoidWalkr/']);
});

/* ------------------------------------------------------------------ */
/* js/parseId.js                                                      */
/* ------------------------------------------------------------------ */
console.log('\njs/parseId.js — YouTube id parsing');

const parse = loadScript('js/parseId.js', { pathname: '/', origin: 'https://host' })
  .VoidWalkrParse.parseYouTubeId;

const CASES = [
  ['bare id', ID, ID],
  ['watch url', 'https://www.youtube.com/watch?v=' + ID, ID],
  ['watch url with timestamp', 'https://www.youtube.com/watch?v=' + ID + '&t=42s', ID],
  ['short url', 'https://youtu.be/' + ID, ID],
  ['short url with timestamp', 'https://youtu.be/' + ID + '?t=42', ID],
  ['shorts url', 'https://www.youtube.com/shorts/' + ID, ID],
  ['shorts url with query', 'https://www.youtube.com/shorts/' + ID + '?feature=share', ID],
  ['embed url', 'https://www.youtube.com/embed/' + ID, ID],
  ['legacy /v/ url', 'https://www.youtube.com/v/' + ID, ID],
  ['live url', 'https://www.youtube.com/live/' + ID, ID],
  ['mobile url', 'https://m.youtube.com/watch?v=' + ID, ID],
  ['url with fragment', 'https://www.youtube.com/watch?v=' + ID + '#t=30', ID],
  ['url with surrounding space', '   https://youtu.be/' + ID + '   ', ID],
  ['watch url with extra params', 'https://www.youtube.com/watch?app=desktop&v=' + ID + '&feature=share', ID]
];

CASES.forEach(([name, input, expected]) => {
  test('parses ' + name, () => {
    assert.strictEqual(parse(input), expected);
  });
});

const REJECTS = [
  ['empty string', ''],
  ['whitespace only', '    '],
  ['non-string', null],
  ['a number', 42],
  ['plain url', 'https://example.com/watch?v=' + ID],
  ['too-short id', 'abc123'],
  ['playlist url', 'https://www.youtube.com/playlist?list=PL1234567890']
];

REJECTS.forEach(([name, input]) => {
  test('rejects ' + name, () => {
    assert.strictEqual(parse(input), null);
  });
});

/* ------------------------------------------------------------------ */
console.log('\n' + passed + ' passed, ' + failures.length + ' failed\n');
if (failures.length) {
  failures.forEach((f) => console.error('FAILED: ' + f.name + '\n' + f.err.stack));
  process.exit(1);
}
