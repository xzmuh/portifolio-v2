/* Ilustrações provisórias. Cada função recebe (g, W, H, s): g é o lápis,
   W/H o tamanho da folha em pixels e s a espessura base do traço. */

const VERDE = '#6bbf7a', VERDE_ESCURO = '#3f8a52', TERRACOTA = '#d0784e';

export function parede(sala, { lambri = true, largura } = {}) {
  return (g, W, H) => {
    const u = W / largura;
    const yLambri = lambri ? H - 1.0 * u : H + 20;
    g.ret(-12, -12, W + 24, yLambri + 12, sala.parede);
    // estampa do papel de parede
    for (let y = 0.35 * u; y < yLambri - 0.2 * u; y += 0.7 * u) {
      for (let x = 0.3 * u + ((y / u) % 1.4 > 0.7 ? 0.35 * u : 0); x < W; x += 0.7 * u) {
        g.elipse(x, y, 0.045 * u, 0.045 * u, sala.cor, { n: 8, traco: 0.6 });
      }
    }
    if (!lambri) return;
    g.ret(-12, yLambri, W + 24, H - yLambri + 12, sala.lambri);
    for (let x = 0.3 * u; x < W - 0.8 * u; x += 1.5 * u) {
      g.ret(x, yLambri + 0.16 * u, 1.2 * u, 0.58 * u, null, { traco: 0.8 });
    }
    g.linha([[0, H - 0.12 * u], [W, H - 0.12 * u]]);
  };
}

export function piso(sala, largura) {
  return (g, W, H) => {
    const u = W / largura, tabua = 0.55 * u;
    let k = 0;
    for (let x = -tabua * 0.3; x < W; x += tabua, k++) {
      g.ret(x, -12, tabua, H + 24, k % 2 ? sala.piso : sala.pisoAlt, { traco: 0.8 });
      // emendas das tábuas
      for (let y = ((k * 0.37) % 1) * 2.2 * u; y < H; y += 2.2 * u) {
        g.linha([[x + 2, y], [x + tabua - 2, y]], { traco: 0.7 });
      }
    }
  };
}

export function placa(titulo, sub, sala) {
  return (g, W, H, s) => {
    g.linha([[W * 0.22, 14 * s], [W * 0.22, H * 0.3]]);
    g.linha([[W * 0.78, 14 * s], [W * 0.78, H * 0.3]]);
    g.elipse(W * 0.22, 14 * s, 5 * s, 5 * s, sala.corEscura, { n: 10 });
    g.elipse(W * 0.78, 14 * s, 5 * s, 5 * s, sala.corEscura, { n: 10 });
    g.ret(W * 0.06, H * 0.28, W * 0.88, H * 0.62, sala.cor, { traco: 1.3 });
    g.texto(titulo, W / 2, H * 0.53, H * 0.25, { cor: '#2b2622' });
    g.texto(sub, W / 2, H * 0.77, H * 0.11, { cor: '#3a2f25', peso: 500 });
  };
}

export function planta(variacao = 0) {
  return (g, W, H, s) => {
    const cx = W / 2, topoVaso = H * 0.66;
    const folhas = variacao ? 7 : 5;
    for (let i = 0; i < folhas; i++) {
      const t = i / (folhas - 1) - 0.5;
      const ang = t * 1.9 - Math.PI / 2;
      const comp = H * (0.3 + 0.12 * Math.cos(t * 3));
      const px = cx + Math.cos(ang) * comp * 0.55, py = topoVaso + Math.sin(ang) * comp * 0.55;
      g.linha([[cx, topoVaso], [px, py]], { traco: 0.8 });
      g.elipse(px, py, comp * 0.34, comp * 0.12, i % 2 ? VERDE : VERDE_ESCURO, { rot: ang, n: 18 });
    }
    g.forma([[W * 0.26, topoVaso], [W * 0.74, topoVaso], [W * 0.66, H - 16 * s], [W * 0.34, H - 16 * s]], TERRACOTA);
    g.ret(W * 0.22, topoVaso - 6 * s, W * 0.56, 16 * s, '#b86440');
  };
}

