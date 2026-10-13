/*
 * História: mapa de cidade em 3D no molde do mapa do Cyberpunk 2077.
 *
 * A cidade tem bairros com tons diferentes, prédios de vários formatos, rio,
 * praças, um elevado com tráfego e painéis holográficos. Cada empresa é um
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
const N = 44, LOTE = 1, RUA = 0.42, PASSO = LOTE + RUA;
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
  { centro: [0, 0], cor: 0xff2a6d, raio: 9 },        // centro: rosa quente
  { centro: [-12, 12], cor: 0xff6a2b, raio: 10 },    // zona industrial (perto da I-SINC): laranja
  { centro: [14, -8], cor: 0x9b3cff, raio: 11 },     // lado das empresas remotas: violeta
  { centro: [-12, -12], cor: 0xd01870, raio: 10 },   // norte: magenta escuro
];

let renderer, cena, camera, rodando = false, montado = false;
let sel = 0;
const cam = { alvo: new THREE.Vector3(), alvoDe: new THREE.Vector3(), t: 1, dur: 1.1, ang: 0.5, dist: 11, alt: 17 };
const marcadores = [];
let setas, trafego, agua, fade, cenaFade, cameraFade;
const sandy = { ativo: false, ini: 0, dur: 3.0 };
// o corredor: o Xbot correndo pela rota com o Sandevistan, deixando cópias
const corredor = { modelo: null, mixer: null, acoes: {}, de: 0, para: 0, caminho: null, fantasmas: [], ultimoFantasma: 0 };
const ESCALA_CORREDOR = 0.62;
// quanto o corredor anda por segundo com a animação de corrida em velocidade normal
const PASSADA = 2.9;
// a rota amarela: pontos em ordem e o índice de cada empresa nela
const rota = { pts: [], indice: [] };
const BORDA_MARCO = 1.7; // o corredor para na borda do prédio-marco, não dentro dele

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

  // tipos de prédio em malhas instanciadas
  const geoCaixa = new THREE.BoxGeometry(1, 1, 1); geoCaixa.translate(0, 0.5, 0);
  const geoCil = new THREE.CylinderGeometry(0.5, 0.5, 1, 14); geoCil.translate(0, 0.5, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const caixas = new THREE.InstancedMesh(geoCaixa, mat, N * N * 2);
  const cilindros = new THREE.InstancedMesh(geoCil, mat, N * N);
  const geoArv = new THREE.ConeGeometry(0.12, 0.3, 6); geoArv.translate(0, 0.15, 0);
  const arvores = new THREE.InstancedMesh(geoArv, new THREE.MeshBasicMaterial({ color: 0x1fd6a0 }), N * N);
  const geoPraca = new THREE.PlaneGeometry(1, 1); geoPraca.rotateX(-Math.PI / 2);
  const pracas = new THREE.InstancedMesh(geoPraca, new THREE.MeshBasicMaterial({ color: 0x0d3b3a }), N * N);
  const paineis = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.28), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), 140);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), eu = new THREE.Euler();
  let nc = 0, nl = 0, na = 0, np = 0, nh = 0;
  const POR = (x, y, z, sx, sy, sz, ry = 0) => m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(eu.set(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  const NEON = [0x00f0ff, 0xfcee0a, 0xff2a6d, 0x9b3cff];

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = canto(i) + LOTE / 2, z = canto(j) + LOTE / 2;
      if (noRio(x, z)) continue;
      if (perto(x, z) < 1.6) continue; // o lote do prédio-marco fica livre
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
      // centro mais alto, borda mais baixa
      const alturaBase = 0.1 + Math.max(0, 1 - centro / 22) * 0.9;
      if (tipo < 0.14 && centro < 18) {
        // torre cilíndrica
        const h = alturaBase * (1.5 + sorte() * 2.2);
        POR(x, 0, z, 0.7, h, 0.7); cilindros.setMatrixAt(nl, m); cilindros.setColorAt(nl++, tom(0.9));
        if (nh < 140 && sorte() < 0.5) { POR(x + 0.36, h * 0.7, z, 1, 1, 1, Math.PI / 2); paineis.setMatrixAt(nh, m); paineis.setColorAt(nh++, c.setHex(NEON[Math.floor(sorte() * 4)])); }
        continue;
      }
      if (tipo < 0.34) {
        // escalonado: base larga + bloco menor em cima
        const h1 = alturaBase * (0.4 + sorte() * 0.6), h2 = alturaBase * (0.5 + sorte() * 1.4);
        POR(x, 0, z, 0.9, h1, 0.9); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(0.75));
        POR(x + (sorte() - 0.5) * 0.2, h1, z + (sorte() - 0.5) * 0.2, 0.55, h2, 0.55); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(1));
        if (nh < 140 && sorte() < 0.25) { POR(x, h1 + h2 * 0.6, z + 0.28, 1, 1, 1); paineis.setMatrixAt(nh, m); paineis.setColorAt(nh++, c.setHex(NEON[Math.floor(sorte() * 4)])); }
        continue;
      }
      if (tipo < 0.46) {
        // laje larga e baixa (galpão)
        POR(x, 0, z, 0.95, 0.12 + sorte() * 0.2, 0.95); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(0.6));
        continue;
      }
      // caixa comum, uma ou outra torre
      const h = alturaBase * (0.3 + sorte() * 1.1) + (sorte() < 0.05 ? 1.2 : 0);
      const lado = 0.74 + sorte() * 0.2;
      POR(x, 0, z, lado, h, lado); caixas.setMatrixAt(nc, m); caixas.setColorAt(nc++, tom(0.65 + sorte() * 0.4));
    }
  }
  caixas.count = nc; cilindros.count = nl; arvores.count = na; pracas.count = np; paineis.count = nh;
  cena.add(caixas, cilindros, arvores, pracas, paineis);

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

  // elevado: via suspensa sobre uma avenida, com luzes de tráfego andando
  const zElev = (5 - 0) * PASSO * 1 + 3 * PASSO - RUA / 2; // avenida ao sul do centro
  const matElev = new THREE.MeshLambertMaterial({ color: 0x24123f });
  const via = new THREE.Mesh(new THREE.BoxGeometry(tam, 0.06, 0.32), matElev);
  via.position.set(-RUA / 2, 0.55, zElev);
  const bordaVia = new THREE.Mesh(new THREE.BoxGeometry(tam, 0.02, 0.34), new THREE.MeshBasicMaterial({ color: 0xff2a6d }));
  bordaVia.position.set(-RUA / 2, 0.59, zElev);
  cena.add(via, bordaVia);
  const geoPilar = new THREE.BoxGeometry(0.08, 0.55, 0.08);
  for (let x = -tam / 2; x < tam / 2; x += 2.8) {
    const pilar = new THREE.Mesh(geoPilar, matElev);
    pilar.position.set(x, 0.275, zElev); cena.add(pilar);
  }
  trafego = { malha: new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), new THREE.MeshBasicMaterial({ color: 0xffffff }), 40), z: zElev, tam };
  for (let i = 0; i < 40; i++) trafego.malha.setColorAt(i, c.setHex(i % 2 ? 0xfcee0a : 0x00f0ff));
  cena.add(trafego.malha);

  // rota amarela: caminho em L pelas ruas, de empresa em empresa
  const pts = rota.pts;
  EMPRESAS.forEach((e, i) => {
    const p = ponto(e.lote);
    if (i > 0) pts.push(new THREE.Vector3(p.x, 0, pts[pts.length - 1].z));
    rota.indice[i] = pts.length;
    pts.push(p);
  });
  const matRota = new THREE.MeshBasicMaterial({ color: COR.rota });
  const matBrilho = new THREE.MeshBasicMaterial({ color: COR.rota, transparent: true, opacity: 0.25, depthWrite: false });
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], len = a.distanceTo(b);
    if (len < 0.01) continue;
    for (const [mt, larg, y] of [[matBrilho, 0.45, 0.02], [matRota, 0.13, 0.03]]) {
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(larg, len + larg), mt);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = Math.abs(a.x - b.x) > 0.01 ? Math.PI / 2 : 0;
      seg.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
      cena.add(seg);
    }
  }
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
function carregarCorredor() {
  new GLTFLoader().load('modelos/xbot.glb', (gltf) => {
    const m = gltf.scene;
    m.scale.setScalar(ESCALA_CORREDOR);
    // corpo escuro com borda ciano, para destacar no mapa
    m.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      o.material = o.name.includes('Joints')
        ? new THREE.MeshBasicMaterial({ color: 0x00f0ff })
        : new THREE.MeshLambertMaterial({ color: 0x2a1640, emissive: 0x3a0f3a });
    });
    corredor.modelo = m;
    corredor.mixer = new THREE.AnimationMixer(m);
    for (const clip of gltf.animations) corredor.acoes[clip.name] = corredor.mixer.clipAction(clip);
    corredor.acoes.idle?.play();
    m.position.copy(pontoDeEspera(sel));
    cena.add(m);
  });
}
// caminho do corredor: os pontos da rota amarela entre as duas empresas
// (passando pelas do meio), cortando a ponta dentro de cada prédio-marco
function caminhoEntre(i, j) {
  const a = rota.indice[i], b = rota.indice[j];
  let pts = rota.pts.slice(Math.min(a, b), Math.max(a, b) + 1).map((p) => p.clone());
  if (b < a) pts.reverse();
  pts = pts.filter((p, k) => k === 0 || p.distanceTo(pts[k - 1]) > 0.01);
  // tira BORDA_MARCO do começo e do fim
  const encurtar = (de, para) => { const d = para.clone().sub(de); const len = d.length(); if (len > BORDA_MARCO * 1.5) de.add(d.multiplyScalar(BORDA_MARCO / len)); };
  if (pts.length > 1) { encurtar(pts[0], pts[1]); encurtar(pts[pts.length - 1], pts[pts.length - 2]); }
  const c = new THREE.CurvePath();
  for (let k = 1; k < pts.length; k++) c.add(new THREE.LineCurve3(pts[k - 1], pts[k]));
  return c;
}
// onde o corredor espera parado: na rota, na borda do prédio da empresa
function pontoDeEspera(i) {
  const k = rota.indice[i];
  const viz = rota.pts[k + 1] || rota.pts[k - 1];
  const p = rota.pts[k].clone();
  return p.add(viz.clone().sub(p).setLength(BORDA_MARCO));
}

// cópia congelada do corredor na pose deste instante, tingida e sumindo
function soltarFantasma(cor) {
  const m = corredor.modelo;
  const f = clonarEsqueleto(m);
  const ossos = {};
  m.traverse((o) => { if (o.isBone) ossos[o.name] = o; });
  f.traverse((o) => {
    if (o.isBone && ossos[o.name]) { o.position.copy(ossos[o.name].position); o.quaternion.copy(ossos[o.name].quaternion); }
    if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.75, depthWrite: false });
  });
  f.position.copy(m.position);
  f.rotation.copy(m.rotation);
  f.scale.copy(m.scale);
  cena.add(f);
  corredor.fantasmas.push({ f, vida: 0 });
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
function ligarSandy(de, para) {
  tocar('sandy-entra');
  if (corredor.modelo) {
    corredor.caminho = caminhoEntre(de, para);
    // sai de onde ele está: se não está no começo do caminho, anda até lá antes
    const inicio = corredor.caminho.getPoint(0);
    if (corredor.modelo.position.distanceTo(inicio) > 0.05) {
      const c = new THREE.CurvePath();
      c.add(new THREE.LineCurve3(corredor.modelo.position.clone().setY(0), inicio));
      corredor.caminho.curves.forEach((curva) => c.add(curva));
      corredor.caminho = c;
    }
    corredor.acoes.idle?.fadeOut(0.15);
    corredor.acoes.run?.reset().fadeIn(0.15).play();
  }
  sandy.ativo = true;
  sandy.ini = performance.now();
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
    if (corredor.modelo) {
      corredor.acoes.run?.fadeOut(0.25);
      corredor.acoes.idle?.reset().fadeIn(0.25).play();
    }
  }, sandy.dur * 1000);
}
// curva do Sandy: velocidade constante, só acelera na saída e freia na
// chegada (a câmera lenta vem da animação da corrida e das cópias)
const curvaSandy = (t) => {
  const r = 0.12; // fração do tempo acelerando e freando
  const vmax = 1 / (1 - r);
  if (t < r) return (vmax * t * t) / (2 * r);
  if (t > 1 - r) return 1 - (vmax * (1 - t) * (1 - t)) / (2 * r);
  return vmax * (t - r / 2);
};
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
  if (cam.t < 1) cam.t = Math.min(1, cam.t + dt / cam.dur);
  const k = sandy.ativo ? curvaSandy(cam.t) : suave(cam.t);
  cam.alvo.lerpVectors(cam.alvoDe, ponto(EMPRESAS[sel].lote), k);
  cam.ang += dt * (sandy.ativo ? 0.015 : 0.06);
  // no Sandy a câmera chega perto do corredor; depois volta para a vista do mapa
  const perto = sandy.ativo ? 1 : 0;
  cam.zoom = (cam.zoom ?? 0) + (perto - (cam.zoom ?? 0)) * Math.min(1, dt * 3);
  const dist = cam.dist * (1 - 0.45 * cam.zoom), alt = cam.alt * (1 - 0.5 * cam.zoom);
  const posicionarCamera = () => {
    camera.position.set(cam.alvo.x + Math.sin(cam.ang) * dist, alt, cam.alvo.z + Math.cos(cam.ang) * dist);
    camera.lookAt(cam.alvo);
  };
  posicionarCamera();
  const fovAlvo = sandy.ativo ? 52 : 40;
  if (Math.abs(camera.fov - fovAlvo) > 0.05) { camera.fov += (fovAlvo - camera.fov) * 0.1; camera.updateProjectionMatrix(); }

  // corredor: anda pela rota no ritmo do Sandy e solta uma cópia a cada instante
  if (corredor.modelo) {
    // as pernas acompanham a velocidade no chão (sem pé deslizando): no Sandy
    // quem está rápido é ele; o mundo é que fica lento
    let ritmo = 1;
    if (sandy.ativo && corredor.caminho) {
      const velocidade = corredor.caminho.getLength() / sandy.dur / (1 - 0.06); // unidades por segundo
      ritmo = Math.min(3.2, Math.max(1, velocidade / PASSADA));
    }
    corredor.mixer.update(dt * ritmo);
    if (sandy.ativo && corredor.caminho) {
      const p = corredor.caminho.getPointAt(k);
      const dir = corredor.caminho.getTangentAt(Math.min(0.999, k));
      corredor.modelo.position.copy(p);
      corredor.modelo.rotation.y = Math.atan2(dir.x, dir.z);
      cam.alvo.copy(p); // a câmera acompanha o corredor
      posicionarCamera();
      if (agora - corredor.ultimoFantasma > 90) {
        corredor.ultimoFantasma = agora;
        const fase = (agora - sandy.ini) / (sandy.dur * 1000);
        soltarFantasma(new THREE.Color().setHSL((0.33 + fase * 0.75) % 1, 1, 0.55));
      }
    }
    for (const g of corredor.fantasmas) {
      g.vida += dt;
      g.f.traverse((o) => { if (o.isMesh) o.material.opacity = Math.max(0, 0.75 - g.vida * 0.55); });
    }
    corredor.fantasmas = corredor.fantasmas.filter((g) => {
      if (g.vida < 1.4) return true;
      cena.remove(g.f);
      g.f.traverse((o) => { if (o.isMesh) o.material.dispose(); });
      return false;
    });
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

  // tráfego no elevado (duas faixas, sentidos opostos)
  for (let i = 0; i < trafego.malha.count; i++) {
    const sentido = i % 2 ? 1 : -1;
    const x = (((t * 1.6 * sentido + i * 1.37) % trafego.tam) + trafego.tam) % trafego.tam - trafego.tam / 2;
    m4.makeTranslation(x, 0.63, trafego.z + sentido * 0.08);
    trafego.malha.setMatrixAt(i, m4);
  }
  trafego.malha.instanceMatrix.needsUpdate = true;
  agua.material.map.offset.y = -t * 0.08;

  // Sandy: em vez de limpar, apaga devagar com um tom que muda de cor;
  // o que a câmera viu antes fica como rastro colorido
  if (sandy.ativo) {
    const p = (agora - sandy.ini) / (sandy.dur * 1000);
    fade.material.color.setHSL((0.33 + p * 0.7) % 1, 1, 0.12);
    fade.material.opacity = 0.07 + p * 0.12;
    renderer.render(cenaFade, cameraFade);
    renderer.clearDepth();
  } else {
    renderer.clear();
  }
  renderer.render(cena, camera);
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
