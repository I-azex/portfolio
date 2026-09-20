// Dev-only probe. Load with ?probe=1 and read the JSON from <pre id="probe">.
// Reports whether boot, observers and layout landed as intended.
(function () {
  var q = new URLSearchParams(window.location.search);
  if (!q.has('probe')) return;

  window.addEventListener('load', function () {
    setTimeout(function () {
      var out = {
        ready: document.body.classList.contains('is-ready'),
        locked: document.body.classList.contains('is-locked'),
        bootOut: document.getElementById('boot').classList.contains('is-out'),
        bootVisibility: getComputedStyle(document.getElementById('boot')).visibility,
        reveals: document.querySelectorAll('[data-reveal]').length,
        revealed: document.querySelectorAll('[data-reveal].is-in').length,
        secHeadIn: document.querySelectorAll('.sec-head.is-in').length,
        heroLogoState: document.getElementById('logo-hero').getAttribute('data-logo-state'),
        heroLogoBox: (function () {
          var r = document.getElementById('logo-hero').getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.height), Math.round(r.left), Math.round(r.top)];
        })(),
        heroCopyBox: (function () {
          var r = document.querySelector('.hero__copy').getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.left), Math.round(r.top)];
        })(),
        markBox: (function () {
          var r = document.querySelector('.hero__mark').getBoundingClientRect();
          return [Math.round(r.width), Math.round(r.left), Math.round(r.top)];
        })(),
        scrollHeight: document.documentElement.scrollHeight,
        fontsLoaded: document.fonts ? document.fonts.status : 'n/a',
        montserrat: document.fonts ? document.fonts.check('700 16px Montserrat') : 'n/a',
        inter: document.fonts ? document.fonts.check('400 16px Inter') : 'n/a',
        jetbrains: document.fonts ? document.fonts.check('400 16px "JetBrains Mono"') : 'n/a',
        bars: Array.prototype.map.call(document.querySelectorAll('.bar__fill'), function (f) {
          return f.style.width || 'unset';
        })
      };
      var pre = document.createElement('pre');
      pre.id = 'probe';
      pre.textContent = JSON.stringify(out, null, 2);
      document.body.appendChild(pre);
    }, 260);
  });
})();
