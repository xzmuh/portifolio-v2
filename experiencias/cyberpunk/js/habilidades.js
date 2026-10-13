/*
 * Tela Habilidades: árvore de competências no molde da árvore Relic do
 * Cyberpunk 2077: nós octogonais, trilhos duplos com dobras de 45° abrindo
 * do nó central para as pontas. Segurando o clique num nó disponível ele é
 * liberado e acende, como os perks do jogo. Abas de categoria (Q/E), card ao passar o mouse
 * dizendo o que é cada tecnologia.
 */
import { CATEGORIAS } from './dados-habilidades.js';
import { tocar } from './som.js';
import { telaAtual, mostrar } from './menu.js';

// ícones de traço, 24x24
const ICONES = {
  api: 'M4 8h6M4 16h6M14 8h6M14 16h6M10 8l4 8M10 16l4-8',
  balanca: 'M12 4v16M6 20h12M5 8h14M5 8l-3 6h6zM19 8l-3 6h6z',
  hex: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 8v8M8 10l8 4',
  camadas: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  plugue: 'M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3',
  lista: 'M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5',
  raio: 'M13 2L4 14h7l-1 8 9-12h-7z',
  relogio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3',
  cubos: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  banco: 'M4 6c0-2 16-2 16 0v12c0 2-16 2-16 0zM4 6c0 2 16 2 16 0M4 12c0 2 16 2 16 0',
  tabela: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',
  doc: 'M6 3h9l4 4v14H6zM15 3v4h4M9 12h7M9 16h7',
  selo: 'M12 3l2.5 2 3-.5.5 3 2 2.5-2 2.5-.5 3-3-.5L12 21l-2.5-2-3 .5-.5-3-2-2.5 2-2.5.5-3 3 .5zM9 12l2 2 4-4',
  grafico: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8',
  folha: 'M12 21c-6-5-6-13 0-18 6 5 6 13 0 18zM12 21V8',
  tela: 'M3 4h18v12H3zM8 20h8M12 16v4',
  atomo: 'M12 12m-1.5 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M3 12c0-2.5 4-4.5 9-4.5s9 2 9 4.5-4 4.5-9 4.5-9-2-9-4.5zM7.5 4.2c2.2-1.2 6 1.6 8.5 6s3 9.3.8 10.6-6-1.6-8.5-6-3-9.3-.8-10.6z',
  escudo: 'M12 3l8 3-1.5 11L12 21l-6.5-4L4 6zM12 7l4 10M12 7l-4 10M9.5 13h5',
  play: 'M4 4h16v16H4zM10 8l6 4-6 4z',
  cubo: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  olho: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  paleta: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 2-2 2-4c0-4-4-8-8-8zM7.5 11h.5M10 7h.5M15 7.5h.5',
  chip: 'M7 7h10v10H7zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  nuvem: 'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1 0 9z',
  cerebro: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z',
  foguete: 'M12 2c4 3 5 8 4 12l-4 3-4-3c-1-4 0-9 4-12zM8 14l-3 3 1 4 3-3M16 14l3 3-1 4-3-3M12 8v2',
  engrenagem: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  celular: 'M7 2h10v20H7zM11 18h2',
  robo: 'M6 8h12v10H6zM12 4v4M9 12h.5M14.5 12h.5M9 15h6M3 12v3M21 12v3',
  cadeado: 'M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3M12 15v2',
};

// árvore no palco (1600x900): os nós guardam x,y a partir do nó central
const CENTRO = { x: 800, y: 480 };
// espaçamento: só a altura abre; na largura as pontas (±520) já encostam nos
// 1180 px que a tela garante no celular (LARGURA_MIN em tela.js)
const ABRE = 1.15;
const TAM = { raiz: 108, no: 82 };
const posNo = (n) => ({ x: CENTRO.x + n.x, y: CENTRO.y + n.y * ABRE });

