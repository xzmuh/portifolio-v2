import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/* Objetos de papel em 3D, mas desenhados como o resto do corredor: a superfície
   é papel com um leve tom da cor, a sombra vira hachura a lápis (cruzada onde é
   mais escuro, com falhas e tremendo junto com o traço das paredes) e o contorno
   é a nanquim, com um segundo risco fino desencontrado, como esboço.
   Cada função devolve um THREE.Group com a base no chão (y = 0) e a frente
   apontando para +z. */

const vinco = new THREE.LineBasicMaterial({ color: '#2c2c2c' });
const KRAFT = '#ecdcc4', KRAFT_ESCURO = '#dcc6a6', KRAFT_MEIO = '#e4d1b5', BARRO = '#d39b7a', FOLHA = '#a9b98c', FOLHA_CLARA = '#bfcb9f';

// o main.js atualiza: o relógio (para o traço "ferver" junto) e a resolução (contornos)
export const tempoDesenho = { value: 0 };
// o contorno é desenhado à mão: cada risco passa um pouco da quina, sai levemente
// torto e "ferve" (muda de leve) 7 vezes por segundo, junto com o traço das paredes
function tracoAMao(material, { tremor, passa, semente }) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTempoLinha = tempoDesenho;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', `
        uniform float uTempoLinha;
        vec3 tremido(vec3 p, float q) {
          return fract(sin(vec3(dot(p, vec3(12.9, 78.2, 37.7)) + q, dot(p, vec3(39.3, 11.1, 83.4)) + q * 1.3, dot(p, vec3(73.1, 52.2, 9.7)) + q * 0.7)) * 43758.5453) - 0.5;
        }
        void main() {`)
      .replace('vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );', `
        float quadroLinha = floor(uTempoLinha * 7.0) + ${semente.toFixed(1)};
        vec3 eixo = instanceEnd - instanceStart;
        vec3 sobra = eixo * ${passa.toFixed(3)} + normalize(eixo + 1e-6) * ${(passa * 0.15).toFixed(4)};
        vec4 start = modelViewMatrix * vec4( instanceStart - sobra + tremido(instanceStart, quadroLinha) * ${tremor.toFixed(4)}, 1.0 );`)
      .replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );',
        `vec4 end = modelViewMatrix * vec4( instanceEnd + sobra + tremido(instanceEnd, quadroLinha + 2.0) * ${tremor.toFixed(4)}, 1.0 );`);
  };
  // cada traço tem números próprios: não pode reaproveitar o shader do outro
  material.customProgramCacheKey = () => `traco-${semente}`;
  return material;
}
const contornoForte = tracoAMao(new LineMaterial({ color: 0x2c2c2c, linewidth: 1.8, transparent: true, opacity: 0.9 }), { tremor: 0.006, passa: 0.035, semente: 0 });
const contornoEsboco = tracoAMao(new LineMaterial({ color: 0x2c2c2c, linewidth: 1.0, transparent: true, opacity: 0.45 }), { tremor: 0.016, passa: 0.07, semente: 11 });
export function resolucaoDesenho(w, h) {
  for (const m of [contornoForte, contornoEsboco]) m.resolution.set(w, h);
}
resolucaoDesenho(innerWidth, innerHeight);

export function luzes(cena) {
  const sol = new THREE.DirectionalLight('#ffffff', 0.9);
  sol.position.set(3, 6, 2);
  cena.add(new THREE.HemisphereLight('#fffaf0', '#e4ded2', 1.9), sol);
}

// as cores são criadas na primeira vez que alguém desenha: o main.js desliga a
// conversão de cor do three depois que os módulos carregam
let PAPEL_DESENHO = null;
const materiais = new Map();
// material "desenho": um por cor, reaproveitado
export function materialDesenho(cor, hachura = 1) {
  if (!PAPEL_DESENHO) {
    PAPEL_DESENHO = new THREE.Color('#f3f2ef');
    for (const l of [contornoForte, contornoEsboco]) l.color.set('#2c2c2c');
  }
  const chave = `${new THREE.Color(cor).getHexString()}-${hachura}`;
  if (materiais.has(chave)) return materiais.get(chave);
  const m = new THREE.ShaderMaterial({
    uniforms: { uHachura: { value: hachura }, uCor: { value: new THREE.Color(cor) }, uPapel: { value: PAPEL_DESENHO }, uTempo: tempoDesenho, uLuz: { value: new THREE.Vector3(0.45, 0.85, 0.35).normalize() } },
    vertexShader: /* glsl */ `
      varying vec3 vMundo;
      varying float vProf;
      void main() {
        vec4 mundo = modelMatrix * vec4(position, 1.0);
        vMundo = mundo.xyz;
        vec4 vista = viewMatrix * mundo;
        vProf = -vista.z;
        gl_Position = projectionMatrix * vista;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCor, uPapel, uLuz;
      uniform float uTempo, uHachura;
      varying vec3 vMundo;
      varying float vProf;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float ruido(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      // risco de lápis: linha fina centrada em cada inteiro de t, com borda suave
      float risco(float t, float largura) {
        float d = abs(fract(t) - 0.5);
        float aa = fwidth(t) * 0.9;
        return 1.0 - smoothstep(largura - aa, largura + aa, d);
      }
      void main() {
        // normal da face (faceta) virada para quem olha
        vec3 n = normalize(cross(dFdx(vMundo), dFdy(vMundo)));
        if (dot(n, cameraPosition - vMundo) < 0.0) n = -n;
        float luz = clamp(dot(n, uLuz) * 0.5 + 0.5, 0.0, 1.0);
        // a hachura fica presa à superfície: usa o plano da face (como quem desenha
        // os riscos seguindo cada lado do objeto), levemente ondulada
        vec3 an = abs(n);
        vec2 sup = an.x > an.y && an.x > an.z ? vMundo.zy : (an.y > an.z ? vMundo.xz : vMundo.xy);
        float quadro = floor(uTempo * 7.0);
        vec2 q = sup * 34.0 + hash(vec2(quadro, 3.1)) * 0.6;
        float onda = (ruido(sup * 7.0 + quadro * 0.37) - 0.5) * 0.7;
        float falha = 0.5 + 0.5 * ruido(sup * 55.0);
        // hachura leve, só onde é sombra de verdade
        float hA = risco(q.x + q.y + onda, 0.1) * smoothstep(0.56, 0.4, luz);
        float hB = risco((q.x - q.y) * 1.15 - onda, 0.09) * smoothstep(0.36, 0.2, luz);
        vec3 c = mix(uPapel, uCor, 0.3 + 0.2 * (1.0 - uHachura)) * (0.94 + 0.06 * luz);
        c = mix(c, vec3(0.3, 0.3, 0.32), clamp((hA * 0.3 + hB * 0.35) * falha * uHachura, 0.0, 0.5));
        c += (ruido(gl_FragCoord.xy * 0.8) - 0.5) * 0.02;
        c = mix(c, uPapel, smoothstep(8.0, 30.0, vProf) * 0.9);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
  materiais.set(chave, m);
  return m;
}

// contorno de esboço: o risco forte nas quinas e um segundo, fino e desencontrado
export function contorno(geo, limiar = 25) {
  const arestas = new THREE.EdgesGeometry(geo, limiar).attributes.position.array;
  const forte = new LineSegmentsGeometry().setPositions(arestas);
  const torto = arestas.slice();
  for (let i = 0; i < torto.length; i++) torto[i] += (Math.random() - 0.5) * 0.008;
  const esboco = new LineSegmentsGeometry().setPositions(torto);
  const g = new THREE.Group();
  g.add(new LineSegments2(forte, contornoForte), new LineSegments2(esboco, contornoEsboco));
  return g;
}

export function dobradura(geo, cor, pai, { pos = [0, 0, 0], rot = [0, 0, 0], escala = [1, 1, 1], hachura = 1 } = {}) {
  const m = new THREE.Mesh(geo, materialDesenho(cor, hachura));
  m.add(contorno(geo));
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.scale.set(...escala);
  pai.add(m);
  return m;
}

// pé em tronco de pirâmide (4 faces, girado para a quina ficar de frente)
const pe = (pai, alt, pos, cor = KRAFT_ESCURO, rotX = 0) =>
  dobradura(new THREE.CylinderGeometry(0.03, 0.05, alt, 4), cor, pai, { pos, rot: [rotX, Math.PI / 4, 0] });

export function banco() {
  const g = new THREE.Group();
  dobradura(new THREE.BoxGeometry(1.6, 0.06, 0.2), KRAFT, g, { pos: [0, 0.44, 0.1] });
  dobradura(new THREE.BoxGeometry(1.6, 0.06, 0.2), KRAFT_MEIO, g, { pos: [0, 0.44, -0.11] });
  for (const [y, tom] of [[0.62, KRAFT_MEIO], [0.8, KRAFT]]) dobradura(new THREE.BoxGeometry(1.6, 0.12, 0.04), tom, g, { pos: [0, y, -0.24], rot: [-0.18, 0, 0] });
  for (const x of [-0.68, 0.68]) {
    for (const z of [0.14, -0.15]) pe(g, 0.41, [x, 0.205, z]);
    dobradura(new THREE.CylinderGeometry(0.03, 0.035, 0.5, 4), KRAFT_ESCURO, g, { pos: [x, 0.68, -0.25], rot: [-0.18, Math.PI / 4, 0] });
  }
  return g;
}

// mesinha de canto com vaso, livros e caneca em cima
export function mesa() {
  const g = new THREE.Group();
  dobradura(new THREE.BoxGeometry(1.0, 0.05, 0.48), KRAFT, g, { pos: [0, 0.72, 0] });
  dobradura(new THREE.BoxGeometry(0.9, 0.08, 0.4), KRAFT_MEIO, g, { pos: [0, 0.655, 0] });
  for (const x of [-0.42, 0.42]) for (const z of [-0.17, 0.17]) pe(g, 0.62, [x, 0.31, z]);
  const vasinho = vaso(1);
  vasinho.scale.setScalar(0.62);
  vasinho.position.set(-0.26, 0.745, -0.02);
  g.add(vasinho);
  [['#c98b7b', 0.06, 0.3], ['#8fa7b5', 0.05, 0.27], ['#e2c27c', 0.045, 0.31]].reduce((y, [cor, alt, larg], i) => {
    dobradura(new THREE.BoxGeometry(larg, alt, 0.21), cor, g, { pos: [0.2, y + alt / 2, 0.02], rot: [0, (i - 1) * 0.15, 0] });
    return y + alt;
  }, 0.745);
  dobradura(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 6), '#efe6d6', g, { pos: [0.38, 0.795, 0.14] });
  dobradura(new THREE.TorusGeometry(0.03, 0.01, 3, 5), '#efe6d6', g, { pos: [0.44, 0.8, 0.14] });
  return g;
}

// vaso de barro; variação 0 = folhas pontudas, 1 = moita, 2 = arvorezinha
export function vaso(variacao = 0) {
  const g = new THREE.Group();
  dobradura(new THREE.CylinderGeometry(0.15, 0.11, 0.3, 6), BARRO, g, { pos: [0, 0.15, 0] });
  dobradura(new THREE.CylinderGeometry(0.175, 0.17, 0.06, 6), '#dcaa8b', g, { pos: [0, 0.31, 0] });
  if (variacao === 0) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, alt = 0.45 + (i % 3) * 0.12;
      dobradura(new THREE.ConeGeometry(0.05, alt, 3), i % 2 ? FOLHA : FOLHA_CLARA, g, {
        pos: [Math.cos(a) * 0.06, 0.32 + alt / 2, Math.sin(a) * 0.06],
        rot: [Math.sin(a) * 0.3, a, -Math.cos(a) * 0.3],
      });
    }
  } else if (variacao === 1) {
    dobradura(new THREE.IcosahedronGeometry(0.2, 0), FOLHA, g, { pos: [0, 0.48, 0], escala: [1.1, 0.85, 1.1] });
    dobradura(new THREE.IcosahedronGeometry(0.13, 0), FOLHA_CLARA, g, { pos: [0.12, 0.6, 0.06], rot: [0.4, 0.2, 0] });
    dobradura(new THREE.IcosahedronGeometry(0.12, 0), FOLHA_CLARA, g, { pos: [-0.12, 0.56, -0.04], rot: [0.1, 0.8, 0.3] });
  } else {
    pe(g, 0.5, [0, 0.55, 0]);
    dobradura(new THREE.IcosahedronGeometry(0.24, 0), FOLHA, g, { pos: [0, 0.92, 0], escala: [1, 0.9, 1] });
    dobradura(new THREE.IcosahedronGeometry(0.16, 0), FOLHA_CLARA, g, { pos: [0.14, 1.06, 0.08], rot: [0.5, 0.3, 0] });
  }
  return g;
}

