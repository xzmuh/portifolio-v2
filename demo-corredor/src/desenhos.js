/* Tudo que aparece no corredor, desenhado a mão por código. Cada função
   recebe (g, W, H, s): g é o lápis, W/H o tamanho da folha em pixels e s a
   escala do traço. `u` nas funções = pixels por metro. */

import { mulberry32 } from './lapis.js';

/* ---------- arquitetura ---------- */

// parede limpa: muito branco, rodapé, uma linha fina no teto e poucas rachaduras
export function parede(largura, { cantoEsq = false, cantoDir = false } = {}) {
  return (g, W, H, s) => {
    const u = W / largura;
    const r = mulberry32(Math.round(largura * 1000));
    g.linha([[0, 0.05 * u], [W, 0.05 * u]], { peso: 0.6 });
    g.ret(-10, H - 0.13 * u, W + 20, 0.2 * u, 'claro', { peso: 0.9, angulo: 0.2 });
    for (let k = 0; k < largura / 2.5; k++) {
      let x = r() * W, y = 0.3 * u + r() * (H - 0.8 * u);
      const pts = [[x, y]];
      for (let i = 0; i < 3 + Math.floor(r() * 3); i++) { x += (r() - 0.4) * 10 * s; y += r() * 12 * s; pts.push([x, y]); }
      g.linha(pts, { peso: 0.4 });
    }
    if (cantoEsq) g.linha([[2 * s, 0], [2 * s, H]], { peso: 1.1 });
    if (cantoDir) g.linha([[W - 2 * s, 0], [W - 2 * s, H]], { peso: 1.1 });
  };
}

// tábuas com veio de madeira desenhado
export function piso(largura, comprimento) {
  return (g, W, H, s) => {
    const u = W / largura;
    const r = mulberry32(Math.round(comprimento * 77 + largura));
    const tabua = 0.3 * u;
    for (let x = 0; x < W; x += tabua) {
      g.linha([[x, -10], [x, H + 10]], { peso: 0.8 });
      for (let v = 0; v < 2; v++) {
        const ox = x + tabua * (0.3 + v * 0.35 + r() * 0.1), fase = r() * 10;
        g.linha(Array.from({ length: 24 }, (_, i) => { const y = (i / 23) * (H + 20) - 10; return [ox + Math.sin(y / (0.9 * u) + fase) * tabua * 0.08, y]; }), { peso: 0.3 });
      }
      for (let y = r() * 2.5 * u; y < H; y += (1.8 + r() * 1.8) * u) {
        g.linha([[x, y], [x + tabua, y]], { peso: 0.6 });
        if (r() < 0.3) {
          const kx = x + tabua * (0.3 + r() * 0.4), ky = y + (0.3 + r()) * u;
          g.elipse(kx, ky, 4 * s, 10 * s, null, { peso: 0.4 });
          g.elipse(kx, ky, 7 * s, 16 * s, null, { peso: 0.3 });
        }
      }
    }
  };
}

export function teto(largura) {
  return (g, W, H) => {
    const u = W / largura;
    for (let y = 1.2 * u; y < H; y += 1.2 * u) g.linha([[0, y], [W, y]], { peso: 0.3 });
    for (let x = 1.1 * u; x < W; x += 1.1 * u) g.linha([[x, 0], [x, H]], { peso: 0.3 });
  };
}

/* ---------- portas ---------- */

const MADEIRA = '#b8834e', MADEIRA_ESCURA = '#9c6a3a';

// adesivo colorido (o único ponto de cor que aparece mesmo sem hover)
function adesivo(g, tipo, x, y, r) {
  g.elipse(x, y, r * 1.38, r * 1.38, null, { sempreCor: true, fundo: true, cor: '#fffdf5', peso: 0.75 });
  g.elipse(x, y, r * 1.25, r * 1.25, null, { sempreCor: true, cor: '#d9d1c3', peso: 0.35 });
  const base = { sempreCor: true, fundo: true, peso: 1.05 };
  if (tipo === 'js') { g.ret(x - r, y - r, 2 * r, 2 * r, null, { ...base, cor: '#f2d349' }); g.texto('JS', x + r * 0.2, y + r * 0.35, r * 1.1); }
  if (tipo === 'ts') { g.ret(x - r, y - r, 2 * r, 2 * r, null, { ...base, cor: '#3b7ccf' }); g.texto('TS', x + r * 0.2, y + r * 0.35, r * 1.05, { cor: '#fff' }); }
  if (tipo === 'react') {
    // fundo claro e átomo azul: escuro, virava uma bola preta ilegível
    g.elipse(x, y, r * 1.1, r * 1.1, null, { ...base, cor: '#e6f4fa' });
    for (const a of [0, 1.05, 2.1]) g.forma(Array.from({ length: 20 }, (_, i) => { const t = (i / 20) * Math.PI * 2; const ex = Math.cos(t) * r * 0.85, ey = Math.sin(t) * r * 0.32; return [x + ex * Math.cos(a) - ey * Math.sin(a), y - r * 0.12 + ex * Math.sin(a) + ey * Math.cos(a)]; }), null, { sempreCor: true, cor: '#2a9bbf', peso: 0.7 });
    g.elipse(x, y - r * 0.12, r * 0.16, r * 0.16, null, { sempreCor: true, fundo: true, cor: '#2a9bbf', peso: 0.5 });
    g.texto('react', x, y + r * 0.72, r * 0.45);
  }
  if (tipo === 'node') { g.forma(Array.from({ length: 6 }, (_, i) => [x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * r * 1.1, y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * r * 1.1]), null, { ...base, cor: '#6cc24a' }); g.texto('node', x, y, r * 0.75); }
  if (tipo === 'php') { g.elipse(x, y, r * 1.3, r * 0.75, null, { ...base, cor: '#8a93c8' }); g.texto('php', x, y, r * 0.85); }
  if (tipo === 'html') { g.forma([[x - r, y - r], [x + r, y - r], [x + r * 0.85, y + r * 0.8], [x, y + r * 1.1], [x - r * 0.85, y + r * 0.8]], null, { ...base, cor: '#e8743b' }); g.texto('5', x, y, r * 1.1, { cor: '#fff' }); }
  if (tipo === 'sql') { g.ret(x - r * 0.8, y - r * 0.7, r * 1.6, r * 1.5, null, { ...base, cor: '#9fb8d8' }); g.elipse(x, y - r * 0.7, r * 0.8, r * 0.3, null, { ...base, cor: '#c2d4ea' }); g.texto('SQL', x, y + r * 0.25, r * 0.6); }
}

function fita(g, x, y, w, h, angulo, cor) {
  const c = Math.cos(angulo), sn = Math.sin(angulo);
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([a, b]) => [x + a * c - b * sn, y + a * sn + b * c]);
  g.forma(pts, null, { sempreCor: true, cor, peso: 0.5 });
}

