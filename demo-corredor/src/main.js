import * as THREE from 'three';
import { criaFolha, PAPEL } from './lapis.js';
import * as d from './desenhos.js';
import * as som from './som.js';
import { criaVida } from './vida.js';
import './style.css';

/* Corredor desenhado a nanquim. A rolagem anda pelo corredor (ou WASD para
   andar livre; joystick no celular). Conforme você chega perto, o rascunho a
   grafite vira arte final. Cada porta leva a uma sala com uma interação:
   cartões de projeto que viram, bilhetes de habilidades, linha do tempo,
   retrato e um formulário de papel que envia pelo WhatsApp. */

THREE.ColorManagement.enabled = false; // o canvas já está nas cores finais

const LARG = 4.4, ALT = 3.4, FIM = -42;
const PORTA = { w: 1.3, h: 2.3 };
const SALA = { prof: 5.2, larg: 5 };
const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
const toque = matchMedia('(pointer: coarse)').matches;

const WHATSAPP = '5514981647336';
const LINKS = {
  linkedin: 'https://www.linkedin.com/in/murilo-trigo-6205b3190/',
  github: 'https://github.com/xzmuh',
  whatsapp: `https://wa.me/${WHATSAPP}`,
};

const SALAS = [
  { chave: 'projetos', nome: 'Projetos', lado: -1, z: -8 },
  { chave: 'habilidades', nome: 'Habilidades', lado: 1, z: -16 },
  { chave: 'trajetoria', nome: 'Trajetória', lado: -1, z: -24 },
  { chave: 'sobre', nome: 'Sobre mim', lado: 1, z: -32 },
  { chave: 'contato', nome: 'Contato', lado: 0, z: FIM },
];

const PROJETOS = [
  ['Velox CRM', 'funil de vendas para concessionárias', 'CRM de funil de vendas para concessionárias, com gestão de leads e negociações.'],
  ['Beauty Exp', 'gestão para clínicas de estética', 'Sistema de gestão para clínicas de estética, com agenda, pacientes, procedimentos e financeiro.'],
  ['Freplan', 'catálogo de usinagem sob medida', 'Site institucional e catálogo para usinagem sob medida, com orçamento direto pelo WhatsApp.'],
  ['Tecnoglass', 'site institucional', 'Site institucional para a Tecnoglass Brasil.', 'https://tecnoglassbrasil.com.br'],
  ['Mini Chat IA', 'IA local para processos fiscais', 'Chat com IA local (Ollama/Llama) para tirar dúvidas e sugerir rotinas em processos fiscais.'],
  ['API de Notificações', 'alertas orientados a eventos', 'API interna de notificações orientada a eventos, distribuindo alertas para várias plataformas.'],
  ['Dialogi', 'gamificação para operações', 'Site da plataforma de gamificação para operações, com experiências interativas e animações.', 'https://dialogi.ai'],
  ['SigmaCX', 'plataforma de CX', 'Site institucional da SigmaCX, plataforma de CX que unifica canais, automação e IA.', 'https://sigmacx.ai'],
];

/* ---------- renderer ---------- */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(PAPEL);
document.getElementById('palco').appendChild(renderer.domElement);

const cena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(toque ? 70 : 60, innerWidth / innerHeight, 0.05, 80);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const tempo = { value: 0 };
const papel = new THREE.Color(PAPEL);

// as texturas escrevem com a Caveat: precisa estar carregada antes de desenhar
await Promise.race([
  Promise.all([document.fonts.load('700 40px Caveat'), document.fonts.load('500 40px Caveat')]),
  new Promise((r) => setTimeout(r, 3000)),
]);

const texturaPortaMadeira = await new THREE.TextureLoader().loadAsync('doors/entrance-double-cropped.png');
texturaPortaMadeira.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const [texturaArvoreEntrada, texturaMouseEntrada, texturaGatoEntrada] = await Promise.all([
  new THREE.TextureLoader().loadAsync('facade/tree-v3.png'),
  new THREE.TextureLoader().loadAsync('facade/hanging-mouse-v2.png'),
  new THREE.TextureLoader().loadAsync('facade/cat-v4.png'),
]);
for (const texturaEntrada of [texturaArvoreEntrada, texturaMouseEntrada, texturaGatoEntrada]) texturaEntrada.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const texturaPortaSimples = texturaPortaMadeira.clone();
texturaPortaSimples.repeat.set(0.5, 1);
texturaPortaSimples.offset.x = 0;
texturaPortaSimples.needsUpdate = true;
const corPortaNormal = new THREE.Color('#ffffff');
const corPortaHover = new THREE.Color('#d2a16f');

/* ---------- material: rascunho → nanquim ---------- */

