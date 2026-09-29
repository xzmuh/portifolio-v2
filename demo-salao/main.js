import * as THREE from 'three';
import * as art from './pixelart.js';

/* Demo "salão do colosso": um salão enorme com estátuas nas laterais, portas
   para as seções do portfólio e um colosso sentado no trono lá no fundo.
   Dois jeitos de explorar:
   - rolando a página: um passeio guiado que entra em cada sala e termina no trono
   - andar livre: WASD + mouse, com colisão; G volta para o passeio */

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
THREE.ColorManagement.enabled = false;

const OLHO = 1.6;
const LINHAS_DA_TELA = 270;
const N_LUZES = 16;
const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

// salão: x de -7 a 7, z de 0 a -44, pé-direito 11
const SALAO = { meia: 7, fundo: -44, altura: 11 };
const PORTA = { largura: 2.4, altura: 4.2 };
const SALA = { profundidade: 8, meia: 4, altura: 5 };

const CONTEUDO = {
  salao: {
    area: 'Salão', nome: 'O Grande Salão',
    narracao: 'Cada porta guarda uma parte da história de Murilo Gonzales Trigo. Role para seguir o passeio, ou aperte W A S D para andar livre.',
  },
  trono: {
    area: 'Fim', nome: 'O Trono',
    narracao: 'O guardião despertou. Os olhos dele seguem você. Clique nele quando estiver pronto para conversar.',
  },
  galeria: {
    area: 'Ala oeste', nome: 'A Galeria',
    narracao: 'Cada quadro é uma missão concluída. Passe o cursor para ler o registro.',
    porta: 'Porta da Galeria: os projetos. Role ou ande até ela para entrar.',
  },
  arsenal: {
    area: 'Ala leste', nome: 'O Arsenal',
    narracao: 'Mais de cinco anos de sistemas reais, guardados em quatro cristais.',
    porta: 'Porta do Arsenal: as habilidades. Role ou ande até ela para entrar.',
  },
  registros: {
    area: 'Ala oeste', nome: 'Os Registros',
    narracao: 'Lápides com cada lugar por onde ele passou. A mais antiga começa em 2019.',
    porta: 'Porta dos Registros: a trajetória. Role ou ande até ela para entrar.',
  },
  espelho: {
    area: 'Ala leste', nome: 'O Espelho',
    narracao: 'Quem construiu este lugar. Passe o cursor no retrato.',
    porta: 'Porta do Espelho: sobre mim. Role ou ande até ela para entrar.',
  },
};

const HABILIDADES = [
  ['Engenharia de Software', 'Sistemas ERP fiscais e tributários: regras de negócio complexas viram soluções seguras e escaláveis.', 'Regras de negócio · APIs · ERP · NF-e & SPED'],
  ['Frontend Responsivo', 'Sites bem estruturados, com navegação boa em qualquer tela.', 'HTML5 · Tailwind · JavaScript · React · Angular'],
  ['Full Stack', 'Sistemas de ponta a ponta, rápidos, seguros e prontos para crescer.', 'Node.js · NestJS · PHP · Python · TypeScript'],
  ['Dados & Integrações', 'Dashboards, relatórios e consultas otimizadas para grandes volumes de dados.', 'PostgreSQL · MySQL · MongoDB · Integrações'],
];

const PROJETOS = [
  ['Velox CRM', 'grafico', 'CRM de funil de vendas para concessionárias, com gestão de leads e negociações.'],
  ['Beauty Exp', 'painel', 'Gestão para clínicas de estética: agenda, pacientes, procedimentos e financeiro.'],
  ['Freplan', 'site', 'Site institucional e catálogo para usinagem sob medida, com orçamento pelo WhatsApp.'],
  ['Mini Chat IA', 'chat', 'Chat com IA local (Ollama/Llama) para dúvidas e rotinas em processos fiscais.'],
  ['API de Notificações', 'rede', 'API orientada a eventos que distribui alertas para várias plataformas e clientes.'],
  ['Dialogi', 'site', 'Site da plataforma de gamificação para operações, com experiências interativas.'],
];

const TRAJETORIA = [
  ['I-SINC', 'Mai 2019 — Fev 2026 · Full Stack Developer · Agudos, SP', 'ERP, APIs REST entre módulos, Angular, relatórios dinâmicos, PostgreSQL/MySQL e integrações com AWS S3 e SES.'],
  ['Next SI', 'Mai 2026 — hoje · Full Stack Developer · Bauru, SP', 'Sistemas web com React no front-end e PHP no back-end, regras de negócio e IA nos fluxos.'],
  ['Dialogi', 'Ago 2026 — hoje · Front-end Engineer · Remoto', 'Sites, landing pages, experiências interativas e minigames com React, TypeScript e IA.'],
];

const MANDAMENTOS = [
  ['Primeiro mandamento', 'Entenda o problema antes de escrever a solução.'],
  ['Segundo mandamento', 'Esconda a complexidade atrás de uma experiência fluida.'],
];

/* ---------- renderer ---------- */

const canvas = document.getElementById('cena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.setClearColor(art.P.vazio);

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, 1, 0.05, 80);

