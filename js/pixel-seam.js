/*
 * Emenda em pixels: monta uma grade de quadrados brancos e apaga cada um num
 * ponto do scroll. Linhas de baixo apagam antes; dentro da linha a ordem é
 * embaralhada (semente fixa, então é sempre o mesmo desenho).
 */
(function () {
  var seams = document.querySelectorAll('.pixel-seam');
  if (!seams.length) return;
  var ROWS = 5;

  function seeded(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  seams.forEach(function (seam) {
    var cells = [];

    function build() {
      var w = seam.clientWidth || window.innerWidth;
      var size = Math.max(28, Math.min(72, Math.round(w / 26)));
      var cols = Math.ceil(w / size);
      seam.style.setProperty('--pixel-cols', cols);
      seam.style.setProperty('--pixel-size', (w / cols) + 'px');
      seam.innerHTML = '';
      cells = [];
      var rand = seeded(7);
      var frag = document.createDocumentFragment();
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < cols; c++) {
          var cell = document.createElement('i');
          frag.appendChild(cell);
          // 0 = linha de cima (apaga por último), ROWS-1 = de baixo (primeiro)
          var rowBase = (ROWS - 1 - r) / ROWS;
          cells.push({ el: cell, at: rowBase + rand() * (1 / ROWS) * 1.6 - 0.1 });
        }
      }
      seam.appendChild(frag);
    }

    function update(p) {
      for (var i = 0; i < cells.length; i++) {
        cells[i].el.classList.toggle('is-off', p > cells[i].at);
      }
    }

    build();

    if (!window.gsap || !window.ScrollTrigger || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update(0.5);
      return;
    }

    ScrollTrigger.create({
      trigger: seam,
      start: 'top 85%',
      end: 'bottom 35%',
      onUpdate: function (self) { update(self.progress); },
      onRefresh: function (self) { update(self.progress); }
    });

    var lastW = window.innerWidth, t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        build();
        ScrollTrigger.refresh();
      }, 200);
    });
  });
})();
