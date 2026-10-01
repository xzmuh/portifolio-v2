/* Desenha as texturas do corredor no <canvas>, a lápis.
   Cada folha sai em até três versões com o MESMO traço:
   - "lapis": grafite bem claro, traço duplo (o rascunho)
   - "tinta": traço cinza-escuro limpo, sombreado leve (a arte final)
   - "cor": igual à arte final, mas pintada (aparece no hover das portas)
   O shader passa de uma para a outra. */

export const PAPEL = '#f3f2ef';
const TINTA = '#2c2c2c';
const GRAFITE = 'rgba(95, 95, 95, 0.42)';

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

function caixa(p) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function poligonoElipse(cx, cy, rx, ry, n = 28) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
}

/* `geo` decide a forma do traço e é consumido igual nos dois modos (por isso
   rascunho e arte final se alinham); `estilo` cuida do que muda entre eles. */
export class Lapis {
  constructor(ctx, modo, seed, s) {
    this.ctx = ctx;
    this.tinta = modo !== 'lapis';
    this.pinta = modo === 'cor';
    this.s = s;
    this.geo = mulberry32(seed);
    this.estilo = mulberry32(seed * 9301 + (this.tinta ? 49297 : 17));
  }

  _j(v) { return (this.geo() - 0.5) * 2 * v; }
  _e(v) { return (this.estilo() - 0.5) * 2 * v; }

  caminho(pts, fecha) {
    const s = this.s, out = [], n = pts.length;
    const segs = fecha ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const k = Math.max(1, Math.ceil(len / (26 * s)));
      const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      for (let t = 0; t < k; t++) {
        const f = t / k, o = this._j(1.3 * s);
        out.push([x0 + (x1 - x0) * f + nx * o, y0 + (y1 - y0) * f + ny * o]);
      }
    }
    if (!fecha) { const [x, y] = pts[n - 1]; out.push([x + this._j(s), y + this._j(s)]); }
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

  _contorno(p, fecha, peso) {
    if (!peso) return; // canvas ignora lineWidth = 0, então "sem contorno" é pular
    const c = this.ctx, s = this.s;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (this.tinta) {
      c.strokeStyle = TINTA; c.lineWidth = 1.5 * s * peso;
      this._traca(p, fecha, this._e(0.4 * s), this._e(0.4 * s));
      c.stroke();
    } else {
      c.strokeStyle = GRAFITE;
      for (let k = 0; k < 2; k++) {
        c.lineWidth = (k ? 0.8 : 1.3) * s * peso;
        this._traca(p, fecha, this._e(1.8 * s), this._e(1.8 * s));
        c.stroke();
      }
    }
    c.restore();
  }

  /* preenchimento: 'claro' (hachura rala), 'medio' (hachura), 'escuro'
     (hachura cruzada), 'preto' (chapado na tinta), ou null */
  _preenche(p, tom, angulo = Math.PI / 4) {
    if (!tom) return;
    const c = this.ctx, s = this.s, b = caixa(p);
    c.save();
    this._traca(p, true); c.clip();
    if (this.tinta && tom === 'preto') {
      c.fillStyle = '#3b3b3b'; c.fill();
      c.restore();
      return;
    }
    // sombreado leve: poucas linhas finas, como lápis passado de leve
    const passo = { claro: 15, medio: 10, escuro: 7, preto: 5 }[tom] * s * (this.tinta ? 1 : 1.5);
    c.strokeStyle = this.tinta ? TINTA : GRAFITE;
    c.lineWidth = (this.tinta ? 0.75 : 0.7) * s;
    c.globalAlpha = this.tinta ? 0.42 : 0.5;
    const cruza = this.tinta && tom === 'escuro';
    for (const a of cruza ? [angulo, angulo + Math.PI / 2] : [angulo]) {
      const dx = Math.cos(a), dy = Math.sin(a), diag = Math.hypot(b.w, b.h);
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      c.beginPath();
      for (let t = -diag; t < diag; t += passo) {
        const ox = -dy * t, oy = dx * t;
        c.moveTo(cx + ox - dx * diag + this._e(1.5 * s), cy + oy - dy * diag);
        c.lineTo(cx + ox + dx * diag + this._e(1.5 * s), cy + oy + dy * diag);
      }
      c.stroke();
    }
    c.restore();
  }

  /* cor: pinta a forma só no modo "cor"; sempreCor: pinta em todos os modos
     (adesivos coloridos, que são o único ponto de cor no desenho) */
  forma(pts, tom = null, { fecha = true, peso = 1, fundo = false, angulo, cor = null, sempreCor = false } = {}) {
    const p = this.caminho(pts, fecha);
    if (fundo && fecha) { this.ctx.save(); this._traca(p, true); this.ctx.fillStyle = PAPEL; this.ctx.fill(); this.ctx.restore(); }
    const pinta = cor && fecha && (this.pinta || sempreCor);
    if (pinta) {
      this.ctx.save();
      this._traca(p, true);
      this.ctx.fillStyle = cor;
      this.ctx.globalAlpha = this.tinta ? 0.95 : 0.55;
      this.ctx.fill();
      this.ctx.restore();
    }
    if (fecha) this._preenche(p, tom, angulo);
    this._contorno(p, fecha, peso);
    return p;
  }
  ret(x, y, w, h, tom, op) { return this.forma([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], tom, op); }
  elipse(cx, cy, rx, ry, tom, op) { return this.forma(poligonoElipse(cx, cy, rx, ry), tom, op); }
  linha(pts, op = {}) { return this.forma(pts, null, { ...op, fecha: false }); }

  texto(str, x, y, tam, { alinha = 'center', peso = 700, fonte = 'Caveat', cor = null } = {}) {
    const c = this.ctx;
    c.save();
    c.font = `${peso} ${tam}px ${fonte}, 'Comic Sans MS', cursive`;
    c.textAlign = alinha; c.textBaseline = 'middle';
    if (this.tinta) {
      c.fillStyle = (this.pinta && cor) || TINTA; c.fillText(str, x, y);
    } else {
      c.fillStyle = GRAFITE;
      c.fillText(str, x, y);
      c.globalAlpha = 0.5; c.fillText(str, x + this._e(1.5 * this.s), y + this._e(1.5 * this.s));
    }
    c.restore();
  }
}

/* w/h em unidades da cena; ppu = pixels por unidade.
   fundo: 'papel' preenche tudo; 'vazado' deixa transparente o que não foi desenhado */
export function criaFolha({ w, h, seed = 1, ppu = 160, fundo = 'papel', desenha, comCor = false }) {
  const W = Math.min(4096, Math.round(w * ppu)), H = Math.min(4096, Math.round(h * ppu));
  const s = Math.min(W / w, H / h) / 160;
  const saida = {};
  for (const modo of comCor ? ['lapis', 'tinta', 'cor'] : ['lapis', 'tinta']) {
    const c = tela(W, H), ctx = c.getContext('2d');
    if (fundo === 'papel') { ctx.fillStyle = PAPEL; ctx.fillRect(0, 0, W, H); }
    desenha(new Lapis(ctx, modo, seed, s), W, H, s);
    saida[modo] = c;
  }
  return saida;
}