function dimensiona() {
  const escala = Math.max(2, Math.round(innerHeight / LINHAS_DA_TELA));
  renderer.setSize(Math.ceil(innerWidth / escala), Math.ceil(innerHeight / escala), false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
dimensiona();
addEventListener('resize', dimensiona);

const globais = {
  uTempo: { value: 0 },
  uAmbiente: { value: 0.2 },
  uLuzes: { value: Array.from({ length: N_LUZES }, () => new THREE.Vector4()) },
};

/* ---------- shaders ---------- */

const vertexPadrao = /* glsl */ `
  uniform float uTempo;
  uniform float uVento;
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vProf;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(uTempo * 1.6 + p.y * 3.0 + uv.x * 2.0) * uVento * (1.0 - uv.y);
    vec4 m = modelMatrix * vec4(p, 1.0);
    vMundo = m.xyz;
    vec4 mv = viewMatrix * m;
    vProf = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const comum = /* glsl */ `
  uniform vec3 uOrigem;
  uniform vec3 uDir;
  uniform float uPintura;
  uniform float uComprimento;
  uniform float uTempo;
  varying vec3 vMundo;
  varying float vProf;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // a região se materializa em blocos de 25 cm ao longo de uDir; < 0 = ainda não existe
  float materializa() {
    vec3 cel = floor((vMundo - uOrigem) * 4.0 + 0.013);
    float d = dot((cel + 0.5) / 4.0, uDir);
    float alvo = mix(-2.0, uComprimento + 3.0, uPintura);
    return alvo - d + hash(cel.xy + cel.z * 0.37) * 2.5;
  }

  float bayer(vec2 p) {
    ivec2 i = ivec2(mod(p, 4.0));
    const float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
    return m[i.x + i.y * 4] / 16.0 - 0.5;
  }

  vec3 acabamento(vec3 c, float borda) {
    if (uPintura < 0.999) {
      if (borda < 0.18) c = vec3(0.84, 0.93, 1.0);
      else if (borda < 0.45) c = vec3(0.16, 0.59, 1.0);
    }
    c = mix(c, vec3(0.02, 0.024, 0.032), smoothstep(9.0, 34.0, vProf));
    return floor(c * 9.0 + 0.5 + bayer(gl_FragCoord.xy) * 0.55) / 9.0;
  }
`;

const fragmentPedra = /* glsl */ `
  #define N_LUZES ${N_LUZES}
  uniform sampler2D uMapa;
  uniform vec4 uLuzes[N_LUZES];
  uniform float uAmbiente;
  uniform float uProprio;
  uniform float uRealce;
  varying vec2 vUv;
  ${comum}
  void main() {
    float borda = materializa();
    if (borda < 0.0) discard;
    vec4 tex = texture2D(uMapa, vUv);
    if (tex.a < 0.5) discard;
    float luz = 0.0;
    for (int i = 0; i < N_LUZES; i++) {
      vec3 dl = uLuzes[i].xyz - vMundo;
      luz += uLuzes[i].w / (1.0 + dot(dl, dl) * 0.5);
    }
    // várias luzes juntas saturam suavemente em vez de estourar
    luz = (1.0 - exp(-luz * 0.9)) * 1.45;
    vec3 cor = tex.rgb * (uAmbiente + luz * vec3(0.72, 0.86, 1.1));
    cor = mix(cor, tex.rgb * 1.15, uProprio);
    cor += vec3(0.08, 0.3, 0.7) * uRealce * 0.3;
    gl_FragColor = vec4(acabamento(cor, borda), 1.0);
  }
`;

const fragmentChama = /* glsl */ `
  uniform float uFase;
  varying vec2 vUv;
  ${comum}
  void main() {
    float borda = materializa();
    if (borda < 0.0) discard;
    float t = uTempo * 3.0 + uFase;
    float largura = (1.0 - vUv.y) * 0.45 + 0.04;
    float x = abs(vUv.x - 0.5 + sin(vUv.y * 6.0 - t * 2.0) * 0.07 * vUv.y);
    float n = hash(floor(vec2(vUv.x * 6.0, vUv.y * 9.0 - t * 3.0)));
    float f = 1.0 - x / largura - vUv.y * 0.6 + n * 0.25;
    if (f < 0.12) discard;
    vec3 c = f > 0.78 ? vec3(0.98) : f > 0.52 ? vec3(0.49, 0.77, 1.0) : f > 0.3 ? vec3(0.16, 0.59, 1.0) : vec3(0.07, 0.25, 0.45);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const fragmentCristal = /* glsl */ `
  uniform float uRealce;
  ${comum}
  void main() {
    float borda = materializa();
    if (borda < 0.0) discard;
    vec3 n = normalize(cross(dFdx(vMundo), dFdy(vMundo)));
    float k = dot(n, normalize(vec3(0.4, 0.8, 0.5))) * 0.5 + 0.5 + uRealce * 0.2;
    vec3 c = k > 0.85 ? vec3(0.84, 0.93, 1.0) : k > 0.65 ? vec3(0.49, 0.77, 1.0) : k > 0.45 ? vec3(0.16, 0.59, 1.0) : k > 0.25 ? vec3(0.11, 0.38, 0.72) : vec3(0.07, 0.25, 0.45);
    gl_FragColor = vec4(acabamento(c, borda), 1.0);
  }
`;

const fragmentOlho = /* glsl */ `
  uniform float uOlhos;
  ${comum}
  void main() {
    float borda = materializa();
    if (borda < 0.0) discard;
    float pisca = 0.85 + 0.15 * sin(uTempo * 7.0);
    vec3 c = mix(vec3(0.05, 0.06, 0.08), vec3(0.84, 0.93, 1.0) * pisca, uOlhos);
    gl_FragColor = vec4(acabamento(c, borda), 1.0);
  }
`;

/* ---------- regiões (salão e salas) ---------- */

function regiao(origem, dir, comprimento) {
  return {
    uOrigem: { value: new THREE.Vector3(...origem) },
    uDir: { value: new THREE.Vector3(...dir) },
    uPintura: { value: 0 },
    uComprimento: { value: comprimento },
  };
}

function uniformsDe(reg) {
  return { uOrigem: reg.uOrigem, uDir: reg.uDir, uPintura: reg.uPintura, uComprimento: reg.uComprimento, uTempo: globais.uTempo };
}

function textura(c) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function matPedra(c, reg, { vento = 0, proprio = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniformsDe(reg),
      uMapa: { value: c.isTexture ? c : textura(c) },
      uLuzes: globais.uLuzes,
      uAmbiente: globais.uAmbiente,
      uProprio: { value: proprio },
      uRealce: { value: 0 },
      uVento: { value: menosMovimento ? 0 : vento },
    },
    vertexShader: vertexPadrao,
    fragmentShader: fragmentPedra,
    side: THREE.DoubleSide,
  });
}

function plano(pai, reg, c, w, h, pos, { rotX = 0, rotY = 0, ...op } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, op.vento ? 6 : 1, op.vento ? 6 : 1), matPedra(c, reg, op));
  m.position.set(...pos);
  m.rotation.set(rotX, rotY, 0);
  pai.add(m);
  return m;
}

