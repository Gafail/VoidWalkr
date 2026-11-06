(function () {
  'use strict';

  var YT_API_SRC = 'https://www.youtube.com/iframe_api';
  var YT_API_LOADED = false;
  var YT_READY_QUEUE = [];
  var __vwPlayer;

  /* Fallback used only if js/base.js failed to load, so the viewer still
   * functions (at the domain root) instead of throwing. */
  var B = window.VoidWalkrBase || {
    base: function () { return '/'; },
    url: function (p) { return '/' + String(p == null ? '' : p).replace(/^\/+/, ''); },
    homeUrl: function () { return '/home'; },
    absolute: function (p) { return window.location.origin + '/' + String(p == null ? '' : p).replace(/^\/+/, ''); }
  };

  function routeToInvalid(reason, theme) {
    var target = B.url('invalid.html') + '?reason=' + encodeURIComponent(reason) +
      (theme ? '&theme=' + encodeURIComponent(theme) : '');
    try {
      window.location.replace(target);
    } catch (e) {
      window.location.href = target;
    }
  }

  function autoReturn() {
    var home = B.homeUrl();
    try {
      window.location.replace(home);
    } catch (e) {
      window.location.href = home;
    }
  }

  function applyTheme(theme) {
    var valid = ['dark', 'neon', 'blur', 'midnight'];
    var t = valid.indexOf(theme) !== -1 ? theme : 'dark';
    document.body.classList.remove('theme-dark', 'theme-neon', 'theme-blur', 'theme-midnight');
    document.body.classList.add('theme-' + t);
  }

  /* ---- Fullscreen -------------------------------------------------------
   * The short-link format supports "fs=1" for a distraction-free fullscreen
   * player. Browsers only grant fullscreen from a user gesture, so we try
   * once when the player is ready and, if the request is rejected, arm a
   * one-shot click/keydown handler so the first interaction opens it. */
  var fsArmed = false;

  function cleanupFsGesture() {
    if (!fsArmed) return;
    fsArmed = false;
    document.removeEventListener('click', onFsGesture);
    document.removeEventListener('keydown', onFsGesture);
  }

  function onFsGesture() {
    cleanupFsGesture();
    requestFullscreen();
  }

  function armFsGesture() {
    if (fsArmed) return;
    fsArmed = true;
    document.addEventListener('click', onFsGesture);
    document.addEventListener('keydown', onFsGesture);
  }

  function requestFullscreen() {
    var el = document.getElementById('video-container');
    if (!el) return;
    var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!req) return;
    try {
      var p = req.call(el);
      if (p && typeof p.then === 'function') {
        p.then(cleanupFsGesture).catch(armFsGesture);
      } else {
        cleanupFsGesture();
      }
    } catch (e) {
      armFsGesture();
    }
  }

  function buildPlayer(opts) {
    if (!window.YT || !window.YT.Player) {
      YT_READY_QUEUE.push(function () { buildPlayer(opts); });
      return;
    }
    var player = new window.YT.Player('youtube-player', {
      videoId: opts.id,
      playerVars: {
        enablejsapi: 1,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1
      },
      events: {
        onReady: function (e) {
          try { e.target.playVideo(); } catch (err) {}
          if (opts.fs) requestFullscreen();
        },
        onStateChange: function (e) {
          if (e.data === window.YT.PlayerState.ENDED) {
            autoReturn();
          }
        },
        onError: function (e) {
          var code = e && typeof e.data === 'number' ? e.data : 0;
          if (code === 2 || code === 100 || code === 101 || code === 150) {
            routeToInvalid('embed_error', opts.theme);
          }
        }
      }
    });
    __vwPlayer = player;
  }

  function loadYouTubeApi() {
    if (YT_API_LOADED) return;
    YT_API_LOADED = true;
    var tag = document.createElement('script');
    tag.src = YT_API_SRC;
    tag.async = true;
    var first = document.getElementsByTagName('script')[0];
    if (first && first.parentNode) {
      first.parentNode.insertBefore(tag, first);
    } else {
      document.head.appendChild(tag);
    }
  }

  window.onYouTubeIframeAPIReady = function () {
    var q = YT_READY_QUEUE;
    YT_READY_QUEUE = [];
    for (var i = 0; i < q.length; i++) q[i]();
  };

  function mountViewerDom() {
    var existingContainer = document.getElementById('video-container');
    if (existingContainer) return existingContainer;

    var main = document.createElement('main');
    main.className = 'vw-viewer';
    main.setAttribute('role', 'main');

    var container = document.createElement('div');
    container.id = 'video-container';
    container.className = 'vw-video-wrap';

    var player = document.createElement('div');
    player.id = 'youtube-player';
    container.appendChild(player);

    main.appendChild(container);

    var back = document.createElement('a');
    back.href = B.homeUrl();
    back.className = 'vw-back-home';
    back.setAttribute('aria-label', 'Back to home');
    back.textContent = 'Back to home';
    main.appendChild(back);

    document.body.appendChild(main);
    return container;
  }

  function initViewer(opts) {
    if (!opts || !opts.id) {
      routeToInvalid('bad_id', opts && opts.theme);
      return;
    }
    applyTheme(opts.theme);
    document.body.classList.add('is-viewer');
    mountViewerDom();
    loadYouTubeApi();
    buildPlayer({ id: opts.id, theme: opts.theme, fs: opts.fs ? 1 : 0 });
  }

  window.VoidWalkrViewer = { initViewer: initViewer, autoReturn: autoReturn };
})();
