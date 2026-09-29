/* Pixel art gerada por código, 16 pixels por unidade da cena.
   Paleta: os cinzas do site (#161616 … #fafafa) + o azul da marca (#2997ff). */

export const PPU = 16;

export const P = {
  vazio: '#050608',
  noite: '#0b0e12',
  pedra: ['#12161a', '#1b2127', '#252d35', '#323c46', '#46525e', '#63717e'],
  claro: '#c8d2dc',
  branco: '#fafafa',
  azul: ['#0c2644', '#123f73', '#1c62b8', '#2997ff', '#7cc4ff', '#d6ecff'],
  ferro: ['#0e1114', '#1f2429', '#353c43', '#58626b'],
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const limita = (v, a, b) => Math.min(b, Math.max(a, v));

function novo(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

function px(x, cor, i, j, w = 1, h = 1) {
  x.fillStyle = cor;
  x.fillRect(i, j, w, h);
}

// desenha um padrão de texto ('X' = pixel) — usado no brasão e nas runas
function padrao(x, linhas, i0, j0, cor, sombra) {
  linhas.forEach((l, j) => [...l].forEach((ch, i) => {
    if (ch !== 'X') return;
    if (sombra) px(x, sombra, i0 + i + 1, j0 + j + 1);
    px(x, cor, i0 + i, j0 + j);
  }));
}

const RUNAS = [
  ['X.X', '.X.', 'X.X'],
  ['XXX', 'X..', 'XX.'],
  ['.X.', 'XXX', '.X.'],
  ['X..', 'XX.', 'X.X'],
];

/* bloco de pedra com luz em cima e sombra embaixo, ruído por pixel */
function bloco(x, r, x0, y0, w, h, tom) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let t = tom;
      const n = r();
      if (n < 0.12) t--; else if (n > 0.9) t++;
      if (j === 0 || i === 0) t++;
      if (j === h - 1) t--;
      px(x, P.pedra[limita(t, 0, 5)], x0 + i, y0 + j);
    }
  }
  if (r() < 0.1) {
    // rachadura: passeio aleatório escuro
    let ci = x0 + 1 + Math.floor(r() * (w - 2)), cj = y0;
    for (let k = 0; k < h + 1; k++) { px(x, P.pedra[0], ci, cj); cj++; ci += Math.round(r() * 2 - 1); }
  }
}

export function parede(largura, altura, seed, { base = true, escura = 0, runas = true } = {}) {
  const W = Math.round(largura * PPU), H = Math.round(altura * PPU);
  const [c, x] = novo(W, H);
  const r = mulberry32(seed);
  px(x, P.pedra[0], 0, 0, W, H);
  const hBase = base ? PPU : 0;
  const hTijolo = 5;
  for (let y = 0; y < H - hBase; y += hTijolo) {
    let xx = -Math.floor(r() * 10);
    while (xx < W) {
      const w = 8 + Math.floor(r() * 8);
      const tom = limita(1 + Math.floor(r() * 3) - escura, 0, 4);
      bloco(x, r, xx, y, w - 1, Math.min(hTijolo - 1, H - hBase - y - 1), tom);
      if (runas && r() < 0.025) padrao(x, RUNAS[Math.floor(r() * RUNAS.length)], xx + 3, y + 1, P.azul[2]);
      xx += w;
    }
  }
  if (base) {
    let xx = -Math.floor(r() * 12);
    while (xx < W) {
      const w = 16 + Math.floor(r() * 10);
      bloco(x, r, xx, H - hBase, w - 1, hBase - 1, limita(1 - escura, 0, 4));
      xx += w;
    }
  }
  return c;
}

export function piso(largura, comprimento, seed) {
  const W = Math.round(largura * PPU), H = Math.round(comprimento * PPU);
  const [c, x] = novo(W, H);
  const r = mulberry32(seed);
  px(x, P.noite, 0, 0, W, H);
  const lado = 16;
  for (let j = 0, lin = 0; j < H; j += lado, lin++) {
    for (let i = (lin % 2 ? -lado / 2 : 0); i < W; i += lado) {
      bloco(x, r, i, j, lado - 1, lado - 1, 1 + Math.floor(r() * 2));
    }
  }
  return c;
}

