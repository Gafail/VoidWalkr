/* VoidWalkr — site base path helper.
 *
 * The site is served from a directory that is not always the domain root:
 * a GitHub Pages *user* site lives at "/", while a GitHub Pages *project*
 * site lives at "/<repo>/". The same build has to work at both, so no
 * path in the app is hard-coded with a leading slash.
 *
 * This module resolves the directory the current page was loaded from and
 * exposes it so every internal link can be built relative to it.
 */
(function (root) {
  'use strict';

  /* Directory the current page lives in, always with a trailing slash.
   *   https://host/                -> "/"
   *   https://host/home            -> "/"
   *   https://host/index.html      -> "/"
   *   https://host/VoidWalkr/      -> "/VoidWalkr/"
   *   https://host/VoidWalkr/home  -> "/VoidWalkr/"
   *   https://host/VoidWalkr/viewer.html -> "/VoidWalkr/"
   */
  function base() {
    var path = window.location.pathname || '/';
    var idx = path.lastIndexOf('/');
    return idx === -1 ? '/' : path.slice(0, idx + 1);
  }

  /* Build a path inside the site: url("home") -> "/VoidWalkr/home". */
  function url(path) {
    return base() + String(path == null ? '' : path).replace(/^\/+/, '');
  }

  /* The clean home route ("/home" -> home.html on GitHub Pages). */
  function homeUrl() {
    return url('home');
  }

  /* Same as url() but including the origin, for links shared with others. */
  function absolute(path) {
    return window.location.origin + url(path);
  }

  var api = {
    base: base,
    url: url,
    homeUrl: homeUrl,
    absolute: absolute
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.VoidWalkrBase = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
