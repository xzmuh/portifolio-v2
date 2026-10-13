/*
 * Efeitos de energia por cima do close no zoom: brilho suave no implante e
 * pulsos discretos correndo pelos cabos e nervos da imagem. Cada close tem a sua receita (RECEITAS), com
 * os pontos em % da imagem do close, medidos nela. O canvas fica exatamente
 * sobre o close (mesmo centro e tamanho final, ver tela.js).
 *
 * Tudo é desenhado em modo 'lighter' (a luz soma), o que dá o brilho sem
 * precisar de pós-processo. Só roda enquanto o zoom está aberto.
 */
const CIANO = [94, 246, 255];
const ROSA = [255, 52, 110];
const OURO = [255, 190, 80];
const BRANCO = [235, 250, 255];
// raios e anéis de plasma ficaram exagerados; ligue aqui se um dia quiser de volta
const RAIOS = false;
const ANEIS = false;

/*
 * Receitas. Tipos:
 *   plasma  { c: [x,y], r, cor }                núcleo pulsando
 *   raio    { de: [x,y] | [[x,y]...], para: [[x,y]...], cor, freq }
 *           sai de um ponto (ou de um dos pontos) para um dos alvos
 *   pulso   { caminho: [[x,y]...], cor, vel, n } energia correndo pelo caminho
 *   varre   { y0, y1, x0, x1, cor }              feixe de varredura subindo e descendo
 */
const RECEITAS = {
  cerebro: [
    { tipo: 'plasma', c: [51, 41], r: 6, cor: OURO },
    { tipo: 'raio', de: [51, 41], para: [[22, 30], [30, 20], [70, 20], [80, 30], [25, 55], [75, 55], [40, 68], [60, 68], [15, 45], [85, 45]], cor: CIANO, freq: 6 },
    { tipo: 'pulso', caminho: [[51, 41], [38, 35], [25, 30], [14, 40]], cor: OURO, vel: 0.5, n: 2 },
    { tipo: 'pulso', caminho: [[51, 41], [64, 35], [77, 30], [88, 40]], cor: OURO, vel: 0.5, n: 2 },
    { tipo: 'pulso', caminho: [[51, 41], [51, 70], [51, 100]], cor: ROSA, vel: 0.7, n: 3 },
  ],
  cabeca: [
    { tipo: 'plasma', c: [50, 12], r: 5, cor: OURO },
    { tipo: 'raio', de: [50, 12], para: [[32, 20], [68, 20], [38, 8], [62, 8]], cor: CIANO, freq: 3 },
    { tipo: 'pulso', caminho: [[50, 12], [50, 45], [50, 70], [50, 100]], cor: OURO, vel: 0.6, n: 3 },
  ],
  rosto: [
    { tipo: 'plasma', c: [35, 45], r: 4.5, cor: CIANO },
    { tipo: 'plasma', c: [64.5, 45], r: 4.5, cor: CIANO },
    { tipo: 'varre', y0: 36, y1: 56, x0: 15, x1: 85, cor: CIANO },
    { tipo: 'raio', de: [[35, 45], [64.5, 45]], para: [[12, 42], [88, 42], [22, 62], [78, 62], [50, 16]], cor: CIANO, freq: 2 },
  ],
  so: [
    { tipo: 'plasma', c: [50, 50], r: 6, cor: CIANO },
    { tipo: 'pulso', caminho: [[44, 28], [44, 60], [43, 100]], cor: CIANO, vel: 0.8, n: 3 },
    { tipo: 'pulso', caminho: [[56, 28], [56, 60], [57, 100]], cor: CIANO, vel: 0.7, n: 3 },
    { tipo: 'pulso', caminho: [[38, 40], [37, 70], [30, 100]], cor: ROSA, vel: 0.6, n: 2 },
    { tipo: 'pulso', caminho: [[62, 40], [63, 70], [70, 100]], cor: ROSA, vel: 0.6, n: 2 },
    { tipo: 'raio', de: [50, 50], para: [[38, 42], [62, 42], [40, 66], [60, 66]], cor: CIANO, freq: 3 },
  ],
  tronco: [
    { tipo: 'plasma', c: [52, 30], r: 6, cor: ROSA },
    { tipo: 'pulso', caminho: [[50, 92], [50, 60], [50, 30], [50, 4]], cor: CIANO, vel: 0.7, n: 4 },
    { tipo: 'raio', de: [52, 30], para: [[34, 22], [66, 22], [32, 38], [68, 38], [40, 50], [60, 50]], cor: ROSA, freq: 2.5 },
  ],
  // ossos: brilho dourado subindo pela coluna
  esqueleto: [
    { tipo: 'plasma', c: [50, 34], r: 5, cor: OURO },
    { tipo: 'pulso', caminho: [[50, 92], [50, 60], [50, 30], [50, 4]], cor: OURO, vel: 0.6, n: 3 },
  ],
  // nervos: pulsos ciano e rosa saindo da coluna para os lados
  nervoso: [
    { tipo: 'pulso', caminho: [[50, 92], [50, 60], [50, 30], [50, 4]], cor: CIANO, vel: 0.8, n: 4 },
    { tipo: 'pulso', caminho: [[50, 30], [38, 34], [26, 44]], cor: ROSA, vel: 0.7, n: 2 },
    { tipo: 'pulso', caminho: [[50, 30], [62, 34], [74, 44]], cor: ROSA, vel: 0.7, n: 2 },
  ],
  braco: [
    { tipo: 'plasma', c: [57, 56], r: 5, cor: CIANO },
    { tipo: 'pulso', caminho: [[80, 6], [69, 30], [57, 56], [42, 74], [27, 91]], cor: ROSA, vel: 0.55, n: 3 },
    { tipo: 'pulso', caminho: [[76, 10], [64, 34], [54, 58], [38, 78], [24, 94]], cor: CIANO, vel: 0.45, n: 2 },
    { tipo: 'raio', de: [57, 56], para: [[70, 30], [45, 70], [32, 86], [66, 44]], cor: CIANO, freq: 2 },
  ],
  mao: [
    { tipo: 'plasma', c: [55, 52], r: 6, cor: CIANO },
    { tipo: 'raio', de: [[38, 84], [49, 89], [60, 88], [71, 85], [82, 63]], para: [[38, 84], [49, 89], [60, 88], [71, 85], [82, 63]], cor: CIANO, freq: 6 },
    { tipo: 'raio', de: [55, 52], para: [[38, 84], [49, 89], [60, 88], [71, 85], [82, 63]], cor: BRANCO, freq: 2 },
    { tipo: 'pulso', caminho: [[30, 0], [40, 18], [47, 32], [55, 52]], cor: OURO, vel: 0.6, n: 2 },
  ],
  joelhos: [
    { tipo: 'plasma', c: [39, 51], r: 6, cor: CIANO },
    { tipo: 'plasma', c: [61, 51], r: 6, cor: CIANO },
    { tipo: 'pulso', caminho: [[37, 0], [38, 51], [37, 100]], cor: ROSA, vel: 0.6, n: 3 },
    { tipo: 'pulso', caminho: [[63, 0], [61, 51], [62, 100]], cor: ROSA, vel: 0.55, n: 3 },
    { tipo: 'raio', de: [[39, 51], [61, 51]], para: [[39, 51], [61, 51], [30, 40], [70, 40], [32, 62], [68, 62]], cor: BRANCO, freq: 2.5 },
  ],
};

