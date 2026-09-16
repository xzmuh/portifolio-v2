/*
 * Footer: bulge no headline + posicionamento do botão + relógio local.
 *
 * Bulge portado do experimento "Bulge Text" (Codrops, MIT — labs-workspace/imports/bulge)
 * sem React/Three/html2canvas: o texto do <h2> é desenhado num canvas 2D nas mesmas
 * posições do DOM, vira textura de um plano subdividido em WebGL e os vértices perto
 * do mouse sobem em direção à câmera (perspectiva => lente de aumento + luz).
 */
(function () {
  var footer = document.querySelector('.site-footer');
  if (!footer) return;
  var cta = footer.querySelector('.footer-cta');
  var headline = footer.querySelector('.footer-headline');
  var pill = footer.querySelector('.footer-pill');
  var lines = Array.prototype.slice.call(footer.querySelectorAll('.footer-line'));

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Relógio de Agudos (America/Sao_Paulo) na barra final.
  var clock = footer.querySelector('[data-footer-clock]');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  function lineTextRect(line) {
    var range = document.createRange();
    range.selectNodeContents(line);
    return range.getBoundingClientRect();
  }

  // Desktop: botão "encaixado" no fim da última linha, como na referência.
  function layoutPill() {
    if (!pill || !lines.length) return;
    if (window.innerWidth <= 991) {
      pill.style.left = pill.style.top = pill.style.marginTop = '';
      return;
    }
    var last = lines[lines.length - 1];
    var r = lineTextRect(last);
    var lr = last.getBoundingClientRect();
    var cr = cta.getBoundingClientRect();
    var gap = parseFloat(getComputedStyle(headline).fontSize) * 0.28;
    pill.style.marginTop = '0px';
    pill.style.left = (r.right - cr.left + gap) + 'px';
    pill.style.top = (lr.top - cr.top + (lr.height - pill.offsetHeight) / 2) + 'px';
  }

  // ---------- WebGL ----------
  var BLEED = 80; // px extras em volta do texto para a lente não cortar nas bordas
  var canvas, gl, program, tex, loc = {}, indexCount = 0;
  var cssW = 0, cssH = 0, dpr = 1;
  var mouse = { x: -9999, y: -9999 }, target = { x: -9999, y: -9999 };
  var strength = 0, targetStrength = 0, inside = false, visible = false, rafId = 0, t0 = performance.now();

  var VERT = [
    'attribute vec2 aPos;',
    'uniform vec2 uSize;',      // canvas em px
    'uniform vec2 uMouse;',     // mouse em px (origem embaixo/esquerda)
    'uniform float uRadius;',   // raio em px
    'uniform float uLift;',     // elevação máx. (unidades de mundo)
    'uniform float uDist;',     // distância da câmera
    'uniform float uAspect;',
    'uniform vec3 uLight;',
    'varying vec2 vUv;',
    'varying float vShade;',
    'float lift(vec2 uv) {',
    '  float d = distance(uv * uSize, uMouse);',
    '  return (1.0 - smoothstep(0.0, uRadius, d)) * uLift;',
    '}',
    'void main() {',
    '  vec2 uv = aPos;',
    '  vec3 p = vec3((uv.x * 2.0 - 1.0) * uAspect, uv.y * 2.0 - 1.0, lift(uv));',
    '  vec2 e = vec2(1.5) / uSize;',
    '  float dx = (lift(uv + vec2(e.x, 0.0)) - lift(uv - vec2(e.x, 0.0))) / (4.0 * e.x * uAspect);',
    '  float dy = (lift(uv + vec2(0.0, e.y)) - lift(uv - vec2(0.0, e.y))) / (4.0 * e.y);',
    '  vec3 n = normalize(vec3(-dx, -dy, 1.0));',
    '  vec3 l = normalize(uLight - p);',
    '  vec3 l0 = normalize(uLight - vec3(p.xy, 0.0));',
    '  vShade = 1.0 + (dot(n, l) - l0.z) * 0.9;',
    '  vUv = uv;',
    '  float w = uDist - p.z;',
    '  gl_Position = vec4(p.x / uAspect * uDist, p.y * uDist, 0.0, w);',
    '}'
  ].join('\n');

  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D uTex;',
    'varying vec2 vUv;',
    'varying float vShade;',
    'void main() {',
    '  vec4 c = texture2D(uTex, vUv);',
    '  gl_FragColor = vec4(min(c.rgb * clamp(vShade, 0.55, 1.45), vec3(c.a)), c.a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  function initGL() {
    canvas = document.createElement('canvas');
    canvas.className = 'footer-bulge-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) return false;

    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);

    ['uSize', 'uMouse', 'uRadius', 'uLift', 'uDist', 'uAspect', 'uLight', 'uTex'].forEach(function (n) {
      loc[n] = gl.getUniformLocation(program, n);
    });

    // grade 180x90 em uv [0..1]
    var SX = 180, SY = 90, verts = [], idx = [];
    for (var j = 0; j <= SY; j++) for (var i = 0; i <= SX; i++) verts.push(i / SX, j / SY);
    for (j = 0; j < SY; j++) for (i = 0; i < SX; i++) {
      var a = j * (SX + 1) + i, b = a + 1, c = a + SX + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
    indexCount = idx.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    cta.appendChild(canvas);
    return true;
  }

  // Desenha o texto do h2 num canvas 2D nas posições reais do DOM e sobe como textura.
  function buildTexture() {
    var hr = headline.getBoundingClientRect();
    var cr = cta.getBoundingClientRect();
    cssW = Math.ceil(hr.width + BLEED * 2);
    cssH = Math.ceil(hr.height + BLEED * 2);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.style.left = (hr.left - cr.left - BLEED) + 'px';
    canvas.style.top = (hr.top - cr.top - BLEED) + 'px';
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    var src = document.createElement('canvas');
    src.width = canvas.width;
    src.height = canvas.height;
    var ctx = src.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.textBaseline = 'alphabetic';
    // O h2 fica transparente com o bulge ativo, então as cores vêm das variáveis.
    var rootStyle = getComputedStyle(footer);
    var ink = rootStyle.getPropertyValue('--footer-ink').trim() || '#e6e3dc';
    var accent = rootStyle.getPropertyValue('--red').trim() || '#d7ff3f';

    // Cada nó de texto é desenhado com o estilo do próprio pai (ex.: <em> em serifa),
    // na posição que o navegador calculou para ele.
    var walker = document.createTreeWalker(headline, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      var el = node.parentElement;
      var cs = getComputedStyle(el);
      var range = document.createRange();
      range.selectNodeContents(node);
      var r = range.getBoundingClientRect();
      ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing;
      ctx.fillStyle = el.tagName === 'EM' ? accent : ink;
      var ascent = ctx.measureText('H').fontBoundingBoxAscent || r.height * 0.8;
      var text = node.textContent.replace(/\s+/g, ' ').replace(/^\s+/, '');
      if (cs.textTransform === 'uppercase') text = text.toUpperCase();
      else if (cs.textTransform === 'lowercase') text = text.toLowerCase();
      ctx.fillText(text, r.left - hr.left + BLEED, r.top - hr.top + BLEED + ascent);
    }

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function render(now) {
    rafId = 0;
    if (!visible) return;

    if (!canHover) {
      // touch: a lente passeia sozinha pelo texto
      var t = (now - t0) / 1000;
      target.x = cssW * (0.5 + 0.36 * Math.sin(t * 0.55));
      target.y = cssH * (0.5 + 0.3 * Math.sin(t * 0.9 + 1.3));
      targetStrength = 1;
    } else {
      targetStrength = inside ? 1 : 0;
    }
    if (mouse.x < -9000) { mouse.x = target.x; mouse.y = target.y; }
    mouse.x += (target.x - mouse.x) * 0.1;
    mouse.y += (target.y - mouse.y) * 0.1;
    strength += (targetStrength - strength) * 0.08;

    var aspect = cssW / cssH;
    var dist = 1 / Math.tan((55 / 2) * Math.PI / 180);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(loc.uSize, cssW, cssH);
    gl.uniform2f(loc.uMouse, mouse.x, cssH - mouse.y);
    gl.uniform1f(loc.uRadius, Math.max(140, Math.min(cssW, cssH * 1.6) * 0.3));
    gl.uniform1f(loc.uLift, dist * 0.16 * strength);
    gl.uniform1f(loc.uDist, dist);
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform3f(loc.uLight, aspect * 0.45, 1.6, 2.4);
    gl.uniform1i(loc.uTex, 0);
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

    rafId = requestAnimationFrame(render);
  }

  function start() {
    if (!rafId && visible) rafId = requestAnimationFrame(render);
  }

  function onPointer(e) {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    target.x = e.clientX - r.left;
    target.y = e.clientY - r.top;
    var fr = footer.getBoundingClientRect();
    inside = e.clientY >= fr.top && e.clientY <= fr.bottom;
  }

  function refresh() {
    layoutPill();
    if (gl) buildTexture();
  }

  function setup() {
    layoutPill();
    if (reduceMotion) return;
    try {
      if (!initGL()) return;
    } catch (err) {
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      gl = null;
      return;
    }
    buildTexture();
    cta.classList.add('is-bulge');

    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('mouseleave', function () { inside = false; });
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      start();
    }, { rootMargin: '100px 0px' }).observe(footer);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refresh, 150);
  });

  // O WebFont loader injeta a Roboto de forma assíncrona: garante o peso certo
  // antes de medir/desenhar, senão a textura sai com a fonte fallback.
  var fontReady = document.fonts && document.fonts.load
    ? Promise.all([
      document.fonts.load('400 100px Roboto'),
      document.fonts.load('400 100px "DM Serif Display"')
    ]).then(function () { return document.fonts.ready; })
    : Promise.resolve();
  fontReady.then(setup, setup);
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', function () { if (gl || pill) refresh(); });
  }
})();
