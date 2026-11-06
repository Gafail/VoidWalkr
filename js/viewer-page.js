/* VoidWalkr — standalone viewer page bootstrap.
 *
 * Used by viewer.html, which loads a video by id without the home UI.
 * Kept in its own file so the page can be served under a strict
 * Content-Security-Policy without 'unsafe-inline'.
 */
(function () {
  'use strict';

  function getParam(name) {
    var s = window.location.search;
    if (!s || s.length < 2) return null;
    var qs = s.substring(1);
    var pairs = qs.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      var eq = pair.indexOf('=');
      var key = eq === -1 ? pair : pair.slice(0, eq);
      var val = eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1));
      if (key === name) return val;
    }
    return null;
  }

  var B = window.VoidWalkrBase;
  var raw = getParam('id') || getParam('v') || '';
  var id = window.VoidWalkrParse ? window.VoidWalkrParse.parseYouTubeId(raw) : null;
  var theme = getParam('theme') || 'dark';
  var fs = getParam('fs') === '1' ? 1 : 0;

  if (!id) {
    window.location.replace(B.url('invalid.html') + '?reason=bad_id&theme=' + encodeURIComponent(theme));
    return;
  }
  document.body.classList.add('is-viewer');
  window.VoidWalkrViewer.initViewer({ id: id, theme: theme, fs: fs });
})();
