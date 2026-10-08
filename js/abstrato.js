/* Fundo abstrato da hero, por trás da onda de pontos: curvas de nível finas que se deformam devagar
   e duas manchas em meia-tinta (pontos de tamanhos diferentes numa grade, recortadas em degraus)
   que mudam de forma com o tempo e incham embaixo do mouse. Canvas 2D a ~24 quadros por segundo;
   para quando sai da tela. */
(function () {
  var canvas = document.querySelector('[data-abstrato]');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var calma = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, dpr = 1, PASSO = 14;
  var visivel = true, rodando = false, t = 0, ultimo = 0, antes = 0;
  var mouse = { x: -9999, y: -9999, forca: 0, alvo: 0 };

  function medir() {
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    PASSO = W < 700 ? 11 : 14;
    if (calma) desenhar();
  }

  // relevo das curvas de nível (soma de senos: barato e sem emenda)
  function relevo(x, y, tt) {
    var u = x / 420, v = y / 420;
    return Math.sin(u * 1.7 + tt * 0.11) * Math.cos(v * 1.3 - tt * 0.07) +
      Math.sin((u + v) * 1.1 - tt * 0.05) * 0.8 +
      Math.cos(u * 3.1 - v * 2.3 + tt * 0.09) * 0.35;
  }

  // forma das manchas: duas bolhas que andam devagar, com a borda roída por um ruído em blocos
  function mancha(x, y, tt) {
    var bolhas = [
      { x: W * (0.9 + Math.sin(tt * 0.13) * 0.03), y: H * (0.24 + Math.cos(tt * 0.11) * 0.05), r: Math.min(W, H) * 0.2 },
      { x: W * (0.07 + Math.cos(tt * 0.09) * 0.03), y: H * (0.8 + Math.sin(tt * 0.12) * 0.04), r: Math.min(W, H) * 0.16 }
    ];
    var m = 0;
    for (var b = 0; b < bolhas.length; b++) {
      var dx = (x - bolhas[b].x) / bolhas[b].r, dy = (y - bolhas[b].y) / bolhas[b].r;
      m = Math.max(m, 1 - Math.sqrt(dx * dx + dy * dy));
    }
    // ruído quantizado em blocos de 4 células: dá a silhueta em degraus
    var bx = Math.floor(x / (PASSO * 4)), by = Math.floor(y / (PASSO * 4));
    var ruido = Math.sin(bx * 12.9898 + by * 78.233 + Math.floor(tt * 0.6 + (bx + by) * 0.3) * 4.1);
    ruido = ruido - Math.floor(ruido);
    m += (ruido - 0.5) * 0.45;
    // a faixa do meio (onde fica o nome) fica limpa
    var meio = Math.abs(x / W - 0.5) * 2;
    m *= Math.min(1, Math.max(0, (meio - 0.45) / 0.25));
    // o mouse incha a meia-tinta em volta dele
    if (mouse.forca > 0.01) {
      var mx = x - mouse.x, my = y - mouse.y;
      m += Math.exp(-(mx * mx + my * my) / 9000) * 0.45 * mouse.forca;
    }
    return m;
  }

  function curvas(tt) {
    var p = 22, cols = Math.ceil(W / p) + 1, rows = Math.ceil(H / p) + 1;
    var val = new Float32Array(cols * rows);
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) val[j * cols + i] = relevo(i * p, j * p, tt);
    ctx.strokeStyle = 'rgba(18,18,18,.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var nivel = -1.8; nivel <= 1.8; nivel += 0.6) {
      for (j = 0; j < rows - 1; j++) {
        for (i = 0; i < cols - 1; i++) {
          var a = val[j * cols + i] - nivel, b = val[j * cols + i + 1] - nivel;
          var c = val[(j + 1) * cols + i + 1] - nivel, d = val[(j + 1) * cols + i] - nivel;
          var caso = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
          if (caso === 0 || caso === 15) continue;
          var x = i * p, y = j * p;
          // pontos nas quatro arestas, por interpolação
          var cima = [x + p * a / (a - b), y], dir = [x + p, y + p * b / (b - c)];
          var baixo = [x + p * d / (d - c), y + p], esq = [x, y + p * a / (a - d)];
          var seg = SEGMENTOS[caso];
          for (var s = 0; s < seg.length; s += 2) {
            var e1 = [cima, dir, baixo, esq][seg[s]], e2 = [cima, dir, baixo, esq][seg[s + 1]];
            ctx.moveTo(e1[0], e1[1]);
            ctx.lineTo(e2[0], e2[1]);
          }
        }
      }
    }
    ctx.stroke();
  }

  // marching squares: arestas 0 cima, 1 direita, 2 baixo, 3 esquerda
  var SEGMENTOS = {
    1: [3, 2], 2: [2, 1], 3: [3, 1], 4: [0, 1], 5: [3, 0, 2, 1], 6: [0, 2], 7: [3, 0],
    8: [3, 0], 9: [0, 2], 10: [0, 1, 3, 2], 11: [0, 1], 12: [3, 1], 13: [2, 1], 14: [3, 2]
  };

  function meiaTinta(tt) {
    ctx.fillStyle = 'rgba(18,18,18,.32)';
    var raioMax = PASSO * 0.46;
    for (var y = PASSO / 2; y < H; y += PASSO) {
      for (var x = PASSO / 2; x < W; x += PASSO) {
        var m = mancha(x, y, tt);
        if (m <= 0.08) continue;
        // quatro tamanhos só, como meia-tinta impressa
        var nivel = Math.min(4, Math.ceil(m * 5));
        var r = raioMax * nivel / 4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  function desenhar() {
    ctx.clearRect(0, 0, W, H);
    curvas(t);
    meiaTinta(t);
  }

  function quadro(agora) {
    if (!visivel) { rodando = false; return; }
    var dt = Math.min((agora - (ultimo || agora)) / 1000, 0.05);
    ultimo = agora;
    t += dt;
    mouse.forca += (mouse.alvo - mouse.forca) * 0.08;
    if (agora - antes > 40) { antes = agora; desenhar(); }
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