export function tapete(largura, comprimento) {
  const W = Math.round(largura * PPU), H = Math.round(comprimento * PPU);
  const [c, x] = novo(W, H);
  px(x, P.azul[0], 0, 0, W, H);
  px(x, P.azul[2], 1, 0, 1, H);
  px(x, P.azul[2], W - 2, 0, 1, H);
  for (let j = 6; j < H; j += 16) {
    const cx = Math.floor(W / 2);
    for (let k = 0; k < 4; k++) {
      px(x, P.azul[1], cx - k, j + k, 1, 1); px(x, P.azul[1], cx + k, j + k, 1, 1);
      px(x, P.azul[1], cx - k, j + 7 - k, 1, 1); px(x, P.azul[1], cx + k, j + 7 - k, 1, 1);
    }
    px(x, P.azul[3], cx, j + 3, 1, 2);
  }
  return c;
}

const BRASAO_M = [
  'X.....X',
  'XX...XX',
  'X.X.X.X',
  'X..X..X',
  'X.....X',
  'X.....X',
  'X.....X',
];

export function estandarte() {
  const W = 18, H = 36;
  const [c, x] = novo(W, H);
  px(x, P.ferro[2], 0, 1, W, 2);
  px(x, P.ferro[3], 0, 1, W, 1);
  px(x, P.ferro[3], 0, 0, 1, 4); px(x, P.ferro[3], W - 1, 0, 1, 4);
  for (let j = 3; j < H; j++) {
    for (let i = 2; i < W - 2; i++) {
      // cauda de andorinha: recorte em V embaixo
      const fundo = H - j;
      if (fundo <= 6 && Math.abs(i - (W - 1) / 2) < 7 - fundo) continue;
      const dobra = (i - 2) % 5 === 0 ? 0 : (i - 2) % 5 === 4 ? 2 : 1;
      px(x, P.azul[dobra], i, j);
    }
  }
  for (let j = 4; j < H - 7; j += 2) { px(x, P.azul[3], 3, j); px(x, P.azul[3], W - 4, j); }
  padrao(x, BRASAO_M, 5, 11, P.azul[4], P.noite);
  px(x, P.azul[3], 5, 21, 7, 1);
  return c;
}

export function suporteTocha() {
  const [c, x] = novo(6, 10);
  px(x, P.ferro[2], 0, 0, 6, 1);
  px(x, P.ferro[1], 1, 1, 4, 2);
  px(x, P.ferro[3], 1, 1, 1, 1);
  px(x, P.ferro[2], 2, 3, 2, 6);
  px(x, P.ferro[1], 1, 8, 4, 2);
  return c;
}

export function quadro(seed, tipo) {
  const W = 30, H = 22;
  const [c, x] = novo(W, H);
  const r = mulberry32(seed);
  // moldura com bisel: luz em cima/esquerda, sombra embaixo/direita
  px(x, P.pedra[4], 0, 0, W, H);
  px(x, P.claro, 0, 0, W, 1); px(x, P.claro, 0, 0, 1, H);
  px(x, P.pedra[2], 0, H - 1, W, 1); px(x, P.pedra[2], W - 1, 0, 1, H);
  px(x, P.pedra[1], 2, 2, W - 4, H - 4);
  const i0 = 3, j0 = 3, w = W - 6, h = H - 6;
  px(x, P.noite, i0, j0, w, h);
  px(x, P.pedra[2], i0, j0, w, 2);
  px(x, P.azul[3], i0 + 1, j0 + 0, 1, 1); px(x, P.pedra[4], i0 + 3, j0, 1, 1); px(x, P.pedra[4], i0 + 5, j0, 1, 1);
  if (tipo === 'grafico') {
    for (let k = 0; k < 6; k++) {
      const hb = 2 + Math.floor(r() * (h - 6));
      px(x, P.azul[k === 3 ? 4 : 2], i0 + 2 + k * 4, j0 + h - 1 - hb, 3, hb);
    }
  } else if (tipo === 'chat') {
    for (let k = 0; k < 4; k++) {
      const lado = k % 2, bw = 8 + Math.floor(r() * 8);
      px(x, lado ? P.azul[2] : P.pedra[3], lado ? i0 + w - 2 - bw : i0 + 2, j0 + 3 + k * 3, bw, 2);
    }
  } else if (tipo === 'rede') {
    const nos = [[5, 5], [12, 9], [19, 5], [8, 13], [18, 13]].map(([a, b]) => [i0 + a, j0 + b]);
    for (let k = 1; k < nos.length; k++) {
      const [a, b] = nos[0 + (k > 2 ? 1 : 0)], [c2, d2] = nos[k];
      for (let t = 0; t <= 1; t += 0.1) px(x, P.pedra[3], Math.round(a + (c2 - a) * t), Math.round(b + (d2 - b) * t));
    }
    nos.forEach(([a, b], k) => px(x, k === 1 ? P.azul[4] : P.azul[2], a - 1, b - 1, 3, 3));
  } else {
    // página de site: bloco de destaque + linhas de texto
    px(x, P.azul[tipo === 'site' ? 2 : 1], i0 + 2, j0 + 4, 12, 7);
    px(x, P.azul[4], i0 + 3, j0 + 5, 5, 1);
    px(x, P.pedra[3], i0 + 16, j0 + 4, 6, 7);
    for (let k = 0; k < 2; k++) px(x, P.pedra[3], i0 + 2, j0 + 13 + k * 2, 10 + Math.floor(r() * 10), 1);
  }
  // plaquinha embaixo
  px(x, P.claro, W / 2 - 4, H - 2, 8, 2);
  return c;
}