// cada região (corredor e salas) se desenha ao longo de uma direção
function regiao(origem, dir, comprimento) {
  return {
    uOrigem: { value: new THREE.Vector3(...origem) },
    uDir: { value: new THREE.Vector3(...dir).normalize() },
    uComprimento: { value: comprimento },
    uPintura: { value: 0 },
  };
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vProf;
  void main() {
    vUv = uv;
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    vec4 mv = viewMatrix * m;
    vProf = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uLapis, uTinta, uCor;
  uniform vec3 uOrigem, uDir, uPapel;
  uniform float uComprimento, uPintura, uTempo, uSemente, uRealce, uPintar;
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vProf;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    vec3 local = vMundo - uOrigem;
    float d = dot(local, uDir);
    float n = ruido(vec2(local.x + local.z, local.y) * 1.6) * 1.2 + ruido(vec2(local.x - local.z, local.y) * 5.0) * 0.4;
    float alvo = mix(-2.0, uComprimento + 4.0, uPintura);
    float borda = alvo - d + n;
    if (borda < 0.0) discard;                        // ainda não foi desenhado

    // "boiling": o traço treme de leve, 7 vezes por segundo, como animação a mão
    float passo = floor(uTempo * 7.0);
    vec2 uv = vUv + (vec2(hash(vec2(passo, uSemente)), hash(vec2(uSemente, passo + 3.1))) - 0.5) * 0.0018;

    vec4 lapis = texture2D(uLapis, uv);
    vec4 tinta = texture2D(uTinta, uv);
    float k = smoothstep(0.0, 1.2, borda - 2.2 + n * 0.6);  // o nanquim chega depois do grafite
    vec4 c = mix(lapis, tinta, k);
    c = mix(c, texture2D(uCor, uv), uPintar * k);   // hover: o desenho ganha cor
    if (c.a < 0.3) discard;
    vec3 cor = c.rgb;
    cor = mix(cor, cor * vec3(0.78, 0.8, 0.86), uRealce);   // leve sombra ao passar o mouse
    cor = mix(cor, uPapel, smoothstep(8.0, 30.0, vProf) * 0.9);
    gl_FragColor = vec4(cor, 1.0);
  }
`;

function textura(c) {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

function folha(reg, def, pai = cena) {
  const { w, h, pos, rotY = 0, rotX = 0 } = def;
  const f = criaFolha({ ppu: 160, ...def });
  const tinta = textura(f.tinta);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...reg,
      uLapis: { value: textura(f.lapis) },
      uTinta: { value: tinta },
      uCor: { value: f.cor ? textura(f.cor) : tinta },
      uPintar: { value: 0 },
      uPapel: { value: papel },
      uTempo: tempo,
      uSemente: { value: Math.random() * 100 },
      uRealce: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(...pos);
  m.rotation.set(rotX, rotY, 0, 'YXZ');
  pai.add(m);
  return m;
}

function redesenha(mesh, def) {
  const f = criaFolha({ ppu: 200, fundo: 'vazado', ...def });
  const u = mesh.material.uniforms;
  for (const [chave, canvas] of [['uLapis', f.lapis], ['uTinta', f.tinta]]) {
    u[chave].value.dispose();
    u[chave].value = textura(canvas);
  }
}

/* ---------- corredor ---------- */

const corredor = regiao([0, 0, 0], [0, 0, -1], -FIM + 6);
const meia = LARG / 2;

folha(corredor, { w: LARG, h: -FIM, pos: [0, 0, FIM / 2], rotX: -Math.PI / 2, seed: 1, ppu: 110, desenha: d.piso(LARG, -FIM) });
folha(corredor, { w: LARG, h: -FIM, pos: [0, ALT, FIM / 2], rotX: Math.PI / 2, seed: 2, ppu: 90, desenha: d.teto(LARG, -FIM) });

// paredes laterais com os vãos das portas
for (const lado of [-1, 1]) {
  const vaos = SALAS.filter((s) => s.lado === lado).map((s) => s.z);
  let z = 0;
  const trechos = [];
  for (const zc of vaos) { trechos.push([z, zc + PORTA.w / 2]); z = zc - PORTA.w / 2; }
  trechos.push([z, FIM]);
  trechos.forEach(([z0, z1], k) => {
    const w = z0 - z1;
    folha(corredor, { w, h: ALT, pos: [lado * meia, ALT / 2, (z0 + z1) / 2], rotY: -lado * Math.PI / 2, seed: 10 + k + lado * 5, desenha: d.parede(w) });
  });
  for (const zc of vaos) {
    const h = ALT - PORTA.h;
    folha(corredor, { w: PORTA.w, h, pos: [lado * meia, PORTA.h + h / 2, zc], rotY: -lado * Math.PI / 2, seed: 30 + zc, desenha: d.parede(PORTA.w) });
  }
}
// parede do fundo com a porta do contato
{
  const lado = (LARG - PORTA.w) / 2;
  for (const s of [-1, 1]) folha(corredor, { w: lado, h: ALT, pos: [s * (PORTA.w + lado) / 2, ALT / 2, FIM], seed: 40 + s, desenha: d.parede(lado, { cantoEsq: s < 0, cantoDir: s > 0 }) });
  folha(corredor, { w: PORTA.w, h: ALT - PORTA.h, pos: [0, PORTA.h + (ALT - PORTA.h) / 2, FIM], seed: 43, desenha: d.parede(PORTA.w) });
}

// pouca coisa, bem espaçada: luminárias no teto, grades de ventilação, rabiscos e uma mesinha
for (const [k, z] of [-5, -12, -19, -26, -33, -40].entries()) {
  folha(corredor, { w: 1.5, h: 0.34, pos: [0, ALT - 0.01, z], rotX: Math.PI / 2, seed: 300 + k, fundo: 'vazado', ppu: 200, desenha: d.luzFluorescente() });
}
[[-1, -6.4], [1, -13.5], [-1, -30], [1, -36.5]].forEach(([lado, z], k) => {
  folha(corredor, { w: 0.7, h: 0.32, pos: [lado * (meia - 0.02), 2.95, z], rotY: -lado * Math.PI / 2, seed: 310 + k, fundo: 'vazado', ppu: 220, desenha: d.grade() });
});
folha(corredor, { w: 1.3, h: 0.75, pos: [meia - 0.02, 1.9, -4.8], rotY: -Math.PI / 2, seed: 320, fundo: 'vazado', ppu: 220, desenha: d.rabiscoCodigo() });
folha(corredor, { w: 0.8, h: 1.6, pos: [-(meia - 0.02), 1.7, -34.8], rotY: Math.PI / 2, seed: 321, fundo: 'vazado', ppu: 220, desenha: d.rabiscoFluxo() });
folha(corredor, { w: 1.2, h: 1.1, pos: [-(meia - 0.12), 0.55, -12.6], rotY: Math.PI / 2, seed: 322, fundo: 'vazado', ppu: 200, desenha: d.mesinha() });
[[1, -20.4, 'paisagem', 1.0, 0.7], [-1, -28.2, 'abstrato', 0.75, 0.75]].forEach(([lado, z, qual, w, h], k) => {
  folha(corredor, { w, h, pos: [lado * (meia - 0.02), 1.85, z], rotY: -lado * Math.PI / 2, seed: 60 + k, fundo: 'vazado', ppu: 220, desenha: d.quadro(d.cenas[qual]) });
});
// o nome grande no começo do corredor, como uma placa flutuando
const logo = folha(corredor, { w: 3.4, h: 1.25, pos: [0.25, 2.6, -3.6], seed: 330, fundo: 'vazado', ppu: 220, desenha: d.logo('MURILO', '< dev full stack />') });

/* ---------- portas e salas ---------- */

const portas = [];
const animacoesSala = []; // (t, dt) => void
const formulario = { nome: '', mensagem: '', campo: null, cursor: false, aviso: '' };
let fotoDaSala = null;
const grupoProjetos = new THREE.Group();
grupoProjetos.visible = false;
cena.add(grupoProjetos);

function montaSala(def) {
  // n = normal da porta (aponta para o corredor); t = eixo "largura" da porta
  const n = def.lado ? new THREE.Vector3(-def.lado, 0, 0) : new THREE.Vector3(0, 0, 1);
  const c = new THREE.Vector3(def.lado * meia, 0, def.z);
  const rotY = Math.atan2(n.x, n.z);
  const t = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY));
  // no píer (mundo aberto) o desenho precisa alcançar longe: farol e nuvens ficam a 20+ m
  const reg = regiao([c.x, 0, c.z], [-n.x, 0, -n.z], def.chave === 'contato' ? 40 : def.chave === 'projetos' ? 24 : SALA.prof);
  const noFundo = (dist, lateral, y) => c.clone().addScaledVector(n, -dist).addScaledVector(t, lateral).setY(y);
  const paiSala = def.chave === 'projetos' ? grupoProjetos : cena;

  folha(corredor, {
    w: PORTA.w + 0.18, h: PORTA.h + 0.09, pos: c.clone().addScaledVector(n, 0.02).setY((PORTA.h + 0.09) / 2).toArray(), rotY,
    seed: 70 + def.z, fundo: 'vazado', ppu: 200, desenha: d.batente(PORTA.w + 0.18),
  });
  // placa de madeira com o nome e duas setas rabiscadas apontando para a porta
  const placa = folha(corredor, { w: 1.3, h: 0.36, pos: c.clone().addScaledVector(n, 0.03).setY(PORTA.h + 0.42).toArray(), rotY, seed: 75 + def.z, fundo: 'vazado', ppu: 240, comCor: true, desenha: d.placaMadeira(def.nome) });
  placa.rotation.z = (def.z % 2 ? 1 : -1) * 0.035;
  const setas = [-1, 1].map((lado) => {
    const m = folha(corredor, { w: 0.55, h: 0.3, pos: c.clone().addScaledVector(n, 0.03).addScaledVector(t, lado * 1.05).setY(1.45).toArray(), rotY, seed: 77 + def.z + lado, fundo: 'vazado', ppu: 220, desenha: d.seta() });
    if (lado > 0) m.scale.x = -1; // a da direita aponta para a esquerda
    return { m, base: m.position.clone(), lado };
  });
  const dobradica = new THREE.Group();
  dobradica.position.copy(c).addScaledVector(t, -PORTA.w / 2);
  dobradica.rotation.y = rotY;
  cena.add(dobradica);
  const folhaPorta = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTA.w, PORTA.h),
    new THREE.MeshBasicMaterial({ map: texturaPortaSimples, transparent: true, alphaTest: 0.025, side: THREE.DoubleSide }),
  );
  folhaPorta.position.set(PORTA.w / 2, PORTA.h / 2, 0);
  dobradica.add(folhaPorta);
  const decoracaoPorta = folha(corredor, { w: PORTA.w, h: PORTA.h, pos: [PORTA.w / 2, PORTA.h / 2, 0.012], seed: 80 + def.z, ppu: 240, fundo: 'vazado', comCor: true, desenha: d.porta(PORTA.w, PORTA.h, def.chave, { semBase: true }) }, dobradica);

  const P = SALA.prof, W = SALA.larg;
  const mundoAberto = def.chave === 'contato'; // o contato não é sala: é um píer no mar
  if (!mundoAberto) {
    const centro = noFundo(P / 2, 0, 0);
    folha(reg, { w: W, h: P, pos: centro.clone().toArray(), rotX: -Math.PI / 2, rotY, seed: 90 + def.z, ppu: 110, desenha: d.piso(W, P) }, paiSala);
    if (def.chave === 'projetos') {
      folha(reg, { w: 36, h: 5.5, pos: noFundo(18, 0, 0.7).toArray(), rotY, seed: 92, fundo: 'vazado', ppu: 52, desenha: d.cidadePapel({ semente: 824 }) }, paiSala);
      folha(reg, { w: 28, h: 19, pos: noFundo(14.5, 0, -3.1).toArray(), rotX: -Math.PI / 2, rotY, seed: 93, fundo: 'vazado', ppu: 48, desenha: d.cidadeVistaDeCima() }, paiSala);
      const materialPredio = [new THREE.MeshBasicMaterial({ color: '#ece9e2' }), new THREE.MeshBasicMaterial({ color: '#e1ded7' })];
      const materialAresta = new THREE.LineBasicMaterial({ color: '#77736d' });
      const materialLuz = [new THREE.MeshBasicMaterial({ color: '#f4c95d' }), new THREE.MeshBasicMaterial({ color: '#ed8f5b' })];
      for (let linha = 0; linha < 6; linha++) {
        for (let coluna = -4; coluna <= 4; coluna++) {
          if ((linha * 5 + coluna * 3) % 11 === 0) continue;
          const largura = 1.15 + ((linha + coluna + 8) % 3) * 0.24;
          const profundidade = 1.25 + ((linha * 2 + coluna + 9) % 3) * 0.28;
          const altura = 0.65 + ((linha * 7 + coluna * 5 + 40) % 8) * 0.22;
          const grupoPredio = new THREE.Group();
          grupoPredio.position.copy(noFundo(7.2 + linha * 2.7, coluna * 2.25 + (linha % 2) * 0.45, -3.08 + altura / 2));
          grupoPredio.rotation.y = rotY;
          const geometria = new THREE.BoxGeometry(largura, altura, profundidade);
          grupoPredio.add(
            new THREE.Mesh(geometria, materialPredio[(linha + coluna + 8) % 2]),
            new THREE.LineSegments(new THREE.EdgesGeometry(geometria), materialAresta),
          );
          if ((linha + coluna + 8) % 3 !== 0) {
            const luz = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.12), materialLuz[(linha + coluna + 8) % 2]);
            luz.position.set(largura * 0.22, altura / 2 + 0.02, profundidade * 0.18);
            grupoPredio.add(luz);
          }
          paiSala.add(grupoPredio);
        }
      }
      folha(reg, { w: W, h: 1.15, pos: noFundo(P - 0.03, 0, 0.575).toArray(), rotY, seed: 93, fundo: 'vazado', ppu: 150, desenha: d.parapeitoVaranda(W) }, paiSala);
      for (const s of [-1, 1]) folha(reg, { w: P, h: 1.15, pos: noFundo(P / 2, s * W / 2, 0.575).toArray(), rotY: rotY - s * Math.PI / 2, seed: 94 + s, fundo: 'vazado', ppu: 140, desenha: d.parapeitoVaranda(P) }, paiSala);
    } else {
      folha(reg, { w: W, h: P, pos: centro.clone().setY(ALT).toArray(), rotX: Math.PI / 2, rotY, seed: 91 + def.z, ppu: 90, desenha: d.teto(W, P) }, paiSala);
      folha(reg, { w: W, h: ALT, pos: noFundo(P, 0, ALT / 2).toArray(), rotY, seed: 92 + def.z, desenha: d.parede(W, { cantoEsq: true, cantoDir: true }) }, paiSala);
      for (const s of [-1, 1]) folha(reg, { w: P, h: ALT, pos: noFundo(P / 2, s * W / 2, ALT / 2).toArray(), rotY: rotY - s * Math.PI / 2, seed: 93 + s + def.z, desenha: d.parede(P, { cantoEsq: true, cantoDir: true }) }, paiSala);
    }
    for (const s of [-1, 1]) {
      const w = (W - PORTA.w) / 2;
      folha(reg, { w, h: ALT, pos: noFundo(0.01, s * (PORTA.w + w) / 2, ALT / 2).toArray(), rotY, seed: 95 + s + def.z, desenha: d.parede(w) }, paiSala);
    }
  }

  const porta = {
    def, dobradica, folha: folhaPorta, decoracao: decoracaoPorta, placa, setas, rotY, n, c, t, reg, abertura: 0, alvo: 0, pintar: 0, pintarAlvo: 0, travada: null, interativos: [],
    // de dentro, para onde olhar: no píer o olhar vai longe, para o mar
    olhar: mundoAberto ? { dist: 14, y: 1.25 } : def.chave === 'projetos' ? { dist: 18, y: -1, entrada: 0.45, cameraY: 2.15 } : { dist: SALA.prof, y: 1.65 },
  };
  // pendura algo na parede do fundo (ou numa lateral, com naLateral = ±1)
  const pendura = (desenha, w, h, dist, lateral, y, { naLateral = 0, seed = 0, ppu = 220 } = {}) => {
    const pos = naLateral ? noFundo(dist, naLateral * (W / 2 - 0.02), y) : noFundo(P - 0.03, lateral, y);
    const r = naLateral ? rotY - naLateral * Math.PI / 2 : rotY;
    return folha(reg, { w, h, pos: pos.toArray(), rotY: r, seed: seed + def.z * 7, fundo: 'vazado', ppu, desenha }, paiSala);
  };
  const interativo = (mesh, alvo) => { mesh.userData.alvo = alvo; porta.interativos.push(mesh); return mesh; };
  conteudoDa(def.chave, { pendura, interativo, noFundo, rotY, reg, W, paiSala });

  folhaPorta.userData.alvo = {
    rotulo: () => (estado.modo === 'livre' ? (porta.alvo > 0.5 ? 'fechar a porta' : 'abrir a porta') : `entrar em ${def.nome}`),
    aoEntrar: () => { if (estado.modo === 'corredor') { porta.alvo = 0.3; som.papel(); } porta.pintarAlvo = 1; },
    aoSair: () => { if (estado.modo === 'corredor') porta.alvo = 0; porta.pintarAlvo = 0; },
    aoClicar: () => {
      if (estado.modo === 'corredor') entrar(porta);
      else if (estado.modo === 'livre') { porta.travada = porta.alvo > 0.5 ? 'fechada' : 'aberta'; som.rangido(); }
    },
  };
  portas.push(porta);
}

function conteudoDa(chave, { pendura, interativo, noFundo, rotY, reg, W, paiSala }) {
  if (chave === 'projetos') {
    // dois varais com quatro cartões cada; clicar vira o cartão
    const larguraVaral = W - 0.3;
    for (const lado of [-1, 1]) {
      folha(reg, {
        w: 0.24, h: 3.3,
        pos: noFundo(SALA.prof - 0.34, lado * larguraVaral / 2, 1.65).toArray(),
        rotY, seed: 98 + lado, fundo: 'vazado', ppu: 200, desenha: d.posteVaral(),
      }, paiSala);
    }
    [3.05, 1.0].forEach((yVaral, fila) => {
      const corda = pendura(d.varal(), larguraVaral, 0.5, 0, 0, yVaral, { seed: 100 + fila });
      corda.position.copy(noFundo(SALA.prof - 0.3, 0, yVaral));
      for (let col = 0; col < 4; col++) {
        const i = fila * 4 + col;
        const [titulo, linha, descricao, link] = PROJETOS[i];
        const lateral = (col - 1.5) * 1.05;
        // acompanha a "barriga" da corda desenhada
        const y = yVaral + 0.125 - 0.175 * Math.sin(Math.PI * (lateral + larguraVaral / 2) / larguraVaral);
        const cartao = new THREE.Group();
        cartao.position.copy(noFundo(SALA.prof - 0.33, lateral, y));
        cartao.rotation.y = rotY;
        paiSala.add(cartao);
        const frente = folha(reg, { w: 0.78, h: 0.86, pos: [0, -0.405, 0.004], seed: 110 + i, fundo: 'vazado', ppu: 190, desenha: d.cartaoFrente(titulo, linha, i + 1) }, cartao);
        const verso = folha(reg, { w: 0.78, h: 0.86, pos: [0, -0.405, -0.004], rotY: Math.PI, seed: 130 + i, fundo: 'vazado', ppu: 190, desenha: d.cartaoVerso(titulo, descricao, link) }, cartao);
        const estadoCartao = { virado: false, giro: 0, fase: i * 1.3 };
        const noLink = (hit) => estadoCartao.virado && link && hit?.object === verso && hit.uv.y < 0.3;
        const alvo = {
          rotulo: (hit) => (noLink(hit) ? `abrir ${link.replace('https://', '')} ↗` : estadoCartao.virado ? 'desvirar' : 'virar o cartão'),
          aoClicar: (hit) => {
            if (noLink(hit)) { window.open(link, '_blank', 'noopener'); return; }
            estadoCartao.virado = !estadoCartao.virado;
            som.papel();
          },
        };
        interativo(frente, alvo);
        interativo(verso, alvo);
        animacoesSala.push((tt, dt) => {
          const alvoGiro = estadoCartao.virado ? Math.PI : 0;
          estadoCartao.giro += (alvoGiro - estadoCartao.giro) * Math.min(1, dt * 6);
          cartao.rotation.set(0, rotY + estadoCartao.giro, Math.sin(tt * 1.1 + estadoCartao.fase) * 0.03, 'YXZ');
        });
      }
    });
  }
  if (chave === 'habilidades') {
    const notas = [
      ['Engenharia', ['Regras de negócio', 'APIs completas', 'Sistemas ERP', 'NF-e & SPED']],
      ['Front-end', ['HTML5 · Tailwind', 'JavaScript', 'React', 'Angular']],
      ['Full stack', ['Node.js · NestJS', 'PHP · Python', 'TypeScript', 'APIs REST']],
      ['Dados', ['PostgreSQL', 'MySQL', 'MongoDB', 'Integrações']],
    ];
    notas.forEach(([titulo, itens], i) => {
      const m = pendura(d.bilhete(titulo, itens), 1.0, 1.3, 0, (i - 1.5) * 1.15, 1.75, { seed: 20 + i });
      const baseY = m.position.y;
      let balanco = 0;
      interativo(m, {
        rotulo: () => titulo,
        aoEntrar: () => { m.material.uniforms.uRealce.value = 0.2; },
        aoSair: () => { m.material.uniforms.uRealce.value = 0; },
        aoClicar: () => { balanco = 1; som.papel(); },
      });
      animacoesSala.push((tt) => {
        balanco = Math.max(0, balanco - 0.015);
        m.rotation.z = Math.sin(tt * 9) * 0.12 * balanco;
        m.position.y = baseY + balanco * 0.04;
      });
    });
  }
  if (chave === 'trajetoria') {
    pendura(d.linhaDoTempo([
      ['2019', 'I-SINC', 'Full Stack · Agudos, SP', 'ERP, APIs REST, Angular e AWS'],
      ['2026', 'Next SI', 'Full Stack · Bauru, SP', 'React no front e PHP no back'],
      ['2026', 'Dialogi', 'Front-end · remoto', 'sites, experiências e minigames'],
      ['2026', 'SigmaCX', 'Front-end · remoto', 'interfaces e campanhas interativas'],
    ]), 4.6, 2.0, 0, 0, 1.75, { seed: 30, ppu: 220 });
  }
  if (chave === 'sobre') {
    fotoDaSala = pendura;
    pendura(d.texto('Murilo Gonzales Trigo', 'Desenvolvedor full stack há mais de 5 anos, em sistemas corporativos de verdade: ERP, APIs, bancos de dados e integrações. Fascinado pelo universo gamer, gosto de criar interações que vão além da funcionalidade.'),
      1.9, 1.5, 0, 0.95, 1.7, { seed: 40 });
  }
  if (chave === 'contato') montaPier({ interativo, noFundo, rotY, reg });
}

/* ---------- contato: um píer no mar ---------- */

const flutuantes = []; // coisas que boiam: { obj, base, fase, amp }
let mar = null;
const grupoContato = new THREE.Group();
grupoContato.visible = false;
cena.add(grupoContato);
const carregadorContato = new THREE.TextureLoader();
const [texFarol, texNuvem, texNuvemPequena, texBarco, texAgua, texBarril] = await Promise.all([
  carregadorContato.loadAsync('contact/lighthouse.png'),
  carregadorContato.loadAsync('contact/cloud.png'),
  carregadorContato.loadAsync('contact/cloud-small.png'),
  carregadorContato.loadAsync('contact/paper-boat.png'),
  carregadorContato.loadAsync('contact/water-v1.png'),
  carregadorContato.loadAsync('contact/barrel-sign.png'),
]);
for (const tex of [texFarol, texNuvem, texNuvemPequena, texBarco, texAgua, texBarril]) tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
texAgua.wrapS = texAgua.wrapT = THREE.MirroredRepeatWrapping;
texAgua.needsUpdate = true;

function spriteContato(texturaSprite, w, h, pos, rotY, opacidade = 1, pai = grupoContato) {
  const material = new THREE.MeshBasicMaterial({
    map: texturaSprite,
    transparent: true,
    alphaTest: 0.025,
    depthWrite: false,
    opacity: opacidade,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.position.copy(pos);
  mesh.rotation.y = rotY;
  pai.add(mesh);
  return mesh;
}

function montaPier({ interativo, noFundo, rotY, reg }) {
  folha(reg, { w: 2.05, h: 5.2, pos: noFundo(2.6, 0, 0.02).toArray(), rotX: -Math.PI / 2, rotY, seed: 640, ppu: 140, fundo: 'vazado', desenha: d.deck(2.05) }, grupoContato);

  // o mar: ondas desenhadas, repetidas e deslizando devagar
  mar = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShaderMaterial({
    uniforms: { ...reg, uMapa: { value: texAgua }, uTempo: tempo, uPapel: { value: papel } },
    vertexShader,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMapa;
      uniform vec3 uOrigem, uDir, uPapel;
      uniform float uPintura, uTempo;
      varying vec2 vUv;
      varying vec3 vMundo;
      varying float vProf;
      void main() {
        if (dot(vMundo - uOrigem, uDir) > mix(-2.0, 70.0, uPintura)) discard;
        vec2 uvA = vMundo.xz / 9.0 + vec2(uTempo * 0.009, uTempo * 0.014);
        vec2 uvB = vMundo.xz / 13.0 + vec2(-uTempo * 0.004, uTempo * 0.007);
        vec3 c = min(texture2D(uMapa, uvA).rgb, texture2D(uMapa, uvB).rgb);
        c = mix(c, uPapel, smoothstep(16.0, 58.0, vProf) * 0.78);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  }));
  mar.rotation.x = -Math.PI / 2;
  mar.position.copy(noFundo(60, 0, -0.35));
  grupoContato.add(mar);

  spriteContato(texFarol, 3.8, 3.7, noFundo(22, -8.5, 1.45), rotY, 0.78);
  for (let k = 0; k < 7; k++) {
    const w = 4 + (k % 3) * 1.4;
    const compacta = k % 2 === 1;
    const nuvem = spriteContato(compacta ? texNuvemPequena : texNuvem, w, w / (compacta ? 1.78 : 2.36), noFundo(15 + k * 2.2, (k % 2 ? 1 : -1) * (2 + ((k * 3.7) % 8)), 4.6 + (k % 3) * 1.1), rotY, 0.28 + (k % 3) * 0.16);
    nuvem.scale.y = 0.82 + (k % 3) * 0.12;
    flutuantes.push({ obj: nuvem, base: nuvem.position.clone(), fase: k * 1.7, amp: 0.025, deriva: 0.6 + k * 0.1, velocidade: 0.09 + k * 0.012 });
  }

  // barquinho de papel
  const barco = spriteContato(texBarco, 2.4, 1.2, noFundo(13, 0, 0.05), rotY, 0.82);
  flutuantes.push({ obj: barco, base: barco.position.clone(), fase: 2, amp: 0.1, gira: 0.08, deriva: 1.15, velocidade: 0.16 });

  // o formulário de papel aparece flutuando quando você escolhe "Mensagem"
  const defForm = { w: 2.0, h: 2.45, seed: 600, ppu: 280 };
  const papelForm = folha(reg, { ...defForm, pos: noFundo(4.9, 0, 1.75).toArray(), rotY, fundo: 'vazado', desenha: d.formulario(formulario) }, grupoContato);
  papelForm.visible = false;
  formulario.redesenha = () => redesenha(papelForm, { ...defForm, desenha: d.formulario(formulario) });
  const regiaoDo = (hit) => (!hit?.uv ? null : hit.uv.y > 0.67 ? 'nome' : hit.uv.y > 0.25 && hit.uv.y < 0.64 ? 'mensagem' : hit.uv.y < 0.21 && hit.uv.y > 0.06 ? 'enviar' : null);
  interativo(papelForm, {
    rotulo: (hit) => ({ nome: 'escrever seu nome', mensagem: 'escrever a mensagem', enviar: 'enviar pelo WhatsApp' }[regiaoDo(hit)] ?? ''),
    aoClicar: (hit) => {
      const r = regiaoDo(hit);
      if (r === 'nome') campos.nome.focus();
      else if (r === 'mensagem') campos.mensagem.focus();
      else if (r === 'enviar') enviarRecado();
    },
  });
  flutuantes.push({ obj: papelForm, base: papelForm.position.clone(), fase: 1, amp: 0.03 });

  // placas em barris, boiando na frente do píer
  [['GitHub', LINKS.github, 7.6, -2.05], ['LinkedIn', LINKS.linkedin, 8.4, -0.7], ['WhatsApp', LINKS.whatsapp, 8.2, 0.7], ['Mensagem', null, 7.4, 2.05]].forEach(([nome, url, dist, lateral], k) => {
    const grupo = new THREE.Group();
    grupo.position.copy(noFundo(dist, lateral, 0.46));
    grupo.rotation.y = rotY;
    grupoContato.add(grupo);
    const corpo = spriteContato(texBarril, 1.25, 1.14, new THREE.Vector3(), 0, 0.9, grupo);
    const textoPlaca = folha(reg, { w: 0.94, h: 0.2, pos: [0, 0.22, 0.012], seed: 700 + k, fundo: 'vazado', ppu: 300, desenha: d.rotuloPlaca(nome) }, grupo);
    flutuantes.push({ obj: grupo, base: grupo.position.clone(), fase: k * 1.7, amp: 0.05, gira: 0.04 });
    interativo(corpo, {
      rotulo: () => (url ? `abrir ${nome}` : papelForm.visible ? 'guardar o recado' : 'deixar um recado'),
      aoEntrar: () => { corpo.material.color.set('#e4c08f'); textoPlaca.material.uniforms.uRealce.value = 0.15; som.papel(); },
      aoSair: () => { corpo.material.color.set('#ffffff'); textoPlaca.material.uniforms.uRealce.value = 0; },
      aoClicar: () => {
        som.clique();
        if (url) window.open(url, '_blank', 'noopener');
        else { papelForm.visible = !papelForm.visible; if (papelForm.visible) som.rabisco(0.5); }
      },
    });
  });
}

SALAS.forEach(montaSala);

async function montaRetrato() {
  if (!fotoDaSala) return;
  try {
    const img = new Image();
    img.src = 'eu.jpeg';
    await img.decode();
    fotoDaSala(d.gravura(img, { x: 240, y: 70, w: 660, h: 880 }), 1.2, 1.55, 0, -1.1, 1.72, { seed: 41, ppu: 260 });
  } catch {
    // sem a foto, a sala fica só com o texto
  }
}

/* ---------- formulário de contato (campos escondidos recebem o teclado) ---------- */

const campos = { nome: document.getElementById('campoNome'), mensagem: document.getElementById('campoMensagem') };
for (const [nome, el] of Object.entries(campos)) {
  el.addEventListener('focus', () => { formulario.campo = nome; formulario.aviso = ''; formulario.redesenha?.(); });
  el.addEventListener('blur', () => { if (formulario.campo === nome) formulario.campo = null; formulario.redesenha?.(); });
  el.addEventListener('input', () => {
    formulario[nome] = el.value.slice(0, nome === 'nome' ? 32 : 220);
    if (Math.random() < 0.5) som.rabisco(0.12);
    formulario.redesenha?.();
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && nome === 'nome') { e.preventDefault(); campos.mensagem.focus(); } });
}
setInterval(() => {
  if (!formulario.campo) return;
  formulario.cursor = !formulario.cursor;
  formulario.redesenha?.();
}, 530);

function enviarRecado() {
  const nome = formulario.nome.trim(), msg = formulario.mensagem.trim();
  if (nome.length < 2) formulario.aviso = 'faltou o seu nome';
  else if (msg.length < 5) formulario.aviso = 'escreva uma mensagem um pouco maior';
  else {
    const texto = `Oi, Murilo! Aqui é ${nome}. ${msg}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
    formulario.aviso = 'mensagem pronta no WhatsApp ✓';
    som.clique();
  }
  formulario.redesenha?.();
}