/* porta com tema: o que cada sala guarda aparece já na porta */
export function porta(largura, altura, tema, { semBase = false } = {}) {
  return (g, W, H, s) => {
    const u = W / largura;
    if (!semBase) {
      g.ret(0, 0, W, H, null, { peso: 1.2, cor: MADEIRA, fundo: true });
      for (let x = 0.1 * u; x < W; x += 0.14 * u) g.linha(Array.from({ length: 10 }, (_, i) => [x + Math.sin(i + x) * 2 * s, (i / 9) * H]), { peso: 0.25 });
      g.ret(0.14 * u, 0.16 * u, W - 0.28 * u, H * 0.38, null, { peso: 0.9, cor: MADEIRA_ESCURA });
      g.ret(0.14 * u, H * 0.52, W - 0.28 * u, H * 0.4, null, { peso: 0.9, cor: MADEIRA_ESCURA });
      g.ret(W - 0.2 * u, H * 0.47 - 0.07 * u, 0.07 * u, 0.2 * u, null, { cor: '#c9c9c9', peso: 0.9 });
      g.ret(W - 0.36 * u, H * 0.47 - 0.05 * u, 0.2 * u, 0.045 * u, null, { cor: '#b5b5b5', peso: 0.9 });
    }
    const cx = W / 2, topo = 0.2 * u;
    if (tema === 'projetos') {
      [[-0.18, 0.1, -0.08], [0.16, 0.2, 0.1], [-0.05, 0.55, 0.04]].forEach(([dx, dy, a], k) => {
        const x = cx + dx * u, y = topo + dy * u + 0.25 * u;
        // papel levemente torto: os cantos de cima e de baixo deslocados em sentidos opostos
        const t = a * u;
        g.forma([[x - 0.2 * u, y - 0.25 * u + t], [x + 0.2 * u, y - 0.25 * u - t], [x + 0.2 * u, y + 0.25 * u - t], [x - 0.2 * u, y + 0.25 * u + t]], null, { fundo: true, peso: 0.8, cor: '#eef3fb' });
        for (let i = 0; i < 4; i++) g.linha([[x - 0.14 * u, y - 0.12 * u + i * 0.07 * u], [x + 0.12 * u - i * 0.03 * u, y - 0.12 * u + i * 0.07 * u]], { peso: 0.4 });
        fita(g, x, y - 0.25 * u, 0.16 * u, 0.05 * u, a + 0.2, ['#7fb6e8', '#f2a3b3', '#f5d06a'][k]);
      });
    }
    if (tema === 'habilidades') {
      [['js', -0.2, 0.08], ['react', 0.18, 0.12], ['node', -0.14, 0.42], ['ts', 0.2, 0.45], ['php', -0.02, 0.72], ['sql', 0.26, 0.78], ['html', -0.25, 0.8]]
        .forEach(([t, dx, dy]) => adesivo(g, t, cx + dx * u, topo + dy * u + 0.1 * u, 0.075 * u));
    }
    if (tema === 'trajetoria') {
      const x = cx - 0.3 * u, y = topo + 0.1 * u, w = 0.6 * u, h = 0.62 * u;
      g.forma([[x, y], [x + w * 0.33, y + 8 * s], [x + w * 0.66, y], [x + w, y + 8 * s], [x + w, y + h], [x + w * 0.66, y + h - 8 * s], [x + w * 0.33, y + h], [x, y + h - 8 * s]], null, { fundo: true, peso: 0.9, cor: '#efe2c4' });
      const trilha = [[0.12, 0.8], [0.3, 0.6], [0.25, 0.4], [0.5, 0.35], [0.65, 0.55], [0.85, 0.25]];
      for (let i = 0; i < trilha.length - 1; i++) {
        const [a1, b1] = trilha[i], [a2, b2] = trilha[i + 1];
        for (let t = 0; t < 1; t += 0.25) g.elipse(x + w * (a1 + (a2 - a1) * t), y + h * (b1 + (b2 - b1) * t), 1.6 * s, 1.6 * s, 'preto');
      }
      g.linha([[x + w * 0.8, y + h * 0.18], [x + w * 0.9, y + h * 0.32]], { peso: 1.6 });
      g.linha([[x + w * 0.9, y + h * 0.18], [x + w * 0.8, y + h * 0.32]], { peso: 1.6 });
      fita(g, x + w / 2, y, 0.18 * u, 0.05 * u, -0.1, '#f5d06a');
    }
    if (tema === 'sobre') {
      const x = cx - 0.22 * u, y = topo + 0.12 * u, w = 0.44 * u, h = 0.52 * u;
      g.ret(x, y, w, h, null, { fundo: true, peso: 0.9, cor: '#fbfbf8' });
      g.ret(x + w * 0.1, y + w * 0.1, w * 0.8, h * 0.62, 'claro', { cor: '#c7d9e6' });
      g.elipse(x + w / 2, y + h * 0.3, w * 0.13, w * 0.13, null, { fundo: true, peso: 0.8 });
      g.forma([[x + w * 0.25, y + h * 0.7], [x + w * 0.3, y + h * 0.5], [x + w * 0.7, y + h * 0.5], [x + w * 0.75, y + h * 0.7]], null, { fundo: true, peso: 0.8 });
      g.texto('eu :)', x + w / 2, y + h * 0.84, h * 0.12);
      fita(g, x + w / 2, y, 0.16 * u, 0.05 * u, 0.12, '#f2a3b3');
    }
    if (tema === 'contato') {
      const y = topo + 0.5 * u;
      g.ret(cx - 0.28 * u, y, 0.56 * u, 0.12 * u, null, { cor: '#c9c9c9', peso: 1 });
      g.ret(cx - 0.24 * u, y + 0.035 * u, 0.48 * u, 0.05 * u, 'preto');
      g.forma([[cx - 0.2 * u, y + 0.06 * u], [cx + 0.18 * u, y - 0.18 * u], [cx + 0.26 * u, y - 0.08 * u], [cx - 0.1 * u, y + 0.07 * u]], null, { fundo: true, sempreCor: true, cor: '#f7f3e8', peso: 0.9 });
      g.linha([[cx + 0.18 * u, y - 0.18 * u], [cx + 0.06 * u, y - 0.03 * u], [cx + 0.26 * u, y - 0.08 * u]], { peso: 0.6 });
      g.ret(cx + 0.12 * u, y - 0.15 * u, 0.06 * u, 0.05 * u, null, { sempreCor: true, cor: '#e25b4f', peso: 0.5 });
    }
  };
}

// batente fino em volta do vão
export function batente(largura) {
  return (g, W, H) => {
    const u = W / largura, b = 0.09 * u;
    g.ret(0, 0, b, H, 'claro', { fundo: true, peso: 1, angulo: Math.PI / 2 });
    g.ret(W - b, 0, b, H, 'claro', { fundo: true, peso: 1, angulo: Math.PI / 2 });
    g.ret(0, 0, W, b, 'claro', { fundo: true, peso: 1 });
  };
}

// plaquinha de madeira pregada, com o nome da sala
export function placaMadeira(texto) {
  return (g, W, H, s) => {
    g.ret(4 * s, 4 * s, W - 8 * s, H - 8 * s, null, { fundo: true, peso: 1.3, cor: '#caa16f' });
    for (let i = 1; i < 4; i++) g.linha(Array.from({ length: 8 }, (_, k) => [(k / 7) * W, H * (i / 4) + Math.sin(k * 1.3 + i) * 3 * s]), { peso: 0.3 });
    for (const [x, y] of [[0.06, 0.2], [0.94, 0.2], [0.06, 0.8], [0.94, 0.8]]) g.elipse(W * x, H * y, 3 * s, 3 * s, 'preto');
    g.texto(texto.toUpperCase(), W / 2, H * 0.55, H * 0.5, { cor: '#3b2a1a' });
  };
}

// seta rabiscada, curvinha, apontando para a direita
export function seta() {
  return (g, W, H, s) => {
    const pts = Array.from({ length: 10 }, (_, i) => { const t = i / 9; return [W * (0.05 + t * 0.82), H * (0.75 - Math.sin(t * Math.PI) * 0.45 + t * 0.1)]; });
    g.linha(pts, { peso: 1.3 });
    const [x, y] = pts[pts.length - 1];
    g.linha([[x - 14 * s, y - 12 * s], [x, y], [x - 16 * s, y + 6 * s]], { peso: 1.3 });
  };
}

export function grade() {
  return (g, W, H, s) => {
    g.ret(3 * s, 3 * s, W - 6 * s, H - 6 * s, null, { fundo: true, peso: 1.1 });
    for (let y = H * 0.2; y < H * 0.85; y += H * 0.12) g.ret(W * 0.1, y, W * 0.8, H * 0.05, 'medio', { peso: 0.5 });
  };
}