function bloco(pai, reg, tex, w, h, d, pos, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matPedra(tex, reg));
  m.position.set(...pos);
  m.rotation.set(...rot);
  pai.add(m);
  return m;
}

/* ---------- registro de coisas ---------- */

const luzes = [];
const inspecionaveis = [];
const obstaculos = [];   // círculos { x, z, r }
const cristais = [];
const chamas = [];
const portas = [];
let colosso = null;

function inspecionavel(malhas, titulo, texto, extra = {}) {
  const item = { malhas: [].concat(malhas), titulo, texto, ...extra };
  for (const m of item.malhas) {
    m.traverse?.((o) => { if (o.isMesh) { o.userData.item = item; inspecionaveis.push(o); } });
  }
  return item;
}

function chama(reg, pos, w, h, luzBase) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.ShaderMaterial({
      uniforms: { ...uniformsDe(reg), uFase: { value: Math.random() * 10 } },
      vertexShader: vertexPadrao,
      fragmentShader: fragmentChama,
      side: THREE.DoubleSide,
    }),
  );
  m.position.set(...pos);
  cena.add(m);
  chamas.push(m);
  luzes.push({ pos: new THREE.Vector3(pos[0], pos[1] + h * 0.2, pos[2]), base: luzBase, reg, fase: Math.random() * 10 });
}

// (nx, nz) = direção para onde a parede "olha"
function tochaNaParede(reg, x, y, z, nx, nz = 0) {
  plano(cena, reg, art.suporteTocha(), 0.38, 0.62, [x + nx * 0.05, y, z + nz * 0.05], { rotY: Math.atan2(nx, nz) });
  chama(reg, [x + nx * 0.14, y + 0.52, z + nz * 0.14], 0.34, 0.56, 1.8);
}

function braseiro(reg, x, z, alto = 1.1, forca = 3.2) {
  const ferro = art.pedraLisa(8, 16, Math.floor(x * 7 + z * 13), 1);
  bloco(cena, reg, ferro, 0.25, alto, 0.25, [x, alto / 2, z]);
  bloco(cena, reg, ferro, 0.9, 0.3, 0.9, [x, alto + 0.1, z], [0, Math.PI / 4, 0]);
  chama(reg, [x, alto + 0.75, z], 0.9, 1.3, forca);
  obstaculos.push({ x, z, r: 0.75 });
}

/* ---------- estátuas ---------- */

const texEstatua = art.pedraLisa(16, 32, 77, 3);
const texEstatuaEscura = art.pedraLisa(16, 16, 78, 2);

function estatua(reg, x, z, rotY, arma, k) {
  const g = new THREE.Group();
  const b = (w, h, d, p, r) => bloco(g, reg, texEstatua, w, h, d, p, r);
  bloco(g, reg, texEstatuaEscura, 1.5, 1, 1.5, [0, 0.5, 0]);
  const manto = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.72, 2.6, 6), matPedra(texEstatua, reg));
  manto.position.set(0, 2.3, 0);
  g.add(manto);
  b(0.95, 1.25, 0.6, [0, 4.2, 0]);
  b(1.35, 0.35, 0.65, [0, 4.75, 0]);
  const cabeca = b(0.55, 0.7, 0.58, [0, 5.35, 0.02]);
  b(0.7, 0.18, 0.7, [0, 5.72, 0]); // coroa/capuz
  if (arma === 'espada') {
    b(0.26, 1.2, 0.26, [-0.55, 4.0, 0.25], [0.5, 0, 0.2]);
    b(0.26, 1.2, 0.26, [0.55, 4.0, 0.25], [0.5, 0, -0.2]);
    b(0.14, 2.6, 0.05, [0, 2.1, 0.62]);
    b(0.6, 0.1, 0.12, [0, 3.4, 0.62]);
    b(0.12, 0.35, 0.12, [0, 3.62, 0.62]);
  } else if (arma === 'lanca') {
    b(0.26, 1.3, 0.26, [-0.62, 3.9, 0]);
    b(0.26, 1.1, 0.26, [0.62, 4.1, 0.3], [0.9, 0, 0]);
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 5.2, 5), matPedra(texEstatuaEscura, reg));
    haste.position.set(0.72, 3.3, 0.55);
    g.add(haste);
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), matPedra(texEstatua, reg));
    ponta.position.set(0.72, 6.2, 0.55);
    g.add(ponta);
  } else {
    // livro aberto nas mãos
    b(0.26, 1.0, 0.26, [-0.5, 4.0, 0.3], [0.9, 0, 0.3]);
    b(0.26, 1.0, 0.26, [0.5, 4.0, 0.3], [0.9, 0, -0.3]);
    b(0.9, 0.08, 0.6, [0, 3.65, 0.72], [-0.5, 0, 0]);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  g.scale.setScalar(k);
  cena.add(g);
  inspecionavel(g, 'Estátua', 'Guardiões de pedra. Estão aqui desde antes do primeiro commit.');
  return { g, cabeca };
}

