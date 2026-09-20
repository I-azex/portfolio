// Dev-only: does CSS in the document match elements inside a <use> shadow tree?
// Renders the real symbol library and reports computed styles of key parts.
(function () {
  function px(el, prop) { return getComputedStyle(el)[prop]; }

  window.addEventListener('load', function () {
    setTimeout(function () {
      var use = document.querySelector('.rk use');
      var shadow = use && use.shadowRoot;
      var report = {
        hasShadowRoot: !!shadow,
        symbolCount: document.querySelectorAll('symbol').length,
        viaUse: null,
        direct: null
      };

      if (shadow) {
        var spine = shadow.querySelector('.rk__spine');
        var arm = shadow.querySelector('.rk__arm--up');
        var br = shadow.querySelector('.rk__bracket--r');
        var dot = shadow.querySelector('.rk__lattice-dot');
        report.viaUse = {
          spineFound: !!spine,
          spineStroke: spine && px(spine, 'stroke'),
          spineStrokeWidth: spine && px(spine, 'strokeWidth'),
          spineOpacity: spine && px(spine, 'opacity'),
          armStroke: arm && px(arm, 'stroke'),
          bracketRightStroke: br && px(br, 'stroke'),
          dotFill: dot && px(dot, 'fill'),
          dotOpacity: dot && px(dot, 'opacity')
        };
      }

      // same markup rendered directly (no <use>) as the control
      var host = document.createElement('div');
      host.style.cssText = 'position:absolute;left:-9999px';
      host.innerHTML = '<svg viewBox="0 0 160 160" class="rk" data-logo="test" data-logo-state="idle">' +
        document.getElementById('rk-glyph').outerHTML.replace('<symbol', '<g').replace('</symbol>', '</g>') +
        '</svg>';
      document.body.appendChild(host);
      var svg = host.querySelector('svg');
      var s2 = svg.querySelector('.rk__spine');
      var a2 = svg.querySelector('.rk__arm--up');
      var b2 = svg.querySelector('.rk__bracket--r');
      var d2 = svg.querySelector('.rk__lattice-dot');
      report.direct = {
        spineFound: !!s2,
        spineStroke: s2 && px(s2, 'stroke'),
        spineStrokeWidth: s2 && px(s2, 'strokeWidth'),
        armStroke: a2 && px(a2, 'stroke'),
        bracketRightStroke: b2 && px(b2, 'stroke'),
        dotFill: d2 && px(d2, 'fill'),
        dotOpacity: d2 && px(d2, 'opacity')
      };

      var pre = document.createElement('pre');
      pre.id = 'probe';
      pre.textContent = JSON.stringify(report, null, 2);
      document.body.appendChild(pre);
    }, 120);
  });
})();