// luminária de teto: caixa rasa com a placa acesa embaixo
export function luminaria() {
  const g = new THREE.Group();
  dobradura(new THREE.BoxGeometry(1.5, 0.07, 0.34), '#ece7dc', g, { pos: [0, -0.035, 0] });
  const placa = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.24), new THREE.MeshBasicMaterial({ color: '#fff8df' }));
  placa.rotation.x = Math.PI / 2;
  placa.position.y = -0.072;
  g.add(placa);
  return g;
}

// gato sentado: corpo em tronco de pirâmide, cabeça recortada com orelhas,
// rabo de tira dobrada. Devolve também as partes clicáveis e o pivô do rabo.
export function gato() {
  const g = new THREE.Group();
  const LARANJA = '#e7b98c', CLARO = '#f3e2cc', ROSA = '#e8a99a';
  const partes = [
    dobradura(new THREE.CylinderGeometry(0.075, 0.15, 0.3, 6), LARANJA, g, { pos: [0, 0.15, 0] }),
    dobradura(new THREE.CylinderGeometry(0.06, 0.1, 0.22, 5), CLARO, g, { pos: [0, 0.13, 0.06], escala: [1, 1, 0.6] }),
  ];
  const contorno = new THREE.Shape([
    [0, -0.1], [0.11, -0.065], [0.145, 0.03], [0.13, 0.2], [0.05, 0.105], [-0.05, 0.105], [-0.13, 0.2], [-0.145, 0.03], [-0.11, -0.065],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const geoCabeca = new THREE.ExtrudeGeometry(contorno, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.02, bevelSegments: 1 });
  geoCabeca.translate(0, 0, -0.035);
  const cabeca = dobradura(geoCabeca, LARANJA, g, { pos: [0, 0.39, 0.02] });
  partes.push(cabeca);
  const frente = 0.035 + 0.03 + 0.002;
  for (const lado of [-1, 1]) {
    const orelha = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([[lado * 0.07, 0.11], [lado * 0.115, 0.17], [lado * 0.115, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)))), new THREE.MeshBasicMaterial({ color: ROSA, side: THREE.DoubleSide }));
    orelha.position.z = frente;
    cabeca.add(orelha);
    // olhinho fechado, sorrindo
    const olho = Array.from({ length: 6 }, (_, i) => { const a = Math.PI * (i / 5); return new THREE.Vector3(lado * 0.055 + Math.cos(a) * 0.025, 0.02 + Math.sin(a) * 0.015, frente); });
    cabeca.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(olho), vinco));
    cabeca.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([[0.11, -0.02], [0.2, 0], [0.11, -0.04], [0.2, -0.06]].map(([x, y]) => new THREE.Vector3(lado * x, y, frente - 0.01))), vinco));
  }
  const nariz = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([[-0.015, -0.02], [0.015, -0.02], [0, -0.04]].map(([x, y]) => new THREE.Vector2(x, y)))), new THREE.MeshBasicMaterial({ color: ROSA }));
  nariz.position.z = frente + 0.001;
  cabeca.add(nariz);
  const boca = [[-0.03, -0.06], [-0.015, -0.068], [0, -0.05], [0.015, -0.068], [0.03, -0.06]].map(([x, y]) => new THREE.Vector3(x, y, frente));
  cabeca.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boca), vinco));
  for (const lado of [-1, 1]) partes.push(dobradura(new THREE.BoxGeometry(0.06, 0.04, 0.08), CLARO, g, { pos: [lado * 0.05, 0.02, 0.11] }));
  const rabo = new THREE.Group();
  rabo.position.set(0.1, 0.04, -0.06);
  g.add(rabo);
  const curva = new THREE.CatmullRomCurve3([[0, 0, 0], [0.15, 0.02, -0.03], [0.22, 0.17, -0.05], [0.17, 0.32, -0.03]].map((p) => new THREE.Vector3(...p)));
  partes.push(dobradura(new THREE.TubeGeometry(curva, 6, 0.03, 3), LARANJA, rabo));
  return { grupo: g, partes, rabo };
}

