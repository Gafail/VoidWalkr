#!/usr/bin/env bash
# VoidWalkr — static build step for GitHub Pages.
#
# The site itself is plain static files; there is no bundler and no
# dependency. This script only does the two things that are easy to get
# wrong by hand:
#
#   1. Keeps home.html identical to index.html. GitHub Pages has no rewrite
#      rules, so the clean URL "/home" needs a real home.html file to serve.
#
#   2. Generates 404.html from 404.template.html. GitHub's built-in 404 page
#      is served under a restrictive Content-Security-Policy that blocks
#      external stylesheets, and the error page is served at whatever URL was
#      requested. So the CSS is inlined and the redirect points at the
#      absolute site root.
#
# Usage:
#   ./build.sh                        # auto-detect base + domain
#   ./build.sh --base /VoidWalkr/     # force the site base path
#   ./build.sh --domain example.com   # force the canonical domain
set -euo pipefail

cd "$(dirname "$0")"

BASE=""
DOMAIN=""
TMP_STYLES="$(mktemp)"
trap 'rm -f "$TMP_STYLES"' EXIT

while [ $# -gt 0 ]; do
  case "$1" in
    --base)   BASE="${2:-}"; shift 2 ;;
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ---- Detect the GitHub Pages base path -------------------------------------
# A custom domain (CNAME file) is always served at the domain root.
# Otherwise a user site (user.github.io) lives at "/" while a project site
# (user.github.io/repo) lives at "/repo/".
if [ -z "$BASE" ]; then
  BASE="/"
  if [ -s CNAME ]; then
    BASE="/"
  else
    remote="$(git remote get-url origin 2>/dev/null || true)"
    if [ -n "$remote" ]; then
      slug="$(printf '%s' "$remote" \
        | sed -E 's#^[a-zA-Z]+://##; s#^git@##; s#[:/]#/#g; s#\.git$##' \
        | awk -F/ '{print $(NF-1)"/"$NF}')"
      user="${slug%%/*}"
      repo="${slug##*/}"
      if [ -n "$repo" ] && [ "$user" != "$repo" ]; then
        BASE="/$repo/"
      fi
      if [ -z "${GITHUB_USER:-}" ] && [ -n "$user" ]; then
        GITHUB_USER="$user"
      fi
    fi
  fi
fi

# ---- Detect the canonical domain -------------------------------------------
if [ -z "$DOMAIN" ]; then
  if [ -s CNAME ]; then
    DOMAIN="$(tr -d '[:space:]' < CNAME)"
  elif [ -n "${GITHUB_USER:-}" ]; then
    DOMAIN="${GITHUB_USER}.github.io"
  else
    DOMAIN="voidwalkr.com"
  fi
fi

# ---- Generate 404.html -----------------------------------------------------
# GitHub Pages serves 404 responses under
#   Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; ...
# which blocks external stylesheets and scripts. The error page therefore
# carries its CSS inline, and redirects with an absolute path so it lands on
# the site root no matter how deep the missing URL was.
{
  echo '    /* Inlined from css/style.css, css/themes.css and css/invalid.css by build.sh.'
  echo '       GitHub blocks external stylesheets on its 404 pages. */'
  for f in css/style.css css/themes.css css/invalid.css; do
    echo "    /* ---- $f ---- */"
    cat "$f"
  done
} > "$TMP_STYLES"

awk -v styles_file="$TMP_STYLES" '
  /\{\{VW_STYLES\}\}/ {
    while ((getline line < styles_file) > 0) print line;
    close(styles_file);
    next
  }
  { print }
' 404.template.html > 404.html

sed -i "s|{{VW_BASE}}|$BASE|g" 404.html
rm -f "$TMP_STYLES"

# ---- Keep home.html in sync with index.html --------------------------------
cp index.html home.html

# ---- Regenerate sitemap.xml ------------------------------------------------
cat > sitemap.xml <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${DOMAIN}${BASE}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${DOMAIN}${BASE}home</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${DOMAIN}${BASE}viewer.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://${DOMAIN}${BASE}invalid.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.1</priority>
  </url>
  <url>
    <loc>https://${DOMAIN}${BASE}privacy.html</loc>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
EOF

# ---- GitHub Pages housekeeping ----------------------------------------------
# .nojekyll stops Jekyll from processing the source (it would otherwise
# ignore files and folders beginning with an underscore).
[ -e .nojekyll ] || : > .nojekyll

echo "VoidWalkr build complete."
echo "  site base : ${BASE}"
echo "  domain    : ${DOMAIN}"
echo "  home url  : https://${DOMAIN}${BASE}home"
