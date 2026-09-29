import * as THREE from 'three';
import * as art from './pixelart.js';

/* Demo "masmorra": a mesma ideia do corredor de papel, em pixel art escura.
   - a cena é renderizada em baixa resolução e ampliada sem suavizar (pixels nítidos)
   - cada sala se materializa em blocos, com as células novas brilhando em azul
   - tochas de chama fria iluminam; a luz é quantizada com dithering (Bayer 4x4)
   - passar o cursor "inspeciona" o objeto na caixa de diálogo */

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);
THREE.ColorManagement.enabled = false;

const L = 16, LARGURA = 5, ALTURA = 4, OLHO = 1.55;
const Z_INICIO = 5, Z_FIM = -3 * L + 4;
const LINHAS_DA_TELA = 270; // resolução vertical interna
const N_LUZES = 16;
const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

const SALAS = [
  {
    nome: 'O Salão', area: 'Área 01',
    narracao: 'Murilo Gonzales Trigo, desenvolvedor full stack. Mais do que escrever código, gosto de construir experiências. Role para avançar.',
  },
  {
    nome: 'O Arsenal', area: 'Área 02',
    narracao: 'Mais de cinco anos de sistemas reais, guardados em quatro cristais. Passe o cursor sobre eles para inspecionar.',
  },
  {
    nome: 'A Galeria', area: 'Área 03',
    narracao: 'Cada quadro é uma missão concluída. Inspecione para ler o registro.',
  },
];
const FINAL = {
  nome: 'O Portal', area: 'Fim',
  narracao: 'Fim da masmorra, por enquanto. Vamos construir algo juntos? Clique no portal.',
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

/* ---------- renderer ---------- */

const canvas = document.getElementById('cena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(1);
renderer.setClearColor(art.P.vazio);

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60);

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
  uAmbiente: { value: 0.16 },
  uLuzes: { value: Array.from({ length: N_LUZES }, () => new THREE.Vector4()) },
};

/* ---------- shaders ---------- */

const vertexPadrao = /* glsl */ `
  uniform float uTempo;
  uniform float uVento;
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vProf;
  varying vec2 vLocal;
  void main() {
    vUv = uv;
    vLocal = position.xy;
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
  uniform float uPintura;
  uniform float uComprimento;
  uniform float uTempo;
  varying vec3 vMundo;
  varying float vProf;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // frente de materialização em blocos de 25 cm; < 0 = ainda não existe
  float materializa() {
    vec3 cel = floor((vMundo - uOrigem) * 4.0 + 0.013);
    float d = -(cel.z + 0.5) / 4.0;
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
    c = mix(c, vec3(0.02, 0.024, 0.032), smoothstep(7.0, 26.0, vProf));
    // poucos tons por canal + dithering ordenado = cara de jogo antigo
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
      luz += uLuzes[i].w / (1.0 + dot(dl, dl) * 0.55);
    }
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

const fragmentPortal = /* glsl */ `
  uniform float uRaio;
  uniform float uCentroY;
  uniform float uRealce;
  varying vec2 vLocal;
  ${comum}
  void main() {
    float borda = materializa();
    if (borda < 0.0) discard;
    vec2 p = vLocal - vec2(0.0, uCentroY);
    bool dentro = p.y > 0.0 ? length(p) < uRaio : abs(p.x) < uRaio;
    if (!dentro) discard;
    float r = clamp(length(p) / uRaio, 0.0, 1.4);
    float a = atan(p.y, p.x);
    float vel = 2.5 + uRealce * 3.0;
    float espiral = sin(a * 3.0 + r * 9.0 - uTempo * vel) * 0.5 + 0.5;
    float faisca = step(0.97, hash(floor(p * 14.0) + floor(uTempo * 8.0)));
    float v = espiral * 0.55 + (1.0 - min(r, 1.0)) * 0.55 + faisca * 0.6;
    // parte reta de baixo: o redemoinho continua até o chão
    if (p.y < 0.0) v += 0.2 * (1.0 - abs(p.x) / uRaio);
    vec3 c = v > 0.95 ? vec3(0.98) : v > 0.72 ? vec3(0.49, 0.77, 1.0) : v > 0.5 ? vec3(0.16, 0.59, 1.0) : v > 0.3 ? vec3(0.07, 0.25, 0.45) : vec3(0.03, 0.08, 0.16);
    gl_FragColor = vec4(acabamento(c, borda), 1.0);
  }
