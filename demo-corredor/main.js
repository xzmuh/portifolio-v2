import * as THREE from 'three';
import { criaFolha } from './desenho.js';
import * as il from './ilustracoes.js';

/* Demo "corredor de papel": ilustrações 2D em planos dentro de uma cena 3D.
   A rolagem move a câmera; cada sala "se pinta" conforme você chega perto
   (primeiro aparece o rascunho, depois a cor entra com uma pincelada). */

const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

// tudo em sRGB direto: as cores do canvas chegam na tela sem conversão
THREE.ColorManagement.enabled = false;

const L = 16;            // comprimento de cada sala
const LARGURA = 5;
const ALTURA = 3.6;
const Z_INICIO = 6;
const Z_FIM = -3 * L + 3.5;
const OLHO = 1.6;
const FUNDO = '#ebe3d5';
const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

const SALAS = [
  { nome: 'Entrada', cor: '#e9b44c', corEscura: '#a8752a', parede: '#f5e2b8', lambri: '#d9b27a', piso: '#c99a63', pisoAlt: '#bd8d57', porta: '#9a6a44' },
  { nome: 'Stack', cor: '#5b8fd6', corEscura: '#34609f', parede: '#d6e4f6', lambri: '#9fbde3', piso: '#a9b8c9', pisoAlt: '#9dadbf', porta: '#4a6f9e' },
  { nome: 'Projetos', cor: '#e2735a', corEscura: '#a8452f', parede: '#f7d8cc', lambri: '#e6a894', piso: '#c9957c', pisoAlt: '#bd8970', porta: '#8e4f3c' },
];

/* ---------- renderer / cena ---------- */

const canvas = document.getElementById('cena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(FUNDO);
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, OLHO, Z_INICIO);

const globais = {
  uTempo: { value: 0 },
  uNevoa: { value: new THREE.Color(FUNDO) },
  uPapel: { value: new THREE.Color('#f4ede1') },
};

/* ---------- shader ---------- */