/* ---------- vida no corredor ---------- */

const vida = criaVida({ cena, folha, corredor, som, ALT });

/* ---------- fachada: a casa por fora ---------- */

const fachada = regiao([0, 0, 9], [0, 0, -1], 10);
const portasDaCasa = [];
const alvosFachada = [];
{
  const P = { w: 1.8, h: 2.5 }, largura = 16, alto = 6;
  const spritesEntrada = [];
  const spriteEntrada = (texturaSprite, w, h, pos, pai = cena) => {
    const material = new THREE.MeshBasicMaterial({ map: texturaSprite, transparent: true, alphaTest: 0.025, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(...pos);
    pai.add(mesh);
    spritesEntrada.push(mesh);
    return mesh;
  };
  const lado = (largura - P.w) / 2;
  for (const sx of [-1, 1]) folha(fachada, { w: lado, h: alto, pos: [sx * (P.w + lado) / 2, alto / 2, 0.02], seed: 800 + sx, ppu: 80, desenha: d.tijolos(lado) });
  folha(fachada, { w: P.w, h: alto - P.h, pos: [0, P.h + (alto - P.h) / 2, 0.02], seed: 803, ppu: 80, desenha: d.tijolos(P.w) });
  folha(fachada, { w: 16, h: 9, pos: [0, 0, 4.5], rotX: -Math.PI / 2, seed: 804, ppu: 50, desenha: d.chaoTerra() });
  folha(fachada, { w: 1.9, h: 7, pos: [0, 0.01, 3.6], rotX: -Math.PI / 2, seed: 805, ppu: 110, fundo: 'vazado', desenha: d.caminhoPedras() });
  folha(fachada, { w: P.w + 0.18, h: P.h + 0.09, pos: [0, (P.h + 0.09) / 2, 0.04], seed: 806, fundo: 'vazado', ppu: 200, desenha: d.batente(P.w + 0.18) });
  folha(fachada, { w: 5.2, h: 1.25, pos: [0, 4.45, 0.055], seed: 797, fundo: 'vazado', ppu: 180, desenha: d.logo('MURILO', 'DEV FULL STACK  ·  ENTRE E EXPLORE') });
  const cordaoEntrada = folha(fachada, { w: 12.5, h: 1.0, pos: [0, 5.25, 0.07], seed: 798, fundo: 'vazado', ppu: 115, desenha: d.cordaoLuzes() });
  folha(fachada, { w: 2.75, h: 0.72, pos: [0, 2.74, 0.1], seed: 799, fundo: 'vazado', ppu: 220, desenha: d.marquiseEntrada() });
  const arandelasEntrada = [-1, 1].map((ladoLuz) => folha(fachada, { w: 0.55, h: 0.85, pos: [ladoLuz * 1.38, 1.92, 0.1], seed: 820 + ladoLuz, fundo: 'vazado', ppu: 220, desenha: d.arandelaEntrada() }));
  folha(fachada, { w: 1.55, h: 0.72, pos: [0, 0.018, 1.05], rotX: -Math.PI / 2, seed: 821, fundo: 'vazado', ppu: 220, desenha: d.capachoEntrada() });
  const placa = folha(fachada, { w: 2.35, h: 0.58, pos: [0, P.h + 0.78, 0.08], seed: 807, fundo: 'vazado', ppu: 220, comCor: true, desenha: d.placaMadeira('Portfólio vivo') });
  placa.rotation.z = -0.03;
  // A árvore fica fisicamente à frente da parede e recebe uma marca de
  // contato no piso. O recorte possui margem transparente inferior, por isso
  // o plano desce um pouco abaixo de y=0 para o tronco realmente tocar o chão.
  folha(fachada, { w: 2.7, h: 0.95, pos: [-3.8, 0.018, 0.95], rotX: -Math.PI / 2, seed: 822, fundo: 'vazado', ppu: 220, desenha: d.sombraChao() });
  spriteEntrada(texturaArvoreEntrada, 4.3, 4.3, [-3.8, 1.7, 0.82]);
  const janelaEntrada = folha(fachada, { w: 1.55, h: 1.42, pos: [3.05, 1.85, 0.05], seed: 809, fundo: 'vazado', ppu: 170, comCor: true, desenha: d.janelaCasa() });
  janelaEntrada.material.uniforms.uPintar.value = 0.35;
  const floreiraEntrada = folha(fachada, { w: 2.35, h: 0.86, pos: [3.08, 0.43, 0.3], seed: 810, fundo: 'vazado', ppu: 170, comCor: true, desenha: d.floreira() });
  floreiraEntrada.material.uniforms.uPintar.value = 0.52;
  animacoesSala.push((tt) => {
    cordaoEntrada.material.uniforms.uRealce.value = 0.035 + Math.sin(tt * 2.2) * 0.025;
    arandelasEntrada.forEach((luz, i) => luz.scale.setScalar(1 + Math.sin(tt * 2.8 + i * 1.7) * 0.018));
  });
  // mouse de computador pendurado no galho, balançando
  const pivoMouse = new THREE.Group();
  pivoMouse.position.set(-2.48, 2.92, 0.72);
  cena.add(pivoMouse);
  spriteEntrada(texturaMouseEntrada, 0.72, 1.18, [0, -0.59, 0], pivoMouse);
  animacoesSala.push((tt) => { pivoMouse.rotation.z = Math.sin(tt * 1.2) * 0.045; });
  folha(fachada, { w: 0.86, h: 0.38, pos: [-1.5, 0.02, 0.82], rotX: -Math.PI / 2, seed: 823, fundo: 'vazado', ppu: 240, desenha: d.sombraChao() });
  const gatinho = spriteEntrada(texturaGatoEntrada, 0.72, 1.08, [-1.5, 0.47, 0.76]);
  gatinho.userData.alvo = { rotulo: () => 'fazer carinho', aoClicar: () => som.miau(), aoEntrar: () => { gatinho.material.color.set('#f1dfba'); }, aoSair: () => { gatinho.material.color.set('#ffffff'); } };
  alvosFachada.push(gatinho);
  // porta dupla, abrindo para dentro
  for (const sx of [-1, 1]) {
    const dobradica = new THREE.Group();
    dobradica.position.set(sx * P.w / 2, 0, 0.03);
    cena.add(dobradica);
    const texturaMetade = texturaPortaMadeira.clone();
    texturaMetade.repeat.set(0.5, 1);
    texturaMetade.offset.x = sx < 0 ? 0 : 0.5;
    texturaMetade.needsUpdate = true;
    const f = new THREE.Mesh(
      new THREE.PlaneGeometry(P.w / 2, P.h),
      new THREE.MeshBasicMaterial({ map: texturaMetade, transparent: true, alphaTest: 0.025, side: THREE.DoubleSide }),
    );
    f.position.set(-sx * P.w / 4, P.h / 2, 0);
    dobradica.add(f);
    const adesivos = folha(fachada, { w: P.w / 2, h: P.h, pos: [-sx * P.w / 4, P.h / 2, 0.012], seed: 815 + sx, ppu: 240, fundo: 'vazado', comCor: true, desenha: d.adesivosPortaDupla(sx) }, dobradica);
    const folhaCasa = { dobradica, f, adesivos, sx, abertura: 0, alvo: 0, pintar: 0 };
    portasDaCasa.push(folhaCasa);
    f.userData.alvo = {
      rotulo: () => 'entrar',
      aoEntrar: () => { for (const q of portasDaCasa) { q.alvo = 0.12; q.pintar = 1; } placa.material.uniforms.uPintar.value = 1; som.papel(); },
      aoSair: () => { for (const q of portasDaCasa) { q.alvo = 0; q.pintar = 0; } placa.material.uniforms.uPintar.value = 0; },
      aoClicar: () => entrarNaCasa(),
    };
    alvosFachada.push(f);
  }
  animacoesSala.push((tt, dt) => {
    for (const sprite of spritesEntrada) sprite.material.opacity = fachada.uPintura.value;
    for (const q of portasDaCasa) {
      q.abertura += (q.alvo - q.abertura) * Math.min(1, dt * 3);
      q.dobradica.rotation.y = -q.sx * q.abertura;
      q.f.material.color.lerp(q.pintar ? corPortaHover : corPortaNormal, Math.min(1, dt * 5));
      q.adesivos.material.uniforms.uPintar.value += (q.pintar - q.adesivos.material.uniforms.uPintar.value) * Math.min(1, dt * 5);
    }
  });
}

/* ---------- câmera: passeio, salas e andar livre ---------- */

const ui = {
  dica: document.getElementById('dica'),
  voltar: document.getElementById('voltar'),
  rotulo: document.getElementById('rotulo'),
  sala: document.getElementById('sala'),
  modo: document.getElementById('modo'),
  dicasLivre: document.getElementById('dicasLivre'),
  joystick: document.getElementById('joystick'),
  pino: document.getElementById('pino'),
  setas: document.getElementById('setas'),
  tituloNome: document.getElementById('tituloNome'),
  tituloSub: document.getElementById('tituloSub'),
};

const estado = { modo: 'fachada', alvo: 0, t: 0, mx: 0, my: 0, alvoMx: 0, alvoMy: 0, sala: null, anim: null, intro: 0, yaw: 0, pitch: 0, passos: 0 };
const Z_INI = -0.2, Z_FIM = FIM + 3.2;

function lerRolagem() {
  const max = document.documentElement.scrollHeight - innerHeight;
  estado.alvo = max > 0 ? scrollY / max : 0;
  ui.setas.hidden = estado.modo !== 'corredor' || estado.alvo > 0.02;
}

/* ---------- título (HUD): muda conforme você explora ---------- */

const visitadas = new Set();
let tituloAtual = '';
function atualizaTitulo() {
  const n = visitadas.size;
  const [nome, sub] = estado.modo === 'fachada'
    ? ['EXPLORADOR', toque ? 'toque na porta para entrar' : 'clique na porta para entrar']
    : n === 0 ? ['ANDARILHO', 'role para explorar o corredor']
      : n < SALAS.length ? ['CURIOSO', `${n} de ${SALAS.length} portas abertas`]
        : ['VETERANO', 'você abriu todas as portas!'];
  ui.tituloNome.textContent = nome;
  ui.tituloSub.textContent = sub;
  if (nome !== tituloAtual) {
    if (tituloAtual) { ui.dica.classList.remove('muda'); void ui.dica.offsetWidth; ui.dica.classList.add('muda'); som.papel(); }
    tituloAtual = nome;
  }
}
function visitou(nome) {
  if (!nome || visitadas.has(nome)) return;
  visitadas.add(nome);
  atualizaTitulo();
}

function poseFachada(pos, olhar) {
  pos.set(estado.mx * 0.35, 1.6, 7.2);
  olhar.set(estado.mx * 1.4, 1.75 - estado.my * 0.5, 0);
}

function entrarNaCasa() {
  if (estado.modo !== 'fachada') return;
  estado.modo = 'entrando';
  ui.rotulo.hidden = true;
  som.clique();
  setTimeout(() => som.rangido(), 150);
  for (const q of portasDaCasa) q.alvo = 1.55;
  const soleira = pose();
  soleira.pos.set(0, 1.6, 1.2); soleira.olhar.set(0, 1.7, -4);
  anima(cam, soleira, 1.5, () => {
    const dentro = pose();
    poseCorredor(0, dentro.pos, dentro.olhar);
    anima(cam, dentro, 1.1, () => {
      estado.modo = 'corredor';
      document.documentElement.classList.remove('na-fachada');
      scrollTo(0, 0);
      estado.alvo = estado.t = 0;
      lerRolagem();
      atualizaTitulo();
    });
  });
}
addEventListener('scroll', lerRolagem, { passive: true });

function poseCorredor(t, pos, olhar) {
  const z = THREE.MathUtils.lerp(Z_INI, Z_FIM, t);
  const passo = menosMovimento ? 0 : Math.sin(z * 2.2) * 0.025;
  pos.set(estado.mx * 0.25, 1.6 + passo, z);
  olhar.set(estado.mx * 2.2, 1.5 - estado.my * 0.7, z - 6);
}
function poseSala(p, pos, olhar) {
  pos.copy(p.c).addScaledVector(p.n, -(p.olhar.entrada ?? 1.2)).setY(p.olhar.cameraY ?? 1.6);
  olhar.copy(p.c).addScaledVector(p.n, -p.olhar.dist).addScaledVector(p.t, -estado.mx * 1.6 * (p.olhar.dist / SALA.prof)).setY(p.olhar.y - estado.my * 0.6);
}
function poseNaPorta(p, pos, olhar) {
  pos.copy(p.c).addScaledVector(p.n, 1.5).setY(1.6);
  olhar.copy(p.c).setY(1.45);
}

function anima(de, para, duracao, aoFim) {
  estado.anim = { de: { pos: de.pos.clone(), olhar: de.olhar.clone() }, para, t: 0, duracao, aoFim };
}
const suave = (x) => x * x * (3 - 2 * x);
const cam = { pos: new THREE.Vector3(), olhar: new THREE.Vector3() };
const pose = () => ({ pos: new THREE.Vector3(), olhar: new THREE.Vector3() });

function entrar(p) {
  if (estado.modo !== 'corredor') return;
  estado.modo = 'indo';
  estado.sala = p;
  estado.alvoMx = estado.mx = 0;
  estado.alvoMy = estado.my = 0;
  document.documentElement.classList.add('na-sala');
  ui.rotulo.hidden = true;
  const naPorta = pose();
  poseNaPorta(p, naPorta.pos, naPorta.olhar);
  som.clique();
  anima(cam, naPorta, 0.9, () => {
    p.alvo = 1;
    som.rangido();
    setTimeout(() => som.rabisco(0.8), 500);
    const dentro = pose();
    poseSala(p, dentro.pos, dentro.olhar);
    anima(cam, dentro, 1.4, () => {
      estado.modo = 'sala';
      ui.sala.textContent = p.def.nome;
      ui.voltar.hidden = false;
      visitou(p.def.nome);
    });
  });
}

function sair() {
  if (estado.modo !== 'sala') return;
  const p = estado.sala;
  estado.modo = 'voltando';
  ui.voltar.hidden = true;
  ui.sala.textContent = '';
  document.activeElement?.blur?.();
  const naPorta = pose();
  poseNaPorta(p, naPorta.pos, naPorta.olhar);
  som.papel();
  anima(cam, naPorta, 1.2, () => {
    p.alvo = 0;
    setTimeout(() => som.clique(), 350);
    const volta = pose();
    poseCorredor(estado.t, volta.pos, volta.olhar);
    anima(cam, volta, 0.9, () => {
      estado.modo = 'corredor';
      estado.sala = null;
      document.documentElement.classList.remove('na-sala');
    });
  });
}
ui.voltar.addEventListener('click', sair);
const botaoSom = document.getElementById('som');
botaoSom.addEventListener('click', () => {
  const ligado = som.alternaSom();
  botaoSom.textContent = ligado ? 'som: ligado' : 'som: desligado';
  botaoSom.setAttribute('aria-pressed', String(ligado));
});

/* ---------- andar livre (WASD / joystick) ---------- */

const teclas = new Set();
const joy = { x: 0, y: 0 };

function entrarLivre() {
  if (estado.modo === 'livre') return;
  if (estado.modo !== 'corredor' && estado.modo !== 'sala') return;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  estado.yaw = Math.atan2(-dir.x, -dir.z);
  estado.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -0.99, 0.99));
  if (estado.sala) estado.sala.alvo = 1;
  estado.modo = 'livre';
  estado.sala = null;
  document.documentElement.classList.add('livre');
  document.documentElement.classList.remove('na-sala');
  ui.voltar.hidden = true;
  ui.rotulo.hidden = true;
  ui.modo.textContent = toque ? 'voltar ao passeio' : '[G] voltar ao passeio';
  ui.dicasLivre.hidden = toque;
  ui.joystick.hidden = !toque;
  if (!toque) renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
}

