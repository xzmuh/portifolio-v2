/*
 * História: mapa de cidade em 3D no molde do mapa do Cyberpunk 2077.
 *
 * A cidade tem bairros com tons diferentes, prédios de vários formatos, rio,
 * praças de formas diferentes (rotatória, parque com lago, quadrada,
 * hexagonal), uma rodovia elevada por onde a rota passa com tráfego e painéis holográficos. Cada empresa é um
 * prédio-marco com a identidade dela (cores, forma do logo e o logo num
 * painel). A rota amarela liga as empresas na ordem da carreira.
 *
 * Ir para a próxima empresa liga o Sandevistan: a câmera dispara e
 * desacelera, os quadros anteriores ficam como rastros coloridos, a tela
 * fica verde e toca o som.
 *
 * Leve de propósito: prédios em malhas instanciadas, sem sombra nem
 * pós-processo, resolução limitada, só renderiza com a tela aberta.
 */
import * as THREE from 'three';
import { EMPRESAS } from './dados-historia.js';
import { tocar } from './som.js';
import { telaAtual } from './menu.js';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { clone as clonarEsqueleto } from '../vendor/addons/utils/SkeletonUtils.js';

const app = document.getElementById('app');
const canvas = document.querySelector('[data-mapa]');
const rotulos = document.querySelector('[data-mapa-rotulos]');
const listaEl = document.querySelector('[data-hist-lista]');
const cartao = document.querySelector('[data-hist-cartao]');

// grade da cidade: lote de 1, rua de 0.42, avenida a cada 5 ruas
const N = 64, LOTE = 1, RUA = 0.42, PASSO = LOTE + RUA;
const canto = (i) => (i - N / 2) * PASSO;
const ponto = ([x, z]) => new THREE.Vector3(x * PASSO - RUA / 2, 0, z * PASSO - RUA / 2);
const COR = { fundo: 0x07061a, rua: 0x00f0ff, rota: 0xfcee0a };

// rio: faixa diagonal que corta a cidade
const RIO = { a: 0.45, b: 6.5, meia: 1.25 };
const noRio = (x, z) => Math.abs(z - (RIO.a * x + RIO.b)) / Math.hypot(RIO.a, 1) < RIO.meia;
// nenhum prédio-marco pode cair na água: se cair, o rio desce até sair de baixo dele
for (let tentativa = 0; tentativa < 20; tentativa++) {
  const molhado = EMPRESAS.some((e) => { const p = ponto(e.lote); return Math.abs(p.z - (RIO.a * p.x + RIO.b)) / Math.hypot(RIO.a, 1) < RIO.meia + 1.6; });
  if (!molhado) break;
  RIO.b += 1.5;
}

// bairros: tom dos prédios conforme a região
const BAIRROS = [
  { centro: [0, 0], cor: 0xff2a6d, raio: 14 },       // centro: rosa quente
  { centro: [-15, 12], cor: 0xff6a2b, raio: 13 },    // zona industrial (perto da I-SINC): laranja
  { centro: [10, -14], cor: 0x9b3cff, raio: 14 },    // lado das empresas remotas: violeta
  { centro: [-16, -16], cor: 0xd01870, raio: 13 },   // norte: magenta escuro
  { centro: [18, 14], cor: 0x2b6bff, raio: 11 },     // sul: azul
];

let renderer, cena, camera, rodando = false, montado = false;
let sel = 0;
const cam = { alvo: new THREE.Vector3(), alvoDe: new THREE.Vector3(), t: 1, dur: 1.1, ang: 0.5, dist: 11, alt: 17 };
const marcadores = [];
let setas, trafego, agua, fade, cenaFade, cameraFade;
const sandy = { ativo: false, ini: 0, dur: 2.4 };
// Sandy como no anime: o mundo perde a cor (verde-acinzentado) e só o
// corredor e os ecos dele continuam coloridos. O corredor fica na camada 1
// e é desenhado numa segunda passada, sem o material cinza.
const coloridas = []; // malhas com cor por instância (a cor sai durante o Sandy)
let materialSemCor;
let semCor = 0; // 0 = mundo colorido, 1 = sem cor (sobe e desce suave)
const CAMADA_CORREDOR = 1;
// o corredor: personagem anime (Sakurada Fumiriya, modelo de exemplo do
// VRoid, uso livre) correndo pela rota com o Sandevistan, deixando cópias.
// A corrida vem do Xbot (three.js) e é passada para o esqueleto dele
const corredor = { modelo: null, mixer: null, acoes: {}, de: 0, para: 0, caminho: null, pool: [], ossos: [], ultimoFantasma: 0 };
let ESCALA_CORREDOR = 0.62; // recalculada para o personagem ter a altura que o Xbot tinha
// quanto o corredor anda por segundo com a animação de corrida em velocidade normal
const PASSADA = 2.9;
// a rota amarela: pontos em ordem e o índice de cada empresa nela
const rota = { pts: [], indice: [] };

/* ---------- textura do painel com o logo ---------- */
function painelLogo(e) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  const cor = '#' + e.marca.cor.toString(16).padStart(6, '0');
  g.fillStyle = 'rgba(7,6,26,0.92)';
  g.fillRect(0, 0, 512, 200);
  g.strokeStyle = cor;
  g.lineWidth = 6;
  g.strokeRect(6, 6, 500, 188);
  g.fillStyle = cor;
  g.fillRect(6, 6, 40, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const k = Math.min(420 / img.width, 120 / img.height);
    g.drawImage(img, 256 - (img.width * k) / 2, 100 - (img.height * k) / 2, img.width * k, img.height * k);
    tex.needsUpdate = true;
  };
  img.src = `img/empresas/${e.marca.logo}`;
  return tex;
}

/* ---------- prédios-marco (a forma vem do logo de cada empresa) ---------- */
function marco(e) {
  const g = new THREE.Group();
  const cor = new THREE.Color(e.marca.cor), cor2 = new THREE.Color(e.marca.cor2);
  const escuro = new THREE.MeshLambertMaterial({ color: 0x1a1030 });
  const brilho = (c) => new THREE.MeshBasicMaterial({ color: c });
  const faixa = (w, h, d, y, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brilho(c)); m.position.y = y; return m; };
  let anima = () => {};

  if (e.marca.forma === 'anel') {
    // I-SINC: campus largo e baixo, com o anel do logo girando em cima
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 1.5), escuro); base.position.y = 0.225;
    const meio = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 1.0), escuro); meio.position.y = 0.62;
    g.add(base, meio, faixa(2.12, 0.04, 1.52, 0.44, cor), faixa(1.42, 0.04, 1.02, 0.8, cor2));
    const anel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.09, 12, 48), brilho(cor));
    const anel2 = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 48, Math.PI * 1.2), brilho(cor2));
    anel.position.y = anel2.position.y = 1.45;
    g.add(anel, anel2);
    anima = (t) => { anel.rotation.y = t * 0.8; anel2.rotation.y = t * 0.8 + 0.3; anel2.rotation.z = t * 1.4; };
  } else if (e.marca.forma === 'setas') {
    // Next SI: as setas ">>" do logo, em 3D
    const seta = new THREE.Shape();
    seta.moveTo(0, 0); seta.lineTo(0.28, 0); seta.lineTo(0.62, 0.42); seta.lineTo(0.28, 0.84); seta.lineTo(0, 0.84); seta.lineTo(0.34, 0.42); seta.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(seta, { depth: 0.55, bevelEnabled: false });
    geo.translate(-0.31, -0.42, -0.275);
    const s1 = new THREE.Mesh(geo, brilho(cor)), s2 = new THREE.Mesh(geo, brilho(cor2));
    s1.rotation.x = s2.rotation.x = -Math.PI / 2;
    s1.rotation.z = s2.rotation.z = -Math.PI / 2;
    s1.position.set(-0.32, 0.3, 0); s2.position.set(0.32, 0.3, 0);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 1.3), escuro); base.position.y = 0.09;
    const torre = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.6), escuro); torre.position.set(0, 0.55, -0.55);
    g.add(base, torre, faixa(0.62, 0.04, 0.62, 1.1, cor), s1, s2);
    anima = (t) => { s1.position.y = 0.3 + Math.max(0, Math.sin(t * 2)) * 0.08; s2.position.y = 0.3 + Math.max(0, Math.sin(t * 2 - 0.6)) * 0.08; };
  } else if (e.marca.forma === 'barras') {
    // Dialogi: as três pílulas do logo, empilhadas
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.1), escuro); base.position.y = 0.1;
    g.add(base);
    const barras = [[1.0, -0.15, 0.45], [1.3, 0.1, 0.85], [0.75, -0.25, 1.25]];
    const pilulas = barras.map(([larg, dx, y], k) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, larg, 6, 16), brilho(k === 1 ? cor : cor2));
      m.rotation.z = Math.PI / 2; m.position.set(dx, y, 0);
      g.add(m);
      return m;
    });
    anima = (t) => pilulas.forEach((m, k) => { m.position.x = barras[k][1] + Math.sin(t * 1.5 + k) * 0.05; });
  } else {
    // SigmaCX: o "S" do logo, em dois tons
    const S = new THREE.Shape();
    S.moveTo(0, 0); S.lineTo(0.9, 0); S.lineTo(0.9, 0.55); S.lineTo(0.3, 0.55); S.lineTo(0.3, 0.7); S.lineTo(0.9, 0.7); S.lineTo(0.9, 0.95);
    S.lineTo(0.05, 0.95); S.lineTo(0.05, 0.4); S.lineTo(0.65, 0.4); S.lineTo(0.65, 0.25); S.lineTo(0, 0.25); S.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(S, { depth: 0.35, bevelEnabled: false });
    geo.translate(-0.45, 0, -0.175);
    const s = new THREE.Mesh(geo, brilho(cor));
    s.position.y = 0.2;
    const sombra = new THREE.Mesh(geo, brilho(cor2));
    sombra.position.set(0.06, 0.16, -0.08);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 1.0), escuro); base.position.y = 0.1;
    g.add(base, sombra, s);
    anima = (t) => { s.rotation.y = Math.sin(t * 0.7) * 0.35; sombra.rotation.y = s.rotation.y; };
  }

  // painel com o logo, sempre de frente para a câmera
  const painel = new THREE.Sprite(new THREE.SpriteMaterial({ map: painelLogo(e), transparent: true, depthTest: false }));
  painel.scale.set(1.9, 0.74, 1);
  painel.position.y = 2.35;
  painel.renderOrder = 5;
  g.add(painel);
  // anel no chão marcando o lote
  const anelChao = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.45, 48), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  anelChao.rotation.x = -Math.PI / 2; anelChao.position.y = 0.03;
  g.add(anelChao);
  return { g, anima, anelChao, painel };
}

