/*
 * Trajetória: o "+" abre os detalhes do card; a coluna da direita anda mais
 * rápido que a esquerda (parallax).
 */
(function () {
  var section = document.querySelector('.section.xp');
  if (!section) return;
  var cards = Array.prototype.slice.call(section.querySelectorAll('.xp-card'));

  // Número de cada card (ordem da trajetória, não da coluna)
  cards.forEach(function (card) {
    var n = document.createElement('span');
    n.className = 'xp-card-num';
    n.setAttribute('aria-hidden', 'true');
    n.textContent = ('0' + (Number(card.getAttribute('data-xp')) + 1)).slice(-2);
    card.appendChild(n);
  });

  // No celular os cards ficam pequenos (dois por linha): os detalhes abrem numa folha que
  // sobe de baixo, em vez de cobrir o card
  var celular = window.matchMedia('(max-width: 767px)');
  var folha = document.createElement('div');
  folha.className = 'xp-folha';
  folha.setAttribute('role', 'dialog');
  folha.setAttribute('aria-modal', 'true');
  folha.innerHTML = '<div class="xp-folha_painel"><button class="xp-folha_fecha" type="button" aria-label="Fechar">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>' +
    '<div class="xp-folha_corpo"></div></div>';
  document.body.appendChild(folha);
  var corpoFolha = folha.querySelector('.xp-folha_corpo');
  var fechaFolha = function () { folha.classList.remove('aberta'); };
  folha.addEventListener('click', function (e) {
    if (e.target === folha || e.target.closest('.xp-folha_fecha')) fechaFolha();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechaFolha(); });
  var abreFolha = function (card) {
    corpoFolha.innerHTML = '<h3 class="xp-folha_nome">' + card.querySelector('.xp-card-name').innerHTML + '</h3>' +
      '<div class="xp-card-detail xp-card-detail--folha">' + card.querySelector('.xp-card-detail').innerHTML + '</div>';
    folha.scrollTop = 0;
    folha.classList.add('aberta');
  };

  // Detalhes
  cards.forEach(function (card) {
    var btn = card.querySelector('.xp-card-toggle');
    btn.addEventListener('click', function () {
      if (celular.matches) { abreFolha(card); return; }
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