export function luminaria() {
  return (g, W, H, s) => {
    const cx = W / 2;
    g.linha([[cx, 12 * s], [cx, H * 0.45]]);
    g.forma([[cx - W * 0.16, H * 0.45], [cx + W * 0.16, H * 0.45], [cx + W * 0.36, H * 0.68], [cx - W * 0.36, H * 0.68]], '#e2735a', { traco: 1.2 });
    g.elipse(cx, H * 0.73, W * 0.1, W * 0.1, '#ffd95e');
    g.brilho(cx - W * 0.03, H * 0.72, W * 0.03, W * 0.025);
    for (let i = -2; i <= 2; i++) {
      const a = Math.PI / 2 + i * 0.35;
      g.linha([[cx + Math.cos(a) * W * 0.17, H * 0.73 + Math.sin(a) * W * 0.17],
        [cx + Math.cos(a) * W * 0.3, H * 0.73 + Math.sin(a) * W * 0.3]], { traco: 0.7 });
    }
  };
}

export function quadroPaisagem() {
  return (g, W, H, s) => {
    g.linha([[W * 0.3, H * 0.2], [W / 2, 12 * s], [W * 0.7, H * 0.2]], { traco: 0.7 });
    g.ret(W * 0.08, H * 0.2, W * 0.84, H * 0.72, '#8a5a3b', { traco: 1.2 });
    g.ret(W * 0.15, H * 0.29, W * 0.7, H * 0.54, '#bfe0f2');
    g.elipse(W * 0.66, H * 0.42, W * 0.07, W * 0.07, '#ffd95e');
    g.forma([[W * 0.15, H * 0.83], [W * 0.36, H * 0.46], [W * 0.52, H * 0.7], [W * 0.62, H * 0.56], [W * 0.85, H * 0.83]], '#6f9f7a');
    g.forma([[W * 0.3, H * 0.57], [W * 0.36, H * 0.46], [W * 0.42, H * 0.57]], '#ffffff');
  };
}

export function bilhete(linhas, cor) {
  return (g, W, H, s) => {
    g.ret(W * 0.05, H * 0.08, W * 0.9, H * 0.84, '#fff6d8', { traco: 1.1 });
    g.elipse(W / 2, H * 0.1, 9 * s, 9 * s, cor, { n: 12 });
    linhas.forEach((l, i) => g.texto(l, W / 2, H * (0.4 + i * 0.3), H * (i ? 0.17 : 0.24), { cor: i ? '#5a4a3a' : '#2b2622' }));
  };
}

export function balao(rotulo, cor) {
  return (g, W, H, s) => {
    const cx = W / 2, cy = H * 0.32, rx = W * 0.37, ry = H * 0.25;
    const pts = [];
    for (let k = 0; k < 20; k++) {
      pts.push([cx + (k % 2 ? -1 : 1) * 7 * s + Math.sin(k * 0.9) * 4 * s, cy + ry + 4 * s + k * ((H * 0.9 - cy - ry) / 20)]);
    }
    g.linha(pts, { traco: 0.7 });
    g.forma([[cx - 9 * s, cy + ry + 10 * s], [cx + 9 * s, cy + ry + 10 * s], [cx, cy + ry - 4 * s]], cor);
    g.elipse(cx, cy, rx, ry, cor, { traco: 1.2 });
    g.brilho(cx - rx * 0.45, cy - ry * 0.45, rx * 0.16, ry * 0.26, 0.5);
    g.texto(rotulo, cx, cy + 4 * s, Math.min(W * 0.3, (W * 1.1) / Math.max(rotulo.length, 3)), { cor: '#ffffff' });
  };
}

export function nuvem() {
  return (g, W, H) => {
    g.nuvem([
      [W * 0.28, H * 0.6, H * 0.24], [W * 0.45, H * 0.42, H * 0.3], [W * 0.63, H * 0.47, H * 0.26],
      [W * 0.76, H * 0.62, H * 0.2], [W * 0.5, H * 0.66, H * 0.22],
    ], '#ffffff');
  };
}

