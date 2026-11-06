# VoidWalkr

A minimal, sleep-friendly YouTube viewer. Paste a link, get a video — no
recommendations, no autoplay queue, no end-of-video rabbit holes.

**This repository is the live site.** [voidwalkr.com](https://voidwalkr.com) is
served straight from `main` on GitHub Pages. There is no separate copy and no
private branch — if you fork this, your fork is the site.

Note that GitHub Pages publishes *every* file in the repository, not just the
pages: `tests/`, `build.sh` and `404.template.html` are all reachable at
`voidwalkr.com/…`. That is normal for a static host, and nothing in them is
secret.

The site itself is **plain static files**: HTML, CSS and vanilla JavaScript.
No framework, no bundler, no backend, no database. The only npm dependency
anywhere in the repository is Playwright, and it is used by the tests.

---

## Built with AI — and proud of it

**VoidWalkr was built with AI.** The code in this repository was written by an
AI coding assistant, working with me. I'm not going to quietly bury that in a
footnote at the bottom, and I'm not going to apologise for it: **this tool
would not exist without it.**

What that means in practice:

- **VoidWalkr's own code is all here.** There is no VoidWalkr server, no
  backend API, no account system and no database behind the page — the site
  is the files in this repository, and the only external services it reaches
  are Ko-fi, and YouTube plus Google's own infrastructure when you play a
  video. All of them are named in the privacy page.
- **It stays simple on purpose.** Plain HTML, CSS and vanilla JavaScript — no
  framework to inherit opinions from, no dependency tree to audit. The site
  itself has no dependencies at all; the test suite needs Playwright, and that
  is the only package in `package.json`. The one script in the repo,
  `build.sh`, just regenerates three files — it is optional, and the site
  works without ever running it.
- **The AI wrote it; I decided what it should be, checked that it actually
  works, and shipped it.** I have not memorised every line of it, and I am
  not going to pretend otherwise — that is what working with an AI is. What I
  do know is what it does, why it does it, and that it is not hiding anything
  from you.

If you were expecting a carefully hand-typed repository, this is not that —
and I would rather you knew upfront than found out later.

---

## Reuse it — but not the name

**The code is free.** It is released under the [MIT License](LICENSE). Fork
it, copy it, change it, ship it, sell it, fold it into a bigger project. No
permission needed, no "please ask first". You do not have to credit VoidWalkr
in your app or link back — though a link is always welcome. (The one thing
MIT does ask is that you keep the copyright notice and the licence text with
any copy of the code.)

**The name stays mine.** "VoidWalkr", the logo, and `voidwalkr.com` are *not*
covered by that licence. The MIT licence covers code; it does not grant a
brand. If you reuse this, give it your own name and your own domain — the
code is the gift, the name is the trademark, and I am keeping it.

---

## What it does

- Paste a YouTube link, get a clean player. Nothing else on the page.
- Short links work too: `https://voidwalkr.com/?v=dQw4w9WgXcQ`.
- `&fs=1` on a short link opens the player fullscreen.
- Four background themes, remembered in `localStorage` under
  `voidwalkr.theme`.
- No accounts, and VoidWalkr itself sets no cookies and runs no analytics.
  Watch out for the two exceptions below — they are not VoidWalkr's fault,
  but they are real.
- A Ko-fi widget on the home page, if you want to buy me a caffeinated drink.
  The widget's script loads from Ko-fi's servers as soon as the page loads,
  and Ko-fi's own privacy policy applies from that point on.
- When you watch a video, YouTube's iframe API loads and YouTube sets its own
  cookies and does its own tracking. None of that is VoidWalkr, but it is
  not nothing either — the privacy page spells it out.

---

## Run your own copy

### 1. Push the repository

```bash
git init
git add -A
git commit -m "VoidWalkr"
git remote add origin git@github.com:<your-github-username>/VoidWalkr.git
git push -u origin main
```

### 2. Turn on Pages

In the repo: **Settings → Pages → Build and deployment → Source: Deploy from
a branch**, branch `main`, folder `/ (root)`. Save.

GitHub publishes it at `https://<your-github-username>.github.io/VoidWalkr/`
within a minute.

### 3. Point a custom domain at it

The `CNAME` file in the repository root already contains `voidwalkr.com`, so
GitHub will offer to set up the custom domain for you. You need these DNS
records at your registrar (or at Cloudflare, if that is where the zone lives):

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| `A` | `@` | `185.199.108.153` | DNS only |
| `A` | `@` | `185.199.109.153` | DNS only |
| `A` | `@` | `185.199.110.153` | DNS only |
| `A` | `@` | `185.199.111.153` | DNS only |
| `CNAME` | `www` | `<your-github-username>.github.io` | DNS only |

> **If your DNS is on Cloudflare:** set every record to **DNS only** (grey
> cloud). Cloudflare's orange-cloud proxy does not work in front of a
> GitHub Pages custom domain — GitHub issues the certificate and serves the
> site itself.

Those four `A` records are what GitHub's docs specify for an apex domain. A
single `CNAME` at `@` pointing at `<your-github-username>.github.io` also
works, because Cloudflare flattens it at the apex.

### 4. Order of operations matters

This is the part that trips people up, so it is worth being explicit:

1. Set the DNS records **first**.
2. **Then** set the custom domain in **Settings → Pages**.

GitHub runs a DNS check when you save the custom domain, and it only queues
the Let's Encrypt request if that check passes. If you set the custom domain
while DNS still points somewhere else, the request is not retried on its own
once DNS is corrected — and the site ends up serving the default
`*.github.io` certificate, which does not match your domain, so browsers show
`ERR_CERT_COMMON_NAME_INVALID`.

If you hit that, the fix is to restart the check — remove the custom domain,
save, wait, then add it back:

```bash
# Clear the custom domain (wait ~5-10 minutes for the old state to clear)
gh api --method PUT repos/<owner>/<repo>/pages \
  -F cname= -F build_type=legacy \
  -F source[branch]=main -F source[path]=/

# Then re-add it, now that DNS is correct
gh api --method PUT repos/<owner>/<repo>/pages \
  -F cname=example.com -F build_type=legacy \
  -F source[branch]=main -F source[path]=/

# Check whether the certificate has been issued
gh api repos/<owner>/<repo>/pages --jq '.https_certificate'
```

The same sequence works in the UI: clear the custom domain field, **Save**,
wait, then type it again and **Save**.

Two more things that stop a certificate being issued:

- **CAA records.** If your zone has any, at least one must be
  `CAA 0 issue "letsencrypt.org"`, or GitHub cannot get a certificate.
- **Extra records at `@`.** Additional `A`, `AAAA`, `ALIAS` or `ANAME` records
  on the apex — or a `CNAME` on `www` pointing somewhere other than
  `<user>.github.io` — can prevent the certificate from generating. Only the
  records in the table above.

Once `https_certificate` shows a certificate, tick **Enforce HTTPS** (or
`gh api --method PUT repos/<owner>/<repo>/pages -F https_enforced=true`).

> **Note on `www`:** the `www` CNAME record points at `<user>.github.io`, but
> this site is a *project* site. GitHub redirects `www.example.com` to the
> apex automatically, because the `CNAME` file names only the apex domain.
> That is the behaviour you want.

### Serving from a sub-path instead

If you drop the `CNAME` file, the site is served from
`https://<your-github-username>.github.io/VoidWalkr/` instead. The code
handles this automatically — `js/base.js` resolves the directory the current
page was loaded from and builds every internal link against it. The only
thing that needs rebuilding is the error page, whose redirect path must be
absolute:

```bash
./build.sh --base /VoidWalkr/
```

`build.sh` auto-detects this from your git remote when a `CNAME` file is
absent.

---

## Project layout

```
index.html            home page + short-link router (?v=VIDEO_ID)
home.html             generated copy of index.html — serves the clean /home URL
viewer.html           standalone viewer (viewer.html?id=VIDEO_ID)
invalid.html          "that link is broken" page with a 15s countdown
404.html              generated from 404.template.html
404.template.html     source for the error page
privacy.html          privacy policy
ads.txt               IAB ads.txt (declares no programmatic sellers)
LICENSE               MIT licence for the code

css/style.css         layout and components
css/themes.css        the four background themes
css/invalid.css       the error/404 page styles

js/base.js            site-base resolver (makes every link sub-path safe)
js/boot.js            pre-paint bootstrap (hides the home UI on ?v= links)
js/parseId.js         YouTube URL -> video id parser
js/viewer.js          YouTube IFrame API player, fullscreen, routing
js/viewer-page.js     bootstrap for viewer.html
js/main.js            home page behaviour: parse, navigate, copy link
js/invalid.js         countdown and redirect for the error page
js/kofi.js            Ko-fi widget bootstrap

tests/                unit + browser test suites
build.sh              regenerates home.html, 404.html and sitemap.xml
```

### Why `home.html` exists

GitHub Pages has no rewrite rules, but it does serve `home.html` at the
extensionless URL `/home`. `build.sh` keeps `home.html` byte-identical to
`index.html`, and the "Back to home" link points at `/home`.

---

## Design notes

**Routing is sub-path safe.** The site has to work both at a domain root and
under `/<repo>/`, so no path in the application is hard-coded with a leading
slash. Every internal link is built from the resolved site base, which is what
`js/base.js` exists for. The one deliberate exception is the generated
`404.html`, whose redirect has to be absolute — see below.

**`404.html` is self-contained.** GitHub's own built-in 404 page is served
under `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; …`,
which blocks external stylesheets and scripts. The error page therefore
carries its CSS inline and redirects with an absolute path, so it renders
correctly at any URL depth and whichever 404 GitHub chooses to serve.
`build.sh` generates it from `404.template.html`.

**Security headers are meta tags.** GitHub Pages does not let you set
response headers at all, so the Content Security Policy, `Referrer-Policy`
and `Permissions-Policy` are declared with `<meta http-equiv>` tags instead.
The inline scripts were moved into their own files (`js/boot.js`,
`js/kofi.js`, `js/viewer-page.js`) so a strict policy — one without
`unsafe-inline` for scripts — actually holds.

**The parser checks the host.** It accepts a URL only if it is genuinely
YouTube, so a `vimeo.com/watch?v=…` style link is rejected with "That doesn't
look like a YouTube link." instead of failing later with a confusing embed
error. It also understands `youtube.com/live/VIDEO_ID` URLs.

**`fs=1` does something.** The short-link format carries an `fs` parameter, and
it opens the player fullscreen. Browsers only grant fullscreen from a user
gesture, so the first click or keypress opens it if the automatic request is
rejected.

**No analytics.** VoidWalkr runs none, anywhere — no tracking script, no
tag manager, no analytics beacon. Third parties do their own thing when they
are loaded: Ko-fi's widget pulls in its script (and a web font) on the home
page, and YouTube's iframe API pulls in YouTube on the viewer. The privacy
page says exactly what happens and who is responsible for it.

---

## Testing

```bash
./tests/run.sh
```

This runs two suites:

1. **Unit tests** for the URL parser and the site-base resolver.
2. **Browser tests** in Chromium against a GitHub Pages-style static server,
   with the site mounted at a sub-path so the project-site deployment shape is
   exercised — plus a suite against the real domain, which plays an actual
   YouTube video and asserts there are no Content-Security-Policy violations.

There is a third suite for verifying a deployed site:

```bash
node tests/production.test.js
```

It maps `voidwalkr.com` to GitHub's Pages IPs inside the browser, so you can
verify a real deployment without touching your DNS.

The browser suites need Chromium and Playwright:

```bash
npm install
npx playwright install chromium
```

`npm test` runs the local suites, `npm run test:prod` runs the deployment
check.

---

## Known limitations on GitHub Pages

- **No custom response headers.** GitHub Pages does not allow them. The CSP
  is declared via `<meta>` tags, which is slightly weaker than a real header
  (notably `frame-ancestors` cannot be set this way). If you want true header
  control, put a proxy in front of GitHub Pages and set the headers there.
- **No per-path cache headers.** GitHub Pages applies a uniform
  `max-age=600` to everything. The asset filenames are not content-hashed, so
  a long immutable cache would be wrong anyway — add a query string when you
  change a file (`style.css?v=20260626c`).
- **`/home` is served from `home.html`.** If you edit `index.html`, run
  `./build.sh` to keep the two in sync.

---

VoidWalkr · No accounts · No tracking by VoidWalkr · See the privacy page