function voltarPasseio() {
  if (estado.modo !== 'livre') return;
  document.exitPointerLock?.();
  estado.modo = 'voltando';
  for (const p of portas) { p.alvo = 0; p.travada = null; }
  const volta = pose();
  poseCorredor(estado.t, volta.pos, volta.olhar);
  anima(cam, volta, 1.3, () => { estado.modo = 'corredor'; });
  document.documentElement.classList.remove('livre');
  ui.modo.textContent = toque ? 'andar livre' : '[WASD] andar livre';
  ui.dicasLivre.hidden = true;
  ui.joystick.hidden = true;
  ui.rotulo.hidden = true;
  ui.sala.textContent = '';
}

const MOVIMENTO = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea')) {
    // escrevendo no formulário: só o Esc sai (solta o campo e sai da sala)
    if (e.key === 'Escape') { e.target.blur(); sair(); }
    return;
  }
  const k = e.key.toLowerCase();
  if (MOVIMENTO.has(k)) {
    if (k.length === 1) entrarLivre();
    if (estado.modo === 'livre') { teclas.add(k); e.preventDefault(); }
  }
  if (k === 'shift') teclas.add(k);
  if (k === 'g') voltarPasseio();
  if (k === 'escape') sair();
});
addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
addEventListener('blur', () => teclas.clear());
ui.modo.addEventListener('click', () => (estado.modo === 'livre' ? voltarPasseio() : entrarLivre()));