const raiz = document.querySelector('.habilidades');
const $ = (s) => raiz.querySelector(s);
const abasEl = $('[data-hab-abas]');
const arvoreEl = $('[data-hab-arvore]');
const trilhasEl = $('[data-hab-trilhas]');
const card = $('[data-hab-card]');
const SVG = 'http://www.w3.org/2000/svg';
let atual = 0;


CATEGORIAS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'hab_aba';
  b.textContent = c.nome;
  b.addEventListener('click', () => { if (i !== atual) { tocar('abrir'); mostrarCategoria(i); } });
  b.addEventListener('mouseenter', () => { if (i !== atual) tocar('hover'); });
  abasEl.append(b);
});

/* Trilho como na Relic: só retas e dobras de 45°. Galho mais alto que largo
   sai na vertical e entra na diagonal; mais largo que alto sai na diagonal e
   entra na horizontal. O que sai na vertical nasce deslocado para o lado do
   filho, então dois irmãos (um pra cada lado) sobem paralelos e não colados. */
const DESVIO = 12;
function trilho(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const sx = Math.sign(dx), sy = Math.sign(dy);
  if (!dx || !dy) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  if (Math.abs(dy) >= Math.abs(dx)) {
    const x0 = a.x + sx * DESVIO;
    return `M${x0} ${a.y}V${b.y - sy * Math.abs(b.x - x0)}L${b.x} ${b.y}`;
  }
  return `M${a.x} ${a.y}L${a.x + sx * Math.abs(dy)} ${b.y}H${b.x}`;
}
// trilho duplo: uma faixa larga com o miolo escuro por cima vira duas linhas
function linha(d) {
  const g = document.createElementNS(SVG, 'g');
  g.setAttribute('class', 'hab_galho');
  // brilho, faixa e miolo fazem o trilho duplo; a carga é a energia que corre
  // pelo trilho quando o nó é liberado
  for (const camada of ['brilho', 'faixa', 'miolo', 'carga']) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', `hab_trilho hab_trilho--${camada}`);
    g.append(p);
  }
  trilhasEl.append(g);
  return g;
}

/* ---------- liberar nós (segurar o clique, como no jogo) ----------
 * Cada aba começa só com o nó central aceso. Um nó fica disponível quando o
 * pai está liberado; segurando o clique nele a moldura enche e, cheia, ele
 * acende e a energia corre pelo trilho desde o pai. As vagas trancadas
 * ("Sua API"...) não liberam: levam para o Contato. O que foi liberado fica
 * guardado no navegador de quem está vendo. */
const SEGURAR = 550; // ms
const CHAVE = 'cyber-hab-liberados';
const liberados = (() => {
  let salvo = {};
  try { salvo = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { /* sem armazenamento */ }
  return Object.fromEntries(CATEGORIAS.map((c) => {
    const raizes = c.nos.filter((n) => !n.pai).map((n) => n.id);
    return [c.id, new Set([...raizes, ...(salvo[c.id] || [])])];
  }));
})();
function guardar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(Object.fromEntries(Object.entries(liberados).map(([k, v]) => [k, [...v]])))); } catch { /* sem armazenamento */ }
}
const pontosEl = $('[data-hab-pontos]');
const cat = () => CATEGORIAS[atual];
const livre = (n) => liberados[cat().id].has(n.id);
const estado = (n) => (livre(n) ? 'liberado' : !n.pai || livre({ id: n.pai }) ? 'disponivel' : 'travado');
const liberaveis = (c) => c.nos.filter((n) => !n.bloqueado);
function contarPontos() {
  const c = cat();
  const falta = liberaveis(c).filter((n) => !liberados[c.id].has(n.id)).length;
  pontosEl.textContent = falta;
  raiz.classList.toggle('habilidades--completa', falta === 0);
}

let nosEl = {}, galhos = {};
function pintar() {
  for (const n of cat().nos) {
    const e = estado(n);
    const el = nosEl[n.id];
    el.classList.toggle('hab_no--liberado', e === 'liberado');
    el.classList.toggle('hab_no--disponivel', e === 'disponivel');
    el.classList.toggle('hab_no--travado', e === 'travado');
    const g = galhos[n.id];
    if (g) g.setAttribute('class', `hab_galho hab_galho--${n.bloqueado ? (e === 'travado' ? 'travado' : 'meta') : e}`);
  }
  contarPontos();
}

