// Dev-only: which <use> instances overflow, and by how much?
(function () {
  window.addEventListener('load', function () {
    setTimeout(function () {
      var vw = document.documentElement.clientWidth;
      var rows = [];

      document.querySelectorAll('.rk').forEach(function (svg, i) {
        var su = svg.getBoundingClientRect();
        var u = svg.querySelector('use');
        var ur = u ? u.getBoundingClientRect() : null;
        rows.push({
          i: i,
          cls: svg.getAttribute('class'),
          state: svg.getAttribute('data-logo-state'),
          svgBox: [Math.round(su.width), Math.round(su.height), Math.round(su.left), Math.round(su.top)],
          useBox: ur ? [Math.round(ur.width), Math.round(ur.height), Math.round(ur.left), Math.round(ur.top)] : null,
          useOverflowsViewport: ur ? Math.round(ur.right - vw) : null,
          useWiderThanSvg: ur ? Math.round(ur.width - su.width) : null
        });
      });

      // the decorative layers that spill
      var glow = document.querySelector('.hero__glow');
      var gr = glow.getBoundingClientRect();
      var halo = document.querySelector('.hero__logo::before');

      var out = {
        vw: vw,
        bodyScrollWidth: document.body.scrollWidth,
        htmlScrollWidth: document.documentElement.scrollWidth,
        logos: rows,
        glow: [Math.round(gr.left), Math.round(gr.right), Math.round(gr.width)],
        htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
        bodyOverflowX: getComputedStyle(document.body).overflowX
      };

      var pre = document.createElement('pre');
      pre.id = 'probe';
      pre.textContent = JSON.stringify(out, null, 2);
      document.body.appendChild(pre);
    }, 200);
  });
})();
