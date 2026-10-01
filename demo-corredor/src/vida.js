import * as THREE from 'three';
import * as d from './desenhos.js';
import { criaFolha, PAPEL } from './lapis.js';

/* O que deixa o corredor vivo, sem poluir: poucas plantas, um banco com um
   gato (clique nele), duas janelas com nuvens passando, aviõezinhos de papel e um pouco de poeira.
   `folha` e `corredor` vêm do main.js (material rascunho → arte final). */

const MIAUS = ['miau.', 'rrrrr...', 'o Murilo me deve um sachê.', 'miau? (tradução: oi)'];

export function criaVida({ cena, folha, corredor, som, ALT }) {
  const animados = [];   // (t, dt, camera) => void
  const alvos = [];      // meshes clicáveis, com userData.alvo
  const cutouts = [];    // recortes que giram para encarar a câmera (só no eixo Y)

  // troca o desenho de uma folha já existente (balões de fala, janelas)
  function redesenha(mesh, def) {
    const f = criaFolha({ ppu: 200, fundo: 'vazado', ...def });
    const u = mesh.material.uniforms;
    for (const [chave, canvas] of [['uLapis', f.lapis], ['uTinta', f.tinta]]) {
      u[chave].value.dispose();
      u[chave].value = new THREE.CanvasTexture(canvas);
    }
  }

  /* ---------- plantas (recortes que encaram a câmera) ---------- */

  [[1.8, -8.6, 1], [-1.8, -21.6, 1], [1.75, -39.8, 0]].forEach(([x, z, v], k) => {
    const m = folha(corredor, { w: 0.8, h: 1.15, pos: [x, 0.575, z], seed: 520 + k, fundo: 'vazado', ppu: 200, desenha: d.planta(v) });
    cutouts.push(m);
  });

  /* ---------- banco com gato, embaixo de uma janela ---------- */

  folha(corredor, { w: 1.7, h: 0.8, pos: [1.9, 0.4, -23.2], rotY: -Math.PI / 2, seed: 540, fundo: 'vazado', ppu: 200, desenha: d.banco() });
  const gatoGrupo = new THREE.Group();
  gatoGrupo.position.set(1.78, 0.74, -22.8);
  gatoGrupo.rotation.y = -Math.PI / 2;
  cena.add(gatoGrupo);
  const gato = folha(corredor, { w: 0.46, h: 0.56, pos: [0, 0, 0], seed: 541, fundo: 'vazado', ppu: 260, desenha: d.gato() }, gatoGrupo);
  const raboPivo = new THREE.Group();
  raboPivo.position.set(0.1, -0.2, -0.01);
  gatoGrupo.add(raboPivo);
  folha(corredor, { w: 0.3, h: 0.36, pos: [0.12, 0.16, 0], seed: 542, fundo: 'vazado', ppu: 260, desenha: d.rabo() }, raboPivo);
  const balaoGato = folha(corredor, { w: 1.1, h: 0.62, pos: [-0.15, 0.62, 0.02], seed: 543, fundo: 'vazado', desenha: d.balao(MIAUS[0]) }, gatoGrupo);
  balaoGato.visible = false;
  let rabada = 0, fimBalaoGato = 0, miau = 0;
  animados.push((t) => {
    raboPivo.rotation.z = Math.sin(t * (2.2 + rabada * 5)) * (0.25 + rabada * 0.35);
    rabada = Math.max(0, rabada - 0.01);
    balaoGato.visible = t < fimBalaoGato;
  });
  gato.userData.alvo = {
    rotulo: () => 'fazer carinho',
    aoClicar: () => {
      som.miau();
      rabada = 1;
      redesenha(balaoGato, { w: 1.1, h: 0.62, seed: 543 + ++miau, desenha: d.balao(MIAUS[miau % MIAUS.length]) });
      fimBalaoGato = relogioAtual + 3;
    },
  };
  alvos.push(gato);

  /* ---------- janelas com nuvens passando ---------- */

  [[-1, -16], [1, -24.2]].forEach(([lado, z], k) => {
    const def = { w: 1.3, h: 1.15, seed: 570 + k, desenha: d.janela(k * 0.3) };
    const m = folha(corredor, { ...def, pos: [lado * 2.18, 1.95, z], rotY: -lado * Math.PI / 2, fundo: 'vazado', ppu: 200 });
    let proxima = 0;
    animados.push((t, dt, cam) => {
      // só redesenha a janela que está perto (desenhar no canvas custa)
      if (t < proxima || Math.abs(cam.position.z - z) > 14) return;
      proxima = t + 0.14;
      redesenha(m, { ...def, desenha: d.janela(k * 0.3 + t * 0.012) });
    });
  });

  /* ---------- aviõezinhos de papel ---------- */

  const geoAviao = new THREE.BufferGeometry();
  const N = [0, 0, 0.22], L = [-0.14, 0.03, -0.18], R = [0.14, 0.03, -0.18], C = [0, 0, -0.18], K = [0, -0.07, -0.18];
  geoAviao.setAttribute('position', new THREE.Float32BufferAttribute([...N, ...L, ...C, ...N, ...C, ...R, ...N, ...C, ...K], 3));
  const matAviao = new THREE.MeshBasicMaterial({ color: new THREE.Color(PAPEL).multiplyScalar(0.98), side: THREE.DoubleSide });
  const linhas = new THREE.LineBasicMaterial({ color: '#2c2c2c' });
  for (let k = 0; k < 2; k++) {
    const aviao = new THREE.Group();
    aviao.add(new THREE.Mesh(geoAviao, matAviao), new THREE.LineSegments(new THREE.EdgesGeometry(geoAviao, 1), linhas));
    cena.add(aviao);
    const fase = k * 11.5, vel = 2.1 + k * 0.35;
    const pos = (t) => {
      const u = ((t * vel + fase) % 50);
      return new THREE.Vector3(Math.sin(t * 0.6 + k) * 1.3, 2.3 + Math.sin(t * 1.1 + k * 2) * 0.35 + (k % 2) * 0.3, 3 - u);
    };
    animados.push((t) => {
      const p = pos(t), prox = pos(t + 0.05);
      aviao.position.copy(p);
      if (prox.z < p.z) aviao.lookAt(prox);
      aviao.rotateZ(Math.sin(t * 0.6 + k) * 0.4);
      aviao.visible = p.z < -0.5; // só dentro do corredor (antes disso é a fachada)
    });
  }

  /* ---------- poeira ---------- */

  const qtd = 140;
  const base = new Float32Array(qtd * 3);
  for (let i = 0; i < qtd; i++) base.set([(Math.random() - 0.5) * 4, 0.2 + Math.random() * 3, 2 - Math.random() * 44], i * 3);
  const geoPoeira = new THREE.BufferGeometry();
  geoPoeira.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
  const poeira = new THREE.Points(geoPoeira, new THREE.PointsMaterial({ color: '#2c2c2c', size: 0.012, transparent: true, opacity: 0.3, depthWrite: false }));
  cena.add(poeira);
  animados.push((t) => {
    const p = geoPoeira.attributes.position;
    for (let i = 0; i < qtd; i++) {
      p.setX(i, base[i * 3] + Math.sin(t * 0.2 + i) * 0.15);
      p.setY(i, base[i * 3 + 1] + Math.sin(t * 0.13 + i * 1.7) * 0.2);
    }
    p.needsUpdate = true;
  });

  let relogioAtual = 0;
  return {
    alvos,
    anima(t, dt, cam) {
      relogioAtual = t;
      for (const f of animados) f(t, dt, cam);
      for (const c of cutouts) c.rotation.y = Math.atan2(cam.position.x - c.position.x, cam.position.z - c.position.z);
    },
  };
}