function montaColosso(reg) {
  const g = new THREE.Group();
  const tex = art.pedraLisa(24, 48, 91, 2);
  const texEsc = art.pedraLisa(24, 24, 92, 2);
  const b = (w, h, d, p, t = tex) => bloco(g, reg, t, w, h, d, p);
  // degraus
  b(12, 0.5, 7, [0, 0.25, 1.5], texEsc);
  b(10, 0.5, 5.5, [0, 0.75, 0.8], texEsc);
  b(8, 0.5, 4.2, [0, 1.25, 0.2], texEsc);
  // trono
  b(5.2, 1.6, 3, [0, 2.3, -0.4], texEsc);
  b(6, 9.5, 1, [0, 5.75, -2.3], texEsc);
  b(1, 1.4, 3.2, [-3, 3.6, -0.4], texEsc);
  b(1, 1.4, 3.2, [3, 3.6, -0.4], texEsc);
  b(7, 0.8, 1.4, [0, 10.5, -2.3], texEsc);
  // pernas
  for (const s of [-1, 1]) {
    b(1.2, 1.2, 2.8, [s * 0.85, 3.7, 0.7]);
    b(1.05, 2.3, 1.05, [s * 0.85, 2.55, 1.8]);
    b(1.2, 0.5, 1.6, [s * 0.85, 1.75, 2.1]);
  }
  b(3.4, 1.4, 2.6, [0, 3.7, -0.3]); // quadril/manto
  b(3.1, 3.6, 1.9, [0, 6.0, -0.7]); // tronco
  b(4.6, 1.0, 2.0, [0, 7.6, -0.7]); // ombros
  for (const s of [-1, 1]) {
    b(0.95, 2.6, 0.95, [s * 2.45, 6.1, -0.7]);
    b(0.85, 0.85, 2.7, [s * 2.9, 4.75, 0.4]);
    b(1.0, 0.7, 1.0, [s * 2.9, 4.75, 1.95]);
  }
  b(0.9, 0.7, 0.9, [0, 8.4, -0.6]); // pescoço
  // cabeça num pivô para poder virar
  const cabeca = new THREE.Group();
  cabeca.position.set(0, 8.7, -0.55);
  g.add(cabeca);
  bloco(cabeca, reg, tex, 1.7, 2.0, 1.7, [0, 1.0, 0]);
  bloco(cabeca, reg, texEsc, 1.9, 0.5, 1.9, [0, 2.1, 0]);
  const olhos = new THREE.ShaderMaterial({
    uniforms: { ...uniformsDe(reg), uOlhos: { value: 0 } },
    vertexShader: vertexPadrao,
    fragmentShader: fragmentOlho,
  });
  for (const s of [-1, 1]) {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.14), olhos);
    o.position.set(s * 0.38, 1.2, 0.86);
    cabeca.add(o);
  }
  // auréola atrás da cabeça
  const aureola = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 4, 20), matPedra(texEsc, reg));
  aureola.position.set(0, 1.1, -1.1);
  cabeca.add(aureola);

  g.position.set(0, 0, -40);
  cena.add(g);
  const luzOlhos = { pos: new THREE.Vector3(0, 9.9, -38.6), base: 0, reg, fase: 0 };
  luzes.push(luzOlhos);
  const item = inspecionavel(g, 'O Guardião', 'Ele esperou você chegar até aqui. Clique para falar com ele: leva ao contato.', { link: '../#contact' });
  return { g, cabeca, olhos, luzOlhos, acordado: 0, item };
}

/* ---------- salão ---------- */

function montaSalao(reg) {
  const { meia, fundo, altura } = SALAO;
  const comp = -fundo;
  plano(cena, reg, art.piso(meia * 2, comp, 1), meia * 2, comp, [0, 0, fundo / 2], { rotX: -Math.PI / 2 });
  plano(cena, reg, art.parede(meia * 2, comp, 2, { base: false, escura: 1, runas: false }), meia * 2, comp, [0, altura, fundo / 2], { rotX: Math.PI / 2 });
  plano(cena, reg, art.tapete(2, comp - 8), 2, comp - 8, [0, 0.01, (fundo + 8) / 2 - 0.5], { rotX: -Math.PI / 2 });
  // plataforma de entrada
  plano(cena, reg, art.piso(6, 8, 3), 6, 8, [0, 0, 4], { rotX: -Math.PI / 2 });

  // paredes laterais com vãos para as portas
  const vaos = [-10, -24];
  for (const lado of [-1, 1]) {
    let z = 0;
    const trechos = [];
    for (const zc of vaos) { trechos.push([z, zc + PORTA.largura / 2]); z = zc - PORTA.largura / 2; }
    trechos.push([z, fundo]);
    trechos.forEach(([z0, z1], k) => {
      const w = z0 - z1;
      plano(cena, reg, art.parede(w, altura, 10 + k + lado * 5), w, altura, [lado * meia, altura / 2, (z0 + z1) / 2], { rotY: -lado * Math.PI / 2 });
    });
    vaos.forEach((zc, k) => {
      const h = altura - PORTA.altura;
      plano(cena, reg, art.parede(PORTA.largura, h, 20 + k + lado * 5, { base: false }), PORTA.largura, h, [lado * meia, PORTA.altura + h / 2, zc], { rotY: -lado * Math.PI / 2 });
    });
  }
  // fundo e entrada (com um portal largo)
  plano(cena, reg, art.parede(meia * 2, altura, 30), meia * 2, altura, [0, altura / 2, fundo]);
  const vaoEntrada = 6, altEntrada = 7;
  for (const lado of [-1, 1]) {
    const w = meia - vaoEntrada / 2;
    plano(cena, reg, art.parede(w, altura, 31 + lado), w, altura, [lado * (vaoEntrada / 2 + w / 2), altura / 2, 0]);
  }
  plano(cena, reg, art.parede(vaoEntrada, altura - altEntrada, 33, { base: false }), vaoEntrada, altura - altEntrada, [0, altEntrada + (altura - altEntrada) / 2, 0]);

  // pilares com tochas
  const texPilar = art.parede(1, altura, 40, { base: false, runas: false });
  for (const z of [-1.2, -7.8, -12.2, -21.8, -26.2, -35, -41.5]) {
    for (const lado of [-1, 1]) {
      bloco(cena, reg, texPilar, 1, altura, 1, [lado * (meia - 0.5), altura / 2, z]);
      tochaNaParede(reg, lado * (meia - 1.0), 3.2, z, -lado, 0);
    }
  }
  // estátuas voltadas para o corredor
  const armas = ['espada', 'lanca', 'livro'];
  [-4.5, -17, -31].forEach((z, k) => {
    for (const lado of [-1, 1]) estatua(reg, lado * 5.6, z, -lado * Math.PI / 2, armas[(k + (lado > 0 ? 1 : 0)) % 3], 1);
  });
  // braseiros no corredor central
  for (const z of [-6, -18, -30]) for (const lado of [-1, 1]) braseiro(reg, lado * 2.6, z);
  for (const lado of [-1, 1]) braseiro(reg, lado * 4.6, -36.5, 1.6, 1.8);

  // lápides dos mandamentos na frente do trono
  MANDAMENTOS.forEach(([titulo, texto], k) => {
    const lado = k ? 1 : -1;
    const lap = plano(cena, reg, art.lapide(50 + k, { runa: k + 1, linhas: 5 }), 1.8, 2.6, [lado * 3.4, 1.3, -33.8]);
    bloco(cena, reg, texEstatuaEscura, 1.9, 2.6, 0.3, [lado * 3.4, 1.3, -33.98]);
    inspecionavel(lap, titulo, texto);
    obstaculos.push({ x: lado * 3.4, z: -33.9, r: 1.1 });
  });

  colosso = montaColosso(reg);
}