function liberar(n) {
  liberados[cat().id].add(n.id);
  guardar();
  tocar('instalar-2', true); // sempre o mesmo, o "tululu" (sem sortear variação)
  // a energia corre do pai até o nó
  const carga = galhos[n.id]?.querySelector('.hab_trilho--carga');
  if (carga) {
    const L = carga.getTotalLength();
    carga.style.strokeDasharray = `${L}`;
    carga.animate([{ strokeDashoffset: L, opacity: 1 }, { strokeDashoffset: 0, opacity: 1 }, { strokeDashoffset: 0, opacity: 0 }], { duration: 650, easing: 'ease-out' });
  }
  const el = nosEl[n.id];
  el.classList.remove('hab_no--acendeu'); void el.offsetWidth;
  setTimeout(() => el.classList.add('hab_no--acendeu'), 300);
  pintar();
}

function criarNo({ classe, x, y, tam, icone, rotulo, ver, arte }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  b.style.left = x - tam / 2 + 'px';
  b.style.top = y - tam / 2 + 'px';
  b.style.width = b.style.height = tam + 'px';
  b.setAttribute('aria-label', rotulo);
  b.innerHTML = `<i class="hab_enche" aria-hidden="true"></i><svg class="hab_icone" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[icone] || ICONES.chip}"/></svg>`;
  // ilustração gravada (img/perks), pintada na cor do estado; sem ela, fica o ícone
  if (arte) {
    const teste = new Image();
    teste.onload = () => {
      const i = document.createElement('i');
      i.className = 'hab_arte';
      // endereço completo: url() dentro de variável CSS seria resolvido a
      // partir da pasta css/ e a máscara ficaria vazia
      const completo = `url("${new URL(arte, location.href).href}")`;
      i.style.webkitMaskImage = completo;
      i.style.maskImage = completo;
      b.prepend(i);
      b.classList.add('hab_no--com-arte');
    };
    teste.src = arte;
  }
  b.addEventListener('mouseenter', () => { ver(); tocar('hover'); });
  b.addEventListener('focus', ver);
  b.addEventListener('mouseleave', esconderCard);
  b.addEventListener('blur', esconderCard);
  return b;
}

// segurar: a moldura enche em SEGURAR ms; soltar antes esvazia
function segurar(el, n, ver) {
  let ini = 0, quadro = 0;
  const parar = () => {
    if (!ini) return;
    ini = 0; cancelAnimationFrame(quadro);
    el.style.setProperty('--enche', '0');
    el.classList.remove('hab_no--enchendo');
  };
  const passo = (agora) => {
    const k = Math.min(1, (agora - ini) / SEGURAR);
    el.style.setProperty('--enche', k.toFixed(3));
    if (k < 1) { quadro = requestAnimationFrame(passo); return; }
    parar();
    liberar(n);
    ver();
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || estado(n) !== 'disponivel') return;
    e.preventDefault();
    ini = performance.now();
    el.classList.add('hab_no--enchendo');
    tocar('hover');
    quadro = requestAnimationFrame(passo);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, parar);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  // teclado: Enter ou espaço libera direto
  el.addEventListener('click', (e) => {
    if (e.detail === 0 && estado(n) === 'disponivel') { liberar(n); ver(); }
  });
}

