/* Experiências: a escultura de pontos viva. Um pano de ~50 mil pontos que torce e ondula devagar,
   como a foto (img/tema/particulas.webp), e abre um vão embaixo do mouse. Tudo calculado no vertex
   shader: o processador só passa o tempo e o mouse. Para quando o card sai da tela ou a aba some;
   sem WebGL, fica a foto. */
(function () {
  var card = document.querySelector('[data-tilt]');
  if (!card) return;
  var cena = card.querySelector('.pilar_cena');
  var canvas = document.createElement('canvas');
  canvas.className = 'cena_malha';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;
  cena.insertBefore(canvas, cena.firstChild);
  card.classList.add('tem-malha');

  var calma = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pequeno = window.matchMedia('(max-width: 700px)').matches;

  var vs = [
    'attribute vec3 a;', // u, v (-1..1) e um sorteio por ponto
    'uniform float t, asp, px;',
    'uniform vec2 rot, m;',
    'uniform float mf;',
    'varying float luz;',
    'void main(){',
    '  float u = a.x, v = a.y;',
    // a fita: comprida no x, torce em volta dele e serpenteia
    '  float th = u * 3.1 + sin(u * 1.7 + t * .21) * 1.1 + .6;',
    '  float y0 = v * .62 + sin(v * 4.6 + u * 2.7 + t * .5) * .08;',
    '  float z0 = sin(v * 5.2 + u * 3.1 - t * .43) * .2 + sin(u * 6.5 + v * 1.5 + t * .33) * .09 + cos(v * 2.4 - u * 1.7 + t * .27) * .16;',
    '  vec3 p = vec3(u * 1.55, y0 * cos(th) - z0 * sin(th), y0 * sin(th) + z0 * cos(th));',
    '  p.y += sin(u * 2.2 + t * .24) * .3;',
    '  p.z += cos(u * 1.6 - t * .19) * .2;',
    // o mouse gira o conjunto um pouco
    '  float cy = cos(rot.x), sy = sin(rot.x), cx = cos(rot.y), sx = sin(rot.y);',
    '  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);',
    '  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);',
    '  float w = 2.6 - p.z;',
    '  vec2 s = p.xy * 2.35 / w;',
    '  s.x /= asp;',
    // vão embaixo do mouse: os pontos perto dele se afastam
    '  vec2 d = s - m; d.x *= asp;',
    '  float k = mf * exp(-dot(d, d) * 22.);',
    '  s += normalize(d + 1e-4) * k * .09 * vec2(1. / asp, 1.);',
    '  gl_Position = vec4(s, 0., 1.);',
    '  luz = (.42 + .45 * smoothstep(-.6, .6, p.z) + a.z * .25) * (1. - k * .6);',
    '  gl_PointSize = px * (.75 + .55 * smoothstep(-.6, .7, p.z));',
    '}'
  ].join('\n');

  var fs = [
    'precision mediump float;',
    'varying float luz;',
    'void main(){',
    '  vec2 c = gl_PointCoord - .5;',
    '  float r = dot(c, c);',
    '  if (r > .25) discard;',
    '  gl_FragColor = vec4(vec3(luz * (1. - r * 2.2)) * .25, 1.);',
    '}'
  ].join('\n');

  function sh(tipo, src) {
    var s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    canvas.remove();
    card.classList.remove('tem-malha');
    return;
  }
  gl.useProgram(prog);

  // pontos espalhados com um tremor dentro de cada célula: dá o pontilhado da foto, sem moiré
  var C = pequeno ? 260 : 340, L = pequeno ? 110 : 150;
  var n = C * L, dados = new Float32Array(n * 3), i = 0;
  for (var j = 0; j < L; j++) {
    for (var k = 0; k < C; k++) {
      dados[i++] = ((k + Math.random()) / C) * 2 - 1;
      dados[i++] = ((j + Math.random()) / L) * 2 - 1;
      dados[i++] = Math.random();
    }
  }
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
  var la = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(la);
  gl.vertexAttribPointer(la, 3, gl.FLOAT, false, 0, 0);

  var U = {};
  ['t', 'asp', 'px', 'rot', 'm', 'mf'].forEach(function (nome) { U[nome] = gl.getUniformLocation(prog, nome); });

  // soma de luz: onde o pano dobra de lado os pontos se acumulam e a dobra acende, como na foto
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0, 0, 0, 1);

  var dpr = 1, W = 0, H = 0;
  function medir() {
    var r = cena.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = r.width; H = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // mouse e giro seguem o alvo com atraso, para o movimento ficar macio
  var mouse = { x: 0, y: 0, f: 0, ax: 0, ay: 0, af: 0 };
  var giro = { x: 0, y: 0, ax: 0, ay: 0 };
  card.addEventListener('pointermove', function (e) {
    var r = cena.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    mouse.ax = x * 2 - 1;
    mouse.ay = 1 - y * 2;
    mouse.af = x >= 0 && x <= 1 && y >= 0 && y <= 1 ? 1 : 0;
    giro.ax = (x - .5) * .7;
    giro.ay = (y - .5) * .5;
    if (calma) quadro(ultimo);
  });
  card.addEventListener('pointerleave', function () {
    mouse.af = 0;
    giro.ax = giro.ay = 0;
  });

  var ultimo = 0, t = 0, rodando = false, naTela = false;
  function desenhar() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.t, t);
    gl.uniform1f(U.asp, W / Math.max(H, 1));
    gl.uniform1f(U.px, (pequeno ? 1.5 : 1.7) * dpr);
    gl.uniform2f(U.rot, giro.x, giro.y);
    gl.uniform2f(U.m, mouse.x, mouse.y);
    gl.uniform1f(U.mf, mouse.f);
    gl.drawArrays(gl.POINTS, 0, n);
  }

  function quadro(agora) {
    var dt = Math.min((agora - ultimo) / 1000 || 0, .05);
    ultimo = agora;
    if (!calma) t += dt;
    var e = 1 - Math.pow(.02, dt);
    mouse.x += (mouse.ax - mouse.x) * e * 1.6;
    mouse.y += (mouse.ay - mouse.y) * e * 1.6;
    mouse.f += (mouse.af - mouse.f) * e;
    giro.x += (giro.ax - giro.x) * e * .6;
    giro.y += (giro.ay - giro.y) * e * .6;
    desenhar();
    if (rodando) requestAnimationFrame(quadro);
  }

  function liga() {
    if (rodando || calma || !naTela || document.hidden) return;
    rodando = true;
    ultimo = performance.now();
    requestAnimationFrame(quadro);
  }

  function desliga() { rodando = false; }

  new IntersectionObserver(function (es) {
    naTela = es[0].isIntersecting;
    if (naTela) { liga(); if (calma) desenhar(); } else desliga();
  }).observe(cena);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) desliga(); else liga();
  });

  var espera;
  window.addEventListener('resize', function () {
    clearTimeout(espera);
    espera = setTimeout(function () { medir(); desenhar(); }, 150);
  });

  medir();
  t = 4;
  desenhar();
})();