// rabiscos de parede: pseudo-código e um fluxograma
export function rabiscoCodigo() {
  return (g, W, H) => {
    g.texto('while (true) {', W * 0.05, H * 0.2, H * 0.2, { alinha: 'left', peso: 500 });
    g.texto('explorar();', W * 0.18, H * 0.5, H * 0.2, { alinha: 'left', peso: 500 });
    g.texto('}', W * 0.05, H * 0.8, H * 0.2, { alinha: 'left', peso: 500 });
  };
}
export function rabiscoFluxo() {
  return (g, W, H, s) => {
    const caixas = ['IDEIA', 'CÓDIGO', 'BUG!'];
    caixas.forEach((t, i) => {
      const y = H * (0.08 + i * 0.33), h = H * 0.22;
      if (i === 2) g.forma(Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2, r = k % 2 ? 0.3 : 0.44; return [W / 2 + Math.cos(a) * W * r, y + h / 2 + Math.sin(a) * h * (r + 0.25)]; }), null, { fundo: true, peso: 1 });
      else g.ret(W * 0.2, y, W * 0.6, h, null, { fundo: true, peso: 1 });
      g.texto(t, W / 2, y + h / 2, h * 0.5);
      if (i < 2) g.linha([[W / 2, y + h + 4 * s], [W / 2, y + H * 0.33 - 4 * s]], { peso: 0.9 });
    });
  };
}

/* ---------- logo do começo do corredor ---------- */

export function logo(nome, sub) {
  return (g, W, H) => {
    const c = g.ctx;
    c.save();
    c.font = `700 ${H * 0.46}px Caveat, cursive`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    // Palavra-marca de grafite: preenchida e segura, sem o contorno duplo que
    // fazia o nome parecer um adesivo cartunesco perto das ilustrações.
    c.fillStyle = g.tinta ? '#34312d' : 'rgba(92,88,82,.48)';
    c.fillText(nome, W / 2, H * 0.4);
    c.globalAlpha = g.tinta ? 0.16 : 0.1;
    c.fillText(nome, W / 2 + H * 0.012, H * 0.4 + H * 0.009);
    c.restore();
    g.linha([[W * 0.35, H * 0.64], [W * 0.65, H * 0.635]], { peso: 0.48 });
    g.texto(sub, W / 2, H * 0.82, H * 0.12, { peso: 500 });
  };
}

/* ---------- quadros ---------- */

export const cenas = {
  paisagem(g, x, y, w, h) {
    g.forma([[x, y + h], [x + w * 0.25, y + h * 0.45], [x + w * 0.45, y + h * 0.7], [x + w * 0.7, y + h * 0.3], [x + w, y + h * 0.8], [x + w, y + h]], 'medio');
    g.elipse(x + w * 0.78, y + h * 0.22, w * 0.08, w * 0.08, null);
    g.linha([[x, y + h * 0.9], [x + w, y + h * 0.85]], { peso: 0.7 });
  },
  vaso(g, x, y, w, h) {
    g.forma([[x + w * 0.35, y + h * 0.55], [x + w * 0.65, y + h * 0.55], [x + w * 0.7, y + h], [x + w * 0.3, y + h]], 'escuro');
    for (let i = -2; i <= 2; i++) g.linha([[x + w / 2, y + h * 0.55], [x + w / 2 + i * w * 0.12, y + h * (0.15 + Math.abs(i) * 0.06)]]);
    for (let i = -2; i <= 2; i++) g.elipse(x + w / 2 + i * w * 0.12, y + h * (0.13 + Math.abs(i) * 0.06), w * 0.06, h * 0.05, 'claro');
  },
  abstrato(g, x, y, w, h) {
    g.elipse(x + w * 0.35, y + h * 0.4, w * 0.22, w * 0.22, 'escuro');
    g.ret(x + w * 0.45, y + h * 0.45, w * 0.4, h * 0.4, 'claro');
    g.linha([[x + w * 0.1, y + h * 0.85], [x + w * 0.9, y + h * 0.15]], { peso: 1.3 });
  },
  retratoSilhueta(g, x, y, w, h) {
    g.elipse(x + w / 2, y + h * 0.38, w * 0.2, h * 0.2, 'escuro');
    g.forma([[x + w * 0.2, y + h], [x + w * 0.25, y + h * 0.72], [x + w * 0.5, y + h * 0.62], [x + w * 0.75, y + h * 0.72], [x + w * 0.8, y + h]], 'escuro');
  },
};

// janela de navegador rabiscada com o nome do projeto embaixo
export function projeto(titulo, linha) {
  return (g, x, y, w, h, s) => {
    const hj = h * 0.66;
    g.ret(x, y, w, hj, null, { fundo: true });
    g.ret(x, y, w, hj * 0.12, 'claro');
    for (let i = 0; i < 3; i++) g.elipse(x + w * (0.05 + i * 0.05), y + hj * 0.06, hj * 0.025, hj * 0.025, 'preto');
    g.ret(x + w * 0.06, y + hj * 0.22, w * 0.55, hj * 0.4, 'medio');
    g.ret(x + w * 0.66, y + hj * 0.22, w * 0.28, hj * 0.4, 'claro');
    for (let i = 0; i < 3; i++) g.linha([[x + w * 0.06, y + hj * (0.72 + i * 0.09)], [x + w * (0.9 - i * 0.2), y + hj * (0.72 + i * 0.09)]], { peso: 0.8 });
    g.texto(titulo, x + w / 2, y + hj + h * 0.12, h * 0.13);
    g.texto(linha, x + w / 2, y + hj + h * 0.26, h * 0.075, { peso: 500 });
  };
}

// páginas do livro aberto: à esquerda a área e o nome, à direita o que fiz com aquilo
export function paginaTitulo(titulo, categoria) {
  return (g, W, H, s) => {
    g.texto(categoria.toUpperCase(), W / 2, H * 0.3, H * 0.06, { peso: 500 });
    palavras(titulo, 12).forEach((l, k, arr) => g.texto(l, W / 2, H * (0.48 + (k - (arr.length - 1) / 2) * 0.13), H * 0.12));
    g.linha([[W * 0.3, H * 0.64], [W * 0.7, H * 0.64]], { peso: 0.8 });
    g.texto('(clique para fechar)', W / 2, H * 0.88, H * 0.042, { peso: 500 });
  };
}
export function paginaTexto(texto) {
  return (g, W, H, s) => {
    palavras(texto, 20).slice(0, 9).forEach((l, k) => g.texto(l, W * 0.1, H * (0.2 + k * 0.08), H * 0.06, { alinha: 'left', peso: 500 }));
    g.texto('~', W / 2, H * 0.9, H * 0.06, { peso: 500 });
  };
}

// bilhetinho preso no quadro de cortiça: papel quadrado, alfinete e texto à mão
export function notinha(texto) {
  return (g, W, H, s) => {
    g.forma([[6 * s, 12 * s], [W - 8 * s, 6 * s], [W - 5 * s, H - 9 * s], [9 * s, H - 6 * s]], null, { fundo: true, peso: 1.1 });
    g.elipse(W / 2, 22 * s, 8 * s, 8 * s, 'preto');
    const linhas = palavras(texto, 16).slice(0, 5);
    linhas.forEach((l, k) => g.texto(l, W / 2, H * (0.5 + (k - (linhas.length - 1) / 2) * 0.15), H * 0.12, { peso: 500 }));
  };
}

// parada da trajetória, presa numa nuvem do voo
export function marcoVoo(ano, nome, cargo, texto) {
  return (g, W, H, s) => {
    g.forma([[6 * s, 10 * s], [W - 6 * s, 4 * s], [W - 10 * s, H - 6 * s], [10 * s, H - 10 * s]], null, { fundo: true, peso: 1.2 });
    g.texto(ano, W / 2, H * 0.15, H * 0.11, { cor: '#b5652e' });
    g.texto(nome, W / 2, H * 0.34, H * 0.17);
    g.texto(cargo, W / 2, H * 0.5, H * 0.075, { peso: 500 });
    g.linha([[W * 0.25, H * 0.58], [W * 0.75, H * 0.58]], { peso: 0.8 });
    palavras(texto, 28).slice(0, 3).forEach((l, k) => g.texto(l, W / 2, H * (0.69 + k * 0.1), H * 0.07, { peso: 500 }));
  };
}