export function moldura(titulo, sala) {
  return (g, W, H, s) => {
    g.linha([[W * 0.3, H * 0.13], [W / 2, 12 * s], [W * 0.7, H * 0.13]], { traco: 0.7 });
    g.ret(W * 0.06, H * 0.12, W * 0.88, H * 0.66, sala.corEscura, { traco: 1.3 });
    const x = W * 0.12, y = H * 0.18, w = W * 0.76, h = H * 0.54;
    g.ret(x, y, w, h, '#ffffff');
    g.ret(x, y, w, h * 0.13, '#e6e1d8');
    [0.05, 0.1, 0.15].forEach((f, i) => g.elipse(x + w * f, y + h * 0.065, h * 0.03, h * 0.03, ['#e2735a', '#e9b44c', '#6bbf7a'][i], { n: 10 }));
    g.ret(x + w * 0.07, y + h * 0.24, w * 0.5, h * 0.3, sala.cor);
    g.ret(x + w * 0.64, y + h * 0.24, w * 0.28, h * 0.3, '#d8d2c8');
    for (let i = 0; i < 3; i++) g.linha([[x + w * 0.07, y + h * (0.66 + i * 0.1)], [x + w * (0.8 - i * 0.18), y + h * (0.66 + i * 0.1)]], { traco: 0.8 });
    g.ret(W * 0.24, H * 0.8, W * 0.52, H * 0.15, '#fff6d8');
    g.texto(titulo, W / 2, H * 0.875, H * 0.1, { cor: '#2b2622' });
  };
}

export function cavalete(sala) {
  return (g, W, H, s) => {
    g.linha([[W * 0.5, 14 * s], [W * 0.2, H - 14 * s]], { traco: 1.4 });
    g.linha([[W * 0.5, 14 * s], [W * 0.8, H - 14 * s]], { traco: 1.4 });
    g.linha([[W * 0.5, 14 * s], [W * 0.5, H - 30 * s]], { traco: 1.2 });
    g.ret(W * 0.12, H * 0.14, W * 0.76, H * 0.46, '#ffffff', { traco: 1.2 });
    g.texto('seu projeto', W / 2, H * 0.3, W * 0.14, { cor: sala.corEscura });
    g.texto('aqui?', W / 2, H * 0.44, W * 0.14, { cor: sala.corEscura });
    g.ret(W * 0.1, H * 0.6, W * 0.8, 14 * s, '#8a5a3b');
    g.elipse(W * 0.78, H * 0.52, W * 0.07, W * 0.045, sala.cor, { rot: -0.4 });
  };
}

export function porta(proxima, sala) {
  return (g, W, H, s) => {
    g.ret(-12, -12, W + 24, H + 24, sala.porta, { traco: 1.2 });
    g.ret(W * 0.14, H * 0.08, W * 0.72, H * 0.36, null);
    g.ret(W * 0.14, H * 0.52, W * 0.72, H * 0.4, null);
    g.elipse(W * 0.84, H * 0.5, 9 * s, 9 * s, '#e9b44c', { n: 12 });
    g.ret(W * 0.24, H * 0.2, W * 0.52, H * 0.12, '#fff6d8');
    g.texto(proxima + ' →', W / 2, H * 0.26, H * 0.07, { cor: '#2b2622' });
  };
}

export function contato(sala) {
  return (g, W, H, s) => {
    g.ret(W * 0.05, H * 0.06, W * 0.9, H * 0.88, '#fff6d8', { traco: 1.2 });
    const ex = W * 0.5, ey = H * 0.34, ew = W * 0.26, eh = H * 0.16;
    g.ret(ex - ew, ey - eh, ew * 2, eh * 2, '#ffffff');
    g.linha([[ex - ew, ey - eh], [ex, ey + eh * 0.2], [ex + ew, ey - eh]]);
    g.elipse(ex, ey + eh * 0.1, 12 * s, 12 * s, sala.cor, { n: 14 });
    g.texto('vamos conversar?', W / 2, H * 0.66, H * 0.13, { cor: '#2b2622' });
    g.texto('(isso aqui é só uma demo)', W / 2, H * 0.82, H * 0.07, { cor: '#6a5a4a', peso: 500 });
  };
}