export function grade() {
  const W = 26, H = 42;
  const [c, x] = novo(W, H);
  for (let i = 1; i < W; i += 4) {
    px(x, P.ferro[2], i, 0, 2, H - 2);
    px(x, P.ferro[3], i, 0, 1, H - 2);
    px(x, P.ferro[2], i, H - 2, 2, 1);
    px(x, P.ferro[3], i, H - 1, 1, 1);
  }
  for (let j = 3; j < H - 4; j += 7) {
    px(x, P.ferro[1], 0, j, W, 2);
    px(x, P.ferro[3], 0, j, W, 1);
  }
  return c;
}

/* arco de pedra do portal: anel em cima, pilares embaixo, vazado no meio */
export const ARCO = { W: 48, H: 56, cx: 24, cy: 26, rIn: 15, rOut: 22 };

export function arco(seed) {
  const { W, H, cx, cy, rIn, rOut } = ARCO;
  const [c, x] = novo(W, H);
  const r = mulberry32(seed);
  const tons = Array.from({ length: 40 }, () => 3 + Math.floor(r() * 2));
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
      let dentro, seg, junta;
      if (dy <= 0) {
        const d = Math.hypot(dx, dy);
        dentro = d >= rIn && d <= rOut;
        const ang = Math.atan2(-dy, dx) / Math.PI; // 0..1 da direita pra esquerda
        seg = Math.floor(ang * 9);
        junta = Math.abs(ang * 9 - Math.round(ang * 9)) < 0.07;
        if (Math.abs(d - rIn) < 1) junta = 'aro';
      } else {
        const esq = dx <= -rIn && dx >= -rOut, dir = dx >= rIn && dx <= rOut;
        dentro = esq || dir;
        seg = 20 + Math.floor(dy / 6) * 2 + (dir ? 1 : 0);
        junta = Math.floor(dy) % 6 === 0;
        if (Math.abs(Math.abs(dx) - rIn) < 1) junta = 'aro';
      }
      if (!dentro) continue;
      let t = tons[seg % tons.length] + (r() < 0.12 ? -1 : 0);
      if (junta === 'aro') { px(x, P.azul[2], i, j); continue; } // aro azul por dentro
      if (junta) t = 1;
      px(x, P.pedra[limita(t, 0, 5)], i, j);
    }
  }
  // pedra-chave com runa
  px(x, P.pedra[4], cx - 3, cy - rOut, 6, 7);
  padrao(x, RUNAS[2], cx - 1, cy - rOut + 2, P.azul[3]);
  return c;
}

/* ---------- peças do salão ---------- */

// pedra lisa de estátua: sem tijolos, só ruído, veios e rachaduras
export function pedraLisa(W, H, seed, tom = 3) {
  const [c, x] = novo(W, H);
  const r = mulberry32(seed);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      let t = tom;
      const n = r();
      if (n < 0.14) t--; else if (n > 0.92) t++;
      px(x, P.pedra[limita(t, 0, 5)], i, j);
    }
  }
  for (let k = 0; k < Math.max(1, (W * H) / 300); k++) {
    let ci = Math.floor(r() * W), cj = Math.floor(r() * H);
    for (let s = 0; s < 6; s++) { px(x, P.pedra[limita(tom - 2, 0, 5)], ci, cj); cj++; ci += Math.round(r() * 2 - 1); }
  }
  return c;
}

const EMBLEMAS = {
  galeria: ['XXXXX', 'X...X', 'X.X.X', 'X...X', 'XXXXX'],
  arsenal: ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'],
  registros: ['X.X.X', 'XXXXX', 'X.X.X', 'XXXXX', 'X.X.X'],
  espelho: ['.XXX.', 'X...X', 'X.X.X', 'X...X', '.XXX.'],
};