export function texto(titulo, paragrafo) {
  return (g, W, H, s) => {
    g.forma([[6 * s, 10 * s], [W - 6 * s, 4 * s], [W - 10 * s, H - 6 * s], [10 * s, H - 10 * s]], null, { fundo: true, peso: 1.1 });
    g.texto(titulo, W / 2, H * 0.14, H * 0.1);
    palavras(paragrafo, 34).forEach((l, k) => g.texto(l, W * 0.1, H * (0.3 + k * 0.08), H * 0.058, { alinha: 'left', peso: 500 }));
  };
}

export function palavras(frase, max) {
  const linhas = [];
  let atual = '';
  for (const p of frase.split(' ')) {
    if ((atual + ' ' + p).trim().length > max) { linhas.push(atual.trim()); atual = p; } else atual += ' ' + p;
  }
  if (atual.trim()) linhas.push(atual.trim());
  return linhas;
}

/* ---------- retrato "gravura" a partir da foto ---------- */

// linhas horizontais onduladas mais grossas onde a foto é mais escura
export function gravura(img, recorte) {
  const amostra = document.createElement('canvas');
  amostra.width = 90; amostra.height = 120;
  const ax = amostra.getContext('2d');
  ax.drawImage(img, recorte.x, recorte.y, recorte.w, recorte.h, 0, 0, 90, 120);
  const px = ax.getImageData(0, 0, 90, 120).data;
  const lum = (i, j) => {
    const k = (Math.min(119, Math.max(0, j)) * 90 + Math.min(89, Math.max(0, i))) * 4;
    return (0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]) / 255;
  };
  return (g, W, H, s) => {
    g.ret(4 * s, 4 * s, W - 8 * s, H - 8 * s, 'medio', { fundo: true, peso: 1.4 });
    const m = W * 0.09;
    g.ret(m, m, W - 2 * m, H - 2 * m, null, { fundo: true });
    const c = g.ctx;
    const x0 = m * 1.25, y0 = m * 1.25, w = W - 2.5 * m, h = H - 2.5 * m;
    c.save();
    c.strokeStyle = g.tinta ? '#141414' : 'rgba(70,70,70,0.5)';
    const passo = h / 95;
    for (let j = 0; j < 95; j++) {
      const y = y0 + j * passo;
      for (let i = 0; i < 90; i++) {
        const d = 1 - lum(i, Math.round((j / 95) * 120));
        const esp = Math.max(0, d - 0.15) * passo * (g.tinta ? 1.05 : 0.6);
        if (esp < 0.3) continue;
        const x = x0 + (i / 90) * w;
        const onda = Math.sin(i * 0.35 + j * 0.2) * passo * 0.15;
        c.lineWidth = esp;
        c.beginPath();
        c.moveTo(x, y + onda);
        c.lineTo(x + w / 90 + 0.5, y + Math.sin((i + 1) * 0.35 + j * 0.2) * passo * 0.15);
        c.stroke();
      }
    }
    c.restore();
  };
}

/* ---------- varanda de projetos ---------- */

export function cidadePapel({ semente = 824 } = {}) {
  return (g, W, H, s) => {
    const r = mulberry32(semente);
    const horizonte = H * 0.9;
    g.elipse(W * 0.76, H * 0.2, H * 0.09, H * 0.09, 'claro', { peso: 0.7 });
    for (let camada = 0; camada < 2; camada++) {
      let x = -W * 0.03;
      while (x < W) {
        const w = W * (0.035 + r() * 0.035);
        const h = H * ((camada ? 0.2 : 0.12) + r() * (camada ? 0.38 : 0.2));
        const y = horizonte - h;
        const cor = camada ? 'claro' : 'medio';
        g.forma([[x, horizonte], [x + 2 * s, y + 3 * s], [x + w * 0.48, y], [x + w - 2 * s, y + 2 * s], [x + w, horizonte]], cor, { fundo: true, peso: camada ? 0.8 : 0.45 });
        if (camada) {
          for (let wy = y + H * 0.055; wy < horizonte - H * 0.035; wy += H * 0.075) {
            for (let wx = x + w * 0.2; wx < x + w * 0.85; wx += w * 0.25) {
              if (r() > 0.34) {
                const acesa = r() > 0.62;
                g.ret(wx, wy, Math.max(2 * s, w * 0.08), H * 0.022, acesa ? null : r() > 0.72 ? 'preto' : null, {
                  peso: 0.35,
                  fundo: acesa,
                  sempreCor: acesa,
                  cor: acesa ? (r() > 0.45 ? '#f4c95d' : '#ed8f5b') : null,
                });
              }
            }
          }
        }
        x += w * 0.88;
      }
    }
    const marcos = [
      [0.1, 0.12, 0.075, 0.66],
      [0.46, 0.07, 0.09, 0.74],
      [0.8, 0.2, 0.065, 0.57],
    ];
    for (const [px, py, pw, ph] of marcos) {
      const x = W * px, y = H * py, w = W * pw, h = H * ph;
      g.forma([[x, horizonte], [x, y + H * 0.035], [x + w * 0.5, y], [x + w, y + H * 0.035], [x + w, horizonte]], 'claro', { fundo: true, peso: 1 });
      for (let wy = y + H * 0.1; wy < Math.min(y + h, horizonte) - H * 0.04; wy += H * 0.075) {
        g.linha([[x + w * 0.2, wy], [x + w * 0.8, wy]], { peso: 0.4 });
        for (const fx of [0.25, 0.5, 0.75]) {
          if (r() > 0.38) g.elipse(x + w * fx, wy - H * 0.018, H * 0.009, H * 0.009, null, {
            fundo: true,
            sempreCor: true,
            cor: r() > 0.4 ? '#f4c95d' : '#ed8f5b',
            peso: 0.25,
          });
        }
      }
      g.linha([[x + w * 0.5, y], [x + w * 0.5, y - H * 0.055]], { peso: 0.8 });
    }
    for (let i = 0; i < 5; i++) {
      const x0 = W * (0.08 + i * 0.19), y0 = H * (0.2 + (i % 2) * 0.12);
      g.linha([[x0, y0], [x0 + W * 0.045, y0 - H * 0.012], [x0 + W * 0.085, y0]], { peso: 0.45 });
    }
    g.linha([[0, horizonte], [W, horizonte]], { peso: 1.1 });
  };
}

