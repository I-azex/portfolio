// Dev-only: where do the logo instances actually paint at this viewport?
(function () {
  window.addEventListener('load', function () {
    setTimeout(function () {
      var rows = [];
      document.querySelectorAll('.rk').forEach(function (svg, i) {
        var r = svg.getBoundingClientRect();
        rows.push({
          i: i,
          cls: svg.getAttribute('class'),
          box: [Math.round(r.width), Math.round(r.height)],
          left: Math.round(r.left),
          center: Math.round(r.left + r.width / 2),
          right: Math.round(r.right)
        });
      });

      var label = function (sel) {
        var el = document.querySelector(sel);
        if (!el) return null;
        var r = el.getBoundingClientRect();
        var cs = getComputedStyle(el);
        return {
          left: Math.round(r.left), right: Math.round(r.right),
          center: Math.round(r.left + r.width / 2), w: Math.round(r.width),
          transform: cs.transform, overflow: cs.overflow
        };
      };

      var out = {
        vw: document.documentElement.clientWidth,
        logos: rows,
        heroWrap: label('.hero__logo'),
        heroMark: label('.hero__mark'),
        heroGrid: label('.hero__grid'),
        heroLogoBefore: (function () {
          var el = document.querySelector('.hero__logo');
          var cs = getComputedStyle(el, '::before');
          return { width: cs.width, height: cs.height, left: cs.left, top: cs.top, position: cs.position };
        })(),
        halo: label('.hero__logohalo')
      };

      var pre = document.createElement('pre');
      pre.id = 'probe';
      pre.textContent = JSON.stringify(out, null, 2);
      document.body.appendChild(pre);
    }, 250);
  });
})();
