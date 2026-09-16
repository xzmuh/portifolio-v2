/*
 * Transição Trajetória -> footer (referência: OFF+BRAND).
 * Tudo em um SVG no tamanho da tela (unidades = px): um X com cantos internos
 * arredondados serve de clipPath para o gradiente + texto. O ScrollTrigger fixa a
 * seção e o progresso escala/gira o X; no fim um círculo completa o preenchimento
 * e os cantos de baixo arredondam antes do painel subir.
 */
(function () {
  var section = document.querySelector('.xreveal');
  if (!section) return;
  var pin = section.querySelector('.xreveal-pin');
  var svg = section.querySelector('.xreveal-svg');
  var gradRect = section.querySelector('.xreveal-bg');
  var grad = section.querySelector('.xreveal-grad');
  var xPath = section.querySelector('.xreveal-xpath');
  var xCircle = section.querySelector('.xreveal-xcircle');
  var rings = section.querySelectorAll('.xreveal-ring');
  var text = section.querySelector('.xreveal-text');

  // X em coordenadas centradas: braços de meia-largura H e comprimento L,
  // pontas com raio T e cantos internos côncavos com raio R (desenhado como "+").
  var L = 50, H = 8.5, R = 13, T = 3.5;
  function a(r, sweep, x, y) { return ' A' + r + ' ' + r + ' 0 0 ' + sweep + ' ' + x + ' ' + y; }
  xPath.setAttribute('d',
    'M' + (H + R) + ' ' + (-H) +
    ' L' + (L - T) + ' ' + (-H) + a(T, 1, L, -H + T) +
    ' L' + L + ' ' + (H - T) + a(T, 1, L - T, H) +
    ' L' + (H + R) + ' ' + H + a(R, 0, H, H + R) +
    ' L' + H + ' ' + (L - T) + a(T, 1, H - T, L) +
    ' L' + (-H + T) + ' ' + L + a(T, 1, -H, L - T) +
    ' L' + (-H) + ' ' + (H + R) + a(R, 0, -H - R, H) +
    ' L' + (-L + T) + ' ' + H + a(T, 1, -L, H - T) +
    ' L' + (-L) + ' ' + (-H + T) + a(T, 1, -L + T, -H) +
    ' L' + (-H - R) + ' ' + (-H) + a(R, 0, -H, -H - R) +
    ' L' + (-H) + ' ' + (-L + T) + a(T, 1, -H + T, -L) +
    ' L' + (H - T) + ' ' + (-L) + a(T, 1, H, -L + T) +
    ' L' + H + ' ' + (-H - R) + a(R, 0, H + R, -H) + ' Z'
  );

  var W = 0, HH = 0, lineLens = [], fontSize = 100, progress = 0;

  function lerp(from, to, t) { return from + (to - from) * t; }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function easeIn(t) { return t * t * t; }
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
    xCircle.setAttribute('cx', W / 2); xCircle.setAttribute('cy', HH / 2);
    layoutText();
    render(progress);
  }

  function render(p) {
    progress = p;
    var vmin = Math.min(W, HH), diag = Math.sqrt(W * W + HH * HH);
    // 0 -> .8: X cresce e gira; .62 -> .82: círculo fecha os cantos; .82 -> 1: segura cheio.
    // Zoom exponencial (s0 * k^t) para o crescimento parecer constante na tela.
    var grow = easeInOut(clamp01(p / 0.8));
    var s0 = (vmin * 0.23) / L;           // tamanho inicial: braço ~23% da menor dimensão
    var s1 = (diag * 0.5) / H;            // final: meia-largura do braço > diagonal
    var scale = s0 * Math.pow(s1 / s0, grow);
    var rot = lerp(45, 105, clamp01(p / 0.8));
    xPath.setAttribute('transform',
      'translate(' + W / 2 + ' ' + HH / 2 + ') rotate(' + rot + ') scale(' + scale + ')');

    xCircle.setAttribute('r', easeIn(clamp01((p - 0.62) / 0.2)) * diag * 0.6);

    var ringScale = s0 * L;
    rings[0].setAttribute('r', ringScale * 1.4 * scale / s0);
    rings[1].setAttribute('r', ringScale * 1.05 * scale / s0);
    var ringAlpha = 1 - clamp01(p / 0.35);
    rings[0].style.opacity = rings[1].style.opacity = ringAlpha;

    // texto desliza da direita até o centro enquanto o X abre
    var tx = lerp(W * 0.62, 0, easeInOut(clamp01(p / 0.8)));
    text.setAttribute('transform', 'translate(' + (W / 2 + tx) + ' 0)');

    // gradiente escorrega de leve junto com o scroll
    grad.setAttribute('gradientTransform', 'translate(' + (-0.15 + p * 0.15) + ' 0) scale(1.15 1)');

    var radius = clamp01((p - 0.88) / 0.12) * Math.min(48, W * 0.04);
    pin.style.borderBottomLeftRadius = pin.style.borderBottomRightRadius = radius + 'px';
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setup() {
    measure();
    if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
      render(1);
      return;
    }
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: function () { return '+=' + window.innerHeight * 2; },
      pin: pin,
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
    ? document.fonts.load('400 100px Roboto').then(function () { return document.fonts.ready; })
    : Promise.resolve();
  fontsReady.then(setup, setup);

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });
})();