export function cidadeVistaDeCima() {
  return (g, W, H, s) => {
    const r = mulberry32(197);
    const colunas = 9, linhas = 11;
    const ruaX = W / colunas, ruaY = H / linhas;
    g.ret(W * 0.47, 0, W * 0.06, H, null, { fundo: true, sempreCor: true, cor: '#dedbd2', peso: 1.2 });
    g.ret(0, H * 0.44, W, H * 0.07, null, { fundo: true, sempreCor: true, cor: '#dedbd2', peso: 1.2 });
    for (let y = H * 0.025; y < H; y += H * 0.055) g.ret(W * 0.497, y, W * 0.006, H * 0.022, null, { fundo: true, sempreCor: true, cor: '#e7b94f', peso: 0.2 });
    for (let coluna = 0; coluna <= colunas; coluna++) {
      const x = coluna * ruaX;
      g.linha([[x, 0], [x + (coluna - colunas / 2) * ruaX * 0.08, H]], { peso: coluna % 3 === 0 ? 1.65 : 0.75 });
    }
    for (let linha = 0; linha <= linhas; linha++) {
      const y = linha * ruaY;
      g.linha([[0, y], [W, y]], { peso: linha % 3 === 0 ? 1.5 : 0.7 });
    }
    for (let coluna = 0; coluna < colunas; coluna++) {
      for (let linha = 0; linha < linhas; linha++) {
        if (r() < 0.16) continue;
        const margemX = ruaX * (0.12 + r() * 0.08), margemY = ruaY * (0.12 + r() * 0.08);
        const x = coluna * ruaX + margemX, y = linha * ruaY + margemY;
        const w = ruaX - margemX * 2, h = ruaY - margemY * 2;
        const desloca = Math.min(w, h) * 0.09;
        g.forma([[x, y + desloca], [x + desloca, y], [x + w, y], [x + w - desloca, y + h], [x, y + h]], linha % 2 ? 'claro' : 'medio', { fundo: true, peso: 1.15 });
        g.ret(x + w * 0.15, y + h * 0.18, w * 0.7, h * 0.62, null, { peso: 0.65 });
        if (r() > 0.58) {
          g.elipse(x + w * 0.5, y + h * 0.48, Math.min(w, h) * 0.16, Math.min(w, h) * 0.16, null, { peso: 0.7 });
          g.linha([[x + w * 0.38, y + h * 0.48], [x + w * 0.62, y + h * 0.48]], { peso: 0.45 });
        }
        if (r() > 0.45) g.elipse(x + w * (0.25 + r() * 0.5), y + h * (0.25 + r() * 0.5), 2.2 * s, 2.2 * s, null, {
          fundo: true,
          sempreCor: true,
          cor: r() > 0.35 ? '#f4c95d' : '#ed8f5b',
          peso: 0.25,
        });
      }
    }
  };
}

export function posteVaral() {
  return (g, W, H, s) => {
    g.ret(W * 0.34, H * 0.04, W * 0.32, H * 0.91, 'medio', { fundo: true, peso: 1.2, angulo: Math.PI / 2 });
    g.ret(W * 0.1, H * 0.93, W * 0.8, H * 0.055, 'claro', { fundo: true, peso: 1.1 });
    for (const y of [H * 0.11, H * 0.7]) {
      g.elipse(W * 0.5, y, W * 0.28, W * 0.28, 'preto', { peso: 0.8 });
      g.linha([[W * 0.18, y], [W * 0.82, y]], { peso: 1.1 });
    }
    g.linha([[W * 0.5, H * 0.04], [W * 0.5, H * 0.95]], { peso: 0.45 });
  };
}

export function parapeitoVaranda(largura) {
  return (g, W, H, s) => {
    const u = W / largura;
    g.ret(0, H * 0.12, W, 0.09 * u, 'claro', { fundo: true, peso: 1.2 });
    g.ret(0, H * 0.86, W, 0.1 * u, 'claro', { fundo: true, peso: 1.2 });
    for (let x = 0.08 * u; x < W; x += 0.42 * u) {
      g.ret(x, H * 0.14, 0.055 * u, H * 0.73, 'claro', { fundo: true, peso: 0.85, angulo: (x % 2 ? 1 : -1) * 0.008 });
    }
    g.linha([[0, H - 2 * s], [W, H - 2 * s]], { peso: 0.55 });
  };
}

/* ---------- galeria: cartões no varal ---------- */

// prendedor de roupa no topo do cartão
function prendedor(g, W, s) {
  g.ret(W / 2 - 9 * s, -2 * s, 18 * s, 46 * s, 'medio', { fundo: true, peso: 1.1, angulo: Math.PI / 2 });
  g.linha([[W / 2, 4 * s], [W / 2, 40 * s]], { peso: 0.6 });
  g.elipse(W / 2, 22 * s, 4 * s, 4 * s, 'preto');
}

export function cartaoFrente(titulo, linha, ordem) {
  return (g, W, H, s) => {
    g.forma([[6 * s, 20 * s], [W - 6 * s, 16 * s], [W - 8 * s, H - 6 * s], [8 * s, H - 8 * s]], null, { fundo: true, peso: 1.2 });
    g.texto(`nº ${String(ordem).padStart(2, '0')}`, W * 0.1, H * 0.1, H * 0.055, { alinha: 'left', peso: 500 });
    projeto(titulo, linha)(g, W * 0.1, H * 0.16, W * 0.8, H * 0.7, s);
    g.texto('virar ↻', W * 0.86, H * 0.93, H * 0.05, { alinha: 'right', peso: 500 });
    prendedor(g, W, s);
  };
}

export function cartaoVerso(titulo, descricao, link) {
  return (g, W, H, s) => {
    g.forma([[8 * s, 16 * s], [W - 6 * s, 20 * s], [W - 8 * s, H - 8 * s], [6 * s, H - 6 * s]], 'claro', { fundo: true, peso: 1.2, angulo: -Math.PI / 5 });
    g.ret(W * 0.08, H * 0.1, W * 0.84, H * 0.8, null, { fundo: true, peso: 0.8 });
    g.texto(titulo, W / 2, H * 0.2, H * 0.085);
    g.linha([[W * 0.2, H * 0.27], [W * 0.8, H * 0.27]], { peso: 0.7 });
    palavras(descricao, 24).forEach((l, k) => g.texto(l, W * 0.14, H * (0.37 + k * 0.075), H * 0.052, { alinha: 'left', peso: 500 }));
    if (link) {
      g.ret(W * 0.18, H * 0.75, W * 0.64, H * 0.1, null, { fundo: true, peso: 1.2 });
      g.texto(`${link.replace('https://', '')} ↗`, W / 2, H * 0.8, H * 0.05);
    }
    prendedor(g, W, s);
  };
}

// corda do varal, fazendo uma barriguinha no meio
export function varal() {
  return (g, W, H, s) => {
    const pts = Array.from({ length: 13 }, (_, i) => { const t = i / 12; return [t * W, H * 0.25 + Math.sin(t * Math.PI) * H * 0.35]; });
    g.linha(pts, { peso: 1.5 });
    g.linha(pts.map(([x, y]) => [x, y + 3 * s]), { peso: 0.6 });
    g.elipse(8 * s, H * 0.25, 7 * s, 7 * s, 'preto');
    g.elipse(W - 8 * s, H * 0.25, 7 * s, 7 * s, 'preto');
  };
}

/* ---------- contato: formulário de papel ---------- */

export function etiqueta(textoEtiqueta) {
  return (g, W, H, s) => {
    g.forma([[4 * s, H * 0.2], [W * 0.82, 4 * s], [W - 4 * s, H / 2], [W * 0.82, H - 4 * s], [4 * s, H * 0.8]], null, { fundo: true, peso: 1.3 });
    g.elipse(W * 0.87, H / 2, 6 * s, 6 * s, null);
    g.texto(textoEtiqueta, W * 0.43, H / 2, H * 0.34);
  };
}

// o formulário é redesenhado a cada tecla: base fixa + o que a pessoa escreveu
export function formulario({ nome, mensagem, campo, cursor, aviso }) {
  return (g, W, H, s) => {
    g.forma([[8 * s, 14 * s], [W - 6 * s, 6 * s], [W - 10 * s, H - 8 * s], [12 * s, H - 12 * s]], null, { fundo: true, peso: 1.3 });
    g.texto('Deixe um recado', W / 2, H * 0.1, H * 0.07);
    const escreve = (t, x, y, tam) => g.texto(t, x, y, tam, { alinha: 'left', peso: 500 });
    escreve('seu nome:', W * 0.1, H * 0.2, H * 0.04);
    g.linha([[W * 0.1, H * 0.3], [W * 0.9, H * 0.3]], { peso: campo === 'nome' ? 1.6 : 0.8 });
    escreve(nome + (campo === 'nome' && cursor ? '|' : ''), W * 0.12, H * 0.265, H * 0.05);
    escreve('mensagem:', W * 0.1, H * 0.37, H * 0.04);
    const linhas = palavras(mensagem, 30).slice(-4);
    [0.46, 0.54, 0.62, 0.7].forEach((y, k) => {
      g.linha([[W * 0.1, H * y], [W * 0.9, H * y]], { peso: campo === 'mensagem' ? 1.4 : 0.7 });
      const t = linhas[k] ?? '';
      const ultima = k === Math.max(0, linhas.length - 1);
      escreve(t + (campo === 'mensagem' && cursor && ultima ? '|' : ''), W * 0.12, H * (y - 0.035), H * 0.045);
    });
    if (aviso) g.texto(aviso, W / 2, H * 0.765, H * 0.038, { peso: 500 });
    g.ret(W * 0.16, H * 0.81, W * 0.68, H * 0.1, 'claro', { fundo: true, peso: 1.4 });
    g.texto('enviar pelo WhatsApp →', W / 2, H * 0.86, H * 0.05);
  };
}

