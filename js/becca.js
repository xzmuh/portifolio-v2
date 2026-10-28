/* IA (Becca): na seção #ia, as etapas de "Como ela funciona" acendem uma a uma, apagam e
   recomeçam. Roda só enquanto a seção está na tela. */
(function () {
  var sec = document.querySelector('[data-becca]');
  if (!sec || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var etapas = sec.querySelectorAll('[data-etapa]');
  var PASSO = 700;
  var rodando = false, timer = null;

  function ciclo() {
    Array.prototype.forEach.call(etapas, function (li) { li.classList.remove('acesa'); });
    var k = 0;
    (function acende() {
      if (k < etapas.length) { etapas[k++].classList.add('acesa'); timer = setTimeout(acende, PASSO); return; }
      timer = setTimeout(ciclo, 4200);
    })();
  }

  new IntersectionObserver(function (e) {
    if (e[0].isIntersecting && !rodando) { rodando = true; ciclo(); }
    else if (!e[0].isIntersecting && rodando) { rodando = false; clearTimeout(timer); }
  }, { threshold: .25 }).observe(sec);
})();