// texto escrito à mão num recorte transparente (lombada, plaquinha);
// `deitado` gira o texto para correr ao longo da lombada
export function rotulo(texto, w, h, { cor = '#2c2c2c', deitado = false, ppu = 600 } = {}) {
  const tela = document.createElement('canvas');
  tela.width = Math.ceil(w * ppu);
  tela.height = Math.ceil(h * ppu);
  const g = tela.getContext('2d');
  g.fillStyle = cor;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.translate(tela.width / 2, tela.height / 2);
  if (deitado) g.rotate(-Math.PI / 2);
  const [comp, alt] = deitado ? [tela.height, tela.width] : [tela.width, tela.height];
  let tam = alt * 0.62;
  g.font = `700 ${tam}px Caveat`;
  while (g.measureText(texto).width > comp * 0.88 && tam > 8) g.font = `700 ${(tam *= 0.92)}px Caveat`;
  g.fillText(texto, 0, alt * 0.04);
  const mapa = new THREE.CanvasTexture(tela);
  mapa.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: mapa, transparent: true, depthWrite: false }));
}

// livro de verdade: duas capas duras, o miolo de páginas creme um pouco
// recuado e a lombada virada para +z, com duas faixas e o título deitado
const PAGINAS = '#f7f1e3';
export function livro(titulo, cor, esp, alt, prof = 0.27) {
  const g = new THREE.Group();
  const capa = 0.012, escuro = new THREE.Color(cor).offsetHSL(0, 0, -0.12).getStyle();
  const partes = [
    ...[-1, 1].map((s) => dobradura(new THREE.BoxGeometry(capa, alt, prof), cor, g, { pos: [s * (esp / 2 - capa / 2), 0, 0], hachura: 0.15 })),
    dobradura(new THREE.BoxGeometry(esp, alt, capa), cor, g, { pos: [0, 0, prof / 2 - capa / 2], hachura: 0.15 }),
    dobradura(new THREE.BoxGeometry(esp - capa * 2, alt - 0.025, prof - capa - 0.008), PAGINAS, g, { pos: [0, 0, -0.004 - capa / 2], hachura: 0.15 }),
  ];
  for (const y of [0.4, -0.4]) dobradura(new THREE.BoxGeometry(esp + 0.002, 0.018, 0.004), escuro, g, { pos: [0, y * alt, prof / 2 + 0.001], hachura: 0 });
  // linhas finas no topo do miolo, para ler como folhas
  const folhas = [];
  for (let k = 1; k < 5; k++) { const x = -esp / 2 + capa + (k / 5) * (esp - capa * 2); folhas.push(x, alt / 2 - 0.012, prof / 2 - capa - 0.01, x, alt / 2 - 0.012, -prof / 2 + 0.01); }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(folhas, 3)), new THREE.LineBasicMaterial({ color: '#b9b1a1' })));
  if (titulo) {
    const nome = rotulo(titulo, esp * 0.8, alt * 0.62, { deitado: true });
    nome.position.z = prof / 2 + 0.003;
    g.add(nome);
  }
  return { grupo: g, partes };
}

