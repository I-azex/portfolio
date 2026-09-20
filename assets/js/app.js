/* ============================================================
   RK.PORTFOLIO — app.js
   Vanilla ES2019 module. No dependencies, no build step.

   Modules, in order:
     prefs → logo → boot → net → stars → cursor → magnetic
     → tilt → scroll → bars → counters → copy → nav → misc
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     0 · PREFS + HELPERS
     ---------------------------------------------------------- */

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COARSE = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  var BUILD = '2026.02';
  var rafs = [];
  var onFrame = function (fn) { rafs.push(fn); };

  /* ----------------------------------------------------------
     1 · LOGO STATE MACHINE
     Every <svg data-logo> renders its own <use> shadow tree, so a
     state change has to be applied to each instance individually.
     ---------------------------------------------------------- */

  var Logo = (function () {
    var HEADS = 'assembly,idle,hover,loading,success';
    var notes = {
      assembly: 'сборка из частиц · 5 состояний',
      idle:     'idle · логотип собран, ядро пульсирует',
      hover:    'hover · элементы раздвинуты, ядро ярче',
      loading:  'loading · сегменты вращаются вокруг ядра',
      success:  'success · подтверждение действия'
    };

    var note = null;
    var timer = null;
    var base = 'idle';   /* the state the console last selected */

    function set(state, opts) {
      if (HEADS.indexOf(state) < 0) return;
      var isHover = (opts && opts.transient);
      if (!isHover) base = state;

      var targets = $$('[data-logo]:not([data-logo-static])');
      targets.forEach(function (el) { el.setAttribute('data-logo-state', state); });

      $$('.chip[data-logo-state]').forEach(function (btn) {
        var on = btn.getAttribute('data-logo-state') === state;
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      if (note && !isHover) {
        note.textContent = notes[state] || '';
        note.classList.toggle('is-flash', state === 'success');
        clearTimeout(timer);
        if (state === 'success') {
          timer = setTimeout(function () { note.classList.remove('is-flash'); }, 1200);
        }
      }
    }

    function init() {
      note = $('#logo-note');
      $$('.chip[data-logo-state]').forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.classList.contains('is-on') ? 'true' : 'false');
      });

      document.addEventListener('click', function (e) {
        var btn = e.target.closest('.chip[data-logo-state]');
        if (!btn) return;
        set(btn.getAttribute('data-logo-state'));
      });

      /* the hero mark itself reacts to the pointer */
      var hero = $('#logo-hero');
      if (hero && !COARSE && !REDUCED) {
        hero.addEventListener('pointerenter', function () {
          if (base === 'loading') return;
          set('hover', { transient: true });
        });
        hero.addEventListener('pointerleave', function () {
          if (base === 'loading') return;
          set(base, { transient: true });
        });
      }

      /* public hook: window.dispatchEvent(new CustomEvent('rk:logo', {detail:'success'})) */
      window.addEventListener('rk:logo', function (e) { set(e.detail); });
    }

    return { init: init, set: set, baseState: function () { return base; } };
  })();

  /* ----------------------------------------------------------
     2 · BOOT SEQUENCE (preloader)
     ---------------------------------------------------------- */

  var Boot = (function () {
    var STEPS = [
      'инициализация окружения',
      'чтение манифеста проекта',
      'компиляция шейдеров интерфейса',
      'загрузка партикл-сети',
      'подключение навыков и проектов',
      'проверка адаптивной вёрстки'
    ];
    var DURATION = REDUCED ? 260 : 1760;

    var root, log, fill, pct, role, started = 0, done = false;

    function finish() {
      if (done) return;
      done = true;
      var hero = $('#logo-hero');
      if (hero && !REDUCED) hero.setAttribute('data-logo-state', 'success');

      setTimeout(function () {
        root.classList.add('is-out');
        document.body.classList.remove('is-locked');
        requestAnimationFrame(function () {
          document.body.classList.add('is-ready');
        });
        setTimeout(function () {
          root.setAttribute('aria-hidden', 'true');
          if (hero && !REDUCED) hero.setAttribute('data-logo-state', Logo.baseState());
          startObservers();
        }, 900);
      }, REDUCED ? 0 : 560);
    }

    function tick(now) {
      if (!started) started = now;
      var t = clamp((now - started) / DURATION, 0, 1);
      var shown = Math.round(t * 100);

      pct.textContent = shown < 10 ? '00' + shown : shown < 100 ? '0' + shown : '100';
      fill.style.width = shown + '%';

      var idx = Math.min(STEPS.length - 1, Math.floor(t * STEPS.length));
      if (role.dataset.i !== String(idx)) {
        role.dataset.i = String(idx);
        role.textContent = STEPS[idx] + '…';
      }

      /* emit log rows one at a time */
      var want = Math.min(STEPS.length, Math.floor(t * (STEPS.length + 0.35)) + 1);
      while (log.children.length < want) {
        var i = log.children.length;
        var li = document.createElement('li');
        li.className = 'boot__row';
        li.style.animationDelay = '0ms';
        li.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b>' +
                       '<span>' + STEPS[i] + '</span><i></i><em>ok</em>';
        log.appendChild(li);
      }

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        role.textContent = 'система готова';
        finish();
      }
    }

    function init() {
      root = $('#boot');
      log = $('#boot-log');
      fill = $('#boot-fill');
      pct = $('#boot-pct');
      role = $('#boot-role');
      if (!root) return;

      var skip = $('#boot-skip');
      if (skip) skip.addEventListener('click', function (e) { e.preventDefault(); finish(); });

      /* ?instant=1 skips the intro — used by automated captures and previews */
      var instant = /[?&]instant=1\b/.test(window.location.search);

      /* honour the skip on repeat visits — nobody wants the show twice */
      var seen = false;
      try { seen = sessionStorage.getItem('rk:booted') === '1'; } catch (err) { /* private mode */ }

      if (seen || REDUCED || instant) {
        log.innerHTML = '';
        STEPS.forEach(function (s, i) {
          var li = document.createElement('li');
          li.className = 'boot__row is-done';
          li.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b><span>' + s + '</span><i></i><em>ok</em>';
          log.appendChild(li);
        });
        fill.style.width = '100%';
        pct.textContent = '100';
        role.textContent = 'система готова';
        if (instant) {
          /* paint the finished frame synchronously, then get out of the way */
          root.classList.add('is-out');
          document.body.classList.remove('is-locked');
          document.body.classList.add('is-ready');
          root.setAttribute('aria-hidden', 'true');
          var hero = $('#logo-hero');
          if (hero) hero.setAttribute('data-logo-state', Logo.baseState());
          setTimeout(startObservers, 30);
          done = true;
          return;
        }
        started = performance.now() - DURATION;
      } else {
        try { sessionStorage.setItem('rk:booted', '1'); } catch (err) { /* ignore */ }
      }

      requestAnimationFrame(tick);
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     3 · PARTICLE NETWORK
     Nodes drift, link when close, and lean away from the cursor.
     ---------------------------------------------------------- */

  var Net = (function () {
    var canvas, ctx, nodes = [], w = 0, h = 0, dpr = 1;
    var LINK = 148, MOUSE_R = 190;
    var mouse = { x: -9999, y: -9999, on: false };
    var running = false, last = 0, fps = 60;

    function count() {
      var vw = window.innerWidth;
      if (vw < 620) return 26;
      if (vw < 1024) return 44;
      if (vw < 1500) return 68;
      return 86;
    }

    function build() {
      nodes = [];
      var n = count();
      for (var i = 0; i < n; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.26,
          vy: (Math.random() - 0.5) * 0.26,
          r: Math.random() * 1.5 + 1.1,
          k: Math.random() < 0.22 ? 'g' : 'c'
        });
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < nodes.length; i++) {
        var a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;

        if (mouse.on) {
          var mdx = a.x - mouse.x, mdy = a.y - mouse.y;
          var md = Math.sqrt(mdx * mdx + mdy * mdy);
          if (md < MOUSE_R && md > 0.1) {
            var push = (1 - md / MOUSE_R) * 0.5;
            a.x += (mdx / md) * push;
            a.y += (mdy / md) * push;
          }
        }
      }

      /* links */
      for (var j = 0; j < nodes.length; j++) {
        var p = nodes[j];
        for (var m = j + 1; m < nodes.length; m++) {
          var q = nodes[m];
          var dx = p.x - q.x, dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          var d = Math.sqrt(d2);
          var alpha = (1 - d / LINK) * 0.3;
          ctx.strokeStyle = 'rgba(0,229,255,' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }

      /* cursor links, brighter */
      if (mouse.on) {
        for (var k = 0; k < nodes.length; k++) {
          var s = nodes[k];
          var cdx = s.x - mouse.x, cdy = s.y - mouse.y;
          var cd = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cd > MOUSE_R) continue;
          var ca = (1 - cd / MOUSE_R) * 0.42;
          ctx.strokeStyle = 'rgba(57,255,20,' + ca.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }

      /* nodes */
      for (var n2 = 0; n2 < nodes.length; n2++) {
        var o = nodes[n2];
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.k === 'g' ? 'rgba(57,255,20,0.72)' : 'rgba(0,229,255,0.62)';
        ctx.fill();
      }
    }

    function loop(now) {
      if (!running) return;
      var gap = 1000 / fps;
      if (now - last >= gap) { last = now; draw(); }
      requestAnimationFrame(loop);
    }

    function start() { if (!running) { running = true; last = 0; requestAnimationFrame(loop); } }
    function stop() { running = false; }

    function init() {
      canvas = $('#fx-net');
      if (!canvas) return;
      ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      fps = COARSE ? 30 : 60;
      resize();
      start();

      var rt;
      window.addEventListener('resize', function () {
        clearTimeout(rt);
        rt = setTimeout(resize, 180);
      });

      if (!COARSE) {
        window.addEventListener('pointermove', function (e) {
          mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
        }, { passive: true });
        window.addEventListener('pointerleave', function () { mouse.on = false; });
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop();
        else if (!REDUCED) start();
      });
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     4 · STARFIELD — sparse, twinkling, with a few cross spikes
     ---------------------------------------------------------- */

  var Stars = (function () {
    var canvas, ctx, stars = [], w = 0, h = 0, dpr = 1;
    var running = false, t0 = 0;

    function count() {
      var vw = window.innerWidth;
      return vw < 620 ? 60 : vw < 1024 ? 100 : 150;
    }

    function build() {
      stars = [];
      var n = count();
      for (var i = 0; i < n; i++) {
        var big = Math.random() < 0.07;
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: big ? Math.random() * 0.9 + 1.1 : Math.random() * 0.8 + 0.35,
          p: Math.random() * Math.PI * 2,
          s: Math.random() * 0.0016 + 0.0004,
          drift: Math.random() * 0.045 + 0.008,
          big: big
        });
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.p += s.s * 16;
        var tw = 0.36 + 0.64 * (0.5 + 0.5 * Math.sin(s.p));
        s.y -= s.drift;
        if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,240,255,' + (tw * (s.big ? 0.85 : 0.55)).toFixed(3) + ')';
        ctx.fill();

        if (s.big) {
          var arm = s.r * 3.6;
          ctx.strokeStyle = 'rgba(0,229,255,' + (tw * 0.32).toFixed(3) + ')';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(s.x - arm, s.y); ctx.lineTo(s.x + arm, s.y);
          ctx.moveTo(s.x, s.y - arm); ctx.lineTo(s.x, s.y + arm);
          ctx.stroke();
        }
      }
    }

    function loop(now) {
      if (!running) return;
      draw(now);
      requestAnimationFrame(loop);
    }

    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function stop() { running = false; }

    function init() {
      canvas = $('#fx-star');
      if (!canvas) return;
      ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      resize();
      start();
      var rt;
      window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 220); });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else if (!REDUCED) start();
      });
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     5 · CUSTOM CURSOR — dot leads, ring lags behind
     ---------------------------------------------------------- */

  var Cursor = (function () {
    var root, dot, ring, label;
    var mx = -100, my = -100, rx = -100, ry = -100;
    var visible = false, enabled = false;

    function init() {
      root = $('#cursor');
      if (!root || COARSE || REDUCED) return;
      dot = $('.cursor__dot', root);
      ring = $('.cursor__ring', root);
      label = $('#cursor-label', root);
      enabled = true;

      document.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY;
        if (!visible) { visible = true; root.classList.add('is-on'); rx = mx; ry = my; }
        hitTest(e.target);
      }, { passive: true });

      document.addEventListener('pointerdown', function () { root.classList.add('is-down'); });
      document.addEventListener('pointerup', function () { root.classList.remove('is-down'); });
      document.addEventListener('mouseleave', function () { root.classList.remove('is-on'); visible = false; });

      onFrame(function () {
        rx += (mx - rx) * 0.16;
        ry += (my - ry) * 0.16;
        dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
        ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      });
    }

    function hitTest(el) {
      if (!el || !el.closest) return;
      var hot = el.closest('a, button, .chip, [data-copy], [data-tilt], input, textarea');
      root.classList.toggle('is-hot', !!hot && !hot.hasAttribute('data-cursor'));
      var labelled = el.closest('[data-cursor]');
      if (labelled) {
        label.textContent = labelled.getAttribute('data-cursor');
        root.classList.add('is-label');
      } else {
        root.classList.remove('is-label');
      }
    }

    function isOn() { return enabled; }
    return { init: init, isOn: isOn };
  })();

  /* ----------------------------------------------------------
     6 · MAGNETIC BUTTONS + RIPPLE
     ---------------------------------------------------------- */

  var Magnetic = (function () {
    function init() {
      if (COARSE || REDUCED) return;

      $$('[data-magnetic]').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
          var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
          el.style.setProperty('--mag-x', (dx * 9).toFixed(2) + 'px');
          el.style.setProperty('--mag-y', (dy * 7).toFixed(2) + 'px');
        });
        el.addEventListener('pointerleave', function () {
          el.style.setProperty('--mag-x', '0px');
          el.style.setProperty('--mag-y', '0px');
        });
      });

      document.addEventListener('pointerdown', function (e) {
        var btn = e.target.closest('.btn, .chip, .totop');
        if (!btn || REDUCED) return;
        var r = btn.getBoundingClientRect();
        var size = Math.max(r.width, r.height);
        var span = document.createElement('span');
        span.className = 'ripple';
        span.style.width = span.style.height = size + 'px';
        span.style.left = (e.clientX - r.left - size / 2) + 'px';
        span.style.top = (e.clientY - r.top - size / 2) + 'px';
        if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
        btn.appendChild(span);
        setTimeout(function () { span.remove(); }, 640);
      });
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     7 · 3D TILT CARDS
     ---------------------------------------------------------- */

  var Tilt = (function () {
    function init() {
      if (COARSE || REDUCED) return;
      $$('[data-tilt]').forEach(function (card) {
        var raf = 0, tx = 0, ty = 0;

        function apply() {
          raf = 0;
          card.style.setProperty('--rx', ty.toFixed(2) + 'deg');
          card.style.setProperty('--ry', tx.toFixed(2) + 'deg');
          card.style.setProperty('--ty', '-6px');
        }

        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          tx = (px - 0.5) * 11;
          ty = -(py - 0.5) * 9;
          card.style.setProperty('--cx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--cy', (py * 100).toFixed(1) + '%');
          card.classList.add('is-tilting');
          if (!raf) raf = requestAnimationFrame(apply);
        });

        card.addEventListener('pointerleave', function () {
          card.classList.remove('is-tilting');
          card.style.setProperty('--rx', '0deg');
          card.style.setProperty('--ry', '0deg');
          card.style.setProperty('--ty', '0px');
        });
      });
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     8 · SCROLL — progress, header state, active link, to-top
     ---------------------------------------------------------- */

  var Scroll = (function () {
    var hdr, bar, totop, totopPct, links = [], sections = [];
    var ticking = false;

    function measure() {
      sections = $$('main section[id]');
    }

    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      var p = clamp(y / max, 0, 1);

      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
      if (hdr) hdr.classList.toggle('is-stuck', y > 24);
      if (totop) totop.classList.toggle('is-on', y > window.innerHeight * 0.85);
      if (totopPct) totopPct.textContent = Math.round(p * 100) + '%';

      /* active section */
      var current = '';
      for (var i = 0; i < sections.length; i++) {
        var s = sections[i];
        if (s.getBoundingClientRect().top <= window.innerHeight * 0.38) current = s.id;
      }
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + current;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }

    function request() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    function init() {
      hdr = $('#hdr');
      bar = $('#progress-bar');
      totop = $('#totop');
      totopPct = $('#totop-pct');
      links = $$('.nav__link');
      measure();
      window.addEventListener('scroll', request, { passive: true });
      window.addEventListener('resize', function () { measure(); request(); });
      update();

      if (totop) {
        totop.addEventListener('click', function () {
          window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
        });
      }
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     9 · REVEAL ON SCROLL + SKILL BARS + COUNTERS
     ---------------------------------------------------------- */

  var io = null;

  function startObservers() {
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');

        if (el.hasAttribute('data-bar')) fillBar(el);
        if (el.classList.contains('bar')) {
          var num = $('[data-bar-num]', el);
          if (num) countTo(num, parseInt(el.getAttribute('data-bar'), 10) || 0, 1100);
        }
        if (el.classList.contains('count')) countTo(el, parseInt(el.getAttribute('data-count'), 10) || 0, 1300);
        if (el.classList.contains('sec-head')) el.classList.add('is-in');

        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.12 });

    $$('[data-reveal], [data-bar], .count, .sec-head').forEach(function (el) { io.observe(el); });
  }

  function fillBar(el) {
    var target = parseInt(el.getAttribute('data-bar'), 10) || 0;
    var fill = $('.bar__fill', el);
    if (!fill) return;
    el.style.setProperty('--bar-target', target + '%');
    if (REDUCED) { fill.style.width = target + '%'; return; }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { fill.style.width = target + '%'; });
    });
  }

  function countTo(el, target, ms) {
    if (el.dataset.counted === '1') return;
    el.dataset.counted = '1';
    if (REDUCED) { el.textContent = String(target); return; }

    var start = performance.now();
    (function step(now) {
      var t = clamp((now - start) / ms, 0, 1);
      var v = Math.round(easeOut(t) * target);
      el.textContent = String(v);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = String(target);
    })(start);
  }

  /* ----------------------------------------------------------
     10 · COPY TO CLIPBOARD
     ---------------------------------------------------------- */

  var Copy = (function () {
    function init() {
      var hint = $('#copy-hint');
      var timer = null;

      $$('[data-copy]').forEach(function (el) {
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.setAttribute('title', 'Скопировать: ' + el.getAttribute('data-copy'));

        function run(e) {
          e.preventDefault();
          var value = el.getAttribute('data-copy');
          var ok = function () {
            if (hint) {
              hint.textContent = 'скопировано: ' + value;
              hint.classList.add('is-flash');
              clearTimeout(timer);
              timer = setTimeout(function () {
                hint.textContent = 'нажмите на значение, чтобы скопировать';
                hint.classList.remove('is-flash');
              }, 1800);
            }
            Logo.set('success');
            setTimeout(function () { Logo.set(baseState()); }, 1000);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value).then(ok, function () { fallback(value, ok); });
          } else {
            fallback(value, ok);
          }
        }

        el.addEventListener('click', run);
        el.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') run(e);
        });
      });
    }

    function fallback(value, ok) {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (err) { /* nothing else to try */ }
      ta.remove();
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     11 · NAVIGATION (mobile drawer + smooth scroll)
     ---------------------------------------------------------- */

  var Nav = (function () {
    function init() {
      var burger = $('#burger');
      var nav = $('#nav');
      if (!burger || !nav) return;

      function close() {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Открыть меню');
      }
      function toggle() {
        var open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      }

      burger.addEventListener('click', toggle);
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth > 768) close();
      });
    }

    return { init: init };
  })();

  /* ----------------------------------------------------------
     12 · MISC — year, build stamp
     ---------------------------------------------------------- */

  function misc() {
    var y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
    var b = $('#build-stamp');
    if (b) b.textContent = 'v1.0.' + BUILD;
  }

  /* ----------------------------------------------------------
     13 · FRAME LOOP — one rAF for every per-frame consumer
     ---------------------------------------------------------- */

  function startFrames() {
    if (!rafs.length) return;
    (function loop() {
      for (var i = 0; i < rafs.length; i++) rafs[i]();
      requestAnimationFrame(loop);
    })();
  }

  /* ----------------------------------------------------------
     BOOTSTRAP
     ---------------------------------------------------------- */

  function main() {
    misc();
    Logo.init();
    Boot.init();
    Nav.init();
    Scroll.init();
    Magnetic.init();
    Tilt.init();
    Cursor.init();
    Copy.init();

    if (!REDUCED) {
      Net.init();
      Stars.init();
      startFrames();
    } else {
      /* nothing animated: reveal everything immediately */
      $$('[data-reveal], .sec-head').forEach(function (el) { el.classList.add('is-in'); });
      $$('[data-bar]').forEach(fillBar);
      $$('.count').forEach(function (el) {
        el.textContent = el.getAttribute('data-count');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