const vertexShader = /* glsl */ `
  uniform float uTempo;
  uniform float uVento;
  uniform float uPino;     // 1 = preso em cima, 0 = preso embaixo, 0.5 = solto
  uniform float uFase;
  uniform float uTamanho;
  uniform float uSoFrente; // 1 = pendurado na parede: só se afasta dela
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vProf;

  void main() {
    vUv = uv;
    vec3 p = position;

    // papel balançando: senoides somadas, mais forte longe do ponto preso
    float peso = uPino > 0.75 ? pow(1.0 - uv.y, 1.4) : (uPino < 0.25 ? pow(uv.y, 1.4) : 0.6);
    float onda = sin(uTempo * 2.0 + p.y * 2.0 + p.x * 1.3 + uFase)
               + 0.5 * sin(uTempo * 3.3 + p.x * 3.0 + uFase * 1.7);
    if (uSoFrente > 0.5) onda = abs(onda);
    p.z += onda * uVento * peso * uTamanho;

    vec4 mundo = modelMatrix * vec4(p, 1.0);
    vMundo = mundo.xyz;
    vec4 mv = viewMatrix * mundo;
    vProf = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uRascunho;
  uniform sampler2D uPintado;
  uniform float uProgresso;    // pincelada rascunho -> cor, de baixo pra cima
  uniform float uPintura;      // quanto da sala já "existe"
  uniform float uComprimento;
  uniform float uRastro;       // 1 = a cor acompanha a frente de pintura (paredes)
  uniform vec3 uOrigem;
  uniform vec3 uPapel;
  uniform vec3 uNevoa;
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vProf;

  float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), u = fract(p);
    u = u * u * (3.0 - 2.0 * u);
    float r = mix(mix(rand(i), rand(i + vec2(1.0, 0.0)), u.x),
                  mix(rand(i + vec2(0.0, 1.0)), rand(i + vec2(1.0, 1.0)), u.x), u.y);
    return r * r;
  }

  void main() {
    // frente de pintura andando pra dentro da sala; o que ela não alcançou não existe
    vec3 local = vMundo - uOrigem;
    float d = -local.z;
    float alvo = mix(-3.0, uComprimento + 4.0, uPintura);
    float borda = alvo - d + ruido(local.xy * 2.0) * 2.0 + ruido(local.xy * 8.0) * 0.5;
    if (borda < 0.0) discard;

    vec4 rascunho = texture2D(uRascunho, vUv);
    vec4 pintado = texture2D(uPintado, vUv);
    vec4 cor = rascunho;
    float pincel = 0.0;

    if (uRastro > 0.5) {
      float b2 = borda - 3.0 + ruido(local.xy * 5.0 + 3.1) * 0.8;
      if (b2 > 0.0) cor = pintado;
      pincel = (1.0 - smoothstep(0.0, 0.35, abs(b2))) * step(uPintura, 0.999);
    } else if (uProgresso > 0.001) {
      float mascara = vUv.y + ruido(vUv * 15.0) * 0.15;
      float limiar = uProgresso * 1.2;
      if (mascara < limiar) cor = pintado;
      pincel = (1.0 - smoothstep(0.0, 0.035, abs(mascara - limiar))) * step(uProgresso, 0.999);
    }

    // verso da folha: papel com o desenho "vazando" de leve
    if (!gl_FrontFacing) cor = vec4(mix(uPapel, rascunho.rgb, 0.14) * 0.92, rascunho.a);

    if (cor.a < 0.5) discard;
    vec3 c = cor.rgb;

    c *= 0.955 + 0.045 * rand(floor(vUv * 700.0));                         // grão do papel
    c += vec3(0.4, 0.5, 0.7) * (1.0 - smoothstep(0.0, 2.0, borda)) * step(uPintura, 0.999) * 0.6; // tinta fresca
    c += vec3(0.35, 0.45, 0.7) * pincel * 0.5;
    c = mix(c, uNevoa, smoothstep(9.0, 34.0, vProf));

    gl_FragColor = vec4(c, 1.0);
  }
`;

/* ---------- folhas ---------- */

const folhas = [];      // tudo que recebe a pincelada
const interativas = []; // o que reage ao mouse
const balancos = [];    // o que flutua (balões, nuvens)

function textura(fonte) {
  const t = fonte instanceof HTMLCanvasElement ? new THREE.CanvasTexture(fonte) : fonte;
  t.anisotropy = aniso;
  return t;
}

/* Para usar desenho de verdade no lugar do provisório:
   folha(sala, { ..., imagens: { rascunho: 'img/placa.webp', pintado: 'img/placa_painted.webp' } }) */
function texturasDe(def) {
  if (def.imagens) {
    const l = new THREE.TextureLoader();
    return { rascunho: textura(l.load(def.imagens.rascunho)), pintado: textura(l.load(def.imagens.pintado)) };
  }
  const f = criaFolha(def);
  return { rascunho: textura(f.rascunho), pintado: textura(f.pintado) };
}

function folha(sala, def) {
  const { w, h, pos, rotY = 0, pino = 1, rastro = false, vento = rastro ? 0 : 0.03, naParede = false, hover = false, flutua = false } = def;
  const tex = texturasDe(def);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uRascunho: { value: tex.rascunho },
      uPintado: { value: tex.pintado },
      uProgresso: { value: 0 },
      uRastro: { value: rastro ? 1 : 0 },
      uPino: { value: pino },
      uVento: { value: menosMovimento ? 0 : vento },
      uFase: { value: Math.random() * Math.PI * 2 },
      uTamanho: { value: Math.max(w, h) },
      uSoFrente: { value: naParede ? 1 : 0 },
      uPintura: sala.uPintura,
      uOrigem: sala.uOrigem,
      uComprimento: sala.uComprimento,
      uTempo: globais.uTempo,
      uPapel: globais.uPapel,
      uNevoa: globais.uNevoa,
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });
  const seg = rastro ? 1 : 12;
  const malha = new THREE.Mesh(new THREE.PlaneGeometry(w, h, seg, seg), material);
  malha.position.set(pos[0], pos[1], pos[2]);
  malha.rotation.y = rotY;
  cena.add(malha);

  const info = { malha, sala, d: sala.uOrigem.value.z - pos[2], ventoBase: vento, y0: pos[1], fase: Math.random() * 6 };
  if (!rastro) folhas.push(info);
  if (hover) { malha.userData.info = info; interativas.push(malha); }
  if (flutua) balancos.push(info);
  return info;
}