// estante com moldura: uma prateleira por área, livros em pé (um ou outro
// inclinado), aparador de livro e um enfeite. Devolve os livros clicáveis.
export function estante(prateleiras) {
  const g = new THREE.Group();
  const L = 2.9, A = 2.75, P = 0.4, VAO = 0.64;
  for (const s of [-1, 1]) dobradura(new THREE.BoxGeometry(0.09, A, P + 0.03), KRAFT_ESCURO, g, { pos: [s * (L / 2 - 0.045), A / 2, 0.015], hachura: 0.3 });
  dobradura(new THREE.BoxGeometry(L, A, 0.02), KRAFT_MEIO, g, { pos: [0, A / 2, -P / 2 + 0.01], hachura: 0.2 });
  dobradura(new THREE.BoxGeometry(L + 0.08, 0.08, P + 0.06), KRAFT, g, { pos: [0, A + 0.04, 0.02] });
  dobradura(new THREE.BoxGeometry(L - 0.1, 0.1, 0.03), KRAFT_ESCURO, g, { pos: [0, 0.05, P / 2] });   // rodapé
  const livros = [];
  const CORES = ['#c47a6a', '#6f8fa3', '#d9b25e', '#8fa676', '#9d86b3', '#cf8f5b', '#7fa89d', '#d98a8a'];
  const enfeites = [
    (pai) => { const v = vaso(1); v.scale.setScalar(0.55); pai.add(v); },
    (pai) => { dobradura(new THREE.CylinderGeometry(0.06, 0.055, 0.12, 6), '#efe6d6', pai, { pos: [0, 0.06, 0] }); dobradura(new THREE.TorusGeometry(0.035, 0.012, 3, 5), '#efe6d6', pai, { pos: [0.07, 0.065, 0] }); },
    (pai) => { const a = aviaozinho(); a.position.y = 0.08; a.rotation.y = 0.6; pai.add(a); },
    (pai) => { const v = vaso(0); v.scale.setScalar(0.5); pai.add(v); },
  ];
  prateleiras.forEach(([categoria, itens], k) => {
    const y = 0.1 + (prateleiras.length - 1 - k) * VAO;   // a primeira categoria fica em cima
    dobradura(new THREE.BoxGeometry(L - 0.18, 0.05, P), KRAFT, g, { pos: [0, y, 0], hachura: 0.3 });
    const placa = rotulo(categoria, 0.62, 0.12);
    placa.position.set(-L / 2 + 0.42, y + 0.004, P / 2 + 0.004);
    g.add(placa);
    let x = -L / 2 + 0.16;
    itens.forEach(([titulo, texto], i) => {
      const esp = 0.13 + ((k + i) % 3) * 0.025, alt = 0.42 + ((k * 3 + i) % 4) * 0.035;
      const cor = CORES[(k * 3 + i) % CORES.length];
      const { grupo: lv, partes } = livro(titulo, cor, esp, alt);
      const pivo = new THREE.Group();   // gira pela quina de baixo, como livro tombando de leve
      pivo.position.set(x + esp / 2, y + 0.025 + alt / 2, 0.04);
      g.add(pivo);
      pivo.add(lv);
      const inclinado = i === itens.length - 1 && k % 2 === 0;
      if (inclinado) { pivo.rotation.z = -0.16; pivo.position.x += 0.04; pivo.position.y -= 0.01; }
      livros.push({ livro: pivo, partes, titulo, categoria, texto, cor, base: pivo.position.clone(), giroBase: pivo.rotation.z });
      x += esp + (inclinado ? 0.1 : 0.008);
    });
    // aparador segurando a fileira, e uma pilha deitada em metade das prateleiras
    dobradura(new THREE.BoxGeometry(0.02, 0.22, 0.2), '#8c8c8c', g, { pos: [x + 0.02, y + 0.135, 0.04] });
    dobradura(new THREE.BoxGeometry(0.13, 0.02, 0.2), '#8c8c8c', g, { pos: [x + 0.08, y + 0.035, 0.04] });
    if (k % 2) {
      let yy = y + 0.025;
      for (const [j, a] of [0.05, 0.045].entries()) {
        const { grupo: deitado } = livro('', CORES[(k + j + 4) % 8], a, 0.36 - j * 0.04, 0.25);
        deitado.rotation.set(0, 0.08 * (j ? -1 : 1), Math.PI / 2);
        deitado.position.set(L / 2 - 0.75, yy + a / 2, 0.04);
        g.add(deitado);
        yy += a;
      }
    }
    const enfeite = new THREE.Group();
    enfeite.position.set(L / 2 - 0.32, y + 0.025, 0.02);
    g.add(enfeite);
    enfeites[k % enfeites.length](enfeite);
  });
  return { grupo: g, livros };
}

