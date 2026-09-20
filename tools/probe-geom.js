// Dev-only: pin down why the <use>-based monogram renders differently
// from the identical markup written inline.
(function () {
  window.addEventListener('load', function () {
    setTimeout(function () {
      var out = {};

      var useEl = document.querySelector('.rk use');
      out.use = {
        viewBox: useEl.getAttribute('viewBox'),
        href: useEl.getAttribute('href'),
        bbox: (function () { var r = useEl.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
        strokeInherited: getComputedStyle(useEl).stroke,
        fillInherited: getComputedStyle(useEl).fill
      };

      var svg = useEl.ownerSVGElement;
      out.svg = {
        vb: svg.getAttribute('viewBox'),
        box: (function () { var r = svg.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
        state: svg.getAttribute('data-logo-state')
      };

      // where does the painted ink actually land? rasterise and scan.
      // Instead: ask each symbol child for its own bbox via a clone-free trick —
      // wrap the symbol content in a temporary inline svg and read bboxes.
      var sym = document.getElementById('rk-glyph');
      var holder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      holder.setAttribute('viewBox', '0 0 160 160');
      holder.setAttribute('width', '160');
      holder.setAttribute('height', '160');
      holder.setAttribute('class', 'rk');
      holder.setAttribute('data-logo-state', 'idle');
      holder.style.cssText = 'position:absolute;left:-9999px;width:160px;height:160px';
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      Array.prototype.slice.call(sym.childNodes).forEach(function (n) {
        g.appendChild(n.cloneNode(true));
      });
      holder.appendChild(g);
      document.body.appendChild(holder);

      function bb(sel) {
        var el = holder.querySelector(sel);
        if (!el) return 'missing';
        var b = el.getBBox ? el.getBBox() : null;
        if (!b) return 'nobbox';
        return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];
      }
      out.inlineBoxes = {
        spine: bb('.rk__spine'),
        armUp: bb('.rk__arm--up'),
        bracketL: bb('.rk__bracket--l'),
        bracketR: bb('.rk__bracket--r'),
        core: bb('.rk__core'),
        lattice: bb('.rk__lattice')
      };
      out.inlineStyles = {
        spine: getComputedStyle(holder.querySelector('.rk__spine')).stroke,
        armUp: getComputedStyle(holder.querySelector('.rk__arm--up')).stroke
      };

      // and the real thing, via the symbol's own bbox proxy
      var probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      probe.setAttribute('viewBox', '0 0 160 160');
      probe.setAttribute('width', '160');
      probe.setAttribute('height', '160');
      probe.style.cssText = 'position:absolute;left:-9999px';
      probe.innerHTML = '<use href="#rk-glyph"/>';
      document.body.appendChild(probe);
      out.useProbe = {
        useBBox: (function () {
          var u = probe.querySelector('use');
          try { return [Math.round(u.getBBox().x), Math.round(u.getBBox().y), Math.round(u.getBBox().width), Math.round(u.getBBox().height)]; }
          catch (e) { return 'err:' + e.message; }
        })(),
        resolvedStrokeOnUse: (function () {
          var svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          return 'n/a';
        })()
      };

      var pre = document.createElement('pre');
      pre.id = 'probe';
      pre.textContent = JSON.stringify(out, null, 2);
      document.body.appendChild(pre);
    }, 150);
  });
})();