/* ---------- salas ---------- */

const portas = [];

function montaSala(i) {
  const def = SALAS[i];
  const z0 = -i * L;
  const sala = {
    ...def,
    indice: i,
    uPintura: { value: 0 },
    uOrigem: { value: new THREE.Vector3(0, 0, z0) },
    uComprimento: { value: L },
  };
  const seed = (i + 1) * 1000;
  const zc = z0 - L / 2;
  const meiaL = LARGURA / 2;

  // paredes, piso e fundo
  const paredeLateral = { w: L, h: ALTURA, ppu: 128, fundo: 'cheio', rastro: true, desenha: il.parede(sala, { largura: L }) };
  folha(sala, { ...paredeLateral, seed: seed + 1, pos: [-meiaL, ALTURA / 2, zc], rotY: Math.PI / 2 });
  folha(sala, { ...paredeLateral, seed: seed + 2, pos: [meiaL, ALTURA / 2, zc], rotY: -Math.PI / 2 });
  const chao = folha(sala, { w: LARGURA, h: L, ppu: 128, fundo: 'cheio', rastro: true, seed: seed + 3, pos: [0, 0, zc], desenha: il.piso(sala, LARGURA) });
  chao.malha.rotation.set(-Math.PI / 2, 0, 0);

  const zFundo = z0 - L;
  if (i < SALAS.length - 1) {
    const vao = 1.4, alturaVao = 2.4, lado = (LARGURA - vao) / 2;
    const painel = { w: lado, h: ALTURA, ppu: 128, fundo: 'cheio', rastro: true, desenha: il.parede(sala, { largura: lado }) };
    folha(sala, { ...painel, seed: seed + 4, pos: [-(vao + lado) / 2, ALTURA / 2, zFundo] });
    folha(sala, { ...painel, seed: seed + 5, pos: [(vao + lado) / 2, ALTURA / 2, zFundo] });
    folha(sala, {
      w: vao, h: ALTURA - alturaVao, ppu: 128, fundo: 'cheio', rastro: true, seed: seed + 6,
      pos: [0, alturaVao + (ALTURA - alturaVao) / 2, zFundo], desenha: il.parede(sala, { largura: vao, lambri: false }),
    });
    // porta presa na dobradiça: o grupo gira, a folha fica deslocada meia largura
    const dobradica = new THREE.Group();
    dobradica.position.set(-vao / 2, 0, zFundo + 0.02);
    cena.add(dobradica);
    const p = folha(sala, {
      w: vao, h: alturaVao, ppu: 200, fundo: 'cheio', seed: seed + 7, pino: 0.5, vento: 0,
      pos: [0, 0, zFundo + 0.02], desenha: il.porta(SALAS[i + 1].nome, sala),
    });
    cena.remove(p.malha);
    p.malha.position.set(vao / 2, alturaVao / 2, 0);
    dobradica.add(p.malha);
    portas.push({ dobradica, z: zFundo });
  } else {
    folha(sala, { w: LARGURA, h: ALTURA, ppu: 128, fundo: 'cheio', rastro: true, seed: seed + 4, pos: [0, ALTURA / 2, zFundo], desenha: il.parede(sala, { largura: LARGURA }) });
  }

  if (i === 0) {
    folha(sala, { w: 2.6, h: 1.4, seed: seed + 10, pos: [0, 2.75, z0 - 4.5], hover: true, desenha: il.placa('Murilo Trigo', 'portfólio · demo', sala) });
    folha(sala, { w: 1.1, h: 1.7, seed: seed + 11, pos: [-1.75, 0.86, z0 - 3], pino: 0, hover: true, desenha: il.planta(0) });
    folha(sala, { w: 1.1, h: 1.7, seed: seed + 12, pos: [1.8, 0.86, z0 - 11], pino: 0, hover: true, desenha: il.planta(1) });
    folha(sala, { w: 0.9, h: 1.6, seed: seed + 13, pos: [1.25, 2.85, z0 - 8.5], hover: true, desenha: il.luminaria() });
    folha(sala, { w: 1.7, h: 1.3, seed: seed + 14, pos: [-meiaL + 0.06, 1.95, z0 - 8.5], rotY: Math.PI / 2, naParede: true, hover: true, desenha: il.quadroPaisagem() });
    folha(sala, { w: 2.0, h: 1.0, seed: seed + 15, pos: [meiaL - 0.06, 1.9, z0 - 5.5], rotY: -Math.PI / 2, naParede: true, hover: true, desenha: il.bilhete(['bem-vindo!', 'passa o mouse nas coisas'], sala.cor) });
  }

  if (i === 1) {
    const baloes = [
      ['HTML', '#e2735a', -1.5, 2.2, 3], ['CSS', '#5b8fd6', 1.4, 2.5, 4.5], ['JS', '#e9b44c', -0.3, 3.0, 6.5],
      ['GSAP', '#6bbf7a', 1.6, 2.0, 8], ['Three.js', '#9b7bd4', -1.6, 2.7, 9.5], ['Figma', '#e58fb0', 1.3, 2.4, 11],
      ['Git', '#4fb3b3', -1.2, 2.1, 13],
    ];
    baloes.forEach(([rotulo, cor, x, y, dz], k) => folha(sala, {
      w: 0.9, h: 1.5, seed: seed + 20 + k, pos: [x, y, z0 - dz], pino: 0.5, hover: true, flutua: true, desenha: il.balao(rotulo, cor),
    }));
    [[-1.2, 3.25, 5], [1.3, 3.3, 10], [-0.1, 3.4, 14]].forEach(([x, y, dz], k) => folha(sala, {
      w: 1.8, h: 1.0, seed: seed + 40 + k, pos: [x, y, z0 - dz], pino: 0.5, vento: 0.02, flutua: true, desenha: il.nuvem(),
    }));
  }

  if (i === 2) {
    const projetos = [['Nuveto', -1, 4], ['Dialogi', 1, 5.5], ['NextSI', -1, 10], ['Beauty', 1, 11.5]];
    projetos.forEach(([titulo, lado, dz], k) => folha(sala, {
      w: 1.9, h: 1.55, seed: seed + 50 + k, pos: [lado * (meiaL - 0.06), 1.9, z0 - dz], rotY: -lado * Math.PI / 2,
      naParede: true, hover: true, desenha: il.moldura(titulo, sala),
    }));
    folha(sala, { w: 1.2, h: 1.9, seed: seed + 60, pos: [1.45, 0.95, z0 - 13.4], pino: 0, hover: true, desenha: il.cavalete(sala) });
    folha(sala, { w: 2.6, h: 1.8, seed: seed + 61, pos: [0, 1.75, z0 - L + 0.05], vento: 0.015, naParede: true, hover: true, desenha: il.contato(sala) });
  }

  return sala;
}

