/* Páginas "Ler sobre": entrada (painel laranja que se esmaga, título pelos lados, foto revelada),
   blocos que surgem e marca-texto ao rolar, números contando e a linha do tempo que enche. */
(function () {
  var body = document.body;
  var calma = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.add('js');

  // título e foto entram quando o painel laranja já está se fechando
  setTimeout(function () { body.classList.add('entrou'); }, calma ? 0 : 900);
  setTimeout(function () {
    var a = document.querySelector('.abertura');
    if (a) a.parentNode.removeChild(a);
  }, calma ? 0 : 1700);

  // irmãos que surgem juntos entram em escada
  Array.prototype.forEach.call(document.querySelectorAll('.surge'), function (el) {
    var irmaos = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('surge'); });
    el.style.setProperty('--i', irmaos.indexOf(el));
  });

  var alvos = document.querySelectorAll('.surge, .hl, [data-conta], .tempo_lista li');
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(alvos, function (el) { el.classList.add('on'); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('on');
        if (e.target.hasAttribute('data-conta')) conta(e.target);
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    Array.prototype.forEach.call(alvos, function (el) {
      // os marca-textos da capa só pintam depois da entrada
      if (el.closest('.capa')) setTimeout(function () { obs.observe(el); }, calma ? 0 : 1600);
      else obs.observe(el);
    });
  }

  // números sobem de zero até o valor
  function conta(el) {
    var alvo = +el.getAttribute('data-conta'), ini = null;
    if (calma) { el.textContent = alvo; return; }
    (function passo(t) {
      if (!ini) ini = t;
      var f = Math.min((t - ini) / 1400, 1);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - f, 3)));
      if (f < 1) requestAnimationFrame(passo);
    })(performance.now());
  }

  // linha laranja da linha do tempo enche conforme a rolagem
  var lista = document.querySelector('.tempo_lista');
  if (lista) {
    var enche = function () {
      var r = lista.getBoundingClientRect(), meio = innerHeight * .6;
      var f = Math.max(0, Math.min(1, (meio - r.top) / r.height));
      lista.style.setProperty('--enche', f.toFixed(3));
    };
    addEventListener('scroll', enche, { passive: true });
    addEventListener('resize', enche);
    enche();
  }
})();