/* ---------- rota e praças ----------
 * A rota anda pelas ruas de verdade (os cruzamentos da grade são os pontos
 * inteiros de `ponto`), e cada trecho é de um jeito:
 *   I-SINC → Next SI    ruas: sai reto, vira à direita, corta os quarteirões
 *                       e cai na rotatória, que contorna até a Next SI
 *   Next SI → Dialogi   rodovia elevada: rampa, reta longa em diagonal com
 *                       pilares, desce na Dialogi
 *   Dialogi → SigmaCX   volta para as ruas, para outra área: reta longa,
 *                       vira à esquerda e desce até a SigmaCX
 * As esquinas são arredondadas de leve; a rotatória é um arco de verdade.
 * Praças: rotatoria (r), parque (rx, rz, com lago), quadrada (meia),
 * hex (r, com torre holográfica). */
const PRACAS = [];
const ALTURA_RODOVIA = 0.62;
function dentroPraca(pr, x, z, folga) {
  const dx = x - pr.x, dz = z - pr.z;
  if (pr.forma === 'parque') return (dx / (pr.rx + folga)) ** 2 + (dz / (pr.rz + folga)) ** 2 < 1;
  if (pr.forma === 'quadrada') return Math.abs(dx) < pr.meia + folga && Math.abs(dz) < pr.meia + folga;
  return Math.hypot(dx, dz) < pr.r + folga;
}
// cruzamento da grade, com altura opcional (a rodovia)
const P = (x, z, y = 0) => { const v = ponto([x, z]); v.y = y; return v; };
// esquinas arredondadas: troca cada canto por uma curvinha de raio r
function arredondar(pts, r) {
  const out = [pts[0].clone()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const d1 = a.distanceTo(b), d2 = b.distanceTo(c);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const p1 = b.clone().addScaledVector(a.clone().sub(b).normalize(), rr);
    const p2 = b.clone().addScaledVector(c.clone().sub(b).normalize(), rr);
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      out.push(p1.clone().multiplyScalar((1 - t) ** 2).addScaledVector(b, 2 * t * (1 - t)).addScaledVector(p2, t * t));
    }
  }
  out.push(pts[pts.length - 1].clone());
  return out;
}
// reamostra a polilinha em passos iguais
function reamostrar(pts, passo) {
  const out = [pts[0].clone()];
  let sobra = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = a.distanceTo(b);
    let t = passo - sobra;
    while (t <= d) { out.push(a.clone().lerp(b, t / d)); t += passo; }
    sobra = d - (t - passo);
  }
  if (out[out.length - 1].distanceTo(pts[pts.length - 1]) > 0.01) out.push(pts[pts.length - 1].clone());
  return out;
}
function montarRota() {
  const lotes = EMPRESAS.map((e) => ponto(e.lote));
  const [isinc, next, dialogi, sigma] = lotes;
  const bruto = [];

  // 1) ruas até a rotatória
  const rot = { centro: P(-4, 5), r: 2.4 };
  PRACAS.push({ forma: 'rotatoria', x: rot.centro.x, z: rot.centro.z, r: rot.r });
  bruto.push(isinc, P(-15, 8), P(-7, 8), P(-7, 5));
  const raioAnel = rot.r + 0.2;
  // entra pelo oeste e contorna pelo sul até sair a leste
  for (let k = 0; k <= 24; k++) {
    const ang = Math.PI - (Math.PI * k) / 24;
    bruto.push(new THREE.Vector3(rot.centro.x + Math.cos(ang) * raioAnel, 0, rot.centro.z + Math.sin(ang) * raioAnel));
  }
  bruto.push(next);

  // 2) rodovia elevada em diagonal
  bruto.push(P(2, 5), P(4, 3, ALTURA_RODOVIA), P(11, -4, ALTURA_RODOVIA), P(13, -6), dialogi);

  // 3) outra área: reta longa, esquerda, desce
  bruto.push(P(13, -15), P(4, -15), sigma);

  const pts = reamostrar(arredondar(bruto, 0.55), 0.12);
  rota.indice = lotes.map((l) => {
    let melhor = 0, d = Infinity;
    pts.forEach((p, k) => { const dd = p.distanceToSquared(l); if (dd < d) { d = dd; melhor = k; } });
    pts[melhor] = l.clone();
    return melhor;
  });
  rota.pts.length = 0;
  rota.pts.push(...pts);

  // praças ao longo do caminho e soltas, cada uma de um jeito
  const parque = P(10, 2), quadrada = P(8, -18), hex = P(-19, -13), comprido = P(19, 11);
  PRACAS.push({ forma: 'parque', x: parque.x, z: parque.z, rx: 2.6, rz: 1.7 });
  PRACAS.push({ forma: 'quadrada', x: quadrada.x, z: quadrada.z, meia: 1.2 });
  PRACAS.push({ forma: 'hex', x: hex.x, z: hex.z, r: 1.5 });
  PRACAS.push({ forma: 'parque', x: comprido.x, z: comprido.z, rx: 1.1, rz: 2.4 });
}
// fita plana seguindo uma lista de pontos (na altura deles + y), com
// deslocamento lateral opcional (as bordas da rodovia)
function fita(pts, largura, y, material, lado = 0) {
  const pos = [], idx = [];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    const ux = -dz / l, uz = dx / l;
    const cx = pts[k].x + ux * lado, cz = pts[k].z + uz * lado, cy = pts[k].y + y;
    pos.push(cx + ux * largura / 2, cy, cz + uz * largura / 2, cx - ux * largura / 2, cy, cz - uz * largura / 2);
    if (k) { const i = k * 2; idx.push(i - 2, i - 1, i, i - 1, i + 1, i); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return new THREE.Mesh(g, material);
}

// parede vertical seguindo uma lista de pontos, deslocada para o lado
function parede(pts, lado, y0, y1, material) {
  const pos = [], idx = [];
  for (let k = 0; k < pts.length; k++) {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    const x = pts[k].x - (dz / l) * lado, z = pts[k].z + (dx / l) * lado;
    pos.push(x, pts[k].y + y0, z, x, pts[k].y + y1, z);
    if (k) { const i = k * 2; idx.push(i - 2, i - 1, i, i - 1, i + 1, i); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, material);
}

/* ---------- montagem da cidade ---------- */
function montar() {
  montado = true;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setClearColor(COR.fundo, 1);
  renderer.autoClear = false; // o Sandevistan desenha por cima do quadro anterior
  cena = new THREE.Scene();
  cena.fog = new THREE.Fog(COR.fundo, 16, 36);
  camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 120);

  cena.add(new THREE.AmbientLight(0x5a2f7a, 1.0));
  const luz = new THREE.DirectionalLight(0xffb3d9, 2.2);
  luz.position.set(-3, 14, 4);
  cena.add(luz);
  // as luzes valem para o mundo e para a camada do corredor
  cena.children.forEach((o) => { if (o.isLight) o.layers.enableAll(); });

  const chao = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), new THREE.MeshBasicMaterial({ color: 0x0b0824 }));
  chao.rotation.x = -Math.PI / 2; chao.position.y = -0.01;
  cena.add(chao);

  // rio: faixa escura com reflexo ciano correndo (textura listrada que anda)
  const listras = document.createElement('canvas');
  listras.width = 64; listras.height = 256;
  const lg = listras.getContext('2d');
  lg.fillStyle = '#081633'; lg.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 16) { lg.fillStyle = `rgba(0,240,255,${0.08 + Math.random() * 0.2})`; lg.fillRect(4 + Math.random() * 30, y, 10 + Math.random() * 20, 2); }
  const texAgua = new THREE.CanvasTexture(listras);
  texAgua.wrapS = texAgua.wrapT = THREE.RepeatWrapping;
  texAgua.repeat.set(3, 16);
  agua = new THREE.Mesh(new THREE.PlaneGeometry(RIO.meia * 2, 90), new THREE.MeshBasicMaterial({ map: texAgua }));
  agua.rotation.x = -Math.PI / 2;
  agua.rotation.z = -Math.atan(RIO.a) + Math.PI / 2;
  agua.position.set(0, 0.012, RIO.b);
  cena.add(agua);

  const sorte = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const perto = (x, z) => Math.min(...EMPRESAS.map((e) => { const p = ponto(e.lote); return Math.hypot(x - p.x, z - p.z); }));
  const corBairro = (x, z) => {
    let peso = 0; const soma = new THREE.Color(0, 0, 0);
    for (const b of BAIRROS) {
      const d = Math.hypot(x - b.centro[0] * PASSO, z - b.centro[1] * PASSO);
      const w = Math.max(0, 1 - d / (b.raio * PASSO)) ** 2;
      soma.add(new THREE.Color(b.cor).multiplyScalar(w)); peso += w;
    }
    return peso > 0.001 ? soma.multiplyScalar(1 / peso) : new THREE.Color(0xc4185a);
  };

  // rota amarela e rotatórias primeiro: os prédios abrem espaço para elas
  montarRota();
  // o rio também não passa por baixo das praças: desce até sair delas
  const distRio = (x, z) => Math.abs(z - (RIO.a * x + RIO.b)) / Math.hypot(RIO.a, 1);
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    const molhado = PRACAS.some((pr) => distRio(pr.x, pr.z) < RIO.meia + (pr.r || pr.meia || Math.max(pr.rx, pr.rz)) + 0.6)
      || EMPRESAS.some((e) => { const q = ponto(e.lote); return distRio(q.x, q.z) < RIO.meia + 1.6; });
    if (!molhado) break;
    RIO.b += 1.2;
  }
  agua.position.z = RIO.b;
  const pertoRota = (x, z) => { let d = Infinity; for (const p of rota.pts) d = Math.min(d, (x - p.x) ** 2 + (z - p.z) ** 2); return Math.sqrt(d); };
  const naPraca = (x, z, folga) => PRACAS.some((pr) => dentroPraca(pr, x, z, folga));

  // tipos de prédio em malhas instanciadas
  const geoCaixa = new THREE.BoxGeometry(1, 1, 1); geoCaixa.translate(0, 0.5, 0);
  const geoCil = new THREE.CylinderGeometry(0.5, 0.5, 1, 14); geoCil.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const caixas = new THREE.InstancedMesh(geoCaixa, mat, N * N * 4);
  const geoHex = new THREE.CylinderGeometry(0.5, 0.5, 1, 6); geoHex.translate(0, 0.5, 0);
  const hexes = new THREE.InstancedMesh(geoHex, mat, N * N * 2);
  let nx = 0;
  const cilindros = new THREE.InstancedMesh(geoCil, mat, N * N);
  const geoArv = new THREE.ConeGeometry(0.12, 0.3, 6); geoArv.translate(0, 0.15, 0);
  const arvores = new THREE.InstancedMesh(geoArv, new THREE.MeshBasicMaterial({ color: 0x1fd6a0 }), N * N);
  const geoPraca = new THREE.PlaneGeometry(1, 1); geoPraca.rotateX(-Math.PI / 2);
  const pracas = new THREE.InstancedMesh(geoPraca, new THREE.MeshBasicMaterial({ color: 0x0d3b3a }), N * N);
  const paineis = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.28), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 400);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), eu = new THREE.Euler();
  let nc = 0, nl = 0, na = 0, np = 0, nh = 0;
  const POR = (x, y, z, sx, sy, sz, ry = 0) => m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(eu.set(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  const NEON = [0x00f0ff, 0xfcee0a, 0xff2a6d, 0x9b3cff];

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = canto(i) + LOTE / 2, z = canto(j) + LOTE / 2;
      if (noRio(x, z)) continue;
      if (perto(x, z) < 1.6) continue; // o lote do prédio-marco fica livre
      if (naPraca(x, z, 0.5) || pertoRota(x, z) < 0.62) continue; // rotatórias e a rota passam livres
      const centro = Math.hypot(x, z);
      const tipo = sorte();
      const base = corBairro(x, z);
      const tom = (k) => c.copy(base).lerp(new THREE.Color(0xffffff), sorte() * 0.12).multiplyScalar(k);

      if (tipo < 0.06) {
        // praça com árvores
        POR(x, 0.006, z, 0.92, 1, 0.92); pracas.setMatrixAt(np++, m);
        for (let a = 0; a < 4; a++) { POR(x - 0.3 + sorte() * 0.6, 0, z - 0.3 + sorte() * 0.6, 1, 0.7 + sorte() * 0.6, 1); arvores.setMatrixAt(na++, m); }
        continue;
      }
      // cada empresa (e o centro) puxa um miolo de prédios altos em volta
      const miolo = Math.min(centro, perto(x, z));
      const alturaBase = 0.12 + Math.max(0, 1 - miolo / 17) * 0.88;
      if (tipo < 0.14 && miolo < 15) {
        // torre cilíndrica
        const h = alturaBase * (1.5 + sorte() * 2.2);
        POR(x, 0, z, 0.7, h, 0.7); cilindros.setMatrixAt(nl, m); cilindros.setColorAt(nl++, tom(0.9));
        if (nh < 400 && sorte() < 0.5) { POR(x + 0.36, h * 0.7, z, 1, 1, 1, Math.PI / 2); paineis.setMatrixAt(nh, m); paineis.setColorAt(nh++, c.setHex(NEON[Math.floor(sorte() * 4)])); }
        continue;
      }
      if (tipo < 0.34) {
        // escalonado: base larga + bloco menor em cima
        const h1 = alturaBase * (0.4 + sorte() * 0.6), h2 = alturaBase * (0.5 + sorte() * 1.4);
        POR(x, 0, z, 0.9, h1, 0.9); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(0.75));
        POR(x + (sorte() - 0.5) * 0.2, h1, z + (sorte() - 0.5) * 0.2, 0.55, h2, 0.55); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(1));
        if (nh < 400 && sorte() < 0.25) { POR(x, h1 + h2 * 0.6, z + 0.28, 1, 1, 1); paineis.setMatrixAt(nh, m); paineis.setColorAt(nh++, c.setHex(NEON[Math.floor(sorte() * 4)])); }
        continue;
      }
      if (tipo < 0.46) {
        // laje larga e baixa (galpão)
        POR(x, 0, z, 0.95, 0.12 + sorte() * 0.2, 0.95); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(0.6));
        continue;
      }
      if (tipo < 0.56) {
        // torre hexagonal com uma coroa mais fina em cima
        const h = alturaBase * (1 + sorte() * 2);
        POR(x, 0, z, 0.8, h, 0.8, sorte() * Math.PI); hexes.setMatrixAt(nx, m); hexes.setColorAt(nx++, tom(0.85));
        POR(x, h, z, 0.45, alturaBase * (0.3 + sorte() * 0.6), 0.45); hexes.setMatrixAt(nx, m); hexes.setColorAt(nx++, tom(1.05));
        continue;
      }
      if (tipo < 0.8) {
        // quadra picada: dois a quatro prédios menores no mesmo lote
        const partes = 2 + Math.floor(sorte() * 3);
        const cantos = [[-0.22, -0.22], [0.22, 0.22], [0.22, -0.22], [-0.22, 0.22]];
        for (let k = 0; k < partes; k++) {
          const hh = alturaBase * (0.3 + sorte() * 1.5);
          POR(x + cantos[k][0], 0, z + cantos[k][1], 0.38, hh, 0.38); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(0.6 + sorte() * 0.45));
        }
        continue;
      }
      // caixa comum, uma ou outra torre
      const h = alturaBase * (0.3 + sorte() * 1.1) + (sorte() < 0.05 ? 1.2 : 0);
      const lado = 0.74 + sorte() * 0.2;
      POR(x, 0, z, lado, h, lado); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(0.65 + sorte() * 0.4));
    }
  }
  // praças: cada forma com o seu desenho
  const plano = (geo, mat, x, z, y = 0.007) => { const o = new THREE.Mesh(geo, mat); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); cena.add(o); return o; };
  const arvore = (x, z, k = 1) => { POR(x, 0, z, k, k * (0.8 + sorte() * 0.6), k); arvores.setMatrixAt(na++, m); };
  const matGrama = new THREE.MeshBasicMaterial({ color: 0x0d3b3a });
  const matPiso = new THREE.MeshBasicMaterial({ color: 0x1b1240 });
  const matLago = new THREE.MeshBasicMaterial({ color: 0x0a2350 });
  const matMonu = new THREE.MeshLambertMaterial({ color: 0x3a1d5c });
  const linhaNeon = (cor, op) => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: op, side: THREE.DoubleSide });
  for (const pr of PRACAS) {
    if (pr.forma === 'rotatoria') {
      // gramado redondo, dois anéis de rua e um obelisco amarelo no meio
      plano(new THREE.CircleGeometry(pr.r - 0.25, 48), matGrama, pr.x, pr.z);
      plano(new THREE.RingGeometry(pr.r - 0.05, pr.r + 0.05, 72), linhaNeon(COR.rua, 0.85), pr.x, pr.z, 0.009);
      plano(new THREE.RingGeometry(pr.r + 0.38, pr.r + 0.42, 72), linhaNeon(COR.rua, 0.25), pr.x, pr.z, 0.009);
      const agulha = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 1.6, 4), matMonu);
      agulha.position.set(pr.x, 0.8, pr.z);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 6, 32), new THREE.MeshBasicMaterial({ color: COR.rota }));
      halo.rotation.x = Math.PI / 2; halo.position.set(pr.x, 1.15, pr.z);
      cena.add(agulha, halo);
      const n = 20;
      for (let k = 0; k < n; k++) { const ang = (k / n) * Math.PI * 2, rr = pr.r - 0.45 - (k % 2) * 0.3; arvore(pr.x + Math.cos(ang) * rr, pr.z + Math.sin(ang) * rr); }
    } else if (pr.forma === 'parque') {
      // gramado oval, lago no meio com borda ciano e árvores soltas em volta
      plano(new THREE.CircleGeometry(1, 48), matGrama, pr.x, pr.z).scale.set(pr.rx, pr.rz, 1);
      plano(new THREE.CircleGeometry(1, 40), matLago, pr.x + pr.rx * 0.12, pr.z, 0.009).scale.set(pr.rx * 0.5, pr.rz * 0.45, 1);
      plano(new THREE.RingGeometry(0.97, 1, 48), linhaNeon(COR.rua, 0.7), pr.x + pr.rx * 0.12, pr.z, 0.01).scale.set(pr.rx * 0.5, pr.rz * 0.45, 1);
      plano(new THREE.RingGeometry(0.985, 1, 48), linhaNeon(0x1fd6a0, 0.5), pr.x, pr.z, 0.01).scale.set(pr.rx, pr.rz, 1);
      for (let k = 0; k < 26; k++) {
        const ang = sorte() * Math.PI * 2, rr = 0.62 + sorte() * 0.3;
        arvore(pr.x + Math.cos(ang) * pr.rx * rr, pr.z + Math.sin(ang) * pr.rz * rr, 0.8 + sorte() * 0.7);
      }
    } else if (pr.forma === 'quadrada') {
      // piso de pedra com borda rosa, chafariz ciano e uma árvore em cada canto
      plano(new THREE.PlaneGeometry(pr.meia * 2, pr.meia * 2), matPiso, pr.x, pr.z);
      const borda = new THREE.EdgesGeometry(new THREE.PlaneGeometry(pr.meia * 2, pr.meia * 2));
      const contorno = new THREE.LineSegments(borda, new THREE.LineBasicMaterial({ color: 0xff2a6d }));
      contorno.rotation.x = -Math.PI / 2; contorno.position.set(pr.x, 0.012, pr.z); cena.add(contorno);
      const bacia = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.08, 24), matMonu);
      bacia.position.set(pr.x, 0.04, pr.z);
      const agua = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshBasicMaterial({ color: COR.rua }));
      agua.rotation.x = -Math.PI / 2; agua.position.set(pr.x, 0.085, pr.z);
      const jato = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0x9ff8ff, transparent: true, opacity: 0.7 }));
      jato.position.set(pr.x, 0.33, pr.z);
      cena.add(bacia, agua, jato);
      const c0 = pr.meia - 0.25;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) arvore(pr.x + sx * c0, pr.z + sz * c0, 1.4);
    } else {
      // hexágono de piso, seis árvores nas pontas e torre holográfica rosa
      plano(new THREE.CircleGeometry(pr.r, 6), matPiso, pr.x, pr.z);
      plano(new THREE.RingGeometry(pr.r - 0.04, pr.r, 6), linhaNeon(0x9b3cff, 0.9), pr.x, pr.z, 0.009);
      const torre = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.4, 6), matMonu);
      torre.position.set(pr.x, 1.2, pr.z);
      cena.add(torre);
      for (let k = 0; k < 3; k++) {
        const anel = new THREE.Mesh(new THREE.TorusGeometry(0.34 - k * 0.07, 0.014, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff2a6d }));
        anel.rotation.x = Math.PI / 2; anel.position.set(pr.x, 0.9 + k * 0.55, pr.z); cena.add(anel);
      }
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * Math.PI * 2; arvore(pr.x + Math.cos(ang) * (pr.r - 0.3), pr.z + Math.sin(ang) * (pr.r - 0.3), 1.2); }
    }
  }

  caixas.count = nc; cilindros.count = nl; arvores.count = na; pracas.count = np; paineis.count = nh; hexes.count = nx;
  cena.add(caixas, cilindros, arvores, pracas, paineis, hexes);
  coloridas.push(caixas, cilindros, paineis, hexes);

  // ruas: linhas ciano; avenidas mais fortes
  const matRua = new THREE.MeshBasicMaterial({ color: COR.rua, transparent: true, opacity: 0.3 });
  const matAv = new THREE.MeshBasicMaterial({ color: COR.rua, transparent: true, opacity: 0.85 });
  const tam = N * PASSO;
  for (let r = 0; r <= N; r++) {
    const av = r % 5 === 0;
    const largura = av ? 0.09 : 0.035;
    const v = (r - N / 2) * PASSO - RUA / 2;
    const a = new THREE.Mesh(new THREE.PlaneGeometry(largura, tam), av ? matAv : matRua);
    a.rotation.x = -Math.PI / 2; a.position.set(v, 0.005, -RUA / 2); cena.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(tam, largura), av ? matAv : matRua);
    b.rotation.x = -Math.PI / 2; b.position.set(-RUA / 2, 0.005, v); cena.add(b);
  }

  // rodovia elevada de verdade: tabuleiro com espessura, laterais, mureta
  // com faixa de luz em cima e pilares com capitel
  const elevado = rota.pts.filter((p) => p.y > 0.01);
  // tráfego: luzinhas andando pela rodovia, uma faixa em cada sentido
  const pista = new THREE.CurvePath();
  for (let k = 1; k < elevado.length; k++) pista.add(new THREE.LineCurve3(elevado[k - 1], elevado[k]));
  trafego = { malha: new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.04, 0.22), new THREE.MeshBasicMaterial({ color: 0xffffff }), 24), pista };
  for (let i = 0; i < 24; i++) trafego.malha.setColorAt(i, c.setHex(i % 2 ? 0xfcee0a : 0x00f0ff));
  cena.add(trafego.malha);
  if (elevado.length > 1) {
    const LARG = 0.95, ESP = 0.14, MURETA = 0.09;
    const matTab = new THREE.MeshLambertMaterial({ color: 0x2c1748, side: THREE.DoubleSide });
    const matLado = new THREE.MeshLambertMaterial({ color: 0x1a0d2e, side: THREE.DoubleSide });
    const matLuz = new THREE.MeshBasicMaterial({ color: 0xff2a6d, side: THREE.DoubleSide });
    const tampo = fita(elevado, LARG, -0.01, matTab); tampo.geometry.computeVertexNormals();
    cena.add(tampo, fita(elevado, LARG, -0.01 - ESP, matLado));
    for (const lado of [LARG / 2, -LARG / 2]) {
      cena.add(parede(elevado, lado, -0.01 - ESP, MURETA, matLado));
      cena.add(fita(elevado, 0.03, MURETA + 0.002, matLuz, lado));
    }
    const geoPilar = new THREE.BoxGeometry(0.22, 1, 0.22); geoPilar.translate(0, 0.5, 0);
    const geoCapitel = new THREE.BoxGeometry(LARG * 0.8, 0.06, 0.3);
    for (let k = 7; k < elevado.length; k += 16) {
      const p = elevado[k];
      if (p.y < 0.3) continue;
      const d = elevado[Math.min(elevado.length - 1, k + 1)].clone().sub(elevado[k - 1]);
      const pilar = new THREE.Mesh(geoPilar, matLado);
      pilar.scale.y = p.y - ESP - 0.04; pilar.position.set(p.x, 0, p.z);
      const capitel = new THREE.Mesh(geoCapitel, matLado);
      capitel.position.set(p.x, p.y - ESP - 0.04, p.z);
      capitel.rotation.y = Math.atan2(d.x, d.z) + Math.PI / 2;
      cena.add(pilar, capitel);
    }
  }

  // rota amarela: fita contínua seguindo a curva (brilho largo + miolo)
  const pts = rota.pts;
  cena.add(fita(pts, 0.45, 0.02, new THREE.MeshBasicMaterial({ color: COR.rota, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide })));
  cena.add(fita(pts, 0.13, 0.03, new THREE.MeshBasicMaterial({ color: COR.rota, side: THREE.DoubleSide })));
  const caminho = new THREE.CurvePath();
  for (let i = 1; i < pts.length; i++) if (pts[i - 1].distanceTo(pts[i]) > 0.01) caminho.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  const geoSeta = new THREE.ConeGeometry(0.12, 0.3, 3); geoSeta.rotateX(Math.PI / 2);
  setas = { malha: new THREE.InstancedMesh(geoSeta, new THREE.MeshBasicMaterial({ color: 0xffffff }), 18), caminho };
  cena.add(setas.malha);

  // prédios-marco das empresas
  EMPRESAS.forEach((e, i) => {
    const mk = marco(e);
    mk.g.position.copy(ponto(e.lote));
    cena.add(mk.g);
    const alvoClique = new THREE.Mesh(new THREE.SphereGeometry(1.3), new THREE.MeshBasicMaterial({ visible: false }));
    alvoClique.position.y = 1; alvoClique.userData.indice = i;
    mk.g.add(alvoClique);
    const r = document.createElement('button');
    r.type = 'button';
    r.className = 'mapa_rotulo';
    r.innerHTML = '<b></b><small></small>';
    r.querySelector('b').textContent = e.nome;
    r.querySelector('small').textContent = e.bairro;
    r.addEventListener('click', () => escolher(i));
    rotulos.append(r);
    marcadores.push({ ...mk, alvoClique, rotulo: r });
  });

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  canvas.addEventListener('click', (ev) => {
    const r = canvas.getBoundingClientRect();
    mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(marcadores.map((mk) => mk.alvoClique))[0];
    if (hit) escolher(hit.object.userData.indice);
  });

  // Sandevistan: um quadro escuro e tingido desenhado por cima do anterior
  // apaga aos poucos, deixando o rastro colorido do que a câmera viu
  cenaFade = new THREE.Scene();
  cameraFade = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  fade = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: COR.fundo, transparent: true, opacity: 0.2, depthTest: false, depthWrite: false }));
  cenaFade.add(fade);

  carregarCorredor();
  cam.alvo.copy(ponto(EMPRESAS[sel].lote));
  cam.alvoDe.copy(cam.alvo);
  redimensionar();
}