`;

/* ---------- construção ---------- */

function textura(c) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

function uniformsDaSala(sala) {
  return { uOrigem: sala.uOrigem, uPintura: sala.uPintura, uComprimento: sala.uComprimento, uTempo: globais.uTempo };
}

function matPedra(c, sala, { vento = 0, proprio = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...uniformsDaSala(sala),
      uMapa: { value: textura(c) },
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

function plano(sala, c, w, h, pos, { rotX = 0, rotY = 0, ...op } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, op.vento ? 6 : 1, op.vento ? 6 : 1), matPedra(c, sala, op));
  m.position.set(...pos);
  m.rotation.set(rotX, rotY, 0);
  cena.add(m);
  return m;
}

function caixa(sala, c, w, h, d, pos) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matPedra(c, sala));
  m.position.set(...pos);
  cena.add(m);
  return m;
}

const luzes = [];       // { pos, base, sala, fase }
const inspecionaveis = [];
const cristais = [];
const grades = [];
const chamas = [];
let portal = null;

function inspecionavel(malhas, titulo, texto, extra = {}) {
  const item = { malhas: [].concat(malhas), titulo, texto, ...extra };
  for (const m of item.malhas) { m.userData.item = item; inspecionaveis.push(m); }
  return item;
}

function tocha(sala, x, z, lado) {
  const xs = x - lado * 0.06;
  plano(sala, art.suporteTocha(), 0.38, 0.62, [xs, 2.2, z], { rotY: lado * -Math.PI / 2 });
  const chama = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.56),
    new THREE.ShaderMaterial({
      uniforms: { ...uniformsDaSala(sala), uFase: { value: Math.random() * 10 } },
      vertexShader: vertexPadrao,
      fragmentShader: fragmentChama,
      side: THREE.DoubleSide,
    }),
  );
  chama.position.set(xs - lado * 0.08, 2.72, z);
  cena.add(chama);
  chamas.push(chama);
  luzes.push({ pos: new THREE.Vector3(xs - lado * 0.5, 2.6, z), base: 2.3, sala, fase: Math.random() * 10 });
}

function montaSala(i) {
  const z0 = -i * L;
  const sala = {
    ...SALAS[i], indice: i,
    uPintura: { value: 0 },
    uOrigem: { value: new THREE.Vector3(0, 0, z0) },
    uComprimento: { value: L },
  };
  const s = (i + 1) * 100;
  const meia = LARGURA / 2, zc = z0 - L / 2, zFundo = z0 - L;

  plano(sala, art.piso(LARGURA, L, s + 1), LARGURA, L, [0, 0, zc], { rotX: -Math.PI / 2 });
  plano(sala, art.parede(LARGURA, L, s + 2, { base: false, escura: 1, runas: false }), LARGURA, L, [0, ALTURA, zc], { rotX: Math.PI / 2 });
  plano(sala, art.parede(L, ALTURA, s + 3), L, ALTURA, [-meia, ALTURA / 2, zc], { rotY: Math.PI / 2 });
  plano(sala, art.parede(L, ALTURA, s + 4), L, ALTURA, [meia, ALTURA / 2, zc], { rotY: -Math.PI / 2 });

  // pilares meio embutidos nas paredes
  for (const dz of [0.4, L - 0.4]) {
    for (const lado of [-1, 1]) caixa(sala, art.parede(0.6, ALTURA, s + 10 + dz * 3 + lado, { base: false, runas: false }), 0.6, ALTURA, 0.6, [lado * (meia - 0.15), ALTURA / 2, z0 - dz]);
  }

  for (const dz of [4.2, 11.8]) { tocha(sala, -meia, z0 - dz, -1); tocha(sala, meia, z0 - dz, 1); }

  if (i < SALAS.length - 1) {
    const vao = 1.6, altVao = 2.6, lado = (LARGURA - vao) / 2;
    plano(sala, art.parede(lado, ALTURA, s + 5), lado, ALTURA, [-(vao + lado) / 2, ALTURA / 2, zFundo]);
    plano(sala, art.parede(lado, ALTURA, s + 6), lado, ALTURA, [(vao + lado) / 2, ALTURA / 2, zFundo]);
    plano(sala, art.parede(vao, ALTURA - altVao, s + 7, { base: false }), vao, ALTURA - altVao, [0, altVao + (ALTURA - altVao) / 2, zFundo]);
    const g = plano(sala, art.grade(), vao, altVao, [0, altVao / 2, zFundo - 0.05]);
    grades.push({ malha: g, z: zFundo, y0: altVao / 2 });
    for (const lx of [-1, 1]) {
      const e = plano(sala, art.estandarte(), 1.1, 2.2, [lx * (vao + lado) / 2, 2.3, zFundo + 0.06], { vento: 0.03 });
      inspecionavel(e, 'Estandarte', 'O brasão da casa MGT, em azul #2997ff. Dizem que o M é de Murilo.');
    }
  } else {
    plano(sala, art.parede(LARGURA, ALTURA, s + 5), LARGURA, ALTURA, [0, ALTURA / 2, zFundo]);
  }

  if (i === 0) {
    plano(sala, art.tapete(1.6, L - 1), 1.6, L - 1, [0, 0.01, zc + 0.5], { rotX: -Math.PI / 2 });
    for (const lado of [-1, 1]) {
      const e = plano(sala, art.estandarte(), 1.1, 2.2, [lado * (meia - 0.06), 2.3, z0 - 8], { rotY: -lado * Math.PI / 2, vento: 0.03 });
      inspecionavel(e, 'Estandarte', 'O brasão da casa MGT. Fascinado pelo universo gamer, ele quis que o portfólio também fosse um lugar para explorar.');
    }
  }

  if (i === 1) {
    HABILIDADES.forEach(([titulo, texto, tags], k) => {
      const lado = k % 2 ? 1 : -1, z = z0 - 3.6 - k * 3;
      const ped = caixa(sala, art.parede(0.8, 1.1, s + 30 + k, { base: false, runas: k % 2 === 0 }), 0.8, 1.1, 0.8, [lado * 1.35, 0.55, z]);
      const topo = caixa(sala, art.parede(1, 0.15, s + 40 + k, { base: false, runas: false }), 1, 0.15, 1, [lado * 1.35, 1.17, z]);
      const cristal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.26),
        new THREE.ShaderMaterial({ uniforms: { ...uniformsDaSala(sala), uRealce: { value: 0 } }, vertexShader: vertexPadrao, fragmentShader: fragmentCristal }),
      );
      cristal.scale.y = 1.7;
      cristal.position.set(lado * 1.35, 1.75, z);
      cena.add(cristal);
      const c = { malha: cristal, y0: 1.75, fase: k * 1.3, giro: 0.6 };
      cristais.push(c);
      luzes.push({ pos: new THREE.Vector3(lado * 1.2, 1.9, z), base: 0.9, sala, fase: k });
      inspecionavel([cristal, ped, topo], titulo, `${texto}\n${tags}`, { cristal: c });
    });
  }

  if (i === 2) {
    PROJETOS.forEach(([titulo, tipo, texto], k) => {
      const lado = k % 2 ? 1 : -1, z = z0 - 2.2 - Math.floor(k / 2) * 5.8;
      const q = plano(sala, art.quadro(s + 50 + k, tipo), 1.9, 1.4, [lado * (meia - 0.06), 1.95, z], { rotY: -lado * Math.PI / 2, proprio: 0.35 });
      inspecionavel(q, titulo, texto);
    });
    const { W, H, cy, rIn } = art.ARCO;
    const aw = W / art.PPU, ah = H / art.PPU;
    const arco = plano(sala, art.arco(s + 60), aw, ah, [0, ah / 2, zFundo + 0.1]);
    const raio = rIn / art.PPU, centroY = ah - cy / art.PPU;
    const altPortal = centroY + raio;
    const disco = new THREE.Mesh(
      new THREE.PlaneGeometry(raio * 2, altPortal),
      new THREE.ShaderMaterial({
        uniforms: { ...uniformsDaSala(sala), uRaio: { value: raio }, uCentroY: { value: centroY - altPortal / 2 }, uRealce: { value: 0 } },
        vertexShader: vertexPadrao,
        fragmentShader: fragmentPortal,
      }),
    );
    disco.position.set(0, altPortal / 2, zFundo + 0.06);
    cena.add(disco);
    portal = disco;
    luzes.push({ pos: new THREE.Vector3(0, 1.6, zFundo + 1.2), base: 3.2, sala, fase: 0 });
    inspecionavel([disco, arco], 'Portal', 'Leva direto para o contato. Clique para atravessar.', { link: '../#contact' });
  }

  return sala;
}

/* ---------- HUD e diálogo ---------- */

const ui = {
  area: document.getElementById('area'),
  local: document.getElementById('local'),
  cartao: document.getElementById('cartao'),
  xp: document.getElementById('xp'),
  quem: document.getElementById('quem'),
  fala: document.getElementById('fala'),
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
function mostraLocal(s) {
  if (s === localAtual) return;
  localAtual = s;
  ui.area.textContent = s.area;
  ui.local.textContent = s.nome;
  ui.cartao.classList.remove('entra');
  void ui.cartao.offsetWidth; // reinicia a animação
  ui.cartao.classList.add('entra');
  if (!emFoco) fala('Narrador', s.narracao);
}

/* ---------- interação ---------- */

const raio = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
const estado = { z: Z_INICIO, intro: 0, mx: 0, my: 0, alvoMx: 0, alvoMy: 0 };
let emFoco = null;

function realce(item, v) {
  for (const m of item.malhas) {
    if (m.material.uniforms.uRealce) gsap.to(m.material.uniforms.uRealce, { value: v, duration: 0.3 });
  }
  if (item.cristal) gsap.to(item.cristal, { giro: v ? 3 : 0.6, duration: 0.5 });
}

function apontar(e) {
  ponteiro.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raio.setFromCamera(ponteiro, camera);
  const item = raio.intersectObjects(inspecionaveis, false)[0]?.object.userData.item ?? null;
  if (item === emFoco) return item;
  if (emFoco) realce(emFoco, 0);
  if (item) { realce(item, 1); fala(item.titulo, item.texto); } else if (localAtual) fala('Narrador', localAtual.narracao);
  emFoco = item;
  document.body.style.cursor = item?.link ? 'pointer' : item ? 'help' : '';
  return item;
}

addEventListener('pointermove', (e) => {
  estado.alvoMx = (e.clientX / innerWidth) * 2 - 1;
  estado.alvoMy = -(e.clientY / innerHeight) * 2 + 1;
  apontar(e);
});
addEventListener('pointerdown', (e) => {
  const item = apontar(e);
  if (item?.link) location.href = item.link;
});

/* ---------- loop ---------- */

let salas = [];
const relogio = new THREE.Clock();
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function salaDaCamera(z) {
  if (z < Z_FIM + 2) return FINAL;
  return salas[limita(Math.floor(-(z - 2) / L), 0, salas.length - 1)];
}

function quadro() {
  const dt = Math.min(relogio.getDelta(), 0.1);
  const t = (globais.uTempo.value += dt);

  estado.mx += (estado.alvoMx - estado.mx) * 0.05;
  estado.my += (estado.alvoMy - estado.my) * 0.05;
  const z = estado.z;
  const passo = menosMovimento ? 0 : Math.abs(Math.sin(z * 1.4)) * 0.04;
  camera.position.set(estado.mx * 0.2, OLHO + passo, z);
  camera.lookAt(estado.mx * 0.7, OLHO + estado.my * 0.25, z - 6);

  for (const sala of salas) {
    sala.uPintura.value = (1 - limita((z - sala.uOrigem.value.z - 1) / 11)) * estado.intro;
  }

  // só as 16 luzes mais perto da câmera entram no shader
  luzes.sort((a, b) => Math.abs(a.pos.z - z) - Math.abs(b.pos.z - z));
  globais.uLuzes.value.forEach((v, k) => {
    const l = luzes[k];
    if (!l) { v.set(0, 0, 0, 0); return; }
    const tremula = 0.86 + 0.09 * Math.sin(t * 9 + l.fase) + 0.05 * Math.sin(t * 23 + l.fase * 2);
    v.set(l.pos.x, l.pos.y, l.pos.z, l.base * (menosMovimento ? 0.95 : tremula) * l.sala.uPintura.value);
  });

  for (const c of cristais) {
    c.malha.rotation.y += dt * c.giro;
    c.malha.position.y = c.y0 + (menosMovimento ? 0 : Math.sin(t * 1.5 + c.fase) * 0.08);
  }
  for (const ch of chamas) ch.quaternion.copy(camera.quaternion);
  for (const g of grades) {
    const a = limita((5 - (z - g.z)) / 3);
    g.malha.position.y = g.y0 + a * a * (3 - 2 * a) * 2.5;
  }

  mostraLocal(salaDaCamera(z));
  renderer.render(cena, camera);
  requestAnimationFrame(quadro);
}

/* ---------- início ---------- */

async function iniciar() {
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);
  salas = SALAS.map((_, i) => montaSala(i));
  renderer.compile(cena, camera);

  gsap.to(estado, {
    z: Z_FIM,
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