// joystick: arrastar a partir do círculo
let dedoJoy = null;
ui.joystick.addEventListener('pointerdown', (e) => { dedoJoy = e.pointerId; ui.joystick.setPointerCapture(e.pointerId); moveJoy(e); });
ui.joystick.addEventListener('pointermove', (e) => { if (e.pointerId === dedoJoy) moveJoy(e); });
const soltaJoy = () => { dedoJoy = null; joy.x = joy.y = 0; ui.pino.style.transform = ''; };
ui.joystick.addEventListener('pointerup', soltaJoy);
ui.joystick.addEventListener('pointercancel', soltaJoy);
function moveJoy(e) {
  const r = ui.joystick.getBoundingClientRect();
  let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  joy.x = x; joy.y = y;
  ui.pino.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
}

// colisão: pontos válidos ficam dentro de alguma "área" e fora dos obstáculos
const areas = [{ x0: -1.9, x1: 1.9, z0: FIM + 0.35, z1: 3.5 }];
for (const s of SALAS) {
  if (s.lado) {
    const a = s.lado > 0 ? [1.5, 2.9] : [-2.9, -1.5], b = s.lado > 0 ? [2.55, 7.05] : [-7.05, -2.55];
    areas.push({ x0: a[0], x1: a[1], z0: s.z - 0.35, z1: s.z + 0.35 });
    areas.push({ x0: b[0], x1: b[1], z0: s.z - 2.15, z1: s.z + 2.15 });
  } else {
    areas.push({ x0: -0.35, x1: 0.35, z0: FIM - 0.8, z1: FIM + 0.8 });
    areas.push({ x0: -1.05, x1: 1.05, z0: FIM - 5.7, z1: FIM - 0.35 }); // o deck do píer
  }
}
const obstaculos = [[1.8, -8.6, 0.35], [-1.8, -21.6, 0.35], [1.75, -39.8, 0.35], [1.75, -23.2, 0.85], [-1.05, -3.9, 0.35], [-1.7, -12.6, 0.6]];
function podePisar(x, z) {
  if (!areas.some((a) => x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1)) return false;
  return !obstaculos.some(([ox, oz, r]) => (x - ox) ** 2 + (z - oz) ** 2 < r * r);
}