/* ---------- corredor ---------- */
// osso do VRM (humanoide) -> osso do Mixamo (Xbot)
const OSSOS = {
  hips: 'Hips', spine: 'Spine', chest: 'Spine1', upperChest: 'Spine2', neck: 'Neck', head: 'Head',
  leftShoulder: 'LeftShoulder', leftUpperArm: 'LeftArm', leftLowerArm: 'LeftForeArm', leftHand: 'LeftHand',
  rightShoulder: 'RightShoulder', rightUpperArm: 'RightArm', rightLowerArm: 'RightForeArm', rightHand: 'RightHand',
  leftUpperLeg: 'LeftUpLeg', leftLowerLeg: 'LeftLeg', leftFoot: 'LeftFoot', leftToes: 'LeftToeBase',
  rightUpperLeg: 'RightUpLeg', rightLowerLeg: 'RightLeg', rightFoot: 'RightFoot', rightToes: 'RightToeBase',
};
// passa uma animação de um esqueleto para outro: os dois de frente para +Z e
// em pose de descanso; cada osso do alvo gira no mundo o mesmo tanto que o
// osso da fonte girou a partir do descanso
// ossos com movimento ampliado: passada mais longa, braço mais solto
const AMPLIA = { UpperLeg: 1.35, LowerLeg: 1.3, UpperArm: 1.25, LowerArm: 1.2 };
const amplitude = (nome) => { for (const [k, v] of Object.entries(AMPLIA)) if (nome.includes(k)) return v; return 1; };
function reposicionar(fonte, clip, alvo, pares, fps = 30) {
  const qr = new THREE.Quaternion(), eixo = new THREE.Vector3();
  fonte.updateMatrixWorld(true);
  alvo.updateMatrixWorld(true);
  const q = new THREE.Quaternion(), qp = new THREE.Quaternion(), v = new THREE.Vector3();
  const lista = pares.map(([a, f]) => ({
    a, f,
    f0: f.getWorldQuaternion(new THREE.Quaternion()).invert(),
    a0: a.getWorldQuaternion(new THREE.Quaternion()),
    descanso: a.quaternion.clone(),
  }));
  const quadril = lista[0];
  const fPos0 = quadril.f.getWorldPosition(new THREE.Vector3());
  const aPos0 = quadril.a.getWorldPosition(new THREE.Vector3());
  const posDescanso = quadril.a.position.clone();
  const proporcao = aPos0.y / fPos0.y;
  const n = Math.ceil(clip.duration * fps) + 1;
  const tempos = new Float32Array(n);
  const valores = lista.map(() => new Float32Array(n * 4));
  const posicoes = new Float32Array(n * 3);
  const mixer = new THREE.AnimationMixer(fonte);
  mixer.clipAction(clip).play();
  for (let i = 0; i < n; i++) {
    const t = Math.min(i / fps, clip.duration);
    tempos[i] = t;
    mixer.setTime(t);
    fonte.updateMatrixWorld(true);
    lista.forEach((o, k) => {
      o.f.getWorldQuaternion(q).multiply(o.f0).multiply(o.a0); // rotação no mundo que o alvo deve ter
      o.a.parent.getWorldQuaternion(qp).invert();
      o.a.quaternion.copy(qp.multiply(q));
      // amplia o giro em relação ao descanso (pernas e braços)
      const amp = amplitude(o.a.name);
      if (amp !== 1) {
        qr.copy(o.descanso).invert().multiply(o.a.quaternion);
        if (qr.w < 0) { qr.x = -qr.x; qr.y = -qr.y; qr.z = -qr.z; qr.w = -qr.w; }
        const ang = 2 * Math.acos(Math.min(1, qr.w));
        if (ang > 1e-4) {
          eixo.set(qr.x, qr.y, qr.z).normalize();
          qr.setFromAxisAngle(eixo, ang * amp);
          o.a.quaternion.copy(o.descanso).multiply(qr);
        }
      }
      o.a.updateMatrixWorld(true);
      o.a.quaternion.toArray(valores[k], i * 4);
    });
    v.copy(quadril.f.getWorldPosition(new THREE.Vector3())).sub(fPos0).multiplyScalar(proporcao).add(aPos0);
    quadril.a.parent.worldToLocal(v).toArray(posicoes, i * 3);
  }
  mixer.stopAllAction();
  lista.forEach((o) => o.a.quaternion.copy(o.descanso));
  quadril.a.position.copy(posDescanso);
  const trilhas = lista.map((o, k) => new THREE.QuaternionKeyframeTrack(`${o.a.name}.quaternion`, tempos, valores[k]));
  trilhas.push(new THREE.VectorKeyframeTrack(`${quadril.a.name}.position`, tempos, posicoes));
  return new THREE.AnimationClip(clip.name, clip.duration, trilhas);
}