/* ---------- salas laterais ---------- */

function montaSala(chave, lado, zc, reg) {
  const { profundidade: P, meia, altura } = SALA;
  const x0 = lado * SALAO.meia, xc = lado * (SALAO.meia + P / 2), xf = lado * (SALAO.meia + P);
  const s = chave.length * 100 + (lado > 0 ? 50 : 0);
  plano(cena, reg, art.piso(P, meia * 2, s + 1), P, meia * 2, [xc, 0, zc], { rotX: -Math.PI / 2 });
  plano(cena, reg, art.parede(P, meia * 2, s + 2, { base: false, escura: 1, runas: false }), P, meia * 2, [xc, altura, zc], { rotX: Math.PI / 2 });
  plano(cena, reg, art.parede(meia * 2, altura, s + 3), meia * 2, altura, [xf, altura / 2, zc], { rotY: lado * -Math.PI / 2 });
  for (const lz of [-1, 1]) plano(cena, reg, art.parede(P, altura, s + 4 + lz), P, altura, [xc, altura / 2, zc + lz * meia]);
  tochaNaParede(reg, xc, 2.8, zc + meia, 0, -1);
  tochaNaParede(reg, xc, 2.8, zc - meia, 0, 1);

  // porta de ferro presa na dobradiça
  const dobradica = new THREE.Group();
  // a folha cresce ao longo do x local; depois de girar, isso vira +z (direita) ou -z (esquerda)
  dobradica.position.set(x0, 0, zc - lado * PORTA.largura / 2);
  dobradica.rotation.y = -lado * Math.PI / 2;
  cena.add(dobradica);
  const folha = plano(dobradica, regioes.salao, art.porta(chave, s + 9), PORTA.largura, PORTA.altura, [PORTA.largura / 2, PORTA.altura / 2, 0]);
  const p = { dobradica, base: -lado * Math.PI / 2, abertura: 0, x: x0, z: zc, chave };
  portas.push(p);
  inspecionavel(folha, 'Porta', CONTEUDO[chave].porta, { porta: p });

  const dentro = (dx) => xc + lado * dx; // dx > 0 = mais fundo na sala
  if (chave === 'galeria') {
    PROJETOS.forEach(([titulo, tipo, texto], k) => {
      let pos, rotY;
      if (k < 2) { pos = [xf - lado * 0.06, 2, zc + (k ? -1.6 : 1.6)]; rotY = lado * -Math.PI / 2; }
      else { const lz = k % 2 ? -1 : 1; pos = [dentro(k < 4 ? 0 : 2.3), 2, zc + lz * (meia - 0.06)]; rotY = lz > 0 ? Math.PI : 0; }
      const q = plano(cena, reg, art.quadro(s + 20 + k, tipo), 1.9, 1.4, pos, { rotY, proprio: 0.35 });
      inspecionavel(q, titulo, texto);
    });
  }
  if (chave === 'arsenal') {
    const pontos = [[-0.4, 2.6], [1.6, 1.1], [1.6, -1.1], [-0.4, -2.6]];
    HABILIDADES.forEach(([titulo, texto, tags], k) => {
      const [dx, dz] = pontos[k];
      const x = dentro(dx), z = zc + dz;
      const ped = bloco(cena, reg, art.parede(0.8, 1.1, s + 30 + k, { base: false }), 0.8, 1.1, 0.8, [x, 0.55, z]);
      const topo = bloco(cena, reg, art.parede(1, 0.15, s + 40 + k, { base: false, runas: false }), 1, 0.15, 1, [x, 1.17, z]);
      const cristal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.26),
        new THREE.ShaderMaterial({ uniforms: { ...uniformsDe(reg), uRealce: { value: 0 } }, vertexShader: vertexPadrao, fragmentShader: fragmentCristal }),
      );
      cristal.scale.y = 1.7;
      cristal.position.set(x, 1.75, z);
      cena.add(cristal);
      const c = { malha: cristal, y0: 1.75, fase: k * 1.3, giro: 0.6 };
      cristais.push(c);
      luzes.push({ pos: new THREE.Vector3(x, 1.9, z), base: 0.9, reg, fase: k });
      obstaculos.push({ x, z, r: 0.7 });
      inspecionavel([cristal, ped, topo], titulo, `${texto}\n${tags}`, { cristal: c });
    });
  }
  if (chave === 'registros') {
    TRAJETORIA.forEach(([titulo, quando, texto], k) => {
      const z = zc + (k - 1) * 2.4, x = dentro(2.6);
      const lap = plano(cena, reg, art.lapide(s + 60 + k, { runa: k }), 1.6, 2.3, [x - lado * 0.16, 1.15, z], { rotY: lado * -Math.PI / 2 });
      bloco(cena, reg, texEstatuaEscura, 0.3, 2.3, 1.7, [x, 1.15, z]);
      obstaculos.push({ x, z, r: 0.9 });
      inspecionavel(lap, titulo, `${quando}\n${texto}`);
    });
  }
  if (chave === 'espelho') {
    salaEspelho = { reg, pos: [xf - lado * 0.06, 2.3, zc], rotY: lado * -Math.PI / 2 };
    for (const lz of [-1, 1]) {
      const e = plano(cena, reg, art.estandarte(), 1.1, 2.2, [xf - lado * 0.08, 2.5, zc + lz * 2], { rotY: lado * -Math.PI / 2, vento: 0.03 });
      inspecionavel(e, 'Estandarte', 'O brasão da casa MGT, em azul #2997ff.');
    }
  }
}

let salaEspelho = null;

