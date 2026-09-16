/*
 * Traço do "Um pouco sobre mim": desenhado de cima para baixo com a rolagem.
 * Como o SVG estica (preserveAspectRatio="none") e o traço usa
 * vector-effect: non-scaling-stroke, o tracejado é medido em pixels de tela:
 * amostramos o path, somamos o comprimento já transformado e animamos o
 * stroke-dashoffset de L até 0.
 */
(function () {
  var svg = document.querySelector('.about-thread');
  if (!svg) return;
  var paths = Array.prototype.slice.call(svg.querySelectorAll('path'));
  var screenLen = 0, progress = 0;

  function measure() {
    var path = paths[0];
    var total = path.getTotalLength();
    var sx = svg.clientWidth / svg.viewBox.baseVal.width;
    var sy = svg.clientHeight / svg.viewBox.baseVal.height;
    var len = 0, prev = null, STEPS = 400;
    for (var i = 0; i <= STEPS; i++) {
      var pt = path.getPointAtLength((total * i) / STEPS);
      var x = pt.x * sx, y = pt.y * sy;
      if (prev) len += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
    }
    screenLen = Math.ceil(len) + 2;
    paths.forEach(function (p) { p.style.strokeDasharray = screenLen + ' ' + screenLen; });
    draw(progress);
  }

  function draw(p) {
    progress = p;
    var off = screenLen * (1 - p);
    paths.forEach(function (el) { el.style.strokeDashoffset = off; });
  }

  measure();

  if (!window.gsap || !window.ScrollTrigger || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(1);
    return;
  }

  var state = { p: 0 };
  gsap.to(state, {
    p: 1,
    ease: 'none',
    onUpdate: function () { draw(state.p); },
    scrollTrigger: {
      trigger: svg, start: 'top 60%', end: 'bottom 60%', scrub: 0.8,
      invalidateOnRefresh: true, onRefresh: measure
    }
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