function carregarCorredor() {
  const loader = new GLTFLoader();
  const carregar = (url) => new Promise((ok, erro) => loader.load(url, ok, undefined, erro));
  Promise.all([carregar('modelos/xbot.glb'), carregar('modelos/runner.vrm')]).then(([xbot, vrm]) => {
    // VRM 0.x olha para -Z: gira para olhar para +Z, como o Xbot
    const personagem = vrm.scene;
    personagem.rotation.y = Math.PI;
    // inclinado para frente, postura de sprint
    const inclinacao = new THREE.Group();
    inclinacao.rotation.x = 0.22;
    inclinacao.add(personagem);
    const m = new THREE.Group();
    m.add(inclinacao);
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      // material sem luz (anime): só a textura, igual ao VRoid
      // o VRoid exporta cor por vértice zerada: ligada, ela apaga o corpo (só sobrava o cabelo)
      for (const mat of [].concat(o.material)) {
        mat.fog = false;
        mat.vertexColors = false;
        // cabelo preto: escurece a textura (o brilho dela continua aparecendo)
        if (/HAIR/i.test(mat.name)) mat.color.setRGB(0.16, 0.16, 0.2);
        // roupa toda preta; a pele do corpo (braços e mãos) também, como manga longa e luva
        if (/CLOTH|Body_00_SKIN/i.test(mat.name)) mat.color.setRGB(0.1, 0.1, 0.13);
      }
    });
    juntarPedacos(personagem);
    // pares de ossos para passar a corrida
    const humanos = vrm.parser.json.extensions.VRM.humanoid.humanBones;
    const porNome = {};
    xbot.scene.traverse((o) => { if (o.isBone) porNome[o.name.replace(/^mixamorig:?/, '')] = o; });
    const pares = [];
    for (const [osso, mixamo] of Object.entries(OSSOS)) {
      const h = humanos.find((x) => x.bone === osso);
      if (!h || !porNome[mixamo]) continue;
      const nome = THREE.PropertyBinding.sanitizeNodeName(vrm.parser.json.nodes[h.node].name);
      const a = personagem.getObjectByName(nome);
      if (a) pares.push([a, porNome[mixamo]]);
    }
    // mesma altura que o Xbot tinha no mapa
    const altura = (o) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).y;
    ESCALA_CORREDOR = (0.62 * 1.15 * altura(xbot.scene)) / altura(m); // um pouco maior, para o cabelo aparecer
    m.scale.setScalar(ESCALA_CORREDOR);
    m.traverse((o) => o.layers.set(CAMADA_CORREDOR));
    corredor.modelo = m;
    corredor.mixer = new THREE.AnimationMixer(m);
    for (const clip of xbot.animations) {
      if (clip.name !== 'run' && clip.name !== 'idle') continue;
      corredor.acoes[clip.name] = corredor.mixer.clipAction(reposicionar(xbot.scene, clip, personagem, pares));
    }
    corredor.acoes.idle?.play();
    m.position.copy(ponto(EMPRESAS[sel].lote));
    cena.add(m);
    montarFantasmas();
    m.traverse((o) => { if (o.isMesh) for (const mat of [].concat(o.material)) if (mat.map) renderer.initTexture(mat.map); });
    aquecerSandy();
    m.visible = false; // está dentro do prédio da empresa atual
  });
}
// caminho do corredor: os pontos da rota amarela entre as duas empresas
// (passando pelas do meio), de centro a centro: ele sai de dentro de um
// prédio e entra no outro
function caminhoEntre(i, j) {
  const a = rota.indice[i], b = rota.indice[j];
  let pts = rota.pts.slice(Math.min(a, b), Math.max(a, b) + 1).map((p) => p.clone());
  if (b < a) pts.reverse();
  pts = pts.filter((p, k) => k === 0 || p.distanceTo(pts[k - 1]) > 0.01);
  const c = new THREE.CurvePath();
  for (let k = 1; k < pts.length; k++) c.add(new THREE.LineCurve3(pts[k - 1], pts[k]));
  return c;
}
// o VRoid vem em 102 pedaços (só o cabelo tem 83): cada um é um desenho por
// quadro, e com os ecos passava de mil. Junta os pedaços de cada malha que
// usam o mesmo material num só (os vértices já são compartilhados; só o
// índice é emendado). Sai também a deformação de rosto, que não é usada
function juntarPedacos(raiz) {
  const grupos = new Map(); // pai + material -> pedaços
  raiz.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const chave = o.parent.uuid + '|' + o.material.uuid + '|' + o.geometry.attributes.position.uuid;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(o);
  });
  for (const pecas of grupos.values()) {
    const base = pecas[0];
    const indices = [];
    for (const p of pecas) indices.push(...p.geometry.index.array);
    const g = new THREE.BufferGeometry();
    for (const [nome, attr] of Object.entries(base.geometry.attributes)) g.setAttribute(nome, attr);
    g.setIndex(indices);
    g.computeBoundingSphere();
    const nova = new THREE.SkinnedMesh(g, base.material);
    nova.name = base.name;
    nova.position.copy(base.position);
    nova.quaternion.copy(base.quaternion);
    nova.scale.copy(base.scale);
    nova.layers.mask = base.layers.mask;
    nova.bind(base.skeleton, base.bindMatrix);
    nova.frustumCulled = false;
    base.parent.add(nova);
    for (const p of pecas) p.parent.remove(p);
  }
}

