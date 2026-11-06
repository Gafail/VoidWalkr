(function () {
  'use strict';

  var THEME_KEY = 'voidwalkr.theme';
  var VALID_THEMES = ['dark', 'neon', 'blur', 'midnight'];

  /* Fallback used only if js/base.js failed to load. */
  var B = window.VoidWalkrBase || {
    base: function () { return '/'; },
    url: function (p) { return '/' + String(p == null ? '' : p).replace(/^\/+/, ''); },
    homeUrl: function () { return '/home'; },
    absolute: function (p) { return window.location.origin + '/' + String(p == null ? '' : p).replace(/^\/+/, ''); }
  };

  function $(sel) { return document.querySelector(sel); }

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

  function getStoredTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t && VALID_THEMES.indexOf(t) !== -1) return t;
    } catch (e) {}
    return 'dark';
  }

  function setStoredTheme(t) {
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }

  function applyTheme(t) {
    document.body.classList.remove('theme-dark', 'theme-neon', 'theme-blur', 'theme-midnight');
    document.body.classList.add('theme-' + t);
  }

  function routeToInvalid(reason, theme) {
    var target = B.url('invalid.html') + '?reason=' + encodeURIComponent(reason) +
      (theme ? '&theme=' + encodeURIComponent(theme) : '');
    try {
      window.location.replace(target);
    } catch (e) {
      window.location.href = target;
    }
  }

  function handleShortLink() {
    var v = getParam('v');
    if (v === null) return false;
    var id = window.VoidWalkrParse ? window.VoidWalkrParse.parseYouTubeId(v) : null;
    if (!id) {
      routeToInvalid('bad_id', getParam('theme') || 'dark');
      return true;
    }
    var theme = getParam('theme') || 'dark';
    var fs = getParam('fs') === '1' ? 1 : 0;
    if (!window.VoidWalkrViewer || !window.VoidWalkrViewer.initViewer) {
      return true;
    }
    window.VoidWalkrViewer.initViewer({ id: id, theme: theme, fs: fs });
    return true;
  }

  function showHome() {
    document.body.classList.remove('is-viewer');
    document.body.classList.add('is-home');
    var home = document.getElementById('home-ui');
    if (home) home.hidden = false;

    var input = $('#url-input');
    var themeSelector = $('#theme-selector');
    var loadBtn = $('#load-btn');
    var errEl = $('#input-error');

    if (input) {
      input.value = '';
      try { input.focus(); } catch (e) {}
    }

    var currentTheme = getStoredTheme();
    applyTheme(currentTheme);
    syncThemeSelector(themeSelector, currentTheme);

    if (themeSelector) {
      themeSelector.addEventListener('change', function () {
        var t = themeSelector.querySelector('input[name="theme"]:checked');
        if (!t) return;
        var val = t.value;
        applyTheme(val);
        setStoredTheme(val);
      });
    }

    function showError(msg) {
      if (!errEl) return;
      errEl.textContent = msg;
      errEl.classList.add('is-visible');
      if (input) {
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
      }
    }

    function clearError() {
      if (!errEl) return;
      errEl.textContent = '';
      errEl.classList.remove('is-visible');
    }

    function buildShortLink(id, theme) {
      var origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
      var qs = '?v=' + encodeURIComponent(id) + '&theme=' + encodeURIComponent(theme);
      /* B.base() keeps the link correct whether the site is published at the
       * domain root or under a subdirectory (e.g. /VoidWalkr/). */
      return origin + B.base() + qs;
    }

    function go() {
      clearError();
      if (!input) return;
      var raw = input.value || '';
      var id = window.VoidWalkrParse ? window.VoidWalkrParse.parseYouTubeId(raw) : null;
      if (!id) {
        if (!raw.trim()) {
          showError("Paste a YouTube link first.");
        } else {
          showError("That doesn't look like a YouTube link.");
        }
        return;
      }
      var t = getStoredTheme();
      window.location.href = buildShortLink(id, t);
    }

    if (input) {
      input.addEventListener('input', clearError);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') go();
      });
    }
    if (loadBtn) loadBtn.addEventListener('click', function () { go(); });

    var copyBtn = $('#copy-link-btn');
    var copyStatus = $('#copy-link-status');
    var copyTimer = null;
    function setCopyStatus(msg, kind) {
      if (!copyStatus) return;
      copyStatus.textContent = msg || '';
      copyStatus.classList.remove('is-success', 'is-error');
      if (kind) copyStatus.classList.add('is-' + kind);
      if (copyTimer) clearTimeout(copyTimer);
      if (msg) {
        copyTimer = setTimeout(function () {
          copyStatus.textContent = '';
          copyStatus.classList.remove('is-success', 'is-error');
        }, 2500);
      }
    }

    function copyToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function (resolve, reject) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.top = '-1000px';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          ta.setSelectionRange(0, text.length);
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          ok ? resolve() : reject(new Error('execCommand failed'));
        } catch (e) { reject(e); }
      });
    }

    function copyLink() {
      clearError();
      if (!input) return;
      var raw = input.value || '';
      var id = window.VoidWalkrParse ? window.VoidWalkrParse.parseYouTubeId(raw) : null;
      if (!id) {
        if (!raw.trim()) {
          showError("Paste a YouTube link first.");
        } else {
          showError("That doesn't look like a YouTube link.");
        }
        setCopyStatus('', null);
        return;
      }
      var link = buildShortLink(id, getStoredTheme());
      copyToClipboard(link).then(function () {
        setCopyStatus('Copied!', 'success');
      }).catch(function () {
        setCopyStatus("Couldn't copy — link: " + link, 'error');
      });
    }

    if (copyBtn) copyBtn.addEventListener('click', copyLink);
  }

  function syncThemeSelector(group, current) {
    if (!group) return;
    var inputs = group.querySelectorAll('input[name="theme"]');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].value === current) inputs[i].checked = true;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var handled = handleShortLink();
    if (!handled) showHome();
  });
})();