function lugarDa(pos) {
  if (pos.z < FIM - 0.2) return 'Contato';
  if (Math.abs(pos.x) > meia + 0.2) {
    const s = SALAS.filter((q) => q.lado === Math.sign(pos.x)).sort((a, b) => Math.abs(a.z - pos.z) - Math.abs(b.z - pos.z))[0];
    return s?.nome ?? '';
  }
  return '';
}

const olharLivre = new THREE.Vector3();
function andar(dt) {
  let f = -joy.y, l = 0;
  if (teclas.has('w') || teclas.has('arrowup')) f += 1;
  if (teclas.has('s') || teclas.has('arrowdown')) f -= 1;
  if (teclas.has('d') || teclas.has('arrowright')) l += 1;
  if (teclas.has('a') || teclas.has('arrowleft')) l -= 1;
  estado.yaw -= joy.x * 1.9 * dt;
  f = THREE.MathUtils.clamp(f, -1, 1);
  const v = (teclas.has('shift') ? 4.2 : 2.3) * dt;
  const sy = Math.sin(estado.yaw), cy = Math.cos(estado.yaw);
  const dx = (-sy * f + cy * l) * v, dz = (-cy * f - sy * l) * v;
  const p = cam.pos;
  if (podePisar(p.x + dx, p.z)) p.x += dx;
  if (podePisar(p.x, p.z + dz)) p.z += dz;
  estado.passos += Math.hypot(dx, dz);
  p.y = 1.6 + (menosMovimento ? 0 : Math.abs(Math.sin(estado.passos * 2.6)) * 0.035);
  olharLivre.set(-sy * Math.cos(estado.pitch), Math.sin(estado.pitch), -cy * Math.cos(estado.pitch));
  cam.olhar.copy(p).add(olharLivre);
  ui.sala.textContent = lugarDa(p);
  visitou(ui.sala.textContent);
  // portas abrem sozinhas quando você chega perto (a não ser que você as tenha fechado)
  for (const q of portas) {
    const perto = Math.hypot(p.x - q.c.x, p.z - q.c.z) < 2.1;
    q.alvo = q.travada === 'fechada' ? 0 : q.travada === 'aberta' || perto ? 1 : 0;
    if (!perto && q.travada === 'fechada') q.travada = null;
  }
}