// ecos do Sandy: um estoque de cópias montado uma vez na carga. Clonar o
// personagem inteiro a cada eco travava a corrida; aqui só se copia a pose
const ECOS = 12;
function montarFantasmas() {
  const m = corredor.modelo;
  const ossos = [];
  m.traverse((o) => { if (o.isBone) ossos.push(o); });
  corredor.ossos = ossos;
  corredor.pool = [];
  for (let i = 0; i < ECOS; i++) {
    const f = clonarEsqueleto(m);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.75, depthWrite: false });
    const meus = [];
    f.traverse((o) => {
      if (o.isBone) meus.push(o);
      if (o.isMesh) o.material = mat;
    });
    juntarPedacos(f); // eco tem material único: vira um desenho por malha (3 no total)
    f.visible = false;
    cena.add(f);
    corredor.pool.push({ f, mat, ossos: meus, vida: 0, livre: true });
  }
}
// solta um eco na pose deste instante, tingido e sumindo
function soltarFantasma(cor) {
  const m = corredor.modelo;
  const g = corredor.pool.find((x) => x.livre) || corredor.pool.reduce((a, b) => (a.vida > b.vida ? a : b));
  corredor.ossos.forEach((o, i) => { g.ossos[i].position.copy(o.position); g.ossos[i].quaternion.copy(o.quaternion); });
  g.f.position.copy(m.position);
  g.f.rotation.copy(m.rotation);
  g.f.scale.copy(m.scale);
  g.mat.color.set(cor);
  g.mat.opacity = 0.75;
  g.vida = 0;
  g.livre = false;
  g.f.visible = true;
}