async function montaRetrato() {
  if (!salaEspelho) return;
  try {
    const img = new Image();
    img.src = '../eu.jpeg';
    await img.decode();
    const c = art.retrato(img, { x: 240, y: 70, w: 660, h: 880 });
    const { reg, pos, rotY } = salaEspelho;
    const q = plano(cena, reg, c, 1.7, 1.7 * (c.height / c.width), pos, { rotY, proprio: 0.45 });
    inspecionavel(q, 'Murilo Gonzales Trigo', 'Full stack com mais de 5 anos em sistemas corporativos: ERP, APIs, bancos de dados e integrações. Fascinado pelo universo gamer, gosta de criar interações que vão além da funcionalidade.');
  } catch {
    // sem a foto, a sala fica só com os estandartes
  }
}

/* ---------- colisão ---------- */

const RAIO = 0.35;
const areas = [];
function montaAreas() {
  areas.push([-5, 5, -32.5, 0]);      // corredor central (para antes do trono, de onde se vê o colosso inteiro)
  areas.push([-3, 3, -1, 8]);         // entrada (sobrepõe o salão para não ter fresta)
  for (const zc of [-10, -24]) {
    for (const lado of [-1, 1]) {
      const a = SALAO.meia - 2.6, b = SALAO.meia + 1.0;
      areas.push([lado > 0 ? a : -b, lado > 0 ? b : -a, zc - PORTA.largura / 2 + 0.1, zc + PORTA.largura / 2 - 0.1]);
      const c = SALAO.meia + 0.3, d = SALAO.meia + SALA.profundidade - 0.3;
      areas.push([lado > 0 ? c : -d, lado > 0 ? d : -c, zc - SALA.meia + 0.3, zc + SALA.meia - 0.3]);
    }
  }
}

function livre(x, z) {
  const dentro = areas.some(([x0, x1, z0, z1]) => x >= x0 + RAIO && x <= x1 - RAIO && z >= z0 + RAIO && z <= z1 - RAIO)
    // o vão da porta é estreito: basta o centro estar dentro dele
    || areas.some(([x0, x1, z0, z1]) => (z1 - z0) < 3 && x >= x0 && x <= x1 && z >= z0 && z <= z1);
  if (!dentro) return false;
  return !obstaculos.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + RAIO);
}

/* ---------- passeio guiado ---------- */

// cada parada: [posição, para onde olhar]; entre paradas a câmera desacelera (smoothstep)
const PARADAS = [
  [[0, OLHO, 7], [0, 2.2, -10]],
  [[0, OLHO, -3], [0, 2.8, -20]],
  [[0, OLHO, -9], [-7, 2, -10]],
  [[-9.2, OLHO, -10], [-15, 2, -10]],
  [[-9.2, OLHO, -10], [-12.5, 2, -6]],
  [[-9.2, OLHO, -10], [-12.5, 2, -14]],
  [[-3, OLHO, -10], [7, 2, -10]],
  [[9.2, OLHO, -10], [15, 1.6, -10]],
  [[3, OLHO, -10], [0, 2.6, -30]],
  [[0, OLHO, -18], [0, 2.6, -30]],
  [[0, OLHO, -23], [-7, 2, -24]],
  [[-9.2, OLHO, -24], [-15, 1.8, -24]],
  [[-3, OLHO, -24], [7, 2, -24]],
  [[9.2, OLHO, -24], [15, 2.3, -24]],
  [[2, OLHO, -25.5], [0, 5, -40]],
  [[0, OLHO, -31], [0, 6.6, -41]],
].map(([p, o]) => [new THREE.Vector3(...p), new THREE.Vector3(...o)]);

const PARADA_DA_SALA = { galeria: 3, arsenal: 7, registros: 11, espelho: 13 };

const suave = (f) => f * f * (3 - 2 * f);
function posePasseio(t, pos, alvo) {
  const n = PARADAS.length - 1;
  const u = Math.min(t, 0.99999) * n;
  const i = Math.floor(u), f = suave(u - i);
  pos.lerpVectors(PARADAS[i][0], PARADAS[i + 1][0], f);
  alvo.lerpVectors(PARADAS[i][1], PARADAS[i + 1][1], f);
}

/* ---------- HUD ---------- */

const ui = {
  area: document.getElementById('area'),
  local: document.getElementById('local'),
  cartao: document.getElementById('cartao'),
  xp: document.getElementById('xp'),
  quem: document.getElementById('quem'),
  fala: document.getElementById('fala'),
  modo: document.getElementById('modo'),
  dicas: document.getElementById('dicas'),
  mira: document.getElementById('mira'),
  carregando: document.getElementById('carregando'),
};

let falaAtual = '', timerFala = 0;
function fala(quem, texto) {
  if (texto === falaAtual) return;
  falaAtual = texto;
  ui.quem.textContent = quem;
  clearInterval(timerFala);
  if (menosMovimento) { ui.fala.textContent = texto; return; }
  let n = 0;
  ui.fala.textContent = '';
  timerFala = setInterval(() => {
    n += 2;
    ui.fala.textContent = texto.slice(0, n);
    if (n >= texto.length) clearInterval(timerFala);
  }, 22);
}

let localAtual = null;
function mostraLocal(c) {
  if (c === localAtual) return;
  localAtual = c;
  ui.area.textContent = c.area;
  ui.local.textContent = c.nome;
  ui.cartao.classList.remove('entra');
  void ui.cartao.offsetWidth;
  ui.cartao.classList.add('entra');
  if (!emFoco) fala('Narrador', c.narracao);
}

function lugarDa(pos) {
  if (Math.abs(pos.x) > SALAO.meia + 0.3) {
    const esq = pos.x < 0, cima = pos.z > -17;
    return CONTEUDO[esq ? (cima ? 'galeria' : 'registros') : (cima ? 'arsenal' : 'espelho')];
  }
  return pos.z < -25 ? CONTEUDO.trono : CONTEUDO.salao;
}

/* ---------- estado e controles ---------- */

