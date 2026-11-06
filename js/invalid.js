(function () {
  'use strict';

  var VALID_THEMES = ['dark', 'neon', 'blur', 'midnight'];
  var SECONDS = 15;
  var target = null;
  var intervalId = null;

  /* Fallback used only if js/base.js failed to load. */
  var B = window.VoidWalkrBase || {
    base: function () { return '/'; },
    url: function (p) { return '/' + String(p == null ? '' : p).replace(/^\/+/, ''); },
    homeUrl: function () { return '/home'; },
    absolute: function (p) { return window.location.origin + '/' + String(p == null ? '' : p).replace(/^\/+/, ''); }
  };

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

  function applyTheme(t) {
    var theme = VALID_THEMES.indexOf(t) !== -1 ? t : 'dark';
    document.body.classList.remove('theme-dark', 'theme-neon', 'theme-blur', 'theme-midnight');
    document.body.classList.add('theme-' + theme);
  }

  function goHome() {
    var home = B.homeUrl();
    try {
      window.location.replace(home);
    } catch (e) {
      window.location.href = home;
    }
  }

  function tick() {
    var remaining = Math.max(0, Math.round((target - Date.now()) / 1000));
    var n = document.getElementById('countdown-num');
    if (n) n.textContent = String(remaining);
    if (remaining <= 0) {
      stop();
      goHome();
    }
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var reason = getParam('reason') || 'unknown';
    if (console && console.info) console.info('invalid.html reason=' + reason);

    var theme = getParam('theme') || 'dark';
    applyTheme(theme);
    document.body.classList.add('is-invalid');

    target = Date.now() + SECONDS * 1000;
    var n = document.getElementById('countdown-num');
    if (n) n.textContent = String(SECONDS);

    intervalId = setInterval(tick, 250);

    var btn = document.getElementById('go-home-btn');
    if (btn) btn.addEventListener('click', function () { stop(); goHome(); });

    window.addEventListener('pagehide', stop);
    window.addEventListener('beforeunload', stop);
  });
})();