/* ---------- vida no corredor ---------- */

export function balao(frase) {
  return (g, W, H, s) => {
    g.forma(poligonoBalao(W, H), null, { fundo: true, peso: 1.3 });
    palavras(frase, 22).slice(0, 3).forEach((l, k, arr) => g.texto(l, W / 2, H * (0.38 + (k - (arr.length - 1) / 2) * 0.2), H * 0.16, { peso: 500 }));
  };
}
function poligonoBalao(W, H) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    pts.push([W / 2 + Math.cos(a) * W * 0.46, H * 0.4 + Math.sin(a) * H * 0.34]);
    // rabinho do balão saindo por baixo, à esquerda (no canvas, y cresce para baixo)
    if (i === 7) pts.push([W * 0.22, H * 0.98]);
  }
  return pts;
}

export function placaEntrada(titulo, sub) {
  return (g, W, H, s) => {
    g.linha([[W * 0.2, 0], [W * 0.2, H * 0.28]], { peso: 1 });
    g.linha([[W * 0.8, 0], [W * 0.8, H * 0.28]], { peso: 1 });
    g.ret(6 * s, H * 0.26, W - 12 * s, H * 0.7, null, { fundo: true, peso: 1.5 });
    g.ret(14 * s, H * 0.26 + 8 * s, W - 28 * s, H * 0.7 - 16 * s, null, { peso: 0.7 });
    g.texto(titulo, W / 2, H * 0.52, H * 0.26);
    g.texto(sub, W / 2, H * 0.78, H * 0.12, { peso: 500 });
  };
}

// janela: moldura + paisagem; as nuvens são redesenhadas em movimento
// o que se vê pela janela (sem moldura: a moldura é de dobradura): céu com nuvens
// passando e morrinhos lá embaixo
export function vistaJanela(deslocamento) {
  return (g, W, H, s) => {
    g.ret(0, 0, W, H, null, { fundo: true, peso: 0 });
    for (let k = 0; k < 3; k++) {
      const cx = ((((k * 0.37 + deslocamento * (0.6 + k * 0.25)) % 1.3) + 1.3) % 1.3 - 0.15) * W;
      const cy = H * (0.18 + k * 0.13);
      for (const [dx, dy, r] of [[0, 0, 0.09], [0.08, -0.03, 0.07], [-0.08, 0.01, 0.06], [0.15, 0.02, 0.05]]) {
        g.elipse(cx + dx * W, cy + dy * H, r * W, r * W * 0.7, null, { fundo: true, peso: 0.9 });
      }
    }
    g.forma([[0, H], [0, H * 0.74], [W * 0.3, H * 0.6], [W * 0.55, H * 0.72], [W * 0.8, H * 0.55], [W, H * 0.66], [W, H]], 'claro', { fundo: true });
    g.forma([[0, H], [0, H * 0.86], [W * 0.4, H * 0.78], [W * 0.7, H * 0.88], [W, H * 0.8], [W, H]], 'medio', { fundo: true });
  };
}

// janela desenhada na parede: moldura a lápis, cruzeta, peitoril e a vista por dentro
export function janela(deslocamento) {
  return (g, W, H, s) => {
    const m = W * 0.08, x0 = m, y0 = m, w = W - 2 * m, h = H - 2 * m;
    g.ret(4 * s, 4 * s, W - 8 * s, H - 8 * s, 'claro', { fundo: true, peso: 1.4, angulo: Math.PI / 2 });
    g.ctx.save();
    g.ctx.translate(x0, y0);
    g.ctx.beginPath(); g.ctx.rect(0, 0, w, h); g.ctx.clip();
    vistaJanela(deslocamento)(g, w, h, s);
    g.ctx.restore();
    g.ret(x0, y0, w, h, null, { peso: 1.1 });
    g.linha([[W / 2, m], [W / 2, H - m]], { peso: 1.2 });
    g.linha([[m, H * 0.45], [W - m, H * 0.45]], { peso: 1.2 });
    g.ret(m * 0.3, H - m * 1.2, W - m * 0.6, m * 0.8, 'medio', { fundo: true, peso: 1 });
  };
}

// quadro desenhado na parede: moldura a lápis, passe-partout e a cena
export function quadro(conteudo) {
  return (g, W, H, s) => {
    const m = Math.min(W, H) * 0.09;
    g.ret(4 * s, 4 * s, W - 8 * s, H - 8 * s, 'medio', { fundo: true, peso: 1.3 });
    g.ret(m, m, W - 2 * m, H - 2 * m, null, { fundo: true, peso: 1 });
    g.ret(m * 1.7, m * 1.7, W - 3.4 * m, H - 3.4 * m, null, { peso: 0.7 });
    conteudo(g, m * 2.1, m * 2.1, W - 4.2 * m, H - 4.2 * m, s);
  };
}

/* ---------- fachada de entrada ---------- */

export function cordaoLuzes() {
  return (g, W, H, s) => {
    const pontos = Array.from({ length: 31 }, (_, i) => {
      const t = i / 30;
      return [W * t, H * (0.18 + Math.sin(t * Math.PI) * 0.36)];
    });
    g.linha(pontos, { peso: 1.2 });
    for (let i = 1; i < pontos.length - 1; i += 3) {
      const [x, y] = pontos[i];
      g.linha([[x, y], [x, y + H * 0.16]], { peso: 0.55 });
      g.elipse(x, y + H * 0.2, H * 0.055, H * 0.075, null, {
        fundo: true,
        sempreCor: true,
        cor: i % 2 ? '#f4c95d' : '#ed8f5b',
        peso: 0.65,
      });
      g.elipse(x, y + H * 0.2, H * 0.11, H * 0.13, null, { peso: 0.22 });
    }
  };
}


export function arandelaEntrada() {
  return (g, W, H, s) => {
    g.elipse(W / 2, H * 0.42, W * 0.44, W * 0.44, null, { sempreCor: true, cor: '#f5d77a', peso: 0.25 });
    g.forma([[W * 0.23, H * 0.52], [W * 0.77, H * 0.52], [W * 0.64, H * 0.78], [W * 0.36, H * 0.78]], 'medio', { fundo: true, peso: 1.15 });
    g.elipse(W / 2, H * 0.43, W * 0.16, H * 0.13, null, { fundo: true, sempreCor: true, cor: '#f4c95d', peso: 0.8 });
    g.ret(W * 0.45, H * 0.76, W * 0.1, H * 0.2, 'escuro', { fundo: true, peso: 0.7 });
  };
}

export function capachoEntrada() {
  return (g, W, H, s) => {
    g.forma([[5 * s, H * 0.16], [W - 7 * s, H * 0.1], [W - 3 * s, H * 0.9], [8 * s, H * 0.94]], null, { fundo: true, sempreCor: true, cor: '#c78d51', peso: 1.25 });
    for (let x = W * 0.08; x < W * 0.94; x += W * 0.08) g.linha([[x, H * 0.23], [x, H * 0.84]], { peso: 0.3 });
    g.texto('ENTRE  →', W / 2, H * 0.54, H * 0.27, { cor: '#332a22' });
  };
}