/* ---------- mouse / toque: olhar, apontar e clicar ---------- */

const raio = new THREE.Raycaster();
const ponteiro = new THREE.Vector2();
let emFoco = null, hitFoco = null, arrasto = null;
const alvosCorredor = [...portas.map((p) => p.folha), ...vida.alvos];

function listaAtual() {
  if (estado.modo === 'fachada') return alvosFachada;
  if (estado.modo === 'corredor') return alvosCorredor;
  if (estado.modo === 'sala') return estado.sala.interativos;
  if (estado.modo === 'livre') return [...alvosCorredor, ...portas.flatMap((p) => p.interativos)];
  return [];
}

function apontar(x, y, e) {
  ponteiro.set(x, y);
  raio.setFromCamera(ponteiro, camera);
  raio.far = estado.modo === 'livre' ? 4 : 30;
  // ignora o que está escondido (ex.: o formulário do píer antes de abrir)
  const visivel = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  const hit = raio.intersectObjects(listaAtual(), false).find((h) => visivel(h.object)) ?? null;
  const alvo = hit?.object.userData.alvo ?? null;
  if (alvo !== emFoco) {
    emFoco?.aoSair?.();
    alvo?.aoEntrar?.();
    emFoco = alvo;
  }
  hitFoco = hit;
  const texto = alvo?.rotulo?.(hit) ?? '';
  document.body.style.cursor = estado.modo !== 'livre' && texto ? 'pointer' : '';
  ui.rotulo.hidden = !texto;
  if (texto) {
    ui.rotulo.textContent = texto;
    const px = e ? e.clientX + 16 : innerWidth / 2 + 18, py = e ? e.clientY + 12 : innerHeight / 2 + 14;
    ui.rotulo.style.transform = `translate(${px}px, ${py}px)`;
  }
}

