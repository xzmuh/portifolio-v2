/*
 * Transição Trajetória -> footer (referência: OFF+BRAND).
 * Tudo num canvas do tamanho da tela (unidades = px): o M da logo (traço arredondado)
 * recorta o gradiente + texto. Antes era uma máscara SVG, que o navegador refazia na CPU a
 * cada quadro e travava em celular e PC fraco; aqui o gradiente e o texto são desenhados uma
 * vez (a cada resize) e cada quadro só traça o M e recorta as camadas prontas (source-in/atop). O ScrollTrigger fixa a seção e o
 * progresso primeiro espreme o M até virar uma linha reta; depois a linha gira e
 * cresce até cobrir a tela, um círculo completa o preenchimento e os cantos de
 * baixo arredondam antes do painel subir.
 */
(function () {
  var section = document.querySelector('.xreveal');
  if (!section) return;
  var pin = section.querySelector('.xreveal-pin');
  var tela = section.querySelector('.xreveal-svg');
  var ctx = tela.getContext('2d');
  // camadas prontas: o gradiente (fixo) e o texto (desliza; desenhado centrado e deslocado no quadro)
  var camadaGrad = document.createElement('canvas');
  var camadaTexto = document.createElement('canvas');
  var CORES = [[0, '#ffd2b8'], [.28, '#ff8a4f'], [.55, '#ff6a2b'], [.82, '#f2551a'], [1, '#d9d9d9']];

  // M da logo (images/mgt-icon.svg) centrado na origem: 50 de largura, 53 de altura,
  // traço de 13 com pontas redondas. Espremer = achatar os y até zero (vira "—").
  var MW = 25, MH = 26.5, MV = 2.5, STROKE = 13;
  var SPREAD = 0.45, FATTEN = 0.4;        // quanto o M alarga/engorda ao ser esmagado
  // k = altura (1 -> 0); sx = alargamento; b = quanto as pernas envergam para fora.
  // As pernas e as diagonais viram curvas (Q) para o traço "ceder" sob pressão.
  function mShape(k, sx, b) {
    var w = MW * sx, top = -MH * k, bottom = MH * k, mid = MV * k;
    var legBow = b * 9, sag = b * 7;
    return 'M' + (-w) + ' ' + bottom +
      ' Q' + (-w - legBow) + ' 0 ' + (-w) + ' ' + top +
      ' Q' + (-w / 2) + ' ' + (top / 2 + mid / 2 + sag) + ' 0 ' + mid +
      ' Q' + (w / 2) + ' ' + (top / 2 + mid / 2 + sag) + ' ' + w + ' ' + top +
      ' Q' + (w + legBow) + ' 0 ' + w + ' ' + bottom;
  }
  var L = MW + STROKE / 2, H = (STROKE * (1 + FATTEN)) / 2;

  var W = 0, HH = 0, DPR = 1, progress = 0;

  function lerp(from, to, t) { return from + (to - from) * t; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeIn(t) { return t * t * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function prepara(c) {
    c.width = Math.round(W * DPR);
    c.height = Math.round(HH * DPR);
    var x = c.getContext('2d');
    x.setTransform(DPR, 0, 0, DPR, 0, 0);
    return x;
  }

  function fonte(t, tam) {
    t.font = '400 ' + tam + 'px "Inter Tight", sans-serif';
    if ('letterSpacing' in t) t.letterSpacing = (-0.02 * tam) + 'px';
  }

  // texto "Vamos construir algo juntos?" centrado em W/2 (o quadro desloca a camada)
  function desenhaTexto() {
    var lines = (W < 768 ? ['Vamos', 'construir algo', 'juntos?'] : ['Vamos construir algo juntos?'])
      .map(function (l) { return l.toUpperCase(); });
    var t = prepara(camadaTexto);
    fonte(t, 100);
    var widest = Math.max.apply(null, lines.map(function (l) { return t.measureText(l).width; }));
    var fontSize = Math.min((W * (W < 768 ? 0.84 : 0.92)) / widest * 100, HH * 0.22);
    fonte(t, fontSize);
    t.fillStyle = '#141414';
    t.textAlign = 'center';
    t.textBaseline = 'alphabetic';
    var n = lines.length, y = HH / 2 - ((n - 1) * fontSize) / 2 + fontSize * 0.35;
    lines.forEach(function (l, i) { t.fillText(l, W / 2, y + i * fontSize); });
  }

  function measure() {
    W = pin.clientWidth;
    HH = pin.clientHeight;
    // resolução limitada: a forma é grande e lisa, 1.5x já fica nítido e pesa bem menos que 3x
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    prepara(tela);
    var g = prepara(camadaGrad);
    // mesmo gradiente do SVG antigo (translate(-0.08) scale(1.15) na largura)
    var lg = g.createLinearGradient(-0.08 * W, 0, 1.07 * W, 0);
    CORES.forEach(function (c) { lg.addColorStop(c[0], c[1]); });
    g.fillStyle = lg;
    g.fillRect(0, 0, W, HH);
    desenhaTexto();
    desenha();
  }

  function desenha() {
    if (!W || !HH) return;
    var pScroll = progress;
    // a animação acaba junto com o pin: o laranja fecha a tela (p = .88) no fim exato da rolagem
    // fixada, sem trecho parado depois (ele fazia a rolagem parecer presa na tela laranja)
    var p = clamp01(pScroll) * 0.88;
    var vmin = Math.min(W, HH), diag = Math.sqrt(W * W + HH * HH);
    // 0 -> .3: M é esmagado (resiste, treme, cede de uma vez e espirra para os lados);
    // .3 -> .85: a linha volta ao centro, gira e cresce; .68 -> .88: círculo fecha o
    // que falta. (O trecho .88 -> 1, segurando cheio, não é mais usado.)
    var t = clamp01(p / 0.3), k;
    if (t < 0.4) k = 1 - 0.14 * easeOut(t / 0.4);                 // resiste
    else k = 0.86 * (1 - easeIn(clamp01((t - 0.4) / 0.45)));       // cede
    var crush = 1 - k;
    // tremor enquanto segura a pressão (some quando cede)
    var shake = Math.sin(t * 140) * 1.2 * Math.sin(Math.PI * clamp01((t - 0.15) / 0.35));
    // espirro: quando encosta no chão estica além e volta
    var splat = Math.sin(Math.PI * clamp01((t - 0.8) / 0.2)) * 0.18;
    var sx = 1 + SPREAD * crush + splat;
    var bulge = Math.sin(Math.PI * clamp01((t - 0.3) / 0.6));
    var forma = new Path2D(mShape(k, sx, bulge));
    var largura = STROKE * (1 + FATTEN * crush - splat * 0.6);

    // Zoom exponencial (s0 * k^t) para o crescimento parecer constante na tela.
    var spin = clamp01((p - 0.3) / 0.55);
    var grow = easeInOut(spin);
    var s0 = (vmin * 0.16) / L;           // tamanho inicial: M com ~32% da menor dimensão
    var s1 = (diag * 0.55) / H;           // final: espessura da linha > diagonal
    var scale = s0 * Math.pow(s1 / s0, grow);
    var rot = lerp(0, 180, easeInOut(spin));
    // esmagado contra o chão: a base fica parada e o topo desce; no giro volta ao centro
    var floor = MH * crush * s0 * (1 - easeInOut(clamp01(spin / 0.4)));
    var raio = easeIn(clamp01((p - 0.68) / 0.2)) * diag * 0.6;
    var ringScale = s0 * L;
    var ringAlpha = 1 - clamp01((p - 0.25) / 0.3);
    // texto desliza da direita até o centro enquanto a linha gira
    var tx = lerp(W * 0.62, 0, easeInOut(clamp01((p - 0.1) / 0.75)));

    var c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, W, HH);

    // 1. a forma (o M e o círculo que fecha), em branco
    c.save();
    c.translate(W / 2 + shake * s0, HH / 2 + floor);
    c.rotate(rot * Math.PI / 180);
    c.scale(scale, scale);
    c.lineWidth = largura;
    c.lineCap = 'square';
    c.lineJoin = 'miter';
    c.miterLimit = 10;
    c.strokeStyle = '#fff';
    c.stroke(forma);
    c.restore();
    if (raio > 0) {
      c.beginPath();
      c.arc(W / 2, HH / 2, raio, 0, Math.PI * 2);
      c.fillStyle = '#fff';
      c.fill();
    }

    // 2. o gradiente só onde tem forma, e o texto só por cima dela
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.drawImage(camadaGrad, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.drawImage(camadaTexto, Math.round(tx * DPR), 0);

    // 3. os anéis finos ficam atrás
    if (ringAlpha > 0) {
      c.setTransform(DPR, 0, 0, DPR, 0, 0);
      c.globalCompositeOperation = 'destination-over';
      c.globalAlpha = ringAlpha;
      c.strokeStyle = 'rgba(230, 227, 220, .12)';
      c.lineWidth = 1;
      [1.4, 1.05].forEach(function (m) {
        c.beginPath();
        c.arc(W / 2, HH / 2, ringScale * m * scale / s0, 0, Math.PI * 2);
        c.stroke();
      });
      c.globalAlpha = 1;
    }
    c.globalCompositeOperation = 'source-over';
  }

  // o ScrollTrigger pode chamar várias vezes por quadro: desenha uma vez só, no próximo quadro
  var pedido = 0;
  function render(pScroll) {
    progress = pScroll;
    if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; desenha(); });
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pinFim = false;

  // Borda de baixo do painel: enquanto a página rola (para baixo ou para cima) as pontas sobem e
  // a borda vira uma curva; parando, ela volta a ficar reta. É uma faixa da cor do footer que
  // cobre os cantos, mais funda quanto mais rápida a rolagem.
  // no celular fica sem a curva: a barra do navegador some/aparece na rolagem, a altura muda o
  // tempo todo e a borda ficava dobrando sem parar
  var celular = window.matchMedia('(hover: none), (max-width: 767px)').matches;
  (function () {
    if (reduceMotion || celular) return;
    var NS = 'http://www.w3.org/2000/svg';
    var curva = document.createElementNS(NS, 'svg');
    curva.setAttribute('class', 'xreveal-curva');
    curva.setAttribute('aria-hidden', 'true');
    curva.setAttribute('preserveAspectRatio', 'none');
    var forma = document.createElementNS(NS, 'path');
    curva.appendChild(forma);
    pin.appendChild(curva);

    // tamanhos medidos só no resize: ler o layout a cada quadro brigava com o pin do ScrollTrigger
    var w = 0, B = 0;
    function mede() {
      w = window.innerWidth;
      B = Math.min(160, window.innerHeight * 0.18);
      curva.setAttribute('viewBox', '0 0 ' + w + ' ' + B);
      desenha(-1);
    }
    var ultimoB = -1;
    function desenha(b) {
      if (Math.abs(b - ultimoB) < 0.5) return;
      ultimoB = b;
      b = Math.max(0, b);
      // pontas sobem b; o meio continua encostado embaixo
      forma.setAttribute('d', 'M0 ' + (B - b) + ' Q' + (w / 2) + ' ' + (B + b) + ' ' + w + ' ' + (B - b) +
        ' L' + w + ' ' + B + ' L0 ' + B + 'Z');
    }
    window.addEventListener('resize', mede);
    mede();

    var perto = false, rodando = false, ultimoY = 0, ultimoT = 0, dobra = 0;
    function quadro(agora) {
      var dt = ultimoT ? Math.max(1, agora - ultimoT) : 16;
      ultimoT = agora;
      var y = window.scrollY;
      var vel = Math.abs(y - ultimoY) / dt;   // px por ms
      ultimoY = y;
      // só curva depois que a animação acabou e o painel está subindo; antes ela cobria a animação
      var alvo = pinFim ? Math.min(1, vel / 2.5) : 0;
      // sobe rápido, volta devagar
      dobra += (alvo - dobra) * (alvo > dobra ? 0.35 : 0.08);
      if (dobra < 0.003) dobra = 0;
      desenha(dobra * B);
      if (perto || dobra > 0) requestAnimationFrame(quadro);
      else { rodando = false; ultimoT = 0; }
    }
    new IntersectionObserver(function (es) {
      perto = es[0].isIntersecting;
      if (perto && !rodando) { rodando = true; ultimoY = window.scrollY; requestAnimationFrame(quadro); }
    }).observe(section);
  })();

  function setup() {
    measure();
    if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
      render(1);
      return;
    }
    // a barra de endereço do celular mexe na altura ao rolar: não recalcular o pin por isso
    ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: function () { return '+=' + window.innerHeight * 1.36; },
      pin: pin,
      anticipatePin: 1,
      scrub: true,
      // criada depois do pin da Trajetória (que espera as fontes): recalcular por último
      refreshPriority: -1,
      invalidateOnRefresh: true,
      onRefresh: function () { measure(); },
      onUpdate: function (self) { pinFim = self.progress >= 1; render(self.progress); }
    });
    render(0);
    ScrollTrigger.refresh();
  }

  var fontsReady = document.fonts && document.fonts.load
    ? document.fonts.load('400 100px "Inter Tight"').then(function () { return document.fonts.ready; })
    : Promise.resolve();
  fontsReady.then(setup, setup);
  // imagens carregando depois mudam a altura da página: sem isso o pin começava no lugar errado
  // e dava o pulo (rola, volta, aí desce)
  window.addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  // só a largura conta: no celular a altura muda sozinha quando a barra do navegador some
  var resizeTimer, larguraAntes = window.innerWidth;
  window.addEventListener('resize', function () {
    if (celular && window.innerWidth === larguraAntes) return;
    larguraAntes = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });
})();