export function tijolos(largura) {
  return (g, W, H, s) => {
    const u = W / largura, h = 0.22 * u, w = 0.52 * u;
    const r = mulberry32(99);
    for (let y = 0, lin = 0; y < H; y += h, lin++) {
      g.linha([[0, y], [W, y]], { peso: 0.34 });
      for (let x = lin % 2 ? -w / 2 : 0; x < W; x += w) {
        g.linha([[x, y], [x, y + h]], { peso: 0.34 });
        if (r() < 0.09) g.ret(x + 3 * s, y + 3 * s, w - 6 * s, h - 6 * s, 'claro', { peso: 0 });
      }
    }
  };
}

export function arvore() {
  return (g, W, H, s) => {
    const r = mulberry32(3), cx = W * 0.47;
    g.forma([[W * 0.31, H], [W * 0.39, H * 0.91], [W * 0.41, H * 0.58], [W * 0.45, H * 0.43], [W * 0.53, H * 0.46], [W * 0.56, H * 0.62], [W * 0.59, H * 0.91], [W * 0.72, H]], null, { fundo: true, peso: 1.35, cor: '#8f6746' });
    const galhos = [
      [[0.45, 0.58], [0.34, 0.43], [0.19, 0.34]],
      [[0.5, 0.55], [0.62, 0.4], [0.79, 0.31]],
      [[0.48, 0.48], [0.43, 0.3], [0.36, 0.2]],
      [[0.52, 0.48], [0.59, 0.28], [0.67, 0.18]],
    ];
    for (const galho of galhos) {
      const pts = galho.map(([x, y]) => [W * x, H * y]);
      g.linha(pts, { peso: 4.2 });
      g.linha(pts.map(([x, y]) => [x + 2.5 * s, y]), { peso: 1.4 });
    }
    for (let i = 0; i < 14; i++) {
      const y = H * (0.55 + i * 0.027), onda = Math.sin(i * 1.7) * W * 0.018;
      g.linha([[cx - W * 0.035 + onda, y], [cx + W * 0.035 + onda * 0.4, y - H * 0.018]], { peso: 0.45 });
    }
    for (const [x, y, rw, rh] of [[0.44, 0.67, 0.025, 0.018], [0.52, 0.79, 0.03, 0.02]]) {
      g.elipse(W * x, H * y, W * rw, H * rh, 'escuro', { peso: 0.7 });
      g.elipse(W * x, H * y, W * rw * 0.45, H * rh * 0.45, null, { peso: 0.35 });
    }
    const copas = [[0.18, 0.3, 0.22, 0.16], [0.34, 0.19, 0.24, 0.17], [0.54, 0.16, 0.26, 0.18], [0.75, 0.27, 0.24, 0.17], [0.58, 0.34, 0.3, 0.19], [0.32, 0.38, 0.28, 0.18]];
    for (const [x, y, rw, rh] of copas) {
      const contorno = Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const ondula = 0.84 + r() * 0.2 + Math.sin(i * 2.7) * 0.055;
        return [W * (x + Math.cos(a) * rw * ondula), H * (y + Math.sin(a) * rh * ondula)];
      });
      g.forma(contorno, null, { fundo: true, peso: 0.8, cor: r() > 0.5 ? '#8fbf73' : '#a5cb82' });
    }
    for (let i = 0; i < 34; i++) {
      const x = W * (0.1 + r() * 0.78), y = H * (0.1 + r() * 0.36);
      const rw = W * (0.012 + r() * 0.009), rh = H * (0.008 + r() * 0.007);
      g.elipse(x, y, rw, rh, null, { fundo: true, peso: 0.38, cor: r() > 0.45 ? '#759f5f' : '#a7c97f' });
      g.linha([[x - rw * 0.7, y + rh * 0.6], [x + rw * 0.7, y - rh * 0.6]], { peso: 0.25 });
    }
    g.linha([[W * 0.3, H], [W * 0.39, H * 0.93], [W * 0.47, H]], { peso: 1.1 });
    g.linha([[W * 0.48, H], [W * 0.58, H * 0.92], [W * 0.73, H]], { peso: 1.1 });
  };
}

export function mousePendurado() {
  return (g, W, H, s) => {
    const cabo = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      return [W * (0.5 + Math.sin(t * 8.5) * 0.055 * (1 - t)), H * t * 0.57];
    });
    g.linha(cabo, { peso: 1.35 });
    g.linha(cabo.map(([x, y]) => [x + 2 * s, y]), { peso: 0.45 });
    g.ret(W * 0.43, H * 0.02, W * 0.14, H * 0.08, 'escuro', { fundo: true, peso: 0.8 });
    g.forma([[W * 0.42, H * 0.56], [W * 0.58, H * 0.56], [W * 0.74, H * 0.68], [W * 0.78, H * 0.86], [W * 0.68, H * 0.96], [W * 0.32, H * 0.96], [W * 0.22, H * 0.86], [W * 0.26, H * 0.68]], null, { fundo: true, peso: 1.35, cor: '#cbd4da' });
    g.linha([[W * 0.5, H * 0.57], [W * 0.5, H * 0.75]], { peso: 0.85 });
    g.linha([[W * 0.27, H * 0.7], [W * 0.5, H * 0.75], [W * 0.73, H * 0.7]], { peso: 0.55 });
    g.ret(W * 0.45, H * 0.61, W * 0.1, H * 0.095, 'escuro', { fundo: true, peso: 0.75 });
    for (let y = H * 0.625; y < H * 0.69; y += H * 0.014) g.linha([[W * 0.47, y], [W * 0.53, y]], { peso: 0.3 });
    g.ret(W * 0.25, H * 0.79, W * 0.06, H * 0.08, 'medio', { fundo: true, peso: 0.55 });
    g.texto('</>', W / 2, H * 0.85, H * 0.075, { peso: 500 });
    g.linha([[W * 0.3, H * 0.9], [W * 0.5, H * 0.94], [W * 0.7, H * 0.9]], { peso: 0.4 });
  };
}

export function gatoFrente() {
  return (g, W, H, s) => {
    g.forma([[W * 0.25, H], [W * 0.22, H * 0.62], [W * 0.35, H * 0.42], [W * 0.65, H * 0.42], [W * 0.78, H * 0.62], [W * 0.75, H]], null, { fundo: true, peso: 1.2, cor: '#d9d4cc' });
    g.elipse(W / 2, H * 0.3, W * 0.24, H * 0.17, null, { fundo: true, peso: 1.2, cor: '#d9d4cc' });
    g.forma([[W * 0.3, H * 0.22], [W * 0.3, H * 0.04], [W * 0.43, H * 0.15]], null, { fundo: true, peso: 1.1, cor: '#d9d4cc' });
    g.forma([[W * 0.57, H * 0.15], [W * 0.7, H * 0.04], [W * 0.7, H * 0.22]], null, { fundo: true, peso: 1.1, cor: '#d9d4cc' });
    for (const x of [0.41, 0.59]) g.elipse(W * x, H * 0.29, 3.5 * s, 4.5 * s, 'preto');
    g.forma([[W * 0.48, H * 0.35], [W * 0.52, H * 0.35], [W * 0.5, H * 0.37]], 'preto');
    for (const d of [-1, 1]) for (const k of [0, 1]) g.linha([[W * (0.5 + d * 0.08), H * (0.37 + k * 0.02)], [W * (0.5 + d * 0.3), H * (0.34 + k * 0.05)]], { peso: 0.4 });
    g.linha([[W * 0.42, H], [W * 0.43, H * 0.8]], { peso: 0.7 });
    g.linha([[W * 0.58, H], [W * 0.57, H * 0.8]], { peso: 0.7 });
  };
}