function redimensionar() {
  if (!renderer) return;
  const w = app.clientWidth, h = app.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', redimensionar);

/* ---------- lista e cartão ---------- */
const itens = EMPRESAS.map((e, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'hist_item';
  b.innerHTML = '<span class="hist_num"></span><span class="hist_txt"><b></b><small></small></span>';
  b.querySelector('.hist_num').textContent = String(i + 1).padStart(2, '0');
  b.querySelector('b').textContent = e.nome;
  b.querySelector('small').textContent = e.periodo;
  b.addEventListener('click', () => escolher(i));
  b.addEventListener('mouseenter', () => { if (i !== sel) tocar('hover'); });
  listaEl.append(b);
  return b;
});

function preencherCartao(e) {
  const q = (s) => cartao.querySelector(s);
  q('[data-hc-nome]').textContent = e.nome;
  q('[data-hc-cargo]').textContent = e.cargo;
  q('[data-hc-local]').textContent = `${e.local} · ${e.periodo}${e.duracao === 'atual' ? '' : ' · ' + e.duracao}`;
  q('[data-hc-resumo]').textContent = e.resumo;
  q('[data-hc-feitos]').replaceChildren(...e.feitos.map((f) => Object.assign(document.createElement('li'), { textContent: f })));
  q('[data-hc-stack]').replaceChildren(...e.stack.map((t) => Object.assign(document.createElement('span'), { textContent: t })));
  q('[data-hc-atual]').hidden = e.duracao !== 'atual';
  cartao.style.setProperty('--marca', '#' + e.marca.cor.toString(16).padStart(6, '0'));
  cartao.classList.remove('hist_cartao--troca'); void cartao.offsetWidth; cartao.classList.add('hist_cartao--troca');
}

function escolher(i, som = true) {
  const mudou = i !== sel;
  const anterior = sel;
  sel = i;
  itens.forEach((b, k) => b.classList.toggle('hist_item--sel', k === i));
  preencherCartao(EMPRESAS[i]);
  if (!montado) return;
  marcadores.forEach((mk, k) => mk.rotulo.classList.toggle('mapa_rotulo--sel', k === i));
  cam.alvoDe.copy(cam.alvo);
  cam.t = 0;
  // o Sandy roda sempre: é o efeito principal desta tela
  if (som && mudou) ligarSandy(anterior, i);
}

/* ---------- Sandevistan ---------- */
// velocidade no chão do Sandy (unidades por segundo): sempre a mesma, então
// trecho curto termina mais cedo em vez de ser percorrido devagar
const VELOCIDADE_SANDY = 9;
function ligarSandy(de, para) {
  tocar('sandy-entra');
  const caminho = caminhoEntre(de, para);
  sandy.dur = Math.min(4.5, Math.max(1.5, caminho.getLength() / VELOCIDADE_SANDY));
  if (corredor.modelo) {
    corredor.caminho = caminho;
    // sai de dentro do prédio: aparece no centro e já corre
    corredor.entrando = null;
    corredor.modelo.visible = true;
    corredor.modelo.scale.setScalar(ESCALA_CORREDOR);
    corredor.modelo.position.copy(corredor.caminho.getPoint(0));
    cam.segue = corredor.caminho.getPoint(0).clone();
    corredor.acoes.idle?.stop();
    corredor.acoes.run?.reset().setEffectiveWeight(1).play(); // já sai correndo, sem misturar com o parado
  }
  sandy.ativo = true;
  sandy.ini = performance.now();
  cam.t = 0;
  cam.dur = sandy.dur;
  document.body.classList.remove('sandy'); void document.body.offsetWidth;
  document.body.classList.add('sandy');
  clearTimeout(ligarSandy.fim);
  ligarSandy.fim = setTimeout(() => {
    sandy.ativo = false;
    // a câmera desliza do corredor até a empresa, sem pulo
    cam.alvoDe.copy(cam.alvo);
    cam.t = 0;
    cam.dur = 0.8;
    document.body.classList.remove('sandy');
    tocar('sandy-sai');
    if (corredor.modelo) corredor.entrando = performance.now(); // entra no prédio
  }, sandy.dur * 1000);
}
// curva do Sandy: larga no máximo e ainda dá um tranco no fim, ao entrar
// no prédio. Posição = 0.9t + 0.1t^4; velocidade de 0.9x a 1.3x a média
const curvaSandy = (t) => 0.9 * t + 0.1 * t ** 4;
const velocidadeSandy = (t) => 0.9 + 0.4 * t ** 3;
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* ---------- quadro ---------- */
const v = new THREE.Vector3(), m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), um = new THREE.Vector3(1, 1, 1), frente = new THREE.Vector3(0, 0, 1);
let antes = 0;
function quadro(agora) {
  if (!rodando) return;
  requestAnimationFrame(quadro);
  const dt = Math.min(0.05, (agora - (antes || agora)) / 1000);
  antes = agora;
  const t = agora / 1000;

  // câmera: desliza até a empresa (com o Sandy, dispara e desacelera)
  // no Sandy o progresso segue o relógio (junto com o som), não os quadros:
  // se um quadro atrasar, ele não fica para trás
  if (sandy.ativo) cam.t = Math.min(1, Math.max(0, (agora - sandy.ini) / (sandy.dur * 1000)));
  else if (cam.t < 1) cam.t = Math.min(1, cam.t + dt / cam.dur);
  const k = Math.min(1, Math.max(0, sandy.ativo ? curvaSandy(cam.t) : suave(cam.t)));
  cam.alvo.lerpVectors(cam.alvoDe, ponto(EMPRESAS[sel].lote), k);
  cam.ang += dt * (sandy.ativo ? 0.015 : 0.06);
  // no Sandy a câmera chega perto do corredor; depois volta para a vista do mapa
  const perto = sandy.ativo ? 1 : 0;
  cam.zoom = (cam.zoom ?? 0) + (perto - (cam.zoom ?? 0)) * Math.min(1, dt * 3);
  // mais perto e mais baixa: o chão passa mais rápido pela tela
  const dist = cam.dist * (1 - 0.55 * cam.zoom), alt = cam.alt * (1 - 0.62 * cam.zoom);
  // inclinação na curva (some devagar na reta e fora do Sandy)
  if (!sandy.ativo) corredor.curva = (corredor.curva ?? 0) * 0.9;
  const inclina = corredor.curva ?? 0;
  const posicionarCamera = () => {
    camera.position.set(cam.alvo.x + Math.sin(cam.ang) * dist, alt, cam.alvo.z + Math.cos(cam.ang) * dist);
    camera.up.set(Math.sin(inclina), Math.cos(inclina), 0);
    camera.lookAt(cam.alvo);
  };
  posicionarCamera();
  // FOV abre junto com a velocidade (como nos jogos de corrida): as bordas esticam e passam voando
  const fovAlvo = sandy.ativo ? 50 + 14 * velocidadeSandy(cam.t) : 40;
  if (Math.abs(camera.fov - fovAlvo) > 0.05) { camera.fov += (fovAlvo - camera.fov) * (sandy.ativo ? 0.18 : 0.08); camera.updateProjectionMatrix(); }

  // corredor: anda pela rota no ritmo do Sandy e solta uma cópia a cada instante
  if (corredor.modelo) {
    // as pernas acompanham a velocidade no chão (sem pé deslizando): no Sandy
    // quem está rápido é ele; o mundo é que fica lento
    let ritmo = 1;
    if (sandy.ativo && corredor.caminho) {
      // as pernas acompanham a aceleração: começa em corrida e termina em disparada
      const velocidade = (corredor.caminho.getLength() / sandy.dur) * velocidadeSandy(cam.t); // unidades por segundo
      ritmo = Math.min(3.2, Math.max(2.2, (velocidade / PASSADA) * 0.75)); // menos passos e mais longos
    }
    corredor.mixer.update(dt * ritmo);
    if (sandy.ativo && corredor.caminho) {
      const p = corredor.caminho.getPointAt(Math.min(k, 0.9999)); // em 1 exato a CurvePath às vezes devolve null
      const dir = corredor.caminho.getTangentAt(Math.min(0.999, k));
      corredor.modelo.position.copy(p);
      const rumo = Math.atan2(dir.x, dir.z);
      // quanto a direção girou neste quadro = força da curva
      let giro = rumo - (corredor.rumo ?? rumo);
      giro = Math.atan2(Math.sin(giro), Math.cos(giro));
      corredor.rumo = rumo;
      // inclinação bem de leve e lenta: nas esquinas fechadas ela balançava a tela
      corredor.curva = (corredor.curva ?? 0) * 0.94 + Math.max(-0.08, Math.min(0.08, giro * 2)) * 0.06;
      corredor.modelo.rotation.y = rumo;
      // a câmera persegue o corredor com amortecimento: esquina e rotatória
      // viram uma curva suave na tela, não um tranco
      if (!cam.segue) cam.segue = p.clone();
      cam.segue.lerp(p, 1 - Math.exp(-dt * 6));
      cam.alvo.copy(cam.segue);
      posicionarCamera();
      if (agora - corredor.ultimoFantasma > 110) {
        corredor.ultimoFantasma = agora;
        const fase = (agora - sandy.ini) / (sandy.dur * 1000);
        soltarFantasma(new THREE.Color().setHSL((0.33 + fase * 0.75) % 1, 1, 0.55));
      }
    }
    // entrando no prédio: encolhe e some com um brilho
    if (corredor.entrando) {
      const f = Math.min(1, (agora - corredor.entrando) / 380);
      corredor.modelo.scale.setScalar(ESCALA_CORREDOR * (1 - f) + 0.0001);
      corredor.modelo.position.y = f * 0.5;
      if (f >= 1) { corredor.modelo.visible = false; corredor.entrando = null; corredor.acoes.run?.stop(); }
    }
    for (const g of corredor.pool) {
      if (g.livre) continue;
      g.vida += dt;
      g.mat.opacity = Math.max(0, 0.75 - g.vida * 0.55);
      if (g.vida >= 1.4) { g.livre = true; g.f.visible = false; }
    }
  }

  // prédios-marco e rótulos
  marcadores.forEach((mk, i) => {
    mk.anima(t);
    const ativo = i === sel;
    mk.anelChao.scale.setScalar((ativo ? 1.08 : 0.9) + Math.sin(t * 3 + i) * 0.04);
    mk.painel.material.opacity = ativo ? 1 : 0.75;
    v.copy(mk.g.position); v.y = 3.9;
    v.project(camera);
    mk.rotulo.style.display = v.z < 1 ? '' : 'none';
    mk.rotulo.style.transform = `translate(${(v.x * 0.5 + 0.5) * app.clientWidth}px, ${(-v.y * 0.5 + 0.5) * app.clientHeight}px) translate(-50%, -100%)`;
  });

  // setas pela rota
  const n = setas.malha.count;
  for (let i = 0; i < n; i++) {
    const f = (t * 0.05 + i / n) % 1;
    const p = setas.caminho.getPointAt(f);
    q4.setFromUnitVectors(frente, setas.caminho.getTangentAt(f));
    m4.compose(p.setY(0.06), q4, um);
    setas.malha.setMatrixAt(i, m4);
  }
  setas.malha.instanceMatrix.needsUpdate = true;

  // tráfego na rodovia (duas faixas, sentidos opostos)
  const nT = trafego.malha.count;
  for (let i = 0; i < nT; i++) {
    const sentido = i % 2 ? 1 : -1;
    const f = (((t * 0.06 * sentido + i / nT) % 1) + 1) % 1;
    const p = trafego.pista.getPointAt(f), d = trafego.pista.getTangentAt(f);
    q4.setFromUnitVectors(frente, d);
    v.set(p.x - d.z * 0.22 * sentido, p.y + 0.03, p.z + d.x * 0.22 * sentido);
    m4.compose(v, q4, um);
    trafego.malha.setMatrixAt(i, m4);
  }
  trafego.malha.instanceMatrix.needsUpdate = true;
  agua.material.map.offset.y = -t * 0.08;

  // Sandy: em vez de limpar, apaga devagar com um tom que muda de cor;
  // o que a câmera viu antes fica como rastro colorido
  if (sandy.ativo) {
    const p = (agora - sandy.ini) / (sandy.dur * 1000);
    fade.material.color.setHSL((0.33 + p * 0.7) % 1, 1, 0.12);
    // rastro longo no meio da corrida (borrão de velocidade), mais curto no fim
    fade.material.opacity = 0.05 + Math.max(0, p - 0.7) * 0.5;
    renderer.render(cenaFade, cameraFade);
    renderer.clearDepth();
  } else {
    renderer.clear();
  }
  // mundo colorido normal; no Sandy, a versão sem cor (verde-acinzentada) é
  // desenhada por cima com transparência que sobe na entrada e desce na saída
  camera.layers.set(0);
  renderer.render(cena, camera);
  semCor += ((sandy.ativo ? 1 : 0) - semCor) * Math.min(1, dt * (sandy.ativo ? 5 : 2.5));
  if (semCor > 0.01) {
    desenharSemCor(semCor);
  }
  camera.layers.set(CAMADA_CORREDOR);
  renderer.render(cena, camera); // corredor e ecos, coloridos (sem limpar a cena)
  camera.layers.set(0);
}