// livro aberto em 3D: capas, miolo e duas páginas; `abre(k)` vai de fechado (0) a aberto (1).
// As páginas recebem os desenhos de fora (folhas com o traço do lápis).
export function livroAberto3D(paginaEsq, paginaDir) {
  const g = new THREE.Group();
  const W = 0.95, H = 1.25;
  const metades = [-1, 1].map((lado) => {
    const dobra = new THREE.Group();
    g.add(dobra);
    const capa = dobradura(new THREE.BoxGeometry(W, H, 0.025), '#c47a6a', dobra, { pos: [lado * W / 2, 0, -0.03] });
    const miolo = dobradura(new THREE.BoxGeometry(W - 0.04, H - 0.05, 0.03), PAGINAS, dobra, { pos: [lado * (W / 2 - 0.01), 0, 0] });
    const pagina = lado < 0 ? paginaEsq : paginaDir;
    pagina.position.set(lado * (W / 2 - 0.01), 0, 0.017);
    dobra.add(pagina);
    return { dobra, lado, capa, miolo };
  });
  const abre = (k) => {
    // fechado: as metades dobram para a frente, páginas por dentro e lombada atrás;
    // aberto: um "V" bem raso, com as páginas viradas para quem lê
    for (const { dobra, lado } of metades) dobra.rotation.y = -lado * ((1 - k) * (Math.PI / 2 - 0.02) + 0.12 * k);
  };
  abre(0);
  return { grupo: g, abre, cor: (c) => metades.forEach(({ capa }) => { capa.material = materialDesenho(c); }) };
}