export function janelaCasa() {
  return (g, W, H, s) => {
    g.ret(4 * s, 4 * s, W - 8 * s, H - 8 * s, null, { fundo: true, peso: 1.4, cor: '#d7e6ef' });
    g.linha([[W / 2, 4 * s], [W / 2, H - 4 * s]], { peso: 1.2 });
    g.linha([[4 * s, H / 2], [W - 4 * s, H / 2]], { peso: 1.2 });
    for (const [x, y] of [[0.15, 0.15], [0.62, 0.15]]) g.linha([[W * x, H * (y + 0.15)], [W * (x + 0.12), H * y]], { peso: 0.5 });
    g.ret(-2 * s, H - 14 * s, W + 4 * s, 12 * s, 'claro', { fundo: true, peso: 1 });
  };
}


export function adesivosPortaDupla(lado) {
  return (g, W, H) => {
    const colados = lado < 0
      ? [['html', 0.35, 0.13], ['js', 0.6, 0.3], ['react', 0.38, 0.58], ['ts', 0.6, 0.78]]
      : [['node', 0.42, 0.18], ['php', 0.6, 0.45], ['sql', 0.42, 0.74]];
    for (const [tipo, x, y] of colados) adesivo(g, tipo, W * x, H * y, W * 0.15);
  };
}

export function caminhoPedras() {
  return (g, W, H, s) => {
    const r = mulberry32(31);
    for (let y = 10 * s; y < H; y += H * 0.14) {
      for (let x = W * 0.08 + (r() - 0.5) * 20 * s; x < W * 0.92; x += W * 0.28) {
        g.elipse(x + W * 0.1, y + H * 0.05, W * (0.11 + r() * 0.03), H * (0.05 + r() * 0.015), null, { fundo: true, peso: 0.9 });
      }
    }
  };
}

export function chaoTerra() {
  return (g, W, H, s) => {
    const r = mulberry32(5);
    for (let i = 0; i < (W * H) / (60000 * s * s); i++) {
      const x = r() * W, y = r() * H;
      g.linha([[x, y], [x + 4 * s, y - 8 * s]], { peso: 0.4 });
      g.linha([[x + 5 * s, y], [x + 7 * s, y - 7 * s]], { peso: 0.4 });
    }
  };
}

// Pequena mancha de contato, usada sob recortes verticais da fachada para que
// pareçam apoiados no piso em vez de impressos na parede.
export function sombraChao() {
  return (g, W, H, s) => {
    g.elipse(W / 2, H / 2, W * 0.42, H * 0.28, 'claro', { fundo: true, peso: 0.28, cor: '#c9c4ba' });
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const x = W * (0.22 + t * 0.56);
      g.linha([[x - 8 * s, H * 0.62], [x + 10 * s, H * 0.38]], { peso: 0.22 });
    }
  };
}

/* ---------- píer (contato) ---------- */

// ondas em espiral, desenhadas para repetir lado a lado (a textura é "tileable")
export function ondas() {
  return (g, W, H, s) => {
    const r = mulberry32(12);
    for (let k = 0; k < 26; k++) {
      const cx = r() * W, cy = r() * H, R = (0.05 + r() * 0.05) * W;
      for (const [ox, oy] of [[0, 0], [W, 0], [-W, 0], [0, H], [0, -H]]) {
        g.linha(Array.from({ length: 16 }, (_, i) => { const a = i * 0.55, rr = R * (1 - i / 18); return [cx + ox + Math.cos(a) * rr, cy + oy + Math.sin(a) * rr * 0.45]; }), { peso: 0.5 });
      }
    }
    for (let y = 0; y < H; y += H / 14) {
      const f = r() * 10;
      g.linha(Array.from({ length: 30 }, (_, i) => [(i / 29) * W, y + Math.sin((i / 29) * Math.PI * 4 + f) * H * 0.012]), { peso: 0.35 });
    }
  };
}

export function deck(largura) {
  return (g, W, H, s) => {
    const u = W / largura, tabua = 0.35 * u;
    for (let x = 0; x < W; x += tabua) {
      g.ret(x + 2 * s, -10, tabua - 4 * s, H + 20, null, { fundo: true, peso: 0.9, cor: '#b0916a' });
      g.linha(Array.from({ length: 12 }, (_, i) => [x + tabua * 0.5 + Math.sin(i) * 3 * s, (i / 11) * H]), { peso: 0.3 });
      for (let y = 0.5 * u; y < H; y += 1.5 * u) { g.elipse(x + tabua * 0.25, y, 2 * s, 2 * s, 'preto'); g.elipse(x + tabua * 0.75, y, 2 * s, 2 * s, 'preto'); }
    }
  };
}

export function farol() {
  return (g, W, H) => {
    g.forma([[0, H], [W * 0.1, H * 0.82], [W * 0.35, H * 0.78], [W * 0.6, H * 0.8], [W * 0.9, H * 0.86], [W, H]], 'claro', { fundo: true, peso: 1 });
    g.forma([[W * 0.38, H * 0.8], [W * 0.43, H * 0.25], [W * 0.57, H * 0.25], [W * 0.62, H * 0.8]], null, { fundo: true, peso: 1.2 });
    for (const y of [0.4, 0.55, 0.7]) g.linha([[W * 0.4, H * y], [W * 0.6, H * y]], { peso: 0.5 });
    g.ret(W * 0.41, H * 0.16, W * 0.18, H * 0.09, null, { fundo: true, peso: 1, cor: '#f5e08a' });
    g.forma([[W * 0.39, H * 0.16], [W * 0.5, H * 0.07], [W * 0.61, H * 0.16]], 'medio', { fundo: true, peso: 1 });
  };
}

export function nuvem() {
  return (g, W, H) => {
    const bolhas = [[0.25, 0.62, 0.2], [0.45, 0.45, 0.25], [0.68, 0.52, 0.22], [0.82, 0.68, 0.15]];
    for (const [x, y, r] of bolhas) g.elipse(W * x, H * y, W * r, H * r * 1.4, null, { fundo: true, peso: 1 });
    for (const [x, y, r] of bolhas) g.elipse(W * x, H * y + 3, W * r * 0.92, H * r * 1.3, null, { fundo: true, peso: 0 });
    g.linha([[W * 0.08, H * 0.8], [W * 0.95, H * 0.8]], { peso: 0.8 });
  };
}

export function placaBarril(texto) {
  return (g, W, H, s) => {
    // barril
    const by = H * 0.6;
    g.forma([[W * 0.3, by], [W * 0.7, by], [W * 0.74, H * 0.8], [W * 0.7, H - 3 * s], [W * 0.3, H - 3 * s], [W * 0.26, H * 0.8]], null, { fundo: true, peso: 1.1, cor: '#a07a52' });
    for (const y of [0.66, 0.92]) g.linha([[W * 0.29, H * y], [W * 0.71, H * y]], { peso: 1.2 });
    for (const x of [0.4, 0.5, 0.6]) g.linha([[W * x, by], [W * x, H - 3 * s]], { peso: 0.4 });
    // poste e placa
    g.ret(W * 0.47, H * 0.1, W * 0.06, by - H * 0.1, null, { fundo: true, peso: 1, cor: '#8a6a4a' });
    g.ret(W * 0.05, H * 0.12, W * 0.9, H * 0.22, null, { fundo: true, peso: 1.3, cor: '#caa16f' });
    for (const x of [0.1, 0.9]) g.elipse(W * x, H * 0.23, 2.5 * s, 2.5 * s, 'preto');
    g.texto(texto.toUpperCase(), W / 2, H * 0.235, H * 0.12, { cor: '#3b2a1a' });
  };
}

export function rotuloPlaca(texto) {
  return (g, W, H) => g.texto(texto.toUpperCase(), W / 2, H * 0.55, H * 0.72, { cor: '#302c28' });
}