// passada do mundo sem cor (verde-acinzentado) do Sandy
function desenharSemCor(opacidade) {
  materialSemCor ??= new THREE.MeshLambertMaterial({ color: 0x5c7564, emissive: 0x05120b, transparent: true, depthWrite: false, depthFunc: THREE.LessEqualDepth });
  materialSemCor.opacity = opacidade;
  cena.overrideMaterial = materialSemCor;
  for (const m of coloridas) { m.userData.cor ??= m.instanceColor; m.instanceColor = null; }
  // luz branca nessa passada (a rosa deixaria o cinza rosado)
  cena.children.forEach((o) => { if (o.isLight) { o.userData.cor ??= o.color.getHex(); o.color.setHex(0xffffff); } });
  renderer.render(cena, camera);
  cena.overrideMaterial = null;
  for (const m of coloridas) m.instanceColor = m.userData.cor;
  cena.children.forEach((o) => { if (o.isLight && o.userData.cor !== undefined) o.color.setHex(o.userData.cor); });
}
// ensaio do Sandy assim que tudo carrega: desenha uma vez cada passada dele
// (rastro, mundo sem cor, corredor e ecos) para o navegador preparar os
// shaders agora. Sem isso, o primeiro clique na História travava
function aquecerSandy() {
  corredor.modelo.visible = true;
  corredor.pool.forEach((g) => { g.f.visible = true; });
  renderer.render(cenaFade, cameraFade);
  renderer.clearDepth();
  camera.layers.set(0);
  renderer.render(cena, camera);
  desenharSemCor(0.5);
  camera.layers.set(CAMADA_CORREDOR);
  renderer.render(cena, camera);
  camera.layers.set(0);
  corredor.pool.forEach((g) => { g.f.visible = false; });
  corredor.modelo.visible = false;
  renderer.clear();
}