function mostrarCategoria(i) {
  atual = i;
  const c = cat();
  [...abasEl.children].forEach((b, k) => b.classList.toggle('hab_aba--ativa', k === i));
  esconderCard();
  trilhasEl.innerHTML = '';
  const porId = Object.fromEntries(c.nos.map((n) => [n.id, n]));
  galhos = {};
  for (const n of c.nos) {
    const pai = porId[n.pai];
    if (pai) galhos[n.id] = linha(trilho(posNo(pai), posNo(n)));
  }

  nosEl = {};
  const nos = c.nos.map((n) => {
    const { x, y } = posNo(n);
    const tam = n.pai ? TAM.no : TAM.raiz;
    const ver = () => mostrarCard(x, y, tam, n);
    const no = criarNo({
      classe: 'hab_no' + (n.pai ? '' : ' hab_no--raiz') + (n.bloqueado ? ' hab_no--meta' : ''),
      x, y, tam, icone: n.bloqueado ? 'cadeado' : n.icone, arte: !n.bloqueado && n.arte && `img/perks/${n.arte}.webp`,
      rotulo: n.bloqueado ? `${n.nome}, bloqueado` : n.nome,
      ver,
    });
    if (n.bloqueado) no.addEventListener('click', () => { if (estado(n) !== 'travado') { tocar('abrir'); mostrar('contato'); } });
    else segurar(no, n, ver);
    const nome = document.createElement('span');
    nome.className = 'hab_nome';
    nome.textContent = n.nome;
    no.append(nome);
    // acende do centro para as pontas
    no.style.animationDelay = Math.round(Math.hypot(n.x, n.y) / 2) + 'ms';
    nosEl[n.id] = no;
    return no;
  });
  arvoreEl.replaceChildren(...nos);
  pintar();
}

function mostrarCard(x, y, tam, n) {
  const e = estado(n);
  card.className = n.bloqueado ? 'hab_card hab_card--meta' : 'hab_card';
  $('[data-hab-cnome]').textContent = n.nome;
  $('[data-hab-cestado]').hidden = !n.bloqueado;
  $('[data-hab-ctexto]').textContent = n.texto;
  const dica = $('[data-hab-cdica]');
  const pai = cat().nos.find((o) => o.id === n.pai);
  dica.textContent = n.bloqueado ? (e === 'travado' ? `Libere ${pai.nome} antes` : 'Clique para falar comigo')
    : e === 'liberado' ? 'Liberado' : e === 'disponivel' ? 'Segure para liberar' : `Libere ${pai.nome} antes`;
  dica.dataset.estado = n.bloqueado && e !== 'travado' ? 'disponivel' : e;
  card.hidden = false;
  const direita = x + tam / 2 + 18 + card.offsetWidth < 1570;
  card.style.left = (direita ? x + tam / 2 + 18 : x - tam / 2 - 18 - card.offsetWidth) + 'px';
  card.style.top = Math.min(900 - card.offsetHeight - 60, Math.max(110, y - tam / 2)) + 'px';
}
function esconderCard() { card.hidden = true; }

$('[data-hab-tudo]').addEventListener('click', () => {
  const c = cat();
  const faltam = liberaveis(c).filter((n) => !liberados[c.id].has(n.id));
  if (!faltam.length) return;
  // libera em cascata, do centro para as pontas
  faltam.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)).forEach((n, k) => {
    setTimeout(() => { if (cat() === c && estado(n) === 'disponivel') liberar(n); }, k * 140);
  });
  // quem só fica disponível depois do pai: segunda passada
  setTimeout(() => { if (cat() === c) liberaveis(c).forEach((n) => { if (!livre(n)) liberados[c.id].add(n.id); }); guardar(); pintar(); }, faltam.length * 140 + 50);
});
$('[data-hab-zerar]').addEventListener('click', () => {
  const c = cat();
  liberados[c.id] = new Set(c.nos.filter((n) => !n.pai).map((n) => n.id));
  guardar();
  tocar('abrir');
  pintar();
});

addEventListener('keydown', (e) => {
  if (telaAtual() !== 'habilidades') return;
  const k = e.key.toLowerCase();
  if (k === 'q' || k === 'e') {
    tocar('abrir');
    mostrarCategoria((atual + (k === 'q' ? -1 : 1) + CATEGORIAS.length) % CATEGORIAS.length);
  }
});
// ao entrar na tela, refaz a cascata
addEventListener('tela', (e) => { if (e.detail === 'habilidades') mostrarCategoria(atual); });

mostrarCategoria(0);
