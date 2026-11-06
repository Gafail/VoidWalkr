# VoidWalkr

A minimal, sleep-friendly YouTube viewer. Paste a link, get a video, no
recommendations, no autoplay queue, no end-of-video rabbit holes.

The site is **plain static files** — no build step, no bundler, no dependencies, no
backend. Every page is HTML, CSS and vanilla JavaScript.

---

## Deploy to GitHub Pages

### 1. Push the repository

```bash
git init
git add -A
git commit -m "VoidWalkr — GitHub Pages port"
git remote add origin git@github.com:<your-github-username>/VoidWalkr.git
git push -u origin main
```

### 2. Turn on Pages

In the repo: **Settings → Pages → Build and deployment → Source: Deploy from
a branch**, branch `main`, folder `/ (root)`. Save.

GitHub will publish the site at `https://<your-github-username>.github.io/VoidWalkr/`
within a minute.

### 3. Point `voidwalkr.com` at it

The `CNAME` file in the repository root already contains `voidwalkr.com`, so
GitHub will offer to set up the custom domain for you. You just need the DNS
records at your registrar (or at Cloudflare, if that is where the zone lives):

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `@` | `<your-github-username>.github.io` |
| `CNAME` | `www` | `<your-github-username>.github.io` |

> **If your DNS is on Cloudflare:** set the records to **DNS only** (grey
> cloud). Cloudflare's orange-cloud proxy does not work in front of a
> GitHub Pages custom domain.

Then, in **Settings → Pages**, set **Custom domain** to `voidwalkr.com` and
tick **Enforce HTTPS**. GitHub provisions the certificate automatically.


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
privacy.html          privacy policy
ads.txt               IAB ads.txt (declares no programmatic sellers)

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
build.sh              regenerates home.html and 404.html
```

### Why `home.html` exists

GitHub Pages has no rewrite rules, but it does serve `home.html` at the
extensionless URL `/home`. `build.sh` keeps `home.html` byte-identical to
`index.html`, and the "Back to home" link points at `/home`.

GitHub Pages has no rewrite rules, but it does serve `home.html` at the
extensionless URL `/home`. `build.sh` keeps `home.html` byte-identical to
`index.html`, and the "Back to home" link points at `/home`.

---

## What changed, and why

These are the deliberate design decisions:

**Routing is sub-path safe.** No path in the app is hard-coded with a leading slash. Every internal link is now built from the resolved site base, so
the site works both at a domain root and under `/VoidWalkr/`.

**`404.html` is self-contained.** GitHub Pages serves 404 responses with
`Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; …`,
which blocks external stylesheets and scripts. The error page therefore
carries its CSS inline and redirects with an absolute path, so it renders
correctly at any URL depth. `build.sh` generates it from
`404.template.html`.

**Security headers are meta tags.** GitHub Pages does not let you set
response headers at all, so the Content Security Policy, `Referrer-Policy`
and `Permissions-Policy` are declared with `<meta http-equiv>` tags instead.
The inline scripts were moved into their own files so a strict policy — one
without `unsafe-inline` for scripts — actually holds.

**The parser checks the host.** It accepts a URL only if it is genuinely
YouTube, so a `vimeo.com/watch?v=…` style link is rejected with "That
doesn't look like a YouTube link." instead of failing later with a confusing
embed error. It also understands `youtube.com/live/VIDEO_ID` URLs.

**`fs=1` does something.** The short-link format carries an `fs` parameter,
and it opens the player fullscreen. Browsers only grant fullscreen from a
user gesture, so the first click or keypress opens it if the automatic
request is rejected.


---

## Testing

```bash
./tests/run.sh
```

This runs three suites:

1. **Unit tests** for the URL parser and the site-base resolver.
2. **Browser tests** in Chromium against a GitHub Pages-style static server,
   with the site mounted at a sub-path so the project-site deployment shape
   is exercised.
3. **Browser tests** against the real production origin
   (`https://voidwalkr.com`, served from this working tree via request
   interception) which play an actual YouTube video and assert there are no
   Content-Security-Policy violations.

The browser suite needs Chromium and Playwright:

```bash
npm install playwright
```

---


---

## Known limitations on GitHub Pages

- **No custom response headers.** GitHub Pages does not allow them. The CSP
  is declared via `<meta>` tags, which is slightly weaker than a real header
  (notably `frame-ancestors` cannot be set this way). If you want true
  header control, put a proxy in front of GitHub Pages and set the headers
  there.
- **No per-path cache headers.** GitHub Pages applies a uniform
  `max-age=600` to everything. The asset filenames are not content-hashed, so
  a long immutable cache would be wrong anyway — add a query string when you
  change a file (`style.css?v=20260626c`).
- **`/home` is served from `home.html`.** If you edit `index.html`, run
  `./build.sh` to keep the two in sync.

---

VoidWalkr · No accounts · No cookies · No tracking
