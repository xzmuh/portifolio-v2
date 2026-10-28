/* Menu lateral do celular: os três painéis (laranja, cinza e preto) entram em cascata pela direita,
   os links sobem escalonados e o + vira x. Fecha no fundo, no Esc ou ao escolher um link (a rolagem
   até a seção continua com o Lenis da página). Mesma mecânica do Panel Menu do AnimationsLabs. */
(function () {
  var nav = document.querySelector('[data-menu]');
  var botao = document.querySelector('.menu_botao');
  if (!nav || !botao || !window.gsap) return;

  if (window.CustomEase) { gsap.registerPlugin(CustomEase); CustomEase.create('menuEase', '0.65,0.01,0.05,0.99'); }
  var EASE = window.CustomEase ? 'menuEase' : 'expo.inOut';

  var painel = nav.querySelector('.menu_painel');
  var fundo = nav.querySelector('.menu_fundo');
  var camadas = nav.querySelectorAll('.menu_camadas i');
  var links = nav.querySelectorAll('.menu_links li');
  var rodape = nav.querySelector('[data-menu-fade]');
  var mais = botao.querySelector('b');
  var tl = gsap.timeline();
  var aberto = false;

  function rolagem(liga) {
    // o Lenis é um const do script da página (não fica em window)
    var l = typeof lenis !== 'undefined' ? lenis : null;
    if (l && l.start) liga ? l.start() : l.stop();
    document.documentElement.style.overflow = liga ? '' : 'hidden';
  }

  function abre() {
    aberto = true;
    nav.hidden = false;
    document.body.classList.add('menu-aberto');
    botao.setAttribute('aria-expanded', 'true');
    rolagem(false);
    tl.clear()
      .set(painel, { xPercent: 0 })
      .fromTo(fundo, { autoAlpha: 0 }, { autoAlpha: 1, duration: .7, ease: EASE })
      .fromTo(camadas, { xPercent: 101 }, { xPercent: 0, stagger: .12, duration: .58, ease: EASE }, '<')
      .fromTo(links, { yPercent: 140, rotate: 8 }, { yPercent: 0, rotate: 0, stagger: .055, duration: .7, ease: EASE }, '<+=.3')
      .fromTo(rodape, { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, duration: .7, ease: EASE }, '<+=.15')
      .to(mais, { rotate: 315, duration: .7, ease: EASE }, 0);
  }

  function fecha() {
    aberto = false;
    document.body.classList.remove('menu-aberto');
    botao.setAttribute('aria-expanded', 'false');
    rolagem(true);
    tl.clear()
      .to(fundo, { autoAlpha: 0, duration: .35, ease: EASE })
      .to(painel, { xPercent: 110, duration: .7, ease: EASE }, '<')
      .to(mais, { rotate: 0, duration: .7, ease: EASE }, '<')
      .add(function () { nav.hidden = true; });
  }

  document.querySelectorAll('[data-menu-toggle]').forEach(function (b) {
    b.addEventListener('click', function () { aberto ? fecha() : abre(); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aberto) fecha(); });

  // escolher um link fecha o menu; a rolagem volta antes do Lenis levar até a seção
  nav.querySelectorAll('.menu_links a').forEach(function (a) {
    a.addEventListener('click', function () { if (aberto) fecha(); }, true);
  });
})();
