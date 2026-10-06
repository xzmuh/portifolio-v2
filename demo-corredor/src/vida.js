import * as THREE from 'three';
import * as d from './desenhos.js';
import * as dobra from './dobradura.js';
import { criaFolha } from './lapis.js';

/* O que deixa o corredor vivo, sem poluir: luminárias, vasos, uma mesinha e um
   banco com um gato (clique nele), todos de papel dobrado; duas janelas com nuvens passando, aviõezinhos de papel e um pouco de poeira.
   `folha` e `corredor` vêm do main.js (material rascunho → arte final). */

const MIAUS = ['miau.', 'rrrrr...', 'o Murilo me deve um sachê.', 'miau? (tradução: oi)'];

export function criaVida({ cena, folha, corredor, som, ALT }) {
  const animados = [];   // (t, dt, camera) => void
  const alvos = [];      // meshes clicáveis, com userData.alvo

  // troca o desenho de uma folha já existente (balões de fala, janelas)
  function redesenha(mesh, def) {
    const f = criaFolha({ ppu: 200, fundo: 'vazado', ...def });
    const u = mesh.material.uniforms;
    for (const [chave, canvas] of [['uLapis', f.lapis], ['uTinta', f.tinta]]) {
      u[chave].value.dispose();
      u[chave].value = new THREE.CanvasTexture(canvas);
    }
  }

  /* ---------- móveis e plantas de papel dobrado ---------- */

  // cada objeto só aparece depois que o traço do corredor chega nele
  const surgindo = [];
  const poe = (obj, x, y, z, rotY) => { obj.position.set(x, y, z); obj.rotation.y = rotY; cena.add(obj); surgindo.push([obj, z]); return obj; };
  animados.push(() => {
    const alcance = -2 + (corredor.uComprimento.value + 6) * corredor.uPintura.value;
    for (const [o, z] of surgindo) o.visible = -z < alcance;
  });
  const PAREDE = 2.2, VIRADO_ESQ = Math.PI / 2, VIRADO_DIR = -Math.PI / 2;

  dobra.luzes(cena);
  for (const z of [-5, -12, -19, -26, -33, -40]) poe(dobra.luminaria(), 0, ALT, z, 0);
  poe(dobra.vaso(0), PAREDE - 0.35, 0, -8.6, 0);
  poe(dobra.vaso(2), -(PAREDE - 0.35), 0, -21.6, 0);
  poe(dobra.vaso(1), PAREDE - 0.35, 0, -39.8, 0);
  poe(dobra.mesa(), -(PAREDE - 0.3), 0, -12.6, VIRADO_ESQ);

  /* ---------- banco com gato, embaixo de uma janela ---------- */

  const banco = poe(dobra.banco(), PAREDE - 0.32, 0, -23.4, VIRADO_DIR);
  const gato = dobra.gato();
  gato.grupo.position.set(-0.35, 0.47, 0.04);
  banco.add(gato.grupo);
  const balaoGato = folha(corredor, { w: 1.1, h: 0.62, pos: [0, 0.95, 0.05], seed: 543, fundo: 'vazado', desenha: d.balao(MIAUS[0]) }, gato.grupo);
  balaoGato.visible = false;
  let rabada = 0, fimBalaoGato = 0, miau = 0;
  animados.push((t, dt, cam) => {
    gato.rabo.rotation.y = Math.sin(t * (2 + rabada * 5)) * (0.3 + rabada * 0.4);
    rabada = Math.max(0, rabada - 0.01);
    balaoGato.visible = t < fimBalaoGato;
    balaoGato.lookAt(cam.position);
  });
  const alvoGato = {
    rotulo: () => 'fazer carinho',
    aoClicar: () => {
      som.miau();
      rabada = 1;
      redesenha(balaoGato, { w: 1.1, h: 0.62, seed: 543 + ++miau, desenha: d.balao(MIAUS[miau % MIAUS.length]) });
      fimBalaoGato = relogioAtual + 3;
    },
  };
  for (const parte of gato.partes) { parte.userData.alvo = alvoGato; alvos.push(parte); }

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

  for (let k = 0; k < 2; k++) {
    const aviao = dobra.aviaozinho();
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
    },
  };
}
