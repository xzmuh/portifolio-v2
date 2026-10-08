/* Barra de rolagem própria: um trilho fino no meio da lateral direita, com o pedaço laranja
   mostrando onde a página está. Dá para arrastar o pedaço, clicar no trilho ou nas setinhas de
   cima e de baixo (sobem/descem quase uma tela). A barra do navegador some no css/tema.css. */
(function () {
  var barra = document.createElement('div');
  barra.className = 'rolagem';
  barra.setAttribute('aria-hidden', 'true');
  var seta = function (lado, d) {
    return '<span class="rolagem_seta rolagem_seta--' + lado + '"><svg viewBox="0 0 12 8"><path d="' + d + '" /></svg></span>';
  };
  barra.innerHTML = '<div class="rolagem_pega"></div>' + seta('cima', 'M1 7 6 2l5 5') + seta('baixo', 'M1 1l5 5 5-5');
  document.body.appendChild(barra);
  var pega = barra.firstChild;

  var arrastando = false, inicioY = 0, inicioScroll = 0, pedido = false;

  // medidas guardadas: ler o layout a cada rolagem brigava com o pin do ScrollTrigger e engasgava
  var alturaPagina = 1, alturaTela = 1, alturaBarra = 1, alturaPega = 28;
  function mede() {
    alturaPagina = document.documentElement.scrollHeight;
    alturaTela = window.innerHeight;
    alturaBarra = barra.clientHeight;
    alturaPega = Math.max(28, alturaBarra * Math.min(1, alturaTela / alturaPagina));
    pega.style.height = alturaPega + 'px';
    agenda();
  }
  function maximo() { return Math.max(1, alturaPagina - alturaTela); }
  function trilho() { return alturaBarra - alturaPega; }

  function vaiPara(y) {
    y = Math.max(0, Math.min(maximo(), y));
    if (typeof lenis !== 'undefined' && lenis.scrollTo) lenis.scrollTo(y, { immediate: arrastando });
    else window.scrollTo(0, y);
  }

  function pinta() {
    pedido = false;
    pega.style.transform = 'translateY(' + (window.scrollY / maximo()) * trilho() + 'px)';
  }
  function agenda() { if (!pedido) { pedido = true; requestAnimationFrame(pinta); } }

  pega.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    arrastando = true;
    inicioY = e.clientY;
    inicioScroll = window.scrollY;
    pega.setPointerCapture(e.pointerId);
    barra.classList.add('ativa');
  });
  pega.addEventListener('pointermove', function (e) {
    if (!arrastando) return;
    vaiPara(inicioScroll + (e.clientY - inicioY) / Math.max(1, trilho()) * maximo());
  });
  var solta = function () { arrastando = false; barra.classList.remove('ativa'); };
  pega.addEventListener('pointerup', solta);
  pega.addEventListener('pointercancel', solta);

  // clique no trilho: centraliza o pedaço onde clicou
  barra.addEventListener('pointerdown', function (e) {
    if (e.target !== barra) return;
    var r = barra.getBoundingClientRect();
    vaiPara((e.clientY - r.top - pega.offsetHeight / 2) / Math.max(1, trilho()) * maximo());
  });

  // setinhas: quase uma tela por clique
  Array.prototype.forEach.call(barra.querySelectorAll('.rolagem_seta'), function (el) {
    var sobe = el.classList.contains('rolagem_seta--cima');
    el.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    el.addEventListener('click', function () {
      vaiPara(window.scrollY + (sobe ? -1 : 1) * window.innerHeight * 0.8);
    });
  });

  window.addEventListener('scroll', agenda, { passive: true });
  window.addEventListener('resize', mede);
  window.addEventListener('load', mede);
  if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', mede);
  var esperaMede;
  if ('ResizeObserver' in window) new ResizeObserver(function () {
    clearTimeout(esperaMede);
    esperaMede = setTimeout(mede, 200);
  }).observe(document.body);
  mede();
})();
