/* Gera as ilustrações provisórias da demo direto no <canvas>.
   Cada folha sai em duas versões com o MESMO traço: "rascunho" (grafite e
   hachura) e "pintado" (aquarela e nanquim). O shader troca uma pela outra.
   Para usar desenhos de verdade, basta trocar por pares nome.webp /
   nome_painted.webp (ver `imagens` em main.js). */

export const PAPEL = '#f4ede1';
const TINTA = '#2b2622';
const GRAFITE = 'rgba(58,54,50,0.9)';

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tela(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  return c;
}

function hexParaRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminancia(hex) {
  const [r, g, b] = hexParaRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function escurece(hex, k) {
  const [r, g, b] = hexParaRgb(hex).map((v) => Math.round(v * (1 - k)));
  return `rgb(${r},${g},${b})`;
}

function caixa(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function poligonoElipse(cx, cy, rx, ry, rot = 0, n = 30) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

/* O lápis usa dois geradores aleatórios: `geo` decide a forma do traço e é
   consumido igual nos dois modos (por isso rascunho e pintado se alinham);
   `estilo` cuida do que só existe num dos modos (hachura, manchas). */
class Lapis {
  constructor(ctx, modo, seed, s) {
    this.ctx = ctx;
    this.pintado = modo === 'pintado';
    this.s = s;
    this.geo = mulberry32(seed);
    this.estilo = mulberry32(seed * 9301 + (this.pintado ? 49297 : 17));
  }

  _j(v) { return (this.geo() - 0.5) * 2 * v; }
  _e(v) { return (this.estilo() - 0.5) * 2 * v; }

  caminho(pts, fecha) {
    const s = this.s, out = [], n = pts.length;
    const segs = fecha ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const k = Math.max(1, Math.ceil(len / (22 * s)));
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      for (let t = 0; t < k; t++) {
        const f = t / k, o = this._j(1.8 * s);
        out.push([x0 + (x1 - x0) * f + nx * o, y0 + (y1 - y0) * f + ny * o]);
      }
    }
    if (!fecha) {
      const [x, y] = pts[n - 1];
      out.push([x + this._j(s), y + this._j(s)]);
    }
    return out;
  }

  _traca(p, fecha, dx = 0, dy = 0) {
    const c = this.ctx;
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    c.beginPath();
    if (p.length < 3) {
      c.moveTo(p[0][0] + dx, p[0][1] + dy);
      for (const q of p.slice(1)) c.lineTo(q[0] + dx, q[1] + dy);
      if (fecha) c.closePath();
      return;
    }
    if (fecha) {
      const ini = m(p[p.length - 1], p[0]);
      c.moveTo(ini[0] + dx, ini[1] + dy);
      for (let i = 0; i < p.length; i++) {
        const a = p[i], mm = m(a, p[(i + 1) % p.length]);
        c.quadraticCurveTo(a[0] + dx, a[1] + dy, mm[0] + dx, mm[1] + dy);
      }
      c.closePath();
    } else {
      c.moveTo(p[0][0] + dx, p[0][1] + dy);
      for (let i = 1; i < p.length - 1; i++) {
        const mm = m(p[i], p[i + 1]);
        c.quadraticCurveTo(p[i][0] + dx, p[i][1] + dy, mm[0] + dx, mm[1] + dy);
      }
      const u = p[p.length - 1];
      c.lineTo(u[0] + dx, u[1] + dy);
    }
  }

  _contorno(p, fecha, traco) {
    const c = this.ctx, s = this.s;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (this.pintado) {
      c.strokeStyle = TINTA; c.globalAlpha = 0.9; c.lineWidth = 2.6 * s * traco;
      this._traca(p, fecha, this._e(0.6 * s), this._e(0.6 * s));
      c.stroke();
    } else {
      c.strokeStyle = GRAFITE;
      for (let k = 0; k < 2; k++) {
        c.lineWidth = (k ? 1.1 : 1.8) * s * traco;
        c.globalAlpha = k ? 0.5 : 0.85;
        this._traca(p, fecha, this._e(1.6 * s), this._e(1.6 * s));
        c.stroke();
      }
    }
    c.restore();
  }

  _aquarela(p, cor) {
    const c = this.ctx, s = this.s, b = caixa(p);
    c.save();
    this._traca(p, true);
    c.fillStyle = cor; c.globalAlpha = 0.93; c.fill();
    c.clip();
    // manchas pequenas no tom da própria cor; em superfície grande, mais manchas e não maiores
    const manchas = Math.round(Math.min(40, Math.max(6, (b.w * b.h) / (110 * s) ** 2)));
    const sombra = escurece(cor, 0.22);
    for (let k = 0; k < manchas; k++) {
      c.globalAlpha = 0.05 + this.estilo() * 0.07;
      c.fillStyle = k % 2 ? sombra : '#fff';
      c.beginPath();
      c.arc(b.x + this.estilo() * b.w, b.y + this.estilo() * b.h,
        Math.min((0.2 + this.estilo() * 0.5) * Math.max(b.w, b.h) * 0.5, 60 * s), 0, Math.PI * 2);
      c.fill();
    }
    // a tinta seca mais escura na beirada, como aquarela de verdade
    c.globalAlpha = 0.35; c.strokeStyle = escurece(cor, 0.3); c.lineWidth = 8 * s;
    this._traca(p, true); c.stroke();
    c.restore();
  }

  _hachura(p, cor) {
    const tom = luminancia(cor);
    if (tom > 0.93) return;
    const c = this.ctx, s = this.s, b = caixa(p);
    const passo = (6 + tom * 12) * s;
    c.save();
    this._traca(p, true); c.clip();
    c.strokeStyle = GRAFITE; c.lineWidth = 1 * s; c.globalAlpha = 0.32;
    c.beginPath();
    for (let t = -b.h; t < b.w; t += passo) {
      c.moveTo(b.x + t + this._e(2 * s), b.y + b.h);
      c.lineTo(b.x + t + b.h + this._e(2 * s), b.y);
    }
    c.stroke();
    c.restore();
  }

  forma(pts, cor, { fecha = true, traco = 1 } = {}) {
    const p = this.caminho(pts, fecha);
    if (cor && fecha) this.pintado ? this._aquarela(p, cor) : this._hachura(p, cor);
    this._contorno(p, fecha, traco);
    return p;
  }

  ret(x, y, w, h, cor, op) { return this.forma([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], cor, op); }
  elipse(cx, cy, rx, ry, cor, { rot = 0, n = 30, ...op } = {}) { return this.forma(poligonoElipse(cx, cy, rx, ry, rot, n), cor, op); }
  linha(pts, op = {}) { return this.forma(pts, null, { ...op, fecha: false }); }

  // reflexo de luz: só aparece na versão pintada
  brilho(cx, cy, rx, ry, rot = 0) {
    if (!this.pintado) return;
    const c = this.ctx;
    c.save(); c.fillStyle = '#fff'; c.globalAlpha = 0.55;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  texto(str, x, y, tam, { cor = TINTA, peso = 700, alinha = 'center' } = {}) {
    const c = this.ctx;
    c.save();
    c.font = `${peso} ${tam}px Caveat, 'Comic Sans MS', cursive`;
    c.textAlign = alinha; c.textBaseline = 'middle';
    if (this.pintado) {
      c.fillStyle = cor; c.fillText(str, x, y);
    } else {
      c.fillStyle = GRAFITE;
      c.globalAlpha = 0.8; c.fillText(str, x, y);
      c.globalAlpha = 0.3; c.fillText(str, x + this._e(1.5 * this.s), y + this._e(1.5 * this.s));
    }
    c.restore();
  }

  // nuvem = vários círculos; o contorno de dentro some porque o preenchimento vem depois
  nuvem(circulos, cor) {
    const ps = circulos.map(([x, y, r]) => this.caminho(poligonoElipse(x, y, r, r * 0.85, 0, 24), true));
    for (const p of ps) this._contorno(p, true, 1.4);
    const c = this.ctx;
    c.save();
    c.fillStyle = this.pintado ? cor : PAPEL;
    for (const p of ps) { this._traca(p, true); c.fill(); }
    c.restore();
  }
}

/* Contorno de papel recortado em volta do desenho (efeito "adesivo"):
   carimba o desenho em volta de si mesmo e pinta tudo de uma cor só. */
function silhueta(fontes, W, H, raio, cor) {
  const c = tela(W, H), ctx = c.getContext('2d');
  for (const f of fontes) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      ctx.drawImage(f, Math.cos(a) * raio, Math.sin(a) * raio);
    }
    ctx.drawImage(f, 0, 0);
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = cor; ctx.fillRect(0, 0, W, H);
  return c;
}

/* w/h em unidades da cena; ppu = pixels por unidade.
   fundo 'recorte' = papel recortado no formato do desenho; 'cheio' = folha inteira. */
export function criaFolha({ w, h, seed = 1, ppu = 256, fundo = 'recorte', desenha }) {
  const W = Math.round(w * ppu), H = Math.round(h * ppu), s = ppu / 160;
  const conteudo = {};
  for (const modo of ['rascunho', 'pintado']) {
    const c = tela(W, H);
    desenha(new Lapis(c.getContext('2d'), modo, seed, s), W, H, s);
    conteudo[modo] = c;
  }

  const saida = {};
  if (fundo === 'cheio') {
    for (const modo of ['rascunho', 'pintado']) {
      const c = tela(W, H), ctx = c.getContext('2d');
      ctx.fillStyle = PAPEL; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(conteudo[modo], 0, 0);
      saida[modo] = c;
    }
    return saida;
  }

  const fontes = [conteudo.rascunho, conteudo.pintado];
  const papel = silhueta(fontes, W, H, 10 * s, PAPEL);
  const sombra = silhueta(fontes, W, H, 10 * s, 'rgba(90,70,50,0.28)');
  for (const modo of ['rascunho', 'pintado']) {
    const c = tela(W, H), ctx = c.getContext('2d');
    ctx.drawImage(sombra, 1.5 * s, 3 * s);
    ctx.drawImage(papel, 0, 0);
    ctx.drawImage(conteudo[modo], 0, 0);
    saida[modo] = c;
  }
  return saida;
}