const estado = {
  t: 0, intro: 0, modo: 'passeio',
  mx: 0, my: 0, alvoMx: 0, alvoMy: 0,
  yaw: 0, pitch: 0,
  transicao: 1, // 0→1 ao voltar para o passeio
};
const cam = { pos: new THREE.Vector3(), alvo: new THREE.Vector3() };
const de = { pos: new THREE.Vector3(), alvo: new THREE.Vector3() };
const teclas = new Set();
const ehToque = matchMedia('(pointer: coarse)').matches;

function entrarLivre() {
  if (estado.modo === 'livre') return;
  estado.modo = 'livre';
  const d = cam.alvo.clone().sub(cam.pos).normalize();
  estado.yaw = Math.atan2(-d.x, -d.z);
  estado.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -0.99, 0.99));
  cam.pos.y = OLHO;
  // se a câmera do passeio estiver num ponto sem chão, anda até o mais próximo livre
  if (!livre(cam.pos.x, cam.pos.z)) cam.pos.set(0, OLHO, THREE.MathUtils.clamp(cam.pos.z, -34, 6));
  document.documentElement.classList.add('livre');
  ui.modo.textContent = '[G] voltar ao passeio';
  ui.dicas.hidden = false;
  canvas.requestPointerLock?.()?.catch?.(() => {});
}

function voltarPasseio() {
  if (estado.modo !== 'livre') return;
  document.exitPointerLock?.();
  de.pos.copy(cam.pos); de.alvo.copy(cam.alvo);
  estado.modo = 'voltando';
  estado.transicao = 0;
  gsap.to(estado, {
    transicao: 1, duration: 1.4, ease: 'power2.inOut',
    onComplete: () => { estado.modo = 'passeio'; },
  });
  document.documentElement.classList.remove('livre');
  ui.modo.textContent = '[WASD] andar livre';
  ui.dicas.hidden = true;
}

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
    if (k !== 'shift' && !k.startsWith('arrow')) entrarLivre();
    if (estado.modo === 'livre') { teclas.add(k); if (k.startsWith('arrow')) e.preventDefault(); }
  }
  if (k === 'g') voltarPasseio();
});
addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
addEventListener('blur', () => teclas.clear());
ui.modo.addEventListener('click', () => (estado.modo === 'livre' ? voltarPasseio() : entrarLivre()));

const raio = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let emFoco = null;
let arrastando = null;

function realce(item, v) {
  for (const m of item.malhas) {
    m.traverse?.((o) => { if (o.material?.uniforms?.uRealce) gsap.to(o.material.uniforms.uRealce, { value: v, duration: 0.3 }); });
  }
  if (item.cristal) gsap.to(item.cristal, { giro: v ? 3 : 0.6, duration: 0.5 });
}

function apontar(x, y) {
  ponteiro.set(x, y);
  raio.setFromCamera(ponteiro, camera);
  raio.far = estado.modo === 'livre' ? 7 : 40;
  const item = raio.intersectObjects(inspecionaveis, false)[0]?.object.userData.item ?? null;
  if (item === emFoco) return item;
  if (emFoco) realce(emFoco, 0);
  if (item) { realce(item, 1); fala(item.titulo, item.texto); } else if (localAtual) fala('Narrador', localAtual.narracao);
  emFoco = item;
  document.body.style.cursor = estado.modo === 'livre' ? '' : item?.link || item?.porta ? 'pointer' : item ? 'help' : '';
  return item;
}

function acionar(item) {
  if (!item) return;
  if (item.link) location.href = item.link;
  else if (item.porta && estado.modo === 'passeio') {
    // no passeio, clicar numa porta rola até a parada dentro daquela sala
    const alvo = PARADA_DA_SALA[item.porta.chave] / (PARADAS.length - 1);
    scrollTo({ top: alvo * (document.documentElement.scrollHeight - innerHeight), behavior: 'smooth' });
  }
}

addEventListener('pointermove', (e) => {
  if (estado.modo === 'livre') {
    if (document.pointerLockElement === canvas) {
      estado.yaw -= e.movementX * 0.0022;
      estado.pitch -= e.movementY * 0.0022;
    } else if (arrastando) {
      estado.yaw -= (e.clientX - arrastando.x) * 0.004;
      estado.pitch -= (e.clientY - arrastando.y) * 0.004;
      arrastando = { x: e.clientX, y: e.clientY };
    }
    estado.pitch = THREE.MathUtils.clamp(estado.pitch, -1.2, 1.2);
    return;
  }
  estado.alvoMx = (e.clientX / innerWidth) * 2 - 1;
  estado.alvoMy = -(e.clientY / innerHeight) * 2 + 1;
  apontar(estado.alvoMx, estado.alvoMy);
});

addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('button')) return;
  if (estado.modo === 'livre') {
    if (document.pointerLockElement === canvas) acionar(emFoco);
    else { arrastando = { x: e.clientX, y: e.clientY }; canvas.requestPointerLock?.()?.catch?.(() => {}); }
    return;
  }
  acionar(apontar((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
});
addEventListener('pointerup', () => { arrastando = null; });

/* ---------- loop ---------- */

const regioes = {
  salao: regiao([0, 0, 0], [0, 0, -1], -SALAO.fundo),
  galeria: regiao([-SALAO.meia, 0, -10], [-1, 0, 0], SALA.profundidade),
  arsenal: regiao([SALAO.meia, 0, -10], [1, 0, 0], SALA.profundidade),
  registros: regiao([-SALAO.meia, 0, -24], [-1, 0, 0], SALA.profundidade),
  espelho: regiao([SALAO.meia, 0, -24], [1, 0, 0], SALA.profundidade),
};

const relogio = new THREE.Clock();
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const tmpPos = new THREE.Vector3(), tmpAlvo = new THREE.Vector3(), frente = new THREE.Vector3();

function andar(dt) {
  const correr = teclas.has('shift') ? 2 : 1;
  const v = 3.4 * correr * dt;
  let f = 0, l = 0;
  if (teclas.has('w') || teclas.has('arrowup')) f += 1;
  if (teclas.has('s') || teclas.has('arrowdown')) f -= 1;
  if (teclas.has('d') || teclas.has('arrowright')) l += 1;
  if (teclas.has('a') || teclas.has('arrowleft')) l -= 1;
  const sy = Math.sin(estado.yaw), cy = Math.cos(estado.yaw);
  const dx = (-sy * f + cy * l) * v, dz = (-cy * f - sy * l) * v;
  // eixo por eixo: deslizar pela parede em vez de travar
  if (livre(cam.pos.x + dx, cam.pos.z)) cam.pos.x += dx;
  if (livre(cam.pos.x, cam.pos.z + dz)) cam.pos.z += dz;
  estado.passos = (estado.passos || 0) + (f || l ? v : 0);
  cam.pos.y = OLHO + (menosMovimento ? 0 : Math.abs(Math.sin(estado.passos * 2.2)) * 0.05);
  frente.set(-Math.sin(estado.yaw) * Math.cos(estado.pitch), Math.sin(estado.pitch), -Math.cos(estado.yaw) * Math.cos(estado.pitch));
  cam.alvo.copy(cam.pos).add(frente);
}

function quadro() {
  const dt = Math.min(relogio.getDelta(), 0.1);
  const t = (globais.uTempo.value += dt);

  if (estado.modo === 'livre') {
    andar(dt);
    apontar(0, 0); // mira no centro da tela
  } else {
    estado.mx += (estado.alvoMx - estado.mx) * 0.05;
    estado.my += (estado.alvoMy - estado.my) * 0.05;
    posePasseio(estado.t, tmpPos, tmpAlvo);
    // olhar um pouco para onde o mouse aponta
    frente.copy(tmpAlvo).sub(tmpPos).normalize();
    tmpAlvo.x += estado.mx * 1.2 * Math.abs(frente.z);
    tmpAlvo.z -= estado.mx * 1.2 * frente.x;
    tmpAlvo.y += estado.my * 0.8;
    if (estado.modo === 'voltando') {
      const k = estado.transicao;
      cam.pos.lerpVectors(de.pos, tmpPos, k);
      cam.alvo.lerpVectors(de.alvo, tmpAlvo, k);
    } else {
      cam.pos.copy(tmpPos);
      cam.alvo.copy(tmpAlvo);
    }
  }
  camera.position.copy(cam.pos);
  camera.lookAt(cam.alvo);

  // materialização: só avança, nunca volta
  const sal = regioes.salao;
  sal.uPintura.value = Math.max(sal.uPintura.value, limita(((7 - cam.pos.z) + 16 + 2) / (-SALAO.fundo + 5)) * estado.intro);
  for (const p of portas) {
    const d = Math.hypot(cam.pos.x - p.x, cam.pos.z - p.z);
    const reg = regioes[p.chave];
    reg.uPintura.value = Math.max(reg.uPintura.value, (1 - limita((d - 1.5) / 6)) * estado.intro);
    // porta abre sozinha quando a câmera chega perto
    const alvoAbertura = d < 4 ? 1 : 0;
    p.abertura += (alvoAbertura - p.abertura) * Math.min(1, dt * 3);
    p.dobradica.rotation.y = p.base + suave(limita(p.abertura)) * 1.6;
  }

  // o colosso acorda quando você chega perto; depois disso, a cabeça segue a câmera
  if (colosso) {
    if (!colosso.acordado && cam.pos.z < -24) {
      colosso.acordado = 1;
      gsap.to(colosso.olhos.uniforms.uOlhos, { value: 1, duration: 1.8, ease: 'steps(6)' });
      gsap.to(colosso.luzOlhos, { base: 1.6, duration: 1.8, ease: 'steps(6)' });
    }
    const k = colosso.olhos.uniforms.uOlhos.value;
    const hx = 0, hy = 9.8, hz = -39.4;
    const yaw = limita(Math.atan2(cam.pos.x - hx, cam.pos.z - hz), -0.6, 0.6);
    const pitch = limita(Math.atan2(hy - cam.pos.y, Math.hypot(cam.pos.x - hx, cam.pos.z - hz)), 0, 0.5);
    colosso.cabeca.rotation.y += (yaw * k - colosso.cabeca.rotation.y) * 0.04;
    colosso.cabeca.rotation.x += (pitch * 0.8 * k - colosso.cabeca.rotation.x) * 0.04;
  }

  // as 16 luzes mais perto da câmera
  luzes.sort((a, b) => a.pos.distanceToSquared(cam.pos) - b.pos.distanceToSquared(cam.pos));
  globais.uLuzes.value.forEach((v, k) => {
    const l = luzes[k];
    if (!l) { v.set(0, 0, 0, 0); return; }
    const tremula = 0.86 + 0.09 * Math.sin(t * 9 + l.fase) + 0.05 * Math.sin(t * 23 + l.fase * 2);
    v.set(l.pos.x, l.pos.y, l.pos.z, l.base * (menosMovimento ? 0.95 : tremula) * l.reg.uPintura.value);
  });

  for (const c of cristais) {
    c.malha.rotation.y += dt * c.giro;
    c.malha.position.y = c.y0 + (menosMovimento ? 0 : Math.sin(t * 1.5 + c.fase) * 0.08);
  }
  for (const ch of chamas) ch.quaternion.copy(camera.quaternion);

  mostraLocal(lugarDa(cam.pos));
  renderer.render(cena, camera);
  requestAnimationFrame(quadro);
}

/* ---------- início ---------- */

async function iniciar() {
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);
  montaSalao(regioes.salao);
  montaSala('galeria', -1, -10, regioes.galeria);
  montaSala('arsenal', 1, -10, regioes.arsenal);
  montaSala('registros', -1, -24, regioes.registros);
  montaSala('espelho', 1, -24, regioes.espelho);
  montaAreas();
  await montaRetrato();
  posePasseio(0, cam.pos, cam.alvo);
  renderer.compile(cena, camera);

  if (ehToque) ui.modo.hidden = true;

  gsap.to(estado, {
    t: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '#rolagem', start: 'top top', end: 'bottom bottom', scrub: 1.2,
      onUpdate: (st) => ui.xp.style.setProperty('--p', st.progress),
    },
  });

  ui.carregando.classList.add('pronto');
  gsap.to(estado, { intro: 1, duration: menosMovimento ? 0 : 2.2, ease: 'power2.out', delay: 0.3 });
  requestAnimationFrame(quadro);
}

iniciar();
