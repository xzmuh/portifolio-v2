/*
 * Transição Trajetória -> footer (referência: OFF+BRAND).
 * Tudo em um SVG no tamanho da tela (unidades = px): o M da logo (traço arredondado)
 * serve de máscara para o gradiente + texto. O ScrollTrigger fixa a seção e o
 * progresso primeiro espreme o M até virar uma linha reta; depois a linha gira e
 * cresce até cobrir a tela, um círculo completa o preenchimento e os cantos de
 * baixo arredondam antes do painel subir.
 */
(function () {
  var section = document.querySelector('.xreveal');
  if (!section) return;
  var pin = section.querySelector('.xreveal-pin');
  var svg = section.querySelector('.xreveal-svg');
  var gradRect = section.querySelector('.xreveal-bg');
  var grad = section.querySelector('.xreveal-grad');
  var mask = section.querySelector('.xreveal-mask');
  var mPath = section.querySelector('.xreveal-mpath');
  var xCircle = section.querySelector('.xreveal-xcircle');
  var rings = section.querySelectorAll('.xreveal-ring');
  var text = section.querySelector('.xreveal-text');

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

  var W = 0, HH = 0, lineLens = [], fontSize = 100, progress = 0;

  function lerp(from, to, t) { return from + (to - from) * t; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeIn(t) { return t * t * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function layoutText() {
    var lines = W < 768
      ? ['Vamos', 'construir algo', 'juntos?']
      : ['Vamos construir algo juntos?'];
    while (text.firstChild) text.removeChild(text.firstChild);
    text.setAttribute('font-size', 100);
    lineLens = lines.map(function (line, i) {
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      t.textContent = line.toUpperCase();
      t.setAttribute('x', 0);
      t.setAttribute('dy', i === 0 ? 0 : '1em');
      text.appendChild(t);
      return t.getComputedTextLength();
    });
    var widest = Math.max.apply(null, lineLens);
    fontSize = Math.min((W * (W < 768 ? 0.84 : 0.92)) / widest * 100, HH * 0.22);
    text.setAttribute('font-size', fontSize);
    text.setAttribute('text-anchor', 'middle');
    // centraliza o bloco de linhas na vertical
    var n = lines.length;
    text.setAttribute('y', HH / 2 - ((n - 1) * fontSize) / 2 + fontSize * 0.35);
  }

  function measure() {
    W = pin.clientWidth;
    HH = pin.clientHeight;
    svg.setAttribute('width', W);
    svg.setAttribute('height', HH);
    gradRect.setAttribute('width', W);
    gradRect.setAttribute('height', HH);
    rings[0].setAttribute('cx', W / 2); rings[0].setAttribute('cy', HH / 2);
    rings[1].setAttribute('cx', W / 2); rings[1].setAttribute('cy', HH / 2);
    mask.setAttribute('x', 0); mask.setAttribute('y', 0);
    mask.setAttribute('width', W); mask.setAttribute('height', HH);
    xCircle.setAttribute('cx', W / 2); xCircle.setAttribute('cy', HH / 2);
    layoutText();
    render(progress);
  }

  function render(pScroll) {
    progress = pScroll;
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
    mPath.setAttribute('d', mShape(k, sx, bulge));
    mPath.setAttribute('stroke-width', STROKE * (1 + FATTEN * crush - splat * 0.6));

    // Zoom exponencial (s0 * k^t) para o crescimento parecer constante na tela.
    var spin = clamp01((p - 0.3) / 0.55);
    var grow = easeInOut(spin);
    var s0 = (vmin * 0.16) / L;           // tamanho inicial: M com ~32% da menor dimensão
    var s1 = (diag * 0.55) / H;           // final: espessura da linha > diagonal
    var scale = s0 * Math.pow(s1 / s0, grow);
    var rot = lerp(0, 180, easeInOut(spin));
    // esmagado contra o chão: a base fica parada e o topo desce; no giro volta ao centro
    var floor = MH * crush * s0 * (1 - easeInOut(clamp01(spin / 0.4)));
    mPath.setAttribute('transform',
      'translate(' + (W / 2 + shake * s0) + ' ' + (HH / 2 + floor) + ') rotate(' + rot + ') scale(' + scale + ')');

    xCircle.setAttribute('r', easeIn(clamp01((p - 0.68) / 0.2)) * diag * 0.6);

    var ringScale = s0 * L;
    rings[0].setAttribute('r', ringScale * 1.4 * scale / s0);
    rings[1].setAttribute('r', ringScale * 1.05 * scale / s0);
    var ringAlpha = 1 - clamp01((p - 0.25) / 0.3);
    rings[0].style.opacity = rings[1].style.opacity = ringAlpha;

    // texto desliza da direita até o centro enquanto a linha gira
    var tx = lerp(W * 0.62, 0, easeInOut(clamp01((p - 0.1) / 0.75)));
    text.setAttribute('transform', 'translate(' + (W / 2 + tx) + ' 0)');

    // gradiente escorrega de leve junto com o scroll
    grad.setAttribute('gradientTransform', 'translate(' + (-0.15 + p * 0.15) + ' 0) scale(1.15 1)');

  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Borda de baixo do painel: enquanto a página rola (para baixo ou para cima) as pontas sobem e
  // a borda vira uma curva; parando, ela volta a ficar reta. É uma faixa da cor do footer que
  // cobre os cantos, mais funda quanto mais rápida a rolagem.
  (function () {
    if (reduceMotion) return;
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
      var alvo = Math.min(1, vel / 2.5);
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
      onUpdate: function (self) { render(self.progress); }
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

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });
})();
