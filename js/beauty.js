/* Beauty Exp. (projeto em destaque): o pitch toca mudo só com a seção na tela; o capítulo do
   tempo atual acende e a régua dele enche; clicar num capítulo pula o vídeo para ele. */
(function () {
  var sec = document.querySelector('[data-beauty]');
  if (!sec) return;

  var video = sec.querySelector('video');
  var botoes = sec.querySelectorAll('[data-cap]');
  var barra = sec.querySelector('.beauty_barra i');
  var inicios = Array.prototype.map.call(botoes, function (b) { return +b.getAttribute('data-cap'); });
  var calma = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var atual = -1, raf = null, naTela = false;

  function capDe(t) {
    var k = 0;
    while (k + 1 < inicios.length && t >= inicios[k + 1]) k++;
    return k;
  }

  function quadro() {
    var t = video.currentTime, dur = video.duration || 62;
    var k = capDe(t);
    if (k !== atual) {
      if (atual >= 0) botoes[atual].classList.remove('ativo');
      botoes[k].classList.add('ativo');
      atual = k;
    }
    var fim = k + 1 < inicios.length ? inicios[k + 1] : dur;
    botoes[k].style.setProperty('--p', Math.min((t - inicios[k]) / (fim - inicios[k]), 1));
    barra.style.transform = 'scaleX(' + t / dur + ')';
    raf = requestAnimationFrame(quadro);
  }

  function toca() {
    if (calma) return;
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    if (!raf) raf = requestAnimationFrame(quadro);
  }

  function para() {
    video.pause();
    cancelAnimationFrame(raf);
    raf = null;
  }

  Array.prototype.forEach.call(botoes, function (b, k) {
    b.addEventListener('click', function () {
      if (video.readyState === 0) video.load();
      video.currentTime = inicios[k] + .05;
      calma = false;
      toca();
    });
  });

  new IntersectionObserver(function (e) {
    naTela = e[0].isIntersecting;
    if (naTela) toca(); else para();
  }, { threshold: .35 }).observe(video);

  // aba escondida não precisa gastar decodificando vídeo
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) para(); else if (naTela) toca();
  });
})();
