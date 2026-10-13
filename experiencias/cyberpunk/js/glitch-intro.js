/*
 * Entrada do menu — glitch cyberpunk em dois tempos.
 *
 * Veio do portfólio (portifolio-v2, commit a770cf7). Aqui o "hero" é o menu
 * principal: o nome pousa no logo dele (.menu_nome / .menu_sub). A foto
 * ficou opcional; sem .hero-split_img as fases da foto só não desenham nada.
 *
 * Tudo acontece num canvas por cima da página, e o canvas termina exatamente
 * em cima do hero de verdade (o split 50/50 em .hero-split), então a entrega
 * é um cross-fade sem pulo: as posições finais não são chutadas, são medidas
 * do DOM com getBoundingClientRect antes de começar.
 *
 * A técnica é sempre a mesma, aplicada primeiro ao nome e depois à foto: o
 * material é desenhado nítido num canvas fora da tela e recopiado em fatias
 * horizontais, cada uma com deslocamento próprio em x (o datamosh). Cada fatia
 * é desenhada duas vezes, em duas cores separadas e com deslocamentos
 * diferentes — é a separação de canal, o fantasma vermelho atrás do ciano.
 * Na foto as duas cores são os canais R e GB dela mesma, então quando os
 * deslocamentos zeram a imagem original se reconstrói sozinha.
 *
 * Linha do tempo:
 *
 *   ignição   assinatura angular fragmentada, vermelho e laranja
 *   trava     metal ciano com fantasma vermelho, rupturas e pausas
 *   eco       cópias em offsets verticais e fragmentos horizontais
 *   virada    metal dourado com contorno ciano e subtítulo
 *   descarga  desintegração em faixas e rastros ciano
 *   foto      a foto entra glitchando atrás do nome
 *   abre      os dois se separam — nome pra esquerda, foto pra direita,
 *             metade e metade, e FULL STACK DEVELOPER entra sob o nome
 *   entrega   resíduo leve e cross-fade pro hero de verdade
 *
 * Sai no clique, em qualquer tecla, no scroll, e nem monta se o visitante
 * pediu menos movimento.
 */
