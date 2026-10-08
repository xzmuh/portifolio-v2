/* Fundo do "Fascinado pelo universo gamer": parado é só o cinza; embaixo do mouse acendem pixels
   laranja do tamanho dos da emenda logo abaixo, que somem aos poucos quando ele sai. Canvas 2D a
   ~12 quadros por segundo (dá o ar de tela de jogo e pesa pouco); só roda enquanto há rastro. */
(function () {
  var canvas = document.querySelector('[data-about-pixels]');
  if (!canvas || !canvas.getContext) return;
  var secao = canvas.closest('.section.about');
  var texto = secao && secao.querySelector('.about-text');
  if (!texto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var ctx = canvas.getContext('2d');

  var LARANJA = '#ff6a2b';
  var W = 0, H = 0, dpr = 1, tam = 40, cols = 0, rows = 0, sorte = [];
  var acesas = {}, rodando = false, ultimo = 0;
  var mouse = { x: -9999, y: -9999 };

  function medir() {
    // do começo do texto grande até o fim da seção
    var topo = texto.offsetTop - 40;
    var el = texto.offsetParent;
    while (el && el !== secao) { topo += el.offsetTop; el = el.offsetParent; }
    W = secao.clientWidth;
    H = Math.max(0, secao.clientHeight - topo);
    canvas.style.top = topo + 'px';
    canvas.style.height = H + 'px';
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // mesma grade da emenda (js/pixel-seam.js), alinhada pela base para continuar nela
    var base = Math.max(28, Math.min(72, Math.round(W / 26)));
    cols = Math.ceil(W / base);
    tam = W / cols;
    rows = Math.ceil(H / tam);
    var s = 11;
    sorte = [];
    for (var k = 0; k < cols * rows; k++) {
      s = (s * 16807) % 2147483647;
      sorte.push((s - 1) / 2147483646);
    }
    acesas = {};
  }

  function quadro(agora) {
    if (agora - ultimo < 80) { requestAnimationFrame(quadro); return; }
    ultimo = agora;
    var y0 = H - rows * tam;   // a última linha encosta na base
    var raio = tam * 2.6;

    // acende as células perto do mouse (falhadas, não um círculo cheio)
    var ci = Math.floor(mouse.x / tam), cj = Math.floor((mouse.y - y0) / tam);
    for (var j = cj - 3; j <= cj + 3; j++) {
      for (var i = ci - 3; i <= ci + 3; i++) {
        if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
        var d = Math.hypot(i * tam + tam / 2 - mouse.x, y0 + j * tam + tam / 2 - mouse.y);
        if (d < raio && sorte[j * cols + i] < 1 - d / raio) acesas[j * cols + i] = 1;
      }
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = LARANJA;
    var resta = false;
    for (var k in acesas) {
      var a = acesas[k] - 0.18;
      if (a <= 0) { delete acesas[k]; continue; }
      acesas[k] = a;
      resta = true;
      // apaga em degraus, como pixel de tela velha
      ctx.globalAlpha = Math.ceil(a * 3) / 3;
      ctx.fillRect((k % cols) * tam, y0 + Math.floor(k / cols) * tam, tam + 0.5, tam + 0.5);
    }
    ctx.globalAlpha = 1;

    if (resta || mouse.x > -9999) requestAnimationFrame(quadro);
    else rodando = false;
  }

  secao.addEventListener('pointermove', function (e) {
    var b = canvas.getBoundingClientRect();
    mouse.x = e.clientX - b.left;
    mouse.y = e.clientY - b.top;
    if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
  });
  secao.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

  var espera;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(medir, 150);
  });
  window.addEventListener('load', medir);
  medir();
})();