// porta de ferro com emblema azul no meio (2.4 x 4.2 unidades)
export function porta(emblema, seed) {
  const W = 38, H = 67;
  const [c, x] = novo(W, H);
  const r = mulberry32(seed);
  for (let i = 0; i < W; i++) {
    const tabua = Math.floor(i / 6);
    for (let j = 0; j < H; j++) {
      let t = 1 + (tabua % 2);
      if (i % 6 === 0) t = 0;
      if (r() < 0.1) t++;
      px(x, P.pedra[limita(t, 0, 5)], i, j);
    }
  }
  for (const j of [8, 32, 58]) {
    px(x, P.ferro[2], 0, j, W, 3); px(x, P.ferro[3], 0, j, W, 1);
    for (let i = 3; i < W; i += 7) px(x, P.ferro[3], i, j + 1, 1, 1);
  }
  px(x, P.ferro[2], 0, 0, 2, H); px(x, P.ferro[2], W - 2, 0, 2, H);
  // emblema com halo
  const cx = Math.floor(W / 2) - 5, cy = 16;
  px(x, P.azul[0], cx - 1, cy - 1, 13, 13);
  px(x, P.azul[1], cx, cy, 11, 11);
  px(x, P.noite, cx + 1, cy + 1, 9, 9);
  EMBLEMAS[emblema].forEach((l, j) => [...l].forEach((ch, i) => {
    if (ch === 'X') px(x, P.azul[3], cx + 1 + i * 2, cy + 1 + j * 2, 1 + (i < 4), 1 + (j < 4));
  }));
  px(x, P.ferro[3], W - 8, 38, 3, 3);
  return c;
}

// lápide gravada: runa no topo e linhas de "texto"
export function lapide(seed, { runa = 0, linhas = 6 } = {}) {
  const W = 29, H = 42;
  const [c, x] = novo(W, H);
  const r = mulberry32(seed);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      // topo arredondado
      const dx = i - (W - 1) / 2, dy = j - 12;
      if (dy < 0 && Math.hypot(dx, dy * 1.2) > 14.5) continue;
      let t = 3 + (r() < 0.12 ? -1 : r() > 0.93 ? 1 : 0);
      if (i === 0 || j === 0 || Math.hypot(dx, dy * 1.2) > 13.6 && dy < 0) t = 4;
      if (i === W - 1 || j === H - 1) t = 2;
      px(x, P.pedra[limita(t, 0, 5)], i, j);
    }
  }
  padrao(x, RUNAS[runa % RUNAS.length], 13, 5, P.azul[3]);
  for (let k = 0; k < linhas; k++) {
    const w = 12 + Math.floor(r() * 10);
    px(x, P.pedra[1], 4, 14 + k * 4, w, 1);
    px(x, P.pedra[5], 4, 15 + k * 4, w, 1);
  }
  return c;
}

// retrato em pixel art a partir de uma foto: tons de cinza com dithering ordenado
export function retrato(img, recorte) {
  const W = 30, H = 40, borda = 2;
  const [tmp, tx] = novo(W, H);
  tx.imageSmoothingEnabled = true;
  tx.drawImage(img, recorte.x, recorte.y, recorte.w, recorte.h, 0, 0, W, H);
  const dados = tx.getImageData(0, 0, W, H).data;
  const lum = [];
  for (let k = 0; k < W * H; k++) lum.push(0.299 * dados[k * 4] + 0.587 * dados[k * 4 + 1] + 0.114 * dados[k * 4 + 2]);
  const min = Math.min(...lum), max = Math.max(...lum);
  const rampa = [P.vazio, P.pedra[0], P.pedra[2], P.pedra[4], P.pedra[5], P.claro, P.branco];
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const [c, x] = novo(W + borda * 2, H + borda * 2 + 3);
  px(x, P.pedra[4], 0, 0, W + borda * 2, H + borda * 2);
  px(x, P.claro, 0, 0, W + borda * 2, 1); px(x, P.claro, 0, 0, 1, H + borda * 2);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const v = Math.pow((lum[j * W + i] - min) / (max - min || 1), 0.85);
      const d = bayer[(i % 4) + (j % 4) * 4] / 16 - 0.5;
      const k = limita(Math.round(v * (rampa.length - 1) + d * 0.9), 0, rampa.length - 1);
      px(x, rampa[k], borda + i, borda + j);
    }
  }
  px(x, P.azul[3], borda, borda + H, W, 1); // filete azul embaixo
  px(x, P.claro, (W + borda * 2) / 2 - 5, H + borda * 2, 10, 3);
  return c;
}