function ligar() {
  if (!montado) montar();
  redimensionar();
  escolher(sel, false);
  if (!rodando) { rodando = true; antes = 0; requestAnimationFrame(quadro); }
}
function desligar() { rodando = false; }

addEventListener('tela', (e) => (e.detail === 'historia' ? ligar() : desligar()));
addEventListener('keydown', (e) => {
  if (telaAtual() !== 'historia') return;
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'arrowleft' || k === 'w' || k === 'arrowup') escolher((sel - 1 + EMPRESAS.length) % EMPRESAS.length);
  else if (k === 'd' || k === 'arrowright' || k === 's' || k === 'arrowdown') escolher((sel + 1) % EMPRESAS.length);
});

escolher(0, false);
if (telaAtual() === 'historia') ligar();

// modo de teste (?debug): avançar o mapa quadro a quadro de fora, para
// conferir o efeito mesmo numa aba em segundo plano (onde o navegador congela)
if (/[?&]debug\b/.test(location.search)) {
  window.__mapa = {
    pronto: () => !!corredor.modelo,
    avancar(ms, passo = 33) {
      const t0 = (window.__mapaT ??= performance.now());
      for (let x = 0; x <= ms; x += passo) quadro((window.__mapaT = t0 + x));
      window.__mapaT = t0 + ms;
    },
    sandy: (i) => escolher(i),
  };
}
