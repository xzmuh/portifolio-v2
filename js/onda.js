/* Onda de partículas do topo: uma malha de pontos em perspectiva que ondula devagar e
   cede um pouco embaixo do mouse. Canvas 2D, para quando sai da tela. */
(function () {
  var canvas = document.querySelector('[data-onda]');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var calma = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, dpr = 1, cols = 0, rows = 0;
  var visivel = true, rodando = false, t = 0, ultimo = 0;
  var mouse = { x: -9999, y: -9999, forca: 0, alvo: 0 };

  function medir() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // menos pontos em tela pequena
    cols = W < 700 ? 90 : 170;
    rows = W < 700 ? 34 : 52;
    if (calma) desenhar();
  }

  // altura da superfície em (u, v), u e v de 0 a 1
  function altura(u, v, tt) {
    return Math.sin(u * 7.0 + tt * 0.55 + v * 2.2) * 0.55 +
      Math.sin(u * 3.1 - tt * 0.35 + v * 4.0) * 0.75 +
      Math.cos(u * 12.0 + v * 6.0 - tt * 0.8) * 0.18;
  }

  function desenhar() {
    ctx.clearRect(0, 0, W, H);
    var horizonte = H * 0.05;
    var amp = H * 0.2;
    for (var j = 0; j < rows; j++) {
      var v = j / (rows - 1);              // 0 = fundo, 1 = frente
      var prof = 0.35 + v * 0.65;          // perspectiva: o fundo encolhe
      var yBase = horizonte + Math.pow(v, 1.35) * (H * 0.82);
      var tam = 0.6 + v * 1.5;
      var alfa = 0.12 + v * 0.55;
      ctx.fillStyle = 'rgba(18,18,18,' + alfa.toFixed(3) + ')';
      for (var i = 0; i < cols; i++) {
        var u = i / (cols - 1);
        var x = W / 2 + (u - 0.5) * W * (0.9 + prof * 0.9);
        if (x < -10 || x > W + 10) continue;
        var h = altura(u, v, t);
        var y = yBase - h * amp * prof;
        if (mouse.forca > 0.01) {
          var dx = x - mouse.x, dy = y - mouse.y;
          var d2 = dx * dx + dy * dy;
          y += Math.exp(-d2 / 9000) * 28 * mouse.forca;
        }
        ctx.fillRect(x, y, tam, tam);
      }
    }
  }

  function quadro(agora) {
    if (!visivel) { rodando = false; return; }
    var dt = Math.min((agora - (ultimo || agora)) / 1000, 0.05);
    ultimo = agora;
    t += dt;
    mouse.forca += (mouse.alvo - mouse.forca) * 0.06;
    desenhar();
    requestAnimationFrame(quadro);
  }

  function ligar() {
    if (rodando || calma) return;
    rodando = true; ultimo = 0;
    requestAnimationFrame(quadro);
  }

  var hero = canvas.parentNode;
  hero.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.alvo = 1;
  });
  hero.addEventListener('pointerleave', function () { mouse.alvo = 0; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      visivel = entradas[0].isIntersecting;
      if (visivel) ligar();
    }).observe(canvas);
  }

  var espera;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(medir, 150);
  });

  medir();
  if (calma) desenhar(); else ligar();
})();
