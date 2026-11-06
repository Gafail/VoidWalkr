(function (root) {
  'use strict';

  var ID_RE = /^[A-Za-z0-9_-]{11}$/;

  /* Hosts we accept links from. Anything else is rejected up front so a
   * lookalike URL (vimeo.com/watch?v=AAAAAAAAAAA) never reaches the
   * player and then fails with a confusing embed error. */
  function isYouTubeHost(host) {
    if (!host) return true;
    return host === 'youtu.be' ||
      host === 'youtube.com' || host.slice(-12) === '.youtube.com' ||
      host === 'youtube-nocookie.com' || host.slice(-22) === '.youtube-nocookie.com';
  }

  /* Pull the hostname out of a pasted URL, if it has one. Returns "" for
   * bare ids and for scheme-less fragments like "watch?v=abc". */
  function extractHost(raw) {
    var withScheme = raw.match(/^(?:[a-z][a-z0-9+.-]*:)?\/\/(?:[^@/]*@)?([^:/?#]+)/i);
    if (withScheme) return withScheme[1].toLowerCase();

    var withoutScheme = raw.match(/^(?:[^@/]*@)?([A-Za-z0-9.-]+\.[A-Za-z]{2,})(?::\d+)?(?:[/?#]|$)/);
    if (withoutScheme) return withoutScheme[1].toLowerCase();

    return '';
  }

  function parseYouTubeId(input) {
    if (typeof input !== 'string') return null;
    var raw = input.trim();
    if (!raw) return null;

    var hashIdx = raw.indexOf('#');
    if (hashIdx !== -1) raw = raw.slice(0, hashIdx);

    if (ID_RE.test(raw)) return raw;

    if (!isYouTubeHost(extractHost(raw))) return null;

    var candidate = null;

    var qIdx = raw.indexOf('?');
    var path = qIdx === -1 ? raw : raw.slice(0, qIdx);
    var query = qIdx === -1 ? '' : raw.slice(qIdx + 1);

    var shortsMatch = path.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    var liveMatch = path.match(/\/live\/([A-Za-z0-9_-]{11})/);
    if (liveMatch) return liveMatch[1];

    var embedMatch = path.match(/\/(?:embed|v)\/([A-Za-z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    if (query) {
      var pairs = query.split('&');
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        var eq = pair.indexOf('=');
        var key = eq === -1 ? pair : pair.slice(0, eq);
        var val = eq === -1 ? '' : pair.slice(eq + 1);
        if ((key === 'v' || key === 'vi') && ID_RE.test(val)) {
          return val;
        }
      }
    }

    var youtuMatch = raw.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (youtuMatch) return youtuMatch[1];

    return null;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseYouTubeId: parseYouTubeId };
  } else {
    root.VoidWalkrParse = { parseYouTubeId: parseYouTubeId };
  }
})(typeof window !== 'undefined' ? window : globalThis);
