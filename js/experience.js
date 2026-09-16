/*
 * Trajetória: o "+" abre os detalhes do card; a coluna da direita anda mais
 * rápido que a esquerda (parallax).
 */
(function () {
  var section = document.querySelector('.section.xp');
  if (!section) return;
  var cards = Array.prototype.slice.call(section.querySelectorAll('.xp-card'));

  // Detalhes
  cards.forEach(function (card) {
    var btn = card.querySelector('.xp-card-toggle');
    btn.addEventListener('click', function () {
      var open = !card.classList.contains('is-open');
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // Luz do fundo segue o mouse
  var bg = section.querySelector('.xp-bg');
  if (bg && window.matchMedia('(hover: hover)').matches) {
    section.addEventListener('pointermove', function (e) {
      var r = section.getBoundingClientRect();
      bg.style.setProperty('--spot-x', (e.clientX - r.left) + 'px');
      bg.style.setProperty('--spot-y', (e.clientY - r.top) + 'px');
      section.classList.add('is-hover');
    });
    section.addEventListener('pointerleave', function () { section.classList.remove('is-hover'); });
  }

  // Parallax da coluna B (só com duas colunas)
  if (window.gsap && window.ScrollTrigger && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ScrollTrigger.matchMedia({
      '(min-width: 768px)': function () {
        gsap.fromTo(section.querySelector('.xp-col--b'),
          { y: function () { return window.innerHeight * 0.12; } },
          {
            y: function () { return -window.innerHeight * 0.22; },
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
          });
        // anos do fundo andam em sentidos opostos
        gsap.fromTo(section.querySelector('.xp-bg-year--a'), { y: -80, x: -40 }, {
          y: 160, x: 60, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.fromTo(section.querySelector('.xp-bg-year--b'), { y: 120, x: 50 }, {
          y: -140, x: -60, ease: 'none',
          scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    });
  }
})();