let ultimoPonteiro = null; // para reapontar a cada quadro enquanto a câmera anda
addEventListener('pointermove', (e) => {
  if (e.target.closest?.('#joystick')) return;
  ultimoPonteiro = { clientX: e.clientX, clientY: e.clientY };
  if (estado.modo === 'livre') {
    const travado = document.pointerLockElement === renderer.domElement;
    if (travado) { estado.yaw -= e.movementX * 0.0022; estado.pitch -= e.movementY * 0.0022; }
    else if (arrasto) {
      estado.yaw -= (e.clientX - arrasto.x) * 0.005;
      estado.pitch -= (e.clientY - arrasto.y) * 0.005;
      arrasto.x = e.clientX; arrasto.y = e.clientY;
    }
    estado.pitch = THREE.MathUtils.clamp(estado.pitch, -1.1, 1.1);
    return;
  }
  estado.alvoMx = (e.clientX / innerWidth) * 2 - 1;
  estado.alvoMy = (e.clientY / innerHeight) * 2 - 1;
  if (estado.modo === 'corredor' || estado.modo === 'sala' || estado.modo === 'fachada') apontar(estado.alvoMx, -estado.alvoMy, e);
});
addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('button, #joystick, input, textarea')) return;
  if (estado.modo !== 'livre') return;
  if (document.pointerLockElement === renderer.domElement) { emFoco?.aoClicar?.(hitFoco); return; }
  arrasto = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
});
addEventListener('pointerup', (e) => {
  if (estado.modo !== 'livre' || !arrasto) return;
  const tocou = Math.hypot(e.clientX - arrasto.x0, e.clientY - arrasto.y0) < 8;
  arrasto = null;
  if (!tocou) return;
  // toque rápido = clicar no que está sob o dedo; no desktop, também prende o mouse
  apontar((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, e);
  emFoco?.aoClicar?.(hitFoco);
  if (!toque) renderer.domElement.requestPointerLock?.()?.catch?.(() => {});
});
addEventListener('click', (e) => {
  if (e.target.closest?.('button, #joystick, input, textarea') || estado.modo === 'livre') return;
  if (toque) apontar((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, e);
  emFoco?.aoClicar?.(hitFoco);
});

/* ---------- loop ---------- */

const relogio = new THREE.Clock();
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const tmp = new THREE.Vector3();
let ultimoZ = 0, ultimoX = 0, distPassos = 0, ultimaPintura = 0;

function quadro() {
  const dt = Math.min(relogio.getDelta(), 0.05);
  tempo.value += dt;
  estado.t += (estado.alvo - estado.t) * Math.min(1, dt * 3);
  estado.mx += (estado.alvoMx - estado.mx) * Math.min(1, dt * 3);
  estado.my += (estado.alvoMy - estado.my) * Math.min(1, dt * 3);

  if (estado.anim) {
    const a = estado.anim;
    a.t = Math.min(1, a.t + dt / a.duracao);
    const k = suave(a.t);
    cam.pos.lerpVectors(a.de.pos, a.para.pos, k);
    cam.olhar.lerpVectors(a.de.olhar, a.para.olhar, k);
    if (a.t >= 1) { estado.anim = null; a.aoFim?.(); }
  } else if (estado.modo === 'fachada') {
    poseFachada(cam.pos, cam.olhar);
  } else if (estado.modo === 'corredor') {
    poseCorredor(estado.t, cam.pos, cam.olhar);
  } else if (estado.modo === 'sala') {
    poseSala(estado.sala, cam.pos, cam.olhar);
  } else if (estado.modo === 'livre') {
    andar(dt);
    apontar(0, 0);
  }
  // a câmera anda com a rolagem mesmo com o mouse parado: o hover precisa acompanhar
  if (ultimoPonteiro && !toque && (estado.modo === 'corredor' || estado.modo === 'sala' || estado.modo === 'fachada')) {
    apontar((ultimoPonteiro.clientX / innerWidth) * 2 - 1, -(ultimoPonteiro.clientY / innerHeight) * 2 + 1, ultimoPonteiro);
  }
  camera.position.copy(cam.pos);
  camera.lookAt(cam.olhar);
  grupoContato.visible = estado.sala?.def.chave === 'contato' || (estado.modo === 'livre' && camera.position.z < FIM - 0.2);
  grupoProjetos.visible = estado.sala?.def.chave === 'projetos' || Math.abs(camera.position.z - SALAS[0].z) < 6;

  // passos e rabiscos acompanham o movimento
  distPassos += Math.abs(camera.position.z - ultimoZ) + Math.abs(camera.position.x - ultimoX);
  ultimoZ = camera.position.z; ultimoX = camera.position.x;
  if (distPassos > 0.8) { distPassos = 0; som.passo(); }
  if (corredor.uPintura.value - ultimaPintura > 0.035) { ultimaPintura = corredor.uPintura.value; som.rabisco(); }

  // o corredor se desenha uns 14 m à frente de quem anda; salas quando você chega na porta
  fachada.uPintura.value = estado.intro;
  const andado = Math.max(Z_INI - camera.position.z, 0);
  corredor.uPintura.value = Math.max(corredor.uPintura.value, limita((andado + 16) / (corredor.uComprimento.value + 6)) * estado.intro);
  for (const p of portas) {
    const dist = camera.position.distanceTo(tmp.copy(p.c).setY(1.6));
    p.reg.uPintura.value = Math.max(p.reg.uPintura.value, limita(1 - (dist - 1.2) / 5) * estado.intro);
    p.abertura += (p.alvo - p.abertura) * Math.min(1, dt * 4);
    p.dobradica.rotation.y = p.rotY + suave(limita(p.abertura)) * 1.75;
    // hover: porta e placa ganham cor; as setas "cutucam" a porta
    p.pintar += (p.pintarAlvo - p.pintar) * Math.min(1, dt * 5);
    p.folha.material.color.lerp(p.pintar ? corPortaHover : corPortaNormal, Math.min(1, dt * 5));
    p.decoracao.material.uniforms.uPintar.value = p.pintar;
    p.placa.material.uniforms.uPintar.value = p.pintar;
    const cutuca = (0.5 + 0.5 * Math.sin(tempo.value * 3.2)) * 0.06 + p.pintar * 0.05;
    for (const { m, base, lado } of p.setas) m.position.copy(base).addScaledVector(p.t, -lado * cutuca);
  }
  for (const f of flutuantes) {
    const tt = tempo.value + f.fase;
    f.obj.position.copy(f.base);
    f.obj.position.y += Math.sin(tt * 1.3) * f.amp;
    if (f.deriva) f.obj.position.x += Math.sin(tt * (f.velocidade ?? 0.05)) * f.deriva * 3;
    if (f.gira) f.obj.rotation.z = Math.sin(tt * 1.1) * f.gira;
  }

  vida.anima(tempo.value, dt, camera);
  for (const f of animacoesSala) f(tempo.value, dt);
  renderer.render(cena, camera);
  requestAnimationFrame(quadro);
}

/* ---------- início ---------- */

await montaRetrato();
if (toque) ui.modo.textContent = 'andar livre';
document.documentElement.classList.add('na-fachada');
scrollTo(0, 0);
lerRolagem();
atualizaTitulo();
poseFachada(cam.pos, cam.olhar);
document.getElementById('carregando').classList.add('pronto');
const inicio = performance.now();
(function intro() {
  estado.intro = menosMovimento ? 1 : Math.min(1, (performance.now() - inicio) / 1800);
  if (estado.intro < 1) requestAnimationFrame(intro);
})();
quadro();