// o aviãozinho de papel (bico em +z): dobra no meio, asas com espessura e cauda.
// Forma adaptada do PaperAirplane do portfolio-itom (MIT, Tomasz Szmajda). É o mesmo
// no corredor, na sala da Trajetória e no céu; só muda a escala.
const geoAviao = new THREE.BufferGeometry();
{
  const E = 0.17;   // ~0,4 m de comprimento na escala 1
  const v = [
    0, 0, -1.5, -1.2, 0.05, 0.3, 1.2, 0.05, 0.3, 0, 0.15, -0.5, 0, 0.12, 0.5,
    -0.3, 0.08, 0.8, 0.3, 0.08, 0.8, 0, 0.1, 0.6,
    0, -0.02, -1.5, -1.2, -0.02, 0.3, 1.2, -0.02, 0.3, 0, 0, 0.5,
    // quilha: a dobra que fica pendurada embaixo, do bico até a cauda (duas folhas encostadas)
    -0.025, -0.02, -1.2, -0.025, -0.36, 0.55, -0.025, 0, 0.6,
    0.025, -0.02, -1.2, 0.025, -0.36, 0.55, 0.025, 0, 0.6,
  ].map((n, i) => (i % 3 === 2 ? -n : n) * E);
  geoAviao.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geoAviao.setIndex([
    0, 1, 3, 1, 4, 3, 1, 5, 4, 5, 7, 4,  0, 3, 2, 3, 4, 2, 4, 6, 2, 4, 7, 6,
    8, 11, 9, 8, 10, 11,  0, 8, 1, 8, 9, 1, 1, 9, 5,  0, 2, 8, 8, 2, 10, 2, 6, 10,
    5, 9, 11, 5, 11, 7, 6, 7, 11, 6, 11, 10,
    12, 13, 14, 15, 17, 16,   12, 15, 13, 15, 16, 13,   13, 16, 14, 16, 17, 14,
  ]);
}
const arestasAviao = new THREE.EdgesGeometry(geoAviao, 15);
const vincoAviao = new THREE.BufferGeometry().setFromPoints([[0, 0, -1.5], [0, 0.15, -0.5], [0, 0.12, 0.5], [0, 0.1, 0.6]].map(([x, y, z]) => new THREE.Vector3(x * 0.17, y * 0.17 + 0.002, -z * 0.17)));
// papel branco, sem sombreado; as faces recuam um tico (polygonOffset) para os vincos não piscarem por cima
const matAviao = new THREE.MeshBasicMaterial({ color: '#f3f2ef', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
export function aviaozinho() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geoAviao, matAviao), new THREE.LineSegments(arestasAviao, vinco), new THREE.Line(vincoAviao, vinco));
  return g;
}
