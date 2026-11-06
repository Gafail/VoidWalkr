#!/usr/bin/env bash
# VoidWalkr — full verification run.
#
#   ./tests/run.sh
#
# 1. Unit tests for the URL parser and the site-base resolver.
# 2. A GitHub Pages-style static server, serving the site from a sub-path
#    so the project-site deployment shape is exercised.
# 3. Browser tests in Chromium: the app's own behaviour against a sub-path
#    deployment, and a full playback check against the real production
#    origin.
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-}"
WORK="${WORK:-/tmp/vwtest}"
SUBPATH="/VoidWalkr"
SITE="$PWD"

# Pick a free port unless one was given, so a stale server can never make
# the run silently test the wrong thing.
if [ -z "$PORT" ]; then
  PORT="$(python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('127.0.0.1', 0))
print(s.getsockname()[1])
s.close()
PY
)"
fi

echo "=============================================================="
echo " 1/3  unit tests"
echo "=============================================================="
node tests/unit.test.js | tail -4

echo
echo "=============================================================="
echo " 2/3  building the project-site variant"
echo "=============================================================="
rm -rf "$WORK/site-subpath" "$WORK/root"
mkdir -p "$WORK/site-subpath" "$WORK/root"
cp -r "$SITE/." "$WORK/site-subpath/"
( cd "$WORK/site-subpath" && ./build.sh --base "$SUBPATH/" | sed 's/^/    /' )
ln -s "$WORK/site-subpath" "$WORK/root/VoidWalkr"

echo
echo "=============================================================="
echo " 3/3  browser tests"
echo "=============================================================="
python3 tests/pages-server.py "$WORK/root" "$PORT" > "$WORK/server.log" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

sleep 2
if ! curl -sSf -o /dev/null "http://127.0.0.1:$PORT$SUBPATH/"; then
  echo "server failed to start on port $PORT; see $WORK/server.log" >&2
  exit 1
fi
if grep -q "Address already in use" "$WORK/server.log"; then
  echo "port $PORT was already taken — refusing to test against a stale server" >&2
  exit 1
fi

echo "  (serving $WORK/root on port $PORT)"
echo
node tests/browser.test.js "http://127.0.0.1:$PORT$SUBPATH"
