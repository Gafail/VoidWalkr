/* VoidWalkr — pre-paint bootstrap.
 *
 * Loaded synchronously in <head>. When the page is opened through a short
 * link (?v=VIDEO_ID) the home UI is hidden before the first paint so there
 * is no flash of the input form while the player mounts.
 *
 * This used to be an inline <script>. It lives in its own file so the page
 * can be served under a strict Content-Security-Policy without needing
 * 'unsafe-inline'.
 */
(function () {
  'use strict';
  try {
    if (new URLSearchParams(window.location.search).has('v')) {
      document.documentElement.classList.add('vw-route-viewer');
    }
  } catch (e) {
    /* Very old browsers without URLSearchParams just get the normal flash. */
  }
})();