(function () {
  'use strict';

  var raiz = document.getElementById('glitch-intro');
  var hero = document.querySelector('.menu');
  if (!raiz || !hero) return;

  var cv = raiz.querySelector('.glitch-intro_canvas');
  var ctx = cv.getContext('2d');
  if (!ctx) {
    document.documentElement.classList.remove('glitch-intro-ativo');
    return;
  }
  var elNome = hero.querySelector('.menu_nome');
  var elSub = hero.querySelector('.menu_sub');
  var elFoto = hero.querySelector('.hero-split_foto');   // opcional
  var imgFoto = hero.querySelector('.hero-split_img');

  /* -----------------------------------------------------------------
     Conteúdo e ajustes
     ----------------------------------------------------------------- */
  var TITULO = ['MURILO', 'GONZALES'];
  var SUB = 'FULL STACK DEVELOPER';

  var AZUL = '#fcee0a';      // amarelo do logo do jogo
  var INDIGO = '#00e5ff';    // fantasma ciano
  var INCLINACAO = -0.2;     // cisalhamento do nome; 0 tira a inclinação

  /* Mais curta que a do portfólio e sem a fase da foto (aqui não tem foto). */
  var FASES = [
    ['ignicao', 0.40],
    ['trava',   1.00],
    ['eco',     1.40],
    ['virada',  2.00],
    ['descarga',2.35],
    ['abre',    2.85],
    ['entrega', 3.15]
  ];
  /* O nome fica nos traços angulares até o fim, igual ao logo do menu. */
  var GLIFOS_SEMPRE = true;
  var FIM = FASES[FASES.length - 1][1];

  /* -----------------------------------------------------------------
     Estado
     ----------------------------------------------------------------- */
  var dpr = 1, L = 0, A = 0;
  var caixa = { y0: 0, y1: 0, alt: 0 };       // faixa vertical que o nome ocupa
  var src = document.createElement('canvas'); // nome nítido, branco
  var sctx = src.getContext('2d');
  var srcVersao = 0;
  var tintas = {};
  var padraoScan = null;
  var marcas = [];
  var t0 = 0, rodando = false, saindo = false;
  var assinatura = '';                        // o que a fonte tem desenhado agora
  var abertura = 0;
  var rng = Math.random;
  var ultimoFrame = -1;
  // Traços desenhados para esta assinatura: diagonais, vértices secos e
  // cortes abertos. Independentes de fontes externas durante a abertura.
  var glifos = {
    M: 'M8 90V10H18L44 52L70 10H80V90',
    U: 'M8 10V72L25 90H64L80 72V10',
    R: 'M8 90V10H65L80 24V41L65 53H8M47 53L83 90',
    I: 'M14 10H74M44 10V90M14 90H74',
    L: 'M8 10V90H80',
    O: 'M26 10H64L80 27V73L64 90H26L8 73V27Z',
    G: 'M80 25L64 10H26L8 27V73L26 90H80V53H48',
    N: 'M8 90V10H18L80 90V10',
    Z: 'M8 10H80V19L8 81V90H80',
    A: 'M4 90L34 10H54L84 90M19 61H69',
    E: 'M80 10H8V90H80M8 49H65',
    S: 'M80 10H26L8 27V43L80 58V73L64 90H8'
  };

  var foto = null, fotoR = null, fotoGB = null;   // canais da imagem
  var alvoNome = null, alvoSub = null, alvoFoto = null;   // medidos do DOM

  var menosMovimento = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------------
     Utilitários
     ----------------------------------------------------------------- */
  function aleatorio(a, b) { return a + rng() * (b - a); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function suave(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }

  function mistura(c1, c2, k) {
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    return 'rgb(' +
      Math.round(lerp(a >> 16, b >> 16, k)) + ',' +
      Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, k)) + ',' +
      Math.round(lerp(a & 255, b & 255, k)) + ')';
  }

  function semente(s) {
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  /* -----------------------------------------------------------------
     Medir o hero de verdade. É isso que faz a aterrissagem bater: o
     último frame do canvas é desenhado nas coordenadas exatas do DOM.
     ----------------------------------------------------------------- */
  function medirAlvos() {
    var rNome = elNome.getBoundingClientRect();
    var rSub = elSub.getBoundingClientRect();
    var rFoto = elFoto ? elFoto.getBoundingClientRect()
      : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var estNome = getComputedStyle(elNome);
    var estSub = getComputedStyle(elSub);

    alvoNome = {
      px: parseFloat(estNome.fontSize) * dpr,
      entre: parseFloat(estNome.lineHeight) * dpr,
      cx: (rNome.left + rNome.width / 2) * dpr,
      topo: rNome.top * dpr
    };
    alvoSub = {
      px: parseFloat(estSub.fontSize) * dpr,
      cx: (rSub.left + rSub.width / 2) * dpr,
      topo: rSub.top * dpr
    };
    alvoFoto = {
      x: rFoto.left * dpr, y: rFoto.top * dpr,
      w: rFoto.width * dpr, h: rFoto.height * dpr
    };
  }

  /* Onde o nome fica enquanto ainda está sozinho: centro da tela, grande. */
  function layoutCentro() {
    var maior = 0;
    for (var i = 0; i < TITULO.length; i++) maior = Math.max(maior, TITULO[i].length);
    var px = Math.min(L * 0.84 / (maior * 0.78), A * 0.25);
    var entre = px * 0.86;
    return {
      px: px, entre: entre, cx: L / 2,
      topo: A / 2 - entre * TITULO.length / 2
    };
  }

  /* -----------------------------------------------------------------
     A fonte do nome: branco, nítido, redesenhado só quando muda.
     ----------------------------------------------------------------- */
  /* Onde o navegador põe a baseline de uma linha de texto: o topo da caixa,
     mais o meio-entrelinha, mais a ascendente. Sem isso o canvas (que centra
     pelo meio do glifo) e o DOM (que centra pela caixa de linha) caem em
     alturas diferentes e o cross-fade mostra o nome em dobro. */
  function baseline(topo, entre, peso, px, i) {
    sctx.font = peso + ' ' + px + 'px Roboto, Arial, sans-serif';
    var m = sctx.measureText('MHxg');
    var asc = m.fontBoundingBoxAscent || px * 0.93;
    var desc = m.fontBoundingBoxDescent || px * 0.24;
    return topo + (entre - (asc + desc)) / 2 + asc + entre * i;
  }

  function desenharFonte(linhas, lay, sub) {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, L, A);

    var n = linhas.length, i;
    var meio = lay.topo + lay.entre * n / 2;

    sctx.fillStyle = '#fff';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'alphabetic';

    if ((GLIFOS_SEMPRE || abertura < 0.45)) {
      sctx.save();
      sctx.globalAlpha = 1;
      sctx.strokeStyle = '#fff';
      sctx.lineWidth = 13;
      sctx.lineJoin = 'bevel';
      var unit = lay.px / 135;
      TITULO.forEach(function (linha, row) {
        sctx.save();
        sctx.translate(lay.cx - linha.length * 100 * unit / 2,
          lay.topo + row * lay.entre + lay.px * 0.02);
        sctx.transform(unit, 0, -0.34 * unit, unit, 25 * unit, 0);
        for (var j = 0; j < linha.length; j++) {
          sctx.stroke(new Path2D(glifos[linha[j]]));
          sctx.translate(100, 0);
        }
        sctx.restore();
      });
      // Lâminas assimétricas prolongam o desenho além das letras.
      var cy = lay.topo + lay.entre * 1.75;
      sctx.beginPath();
      sctx.moveTo(lay.cx + lay.px * 2.65, cy);
      sctx.lineTo(lay.cx + lay.px * 3.3, cy + lay.px * 0.26);
      sctx.lineTo(lay.cx + lay.px * 2.82, cy - lay.px * 0.09);
      sctx.fill();
      sctx.restore();
    }

    sctx.save();
    sctx.globalAlpha = (GLIFOS_SEMPRE || abertura < 0.45) ? 0 : 1;
    /* Cisalhamento em torno do centro vertical — a inclinação do logo. */
    sctx.transform(1, 0, INCLINACAO, 1, -INCLINACAO * meio, 0);
    sctx.font = '900 ' + lay.px + 'px Roboto, Arial, sans-serif';
    if ('letterSpacing' in sctx) sctx.letterSpacing = (-lay.px * 0.02) + 'px';
    for (i = 0; i < n; i++) {
      sctx.fillText(linhas[i], lay.cx, baseline(lay.topo, lay.entre, '900', lay.px, i));
    }
    sctx.restore();

    caixa.y0 = Math.max(0, lay.topo - lay.px * 0.3);
    caixa.y1 = Math.min(A, lay.topo + lay.entre * n + lay.px * 0.3);

    /* O subtítulo ocupa o lugar que no vídeo é o "2077". */
    if (sub && sub.alpha > 0) {
      sctx.save();
      sctx.globalAlpha = sub.alpha;
      sctx.font = '500 ' + sub.px + 'px Roboto, Arial, sans-serif';
      if ('letterSpacing' in sctx) sctx.letterSpacing = (sub.px * 0.42) + 'px';
      /* Sem compensar o tracking: textAlign 'center' no canvas centra a
         largura de avanço já com o espaço final, igual ao line box do DOM. */
      sctx.fillText(SUB, sub.cx, baseline(sub.topo, sub.px, '500', sub.px, 0));
      sctx.restore();
      caixa.y1 = Math.min(A, Math.max(caixa.y1, sub.topo + sub.px * 1.6));
    }

    caixa.alt = caixa.y1 - caixa.y0;
    srcVersao++;
  }

  /* A fonte pintada numa cor: source-in mantém só o recorte das letras. */
  function tinta(cor, slot) {
    var t = tintas[slot];
    if (!t) t = tintas[slot] = { v: -1, cv: document.createElement('canvas') };
    if (t.v !== srcVersao || t.cor !== cor || t.abre !== abertura || t.cv.width !== L || t.cv.height !== A) {
      t.cv.width = L; t.cv.height = A;
      var c = t.cv.getContext('2d');
      c.drawImage(src, 0, 0);
      c.globalCompositeOperation = 'source-in';
      var metal = c.createLinearGradient(0, caixa.y0, L * 0.14, caixa.y1);
      metal.addColorStop(0, '#e7fffa');
      metal.addColorStop(0.16, cor);
      metal.addColorStop(0.39, '#14252c');
      metal.addColorStop(0.40, cor);
      metal.addColorStop(0.53, '#f4ffdc');
      metal.addColorStop(0.54, cor);
      metal.addColorStop(0.84, '#14252c');
      metal.addColorStop(1, cor);
      c.fillStyle = slot === 'corpo' && (GLIFOS_SEMPRE || abertura < 0.45) ? metal : cor;
      c.fillRect(0, 0, L, A);
      c.globalCompositeOperation = 'source-atop';
      c.globalAlpha = (GLIFOS_SEMPRE || abertura < 0.45) ? 0.22 : 0;
      c.fillStyle = '#061014';
      for (var y = caixa.y0; y < caixa.y1; y += 4 * dpr) c.fillRect(0, y, L, dpr * 0.65);
      c.globalAlpha = 1;
      if (slot === 'corpo' && (GLIFOS_SEMPRE || abertura < 0.45)) {
        c.globalCompositeOperation = 'destination-over';
        c.shadowColor = '#57fff0';
        c.shadowBlur = 6 * dpr * (1 - abertura);
        c.drawImage(src, -1.3 * dpr, -1.3 * dpr);
        c.shadowBlur = 0;
        c.globalAlpha = 0.28 * (1 - abertura);
        for (var z = 2; z <= 8; z += 2) c.drawImage(src, -z * dpr, z * dpr);
        c.globalAlpha = 1;
      }
      c.globalCompositeOperation = 'source-over';
      t.v = srcVersao;
      t.cor = cor;
      t.abre = abertura;
    }
    return t.cv;
  }

  /* -----------------------------------------------------------------
     Canais da foto. multiply com vermelho puro guarda só o canal R;
     com ciano puro, só G e B. Somados de volta com 'lighter' e sem
     deslocamento, reconstroem a foto original pixel a pixel.
     ----------------------------------------------------------------- */
  function separarCanais(img) {
    var w = Math.min(img.naturalWidth, 1400);
    var h = Math.round(img.naturalHeight * (w / img.naturalWidth));

    function canal(cor) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var x = c.getContext('2d');
      x.drawImage(img, 0, 0, w, h);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = cor;
      x.fillRect(0, 0, w, h);
      return c;
    }
    fotoR = canal('#ff0000');
    fotoGB = canal('#00ffff');
  }

  /* -----------------------------------------------------------------
     Desenho
     ----------------------------------------------------------------- */

  /* Uma camada deslocada. A imagem inteira vai primeiro, coerente, e só
     então uns poucos talhos GRANDES são recopiados por cima, cada um com seu
     deslocamento. É isso que dá o datamosh do vídeo: a palavra continua
     inteira e uns blocos gordos escorregam pro lado. Fatiar em tirinhas
     finas, que era o que eu fazia antes, vira ruído e não lê como glitch.
     'baseAlpha' abaixa a cópia coerente — perto de zero sobram só os talhos. */
  function camada(img, dx, dy, amp, alpha, talhos, baseAlpha) {
    if (baseAlpha > 0) {
      ctx.globalAlpha = alpha * baseAlpha;
      ctx.drawImage(img, dx, dy);
    }
    ctx.globalAlpha = alpha;
    for (var i = 0; i < talhos; i++) {
      var h = aleatorio(0.07, 0.3) * caixa.alt;
      var y = caixa.y0 + rng() * Math.max(1, caixa.alt - h);
      // Apaga a faixa original: é uma fratura, não uma cópia transparente.
      if (talhos && alpha === 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#05080b';
        ctx.fillRect(0, y + dy, L, h);
        ctx.restore();
      }
      ctx.drawImage(img, 0, y, L, h, dx + aleatorio(-amp, amp), y + dy, L, h);
    }
    ctx.globalAlpha = 1;
  }

  /* A foto, mesma ideia, dentro de um retângulo de destino. O recorte da
     fonte imita object-fit: cover, que é o que o CSS do hero usa — sem isso
     a imagem estica no canvas e dá um salto no cross-fade. */
  function camadaFoto(img, r, dx, amp, alpha, talhos, baseAlpha) {
    if (!img) return;
    var esc = Math.max(r.w / img.width, r.h / img.height);
    var sw = r.w / esc, sh = r.h / esc;
    var sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
    var kv = sh / r.h;                       // px do destino -> px da fonte

    if (baseAlpha > 0) {
      ctx.globalAlpha = alpha * baseAlpha;
      ctx.drawImage(img, sx, sy, sw, sh, r.x + dx, r.y, r.w, r.h);
    }
    ctx.globalAlpha = alpha;
    for (var i = 0; i < talhos; i++) {
      var h = aleatorio(0.06, 0.26) * r.h;
      var y = rng() * Math.max(1, r.h - h);
      ctx.drawImage(img, sx, sy + y * kv, sw, h * kv,
        r.x + dx + aleatorio(-amp, amp), r.y + y, r.w, h);
    }
    ctx.globalAlpha = 1;
  }

  /* Poucos retângulos e grandes. Antes eram dezenas de tirinhas, que de
     longe viram chuvisco em vez de bloco de dado corrompido. */
  function blocos(n, cores, y0, alt) {
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = cores[(rng() * cores.length) | 0];
      ctx.globalAlpha = aleatorio(0.08, 0.28);
      ctx.fillRect(
        aleatorio(-0.12, 0.95) * L,
        y0 + rng() * alt,
        aleatorio(0.02, 0.25) * L,
        aleatorio(0.001, 0.015) * A
      );
    }
    ctx.globalAlpha = 1;
  }

  function montarMarcas() {
    var r = semente(20771);
    marcas = [];
    for (var i = 0; i < 16; i++) {
      marcas.push({ fx: r(), fy: r(), fw: 0.004 + r() * 0.05, alto: r() < 0.25 });
    }
  }

  /* Tiques e colchetes de HUD em volta do nome. Posições vêm de semente
     fixa, então não tremem entre frames. */
  function hud(alpha, cor, x0, x1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.fillStyle = cor;
    ctx.globalAlpha = alpha * 0.5;
    for (var i = 0; i < marcas.length; i++) {
      var m = marcas[i];
      ctx.fillRect(lerp(x0, x1, m.fx), caixa.y0 + m.fy * caixa.alt,
        m.fw * (x1 - x0), (m.alto ? 3 : 1) * dpr);
    }
    ctx.globalAlpha = alpha * 0.85;
    var e = (x1 - x0) * 0.07, g = 2 * dpr;
    [[x0, caixa.y0, 1, 1], [x1, caixa.y0, -1, 1],
     [x0, caixa.y1, 1, -1], [x1, caixa.y1, -1, -1]].forEach(function (c) {
      ctx.fillRect(c[0] - (c[2] < 0 ? g : 0), c[1] - (c[3] < 0 ? g : 0), e * c[2], g);
      ctx.fillRect(c[0] - (c[2] < 0 ? g : 0), c[1] - (c[3] < 0 ? e * 0.7 : 0), g, e * 0.7);
    });
    ctx.restore();
  }

  function scanlines() {
    if (!padraoScan) return;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = padraoScan;
    ctx.fillRect(0, 0, L, A);
    ctx.restore();
  }

  /* -----------------------------------------------------------------
     Um frame
     ----------------------------------------------------------------- */
  /* ?glitch=2.4 desenha só o frame daquele segundo e para. Serve pra
     conferir uma fase sem ficar recarregando e cronometrando no olho. */
  var congelado = (function () {
    var m = /[?&]glitch=([\d.]+)/.exec(location.search);
    return m ? parseFloat(m[1]) : null;
  })();

  function frame(agora) {
    if (!rodando) return;
    var t = congelado !== null ? congelado : (agora - t0) / 1000;
    // Rupturas a 18 Hz; a câmera e a abertura continuam suaves a 60 Hz.
    rng = semente(2077 + Math.floor(t * 18) * 7919);
    if (congelado === null && agora - ultimoFrame < 1000 / 45) {
      requestAnimationFrame(frame); return;
    }
    ultimoFrame = agora;

    var fase = 'entrega', ini = 0, fim = FIM, i;
    for (i = 0; i < FASES.length; i++) {
      if (t < FASES[i][1]) {
        fase = FASES[i][0]; ini = i ? FASES[i - 1][1] : 0; fim = FASES[i][1]; break;
      }
    }
    var k = fim > ini ? Math.min(1, Math.max(0, (t - ini) / (fim - ini))) : 1;

    var corpo, fantasma, amp, talhos, base, split, nBlocos,
        eco = 0, alphaHud = 0, alphaSub = 0,
        fotoAlpha = 0, fotoAmp = 0, fotoSplit = 0, fotoTalhos = 0, fotoBase = 1,
        abre = 0, brilhoCostura = 0;

    switch (fase) {
      case 'ignicao':
        corpo = '#ff542d'; fantasma = '#ff1748';
        amp = L * (0.3 - 0.1 * k); talhos = 9; base = 0.08 + 0.25 * k;
        split = L * 0.018; nBlocos = 9;
        break;
      case 'trava':
        corpo = mistura('#ff7a18', '#2de2ff', Math.min(1, k * 2.2)); fantasma = '#ff2d55';
        var pulso = k < 0.24 || (k > 0.58 && k < 0.7) ? 1 : 0;
        amp = L * 0.13 * pulso; talhos = pulso ? 5 : 0; base = 1;
        split = L * (0.002 + 0.008 * pulso); nBlocos = pulso ? 6 : 1;
        break;
      case 'eco':
        corpo = '#36dfff'; fantasma = '#eaff45';
        amp = L * 0.23; talhos = 7; base = 0.9;
        split = L * 0.008; nBlocos = 4; eco = 0.8;
        break;
      case 'virada':
        corpo = '#decb49'; fantasma = '#35ffdd';
        var corte = k < 0.18 || (k > 0.66 && k < 0.76) ? 1 : 0;
        amp = L * 0.16 * corte; talhos = corte ? 4 : 0; base = 1;
        split = L * 0.0015; nBlocos = corte ? 4 : 0;
        alphaHud = 0.2; alphaSub = Math.min(1, k * 3);
        break;
      case 'descarga':
        corpo = '#55ffe0'; fantasma = '#2ce6ff';
        amp = L * 0.17; talhos = 10; base = 1 - k * 0.75;
        split = L * 0.006; nBlocos = 2; alphaSub = 1;
        break;
      case 'foto':
        /* O nome já está parado. A foto entra atrás dele, glitchando. */
        corpo = AZUL; fantasma = INDIGO;
        amp = 0; talhos = 0; base = 1;
        split = L * 0.0012; nBlocos = 0; alphaHud = 0.7 + k * 0.3;
        fotoAlpha = suave(Math.min(1, k * 1.5));
        fotoAmp = L * 0.26 * Math.pow(1 - k, 1.5);
        fotoSplit = L * 0.026 * Math.pow(1 - k, 1.4);
        fotoTalhos = Math.round(7 * (1 - k * 0.7));
        fotoBase = 0.35 + 0.65 * suave(k);
        break;
      case 'abre':
        /* Os dois se separam: nome pra esquerda, foto pra direita. */
        corpo = AZUL; fantasma = INDIGO;
        abre = suave(k);
        amp = L * 0.05 * (1 - k); talhos = Math.round(3 * (1 - k)); base = 1;
        split = L * 0.005 * (1 - k * 0.8); nBlocos = Math.round(4 * (1 - k));
        alphaHud = 1; alphaSub = Math.max(0, (k - 0.35) / 0.65);
        fotoAlpha = 1; fotoAmp = L * 0.05 * (1 - k); fotoSplit = L * 0.006 * (1 - k);
        fotoTalhos = Math.round(3 * (1 - k));
        brilhoCostura = Math.sin(Math.min(1, k * 1.6) * Math.PI);
        break;
      default: /* entrega */
        corpo = AZUL; fantasma = INDIGO;
        abre = 1;
        var espasmo = k < 0.45 && rng() < 0.1 ? 1 : 0;
        amp = L * 0.06 * espasmo; talhos = espasmo ? 3 : 0; base = 1;
        split = L * 0.006 * espasmo; nBlocos = espasmo ? 3 : 0;
        alphaHud = 1 - k; alphaSub = 1;
        fotoAlpha = 1; fotoAmp = L * 0.05 * espasmo; fotoSplit = L * 0.005 * espasmo;
        fotoTalhos = espasmo ? 2 : 0;
        /* Cross-fade: o hero de verdade surge por baixo. */
        hero.style.opacity = String(suave(Math.min(1, k * 1.4)));
        raiz.style.opacity = String(1 - suave(Math.max(0, (k - 0.35) / 0.65)));
        break;
    }

    /* O fantasma existe porque há deslocamento. Deixá-lo fixo fazia corpo e
       fantasma somarem em 'lighter' no repouso e a cor final lavava pra
       branco em vez de parar no azul da marca. */
    var alphaFantasma = Math.min(0.9, split / (L * 0.008));

    /* Layout: do centro até o lugar medido no DOM. */
    var c = layoutCentro();
    abertura = abre;
    var lay = {
      px: lerp(c.px, alvoNome.px, abre),
      entre: lerp(c.entre, alvoNome.entre, abre),
      cx: lerp(c.cx, alvoNome.cx, abre),
      topo: lerp(c.topo, alvoNome.topo, abre)
    };
    var sub = {
      px: lerp(Math.max(10 * dpr, L * 0.011), alvoSub.px, abre),
      cx: lerp(c.cx, alvoSub.cx, abre),
      topo: lerp(c.topo + c.entre * TITULO.length + c.entre * 0.4, alvoSub.topo, abre),
      alpha: alphaSub
    };

    /* A foto sai de um retângulo central e vai pro seu lugar à direita. */
    var rCentro = { x: L * 0.2, y: 0, w: L * 0.6, h: A };
    var rFoto = {
      x: lerp(rCentro.x, alvoFoto.x, abre),
      y: lerp(rCentro.y, alvoFoto.y, abre),
      w: lerp(rCentro.w, alvoFoto.w, abre),
      h: lerp(rCentro.h, alvoFoto.h, abre)
    };

    /* Redesenha a fonte só quando algo que ela mostra realmente mudou. */
    var linhas = TITULO;
    var ass = linhas.join('|') + '#' + lay.px.toFixed(1) + ',' + lay.cx.toFixed(1) +
      ',' + lay.topo.toFixed(1) + ',' + alphaSub.toFixed(2) + ',' + abre.toFixed(3);
    if (ass !== assinatura) { assinatura = ass; desenharFonte(linhas, lay, sub); }

    /* --- pinta --- */
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, L, A);
    ctx.fillStyle = '#05080b';
    ctx.fillRect(0, 0, L, A);
    // Circuitos discretos e halo local deixam espaço negativo ao redor da marca.
    ctx.save();
    ctx.globalAlpha = (1 - abre) * 0.12;
    ctx.strokeStyle = corpo;
    ctx.lineWidth = dpr * 0.7;
    var circuitos = semente(4207);
    for (i = 0; i < 28; i++) {
      var cx = circuitos() * L, cy = circuitos() * A;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + L * 0.045, cy);
      ctx.lineTo(cx + L * 0.064, cy - A * 0.035);
      ctx.lineTo(cx + L * 0.13, cy - A * 0.035); ctx.stroke();
    }
    ctx.restore();

    /* A foto vai primeiro: ela fica atrás do nome. */
    if (fotoAlpha > 0 && fotoR) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(rFoto.x, rFoto.y, rFoto.w, rFoto.h);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      /* Escurece enquanto está atrás do nome, clareia ao ir pra direita. */
      var brilho = lerp(0.42, 0.78, abre) * fotoAlpha;
      camadaFoto(fotoR, rFoto, -fotoSplit, fotoAmp, brilho, fotoTalhos, fotoBase);
      camadaFoto(fotoGB, rFoto, fotoSplit, fotoAmp, brilho, fotoTalhos, fotoBase);
      ctx.restore();
    }

    /* Costura: o clarão vertical no ponto onde os dois se separam. */
    if (brilhoCostura > 0) {
      var xc = lerp(L / 2, alvoFoto.x, abre);
      var g = ctx.createLinearGradient(xc - L * 0.02, 0, xc + L * 0.02, 0);
      g.addColorStop(0, 'rgba(41,151,255,0)');
      g.addColorStop(0.5, 'rgba(180,220,255,' + (0.85 * brilhoCostura) + ')');
      g.addColorStop(1, 'rgba(41,151,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(xc - L * 0.02, 0, L * 0.04, A);
    }

    ctx.globalCompositeOperation = 'lighter';
    var cFantasma = tinta(fantasma, 'fantasma'), cCorpo = tinta(corpo, 'corpo');

    // Bloom localizado no contorno, nunca um flash de tela inteira.
    if (abre < 0.9) {
      ctx.save();
      ctx.globalAlpha = (fase === 'descarga' ? 0.48 : 0.17) * (1 - abre);
      ctx.filter = 'blur(' + (fase === 'descarga' ? 12 : 7) * dpr + 'px)';
      ctx.drawImage(cCorpo, 0, 0);
      ctx.restore();
    }

    if (eco > 0) {   // as cópias verticais do meio do vídeo
      camada(cCorpo, -split * 2, -caixa.alt * 0.62, amp * 1.4, eco * 0.4, 2, 0.55);
      camada(cCorpo, split * 2, caixa.alt * 0.62, amp * 1.4, eco * 0.4, 2, 0.55);
    }
    camada(cFantasma, -split, 0, amp, alphaFantasma, talhos, base);
    camada(cCorpo, split, 0, amp, 1, talhos, base);

    // Microfragmentos são amostras das letras: preservam cor e material.
    if (fase === 'ignicao' || fase === 'eco' || fase === 'descarga') {
      ctx.save();
      ctx.globalAlpha = fase === 'descarga' ? 0.85 : 0.5;
      for (i = 0; i < (fase === 'descarga' ? 210 : 65); i++) {
        var sy = aleatorio(caixa.y0, caixa.y1 - 2 * dpr);
        var sx = aleatorio(L * 0.1, L * 0.8);
        var sw = aleatorio(0.02, 0.18) * L;
        ctx.drawImage(cCorpo, sx, sy, sw, dpr * 1.4,
          sx + aleatorio(-0.18, 0.18) * L, sy + aleatorio(-8, 8) * dpr,
          sw * aleatorio(1, 2.5), dpr * 1.4);
      }
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';
    if (nBlocos) blocos(nBlocos, [corpo, fantasma, '#ffffff', '#000000'],
      caixa.y0 - A * 0.2, caixa.alt + A * 0.4);
    scanlines();

    if (congelado !== null) return;
    if (t >= FIM) { encerrar(); return; }
    requestAnimationFrame(frame);
  }

  /* -----------------------------------------------------------------
     Entrar, sair, redimensionar
     ----------------------------------------------------------------- */
  function dimensionar() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    L = Math.round(window.innerWidth * dpr);
    A = Math.round(window.innerHeight * dpr);
    cv.width = L; cv.height = A;
    cv.style.width = window.innerWidth + 'px';
    cv.style.height = window.innerHeight + 'px';
    src.width = L; src.height = A;

    var p = document.createElement('canvas');
    p.width = 1; p.height = Math.max(2, Math.round(3 * dpr));
    var pc = p.getContext('2d');
    pc.fillStyle = 'rgba(0,0,0,0.34)';
    pc.fillRect(0, 0, 1, 1);
    padraoScan = ctx.createPattern(p, 'repeat');

    tintas = {};
    assinatura = '';
    medirAlvos();
    montarMarcas();
  }

  function encerrar() {
    if (saindo) return;
    saindo = true;
    rodando = false;
    clearTimeout(window.glitchIntroFallback);
    hero.style.opacity = '1';
    raiz.style.opacity = '0';
    document.documentElement.classList.remove('glitch-intro-ativo');
    window.removeEventListener('resize', dimensionar);
    document.removeEventListener('keydown', pular);
    raiz.removeEventListener('click', pular);
    window.removeEventListener('wheel', pular);
    window.removeEventListener('touchstart', pular);
    setTimeout(function () { raiz.parentNode && raiz.parentNode.removeChild(raiz); }, 500);
  }

  /* Pular não corta seco: joga pro começo da entrega, que ainda faz o
     cross-fade. Cortar no talo deixa um pulo feio. */
  function pular() {
    if (saindo || !rodando) return;
    if (congelado !== null) { encerrar(); return; }
    var entrega = FASES[FASES.length - 2][1];
    if ((performance.now() - t0) / 1000 < entrega) {
      t0 = performance.now() - entrega * 1000;
    }
  }

  function comecar() {
    if (congelado !== null) clearTimeout(window.glitchIntroFallback);
    dimensionar();
    window.addEventListener('resize', dimensionar);
    document.addEventListener('keydown', pular);
    raiz.addEventListener('click', pular);
    window.addEventListener('wheel', pular, { passive: true });
    window.addEventListener('touchstart', pular, { passive: true });
    rodando = true;
    t0 = performance.now();
    window.dispatchEvent(new Event('intro-comecou')); // o som do glitch (js/som.js)
    requestAnimationFrame(frame);
  }

  /* Sem cartão: menos movimento, recarregou dentro de uma tela ou celular em pé. */
  if (menosMovimento || window.semIntro) {
    hero.style.opacity = '1';
    document.documentElement.classList.remove('glitch-intro-ativo');
    raiz.parentNode && raiz.parentNode.removeChild(raiz);
    return;
  }

  document.documentElement.classList.add('glitch-intro-ativo');
  hero.style.opacity = '0';

  /* Esperar a Roboto (que chega assíncrona pelo WebFont.load) e a foto.
     Desenhar antes renderiza em Arial e o nome troca de fonte no meio. */
  var pendentes = imgFoto ? 2 : 1, partiu = false;
  function pronto() { if (--pendentes <= 0) largada(); }
  function largada() { if (!partiu && liberado) { partiu = true; comecar(); } }

  var liberado = true;

  if (document.fonts && document.fonts.load) {
    document.fonts.load('900 100px Roboto').then(pronto).catch(pronto);
  } else { pronto(); }

  if (!imgFoto) {
    /* sem foto: nada a esperar */
  } else if (imgFoto.complete && imgFoto.naturalWidth) {
    separarCanais(imgFoto); pronto();
  } else {
    imgFoto.addEventListener('load', function () { separarCanais(imgFoto); pronto(); });
    imgFoto.addEventListener('error', pronto);
  }
  setTimeout(function () { pendentes = 0; largada(); }, 1200);   // rede ruim não pode segurar o site
})();