const sorte = (a, b) => a + Math.random() * (b - a);
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const escolher = (lista) => lista[Math.floor(Math.random() * lista.length)];

export function criarEfeitos(canvas) {
  const ctx = canvas.getContext('2d');
  let receita = null, lado = 0, rodando = false, ultimo = 0;
  let raios = [], faiscas = [];
  const P = ([x, y]) => [(x / 100) * lado, (y / 100) * lado];

  // relâmpago: subdivide o segmento e desloca os pontos do meio para os lados
  function caminhoRaio(a, b) {
    let pts = [a, b];
    let desvio = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.22;
    for (let n = 0; n < 5; n++) {
      const novos = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
        const off = sorte(-desvio, desvio);
        novos.push([(x0 + x1) / 2 + (-dy / len) * off, (y0 + y1) / 2 + (dx / len) * off], pts[i]);
      }
      pts = novos;
      desvio *= 0.55;
    }
    return pts;
  }
  function soltarRaio(r) {
    const origens = Array.isArray(r.de[0]) ? r.de : [r.de];
    const a = escolher(origens);
    let b = escolher(r.para);
    if (b === a) b = escolher(r.para.filter((p) => p !== a));
    if (!b) return;
    const pa = P(a), pb = P(b);
    raios.push({ pts: caminhoRaio(pa, pb), cor: r.cor, vida: sorte(0.08, 0.18), t: 0 });
    for (let i = 0; i < 6; i++) faiscas.push({ x: pb[0], y: pb[1], vx: sorte(-60, 60), vy: sorte(-60, 60), vida: sorte(0.2, 0.5), t: 0, cor: r.cor });
  }

  function desenharLinha(pts, cor, largura, alfa, blur) {
    ctx.save();
    ctx.strokeStyle = rgba(cor, alfa);
    ctx.lineWidth = largura;
    ctx.shadowColor = rgba(cor, 1);
    ctx.shadowBlur = blur;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    ctx.restore();
  }
  function pontoNoCaminho(cam, f) {
    // f de 0 a 1 ao longo do caminho, pelo comprimento
    const seg = [];
    let total = 0;
    for (let i = 1; i < cam.length; i++) {
      const l = Math.hypot(cam[i][0] - cam[i - 1][0], cam[i][1] - cam[i - 1][1]);
      seg.push(l); total += l;
    }
    let d = f * total;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i]) {
        const k = d / seg[i];
        return [cam[i][0] + (cam[i + 1][0] - cam[i][0]) * k, cam[i][1] + (cam[i + 1][1] - cam[i][1]) * k];
      }
      d -= seg[i];
    }
    return cam[cam.length - 1];
  }

  function quadro(agora) {
    if (!rodando) return;
    const dt = Math.min(0.05, (agora - (ultimo || agora)) / 1000);
    ultimo = agora;
    const t = agora / 1000;
    ctx.clearRect(0, 0, lado, lado);
    ctx.globalCompositeOperation = 'lighter';

    for (const e of receita) {
      if (e.tipo === 'plasma') {
        const [x, y] = P(e.c);
        const r = (e.r / 100) * lado * (1 + 0.08 * Math.sin(t * 2.2));
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
        g.addColorStop(0, rgba(e.cor, 0.35));
        g.addColorStop(0.3, rgba(e.cor, 0.16));
        g.addColorStop(0.6, rgba(e.cor, 0.05));
        g.addColorStop(1, rgba(e.cor, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
        // anéis de plasma girando, tremidos
        for (let k = 0; ANEIS && k < 3; k++) {
          ctx.save();
          ctx.strokeStyle = rgba(e.cor, 0.55);
          ctx.lineWidth = 1.5;
          ctx.shadowColor = rgba(e.cor, 1);
          ctx.shadowBlur = 12;
          ctx.beginPath();
          const ini = t * (1.6 + k) + k * 2.1;
          for (let a = 0; a <= 1.2; a += 0.08) {
            const rr = r * (1.1 + 0.25 * k) + sorte(-2, 2);
            const px = x + Math.cos(ini + a) * rr, py = y + Math.sin(ini + a) * rr * 0.8;
            a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
        }
      } else if (e.tipo === 'raio') {
        // raios desligados: ficaram exagerados (ver RAIOS no topo)
        if (RAIOS && Math.random() < e.freq * dt) soltarRaio(e);
      } else if (e.tipo === 'pulso') {
        const cam = e.caminho.map(P);
        for (let k = 0; k < e.n; k++) {
          const f = (t * e.vel * 0.3 + k / e.n) % 1;
          // rastro: vários pontos atrás, cada vez mais fracos
          for (let j = 0; j < 8; j++) {
            const ff = f - j * 0.01;
            if (ff < 0) break;
            const [x, y] = pontoNoCaminho(cam, ff);
            const a = (1 - j / 8) * 0.45;
            const g = ctx.createRadialGradient(x, y, 0, x, y, 5);
            g.addColorStop(0, rgba(BRANCO, a));
            g.addColorStop(0.4, rgba(e.cor, a * 0.7));
            g.addColorStop(1, rgba(e.cor, 0));
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
          }
        }
      } else if (e.tipo === 'varre') {
        const meio = (Math.sin(t * 1.7) + 1) / 2;
        const y = ((e.y0 + (e.y1 - e.y0) * meio) / 100) * lado;
        const x0 = (e.x0 / 100) * lado, x1 = (e.x1 / 100) * lado;
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, rgba(e.cor, 0));
        g.addColorStop(0.5, rgba(e.cor, 0.25));
        g.addColorStop(1, rgba(e.cor, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x0, y - 1.5, x1 - x0, 3);
        ctx.fillStyle = rgba(e.cor, 0.03);
        ctx.fillRect(x0, y - 18, x1 - x0, 36);
      }
    }

    // raios vivos: halo largo + núcleo fino, piscando
    raios = raios.filter((r) => (r.t += dt) < r.vida);
    for (const r of raios) {
      const a = (1 - r.t / r.vida) * (Math.random() < 0.3 ? 0.4 : 1);
      desenharLinha(r.pts, r.cor, 5, a * 0.35, 18);
      desenharLinha(r.pts, BRANCO, 1.4, a, 6);
    }
    faiscas = faiscas.filter((f) => (f.t += dt) < f.vida);
    for (const f of faiscas) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      ctx.fillStyle = rgba(f.cor, 1 - f.t / f.vida);
      ctx.fillRect(f.x, f.y, 2, 2);
    }
    requestAnimationFrame(quadro);
  }

  return {
    // nome do close e o tamanho final dele em px do palco
    iniciar(nome, tamanho) {
      receita = RECEITAS[nome] || [];
      lado = tamanho;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = lado * dpr;
      canvas.height = lado * dpr;
      canvas.style.width = canvas.style.height = lado + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      raios = []; faiscas = [];
      if (!rodando) { rodando = true; ultimo = 0; requestAnimationFrame(quadro); }
    },
    parar() {
      rodando = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