/* ---------- interface ---------- */

const ui = {
  nome: document.getElementById('nomeSala'),
  barra: document.getElementById('progresso'),
  dica: document.getElementById('dica'),
  carregando: document.getElementById('carregando'),
};

const estado = { z: Z_INICIO, intro: 0, mx: 0, my: 0, alvoMx: 0, alvoMy: 0 };
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function nomeDaSala(z) {
  if (z < Z_FIM + 1.5) return 'Contato';
  return SALAS[limita(Math.floor(-(z - 2) / L), 0, SALAS.length - 1)].nome;
}

addEventListener('pointermove', (e) => {
  estado.alvoMx = (e.clientX / innerWidth) * 2 - 1;
  estado.alvoMy = -(e.clientY / innerHeight) * 2 + 1;
  apontar(e);
});

const raio = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let emFoco = null;

function apontar(e) {
  ponteiro.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raio.setFromCamera(ponteiro, camera);
  const alvo = raio.intersectObjects(interativas, false)[0]?.object.userData.info ?? null;
  if (alvo === emFoco) return;
  if (emFoco) gsap.to(emFoco.malha.material.uniforms.uVento, { value: menosMovimento ? 0 : emFoco.ventoBase, duration: 1.2, ease: 'power2.out' });
  if (alvo) gsap.to(alvo.malha.material.uniforms.uVento, { value: menosMovimento ? 0 : 0.09, duration: 0.5, ease: 'power2.out' });
  emFoco = alvo;
  document.body.style.cursor = alvo ? 'pointer' : '';
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- loop ---------- */

let salas = [];
const relogio = new THREE.Clock();

function quadro() {
  const t = relogio.getElapsedTime();
  globais.uTempo.value = t;

  estado.mx += (estado.alvoMx - estado.mx) * 0.05;
  estado.my += (estado.alvoMy - estado.my) * 0.05;
  const z = estado.z;

  camera.position.set(estado.mx * 0.25, OLHO + estado.my * 0.08 + Math.sin(z * 1.1) * 0.025, z);
  camera.lookAt(estado.mx * 0.6, OLHO - 0.05 + estado.my * 0.15, z - 6);

  // cada sala se pinta conforme a câmera chega perto da entrada dela
  for (const sala of salas) {
    const dist = z - sala.uOrigem.value.z;
    sala.uPintura.value = (1 - limita((dist - 1) / 11)) * estado.intro;
    sala.alvo = -3 + sala.uPintura.value * (L + 7);
  }
  // a pincelada de cor chega um pouco depois do rascunho
  for (const f of folhas) {
    f.malha.material.uniforms.uProgresso.value = limita((f.sala.alvo - f.d - 1) / 3);
  }
  for (const b of balancos) {
    b.malha.position.y = b.y0 + (menosMovimento ? 0 : Math.sin(t * 0.8 + b.fase) * 0.07);
  }
  for (const p of portas) {
    const a = limita((5 - (z - p.z)) / 3);
    p.dobradica.rotation.y = a * a * (3 - 2 * a) * 1.85;
  }

  // o nome segue a câmera (que chega com atraso por causa do scrub), não a barra de rolagem
  const nome = nomeDaSala(z);
  if (ui.nome.textContent !== nome) ui.nome.textContent = nome;

  renderer.render(cena, camera);
  requestAnimationFrame(quadro);
}

/* ---------- início ---------- */

async function iniciar() {
  // as letras do canvas precisam da fonte já carregada
  await Promise.race([
    Promise.all([document.fonts.load('700 64px Caveat'), document.fonts.load('500 64px Caveat')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  await new Promise((r) => requestAnimationFrame(r));

  salas = SALAS.map((_, i) => montaSala(i));
  renderer.compile(cena, camera);

  gsap.to(estado, {
    z: Z_FIM,
    ease: 'none',
    scrollTrigger: {
      trigger: '#rolagem', start: 'top top', end: 'bottom bottom', scrub: 1.2,
      onUpdate: (st) => {
        ui.barra.style.transform = `scaleY(${st.progress})`;
        ui.dica.classList.toggle('some', st.progress > 0.02);
      },
    },
  });

  ui.carregando.classList.add('pronto');
  gsap.to(estado, { intro: 1, duration: menosMovimento ? 0 : 2.4, ease: 'power2.out', delay: 0.2 });
  requestAnimationFrame(quadro);
}

iniciar();
