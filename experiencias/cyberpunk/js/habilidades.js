/*
 * Tela Habilidades: árvore de competências no molde da árvore de perks do
 * Cyberpunk 2077 2.0: principais grandes com contador, satélites presos dos
 * lados, lendas octogonais no topo, trilhos grossos. Abas de categoria (Q/E),
 * card ao passar o mouse e a barra de progressão.
 */
import { CATEGORIAS } from './dados-habilidades.js';
import { tocar } from './som.js';
import { telaAtual } from './menu.js';

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
};

// grade da árvore no palco (1600x900): col -3..3 a partir do centro, lin 0..3
const ARVORE = { cx: 800, passoX: 175, y0: 245, passoY: 140 };
const TAM = { principal: 72, lenda: 88, sat: 42 };
const posNo = (n) => ({ x: ARVORE.cx + n.col * ARVORE.passoX, y: ARVORE.y0 + n.lin * ARVORE.passoY });

const raiz = document.querySelector('.habilidades');
const $ = (s) => raiz.querySelector(s);
const abasEl = $('[data-hab-abas]');
const arvoreEl = $('[data-hab-arvore]');
const trilhasEl = $('[data-hab-trilhas]');
const card = $('[data-hab-card]');
const SVG = 'http://www.w3.org/2000/svg';
let atual = 0;

const ESTADO = (n) => (n.nivel >= 3 ? 'dominado' : n.nivel > 0 ? 'evolucao' : 'meta');
const NOME_ESTADO = { dominado: 'Dominado', evolucao: 'Em evolução', meta: 'Meta · estudando' };


CATEGORIAS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'hab_aba';
  b.textContent = c.nome;
  b.addEventListener('click', () => { if (i !== atual) { tocar('abrir'); mostrarCategoria(i); } });
  b.addEventListener('mouseenter', () => { if (i !== atual) tocar('hover'); });
  abasEl.append(b);
});

// satélites em volta do principal: com 2, um de cada lado; com 4, dois de cada
function posSatelites(n) {
  const { x, y } = posNo(n);
  const dx = TAM.principal / 2 + 30 + TAM.sat / 2;
  const q = (n.sat || []).length;
  return (n.sat || []).map((s, i) => {
    const lado = i % 2 === 0 ? -1 : 1;
    // com 2, ficam um pouco acima: o trilho que chega pelo lado passa por baixo
    const dy = q <= 2 ? -(TAM.sat / 2 + 4) : (i < 2 ? -1 : 1) * (TAM.sat / 2 + 6);
    return { ...s, x: x + lado * dx, y: y + dy, lado };
  });
}

// trilho ortogonal com cantos arredondados
function trilho(a, b, raio = 16) {
  if (a.x === b.x || a.y === b.y) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  // dobra logo depois de sair do pai, longe dos nomes que ficam embaixo dos nós
  const sy = Math.sign(b.y - a.y);
  const meio = a.y + sy * (TAM.principal / 2 + 14);
  const sx = Math.sign(b.x - a.x);
  const r = Math.min(raio, Math.abs(b.x - a.x) / 2, Math.abs(meio - a.y));
  return `M${a.x} ${a.y}V${meio - sy * r}Q${a.x} ${meio} ${a.x + sx * r} ${meio}H${b.x - sx * r}Q${b.x} ${meio} ${b.x} ${meio + sy * r}V${b.y}`;
}
function linha(d, classe) {
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', d);
  p.setAttribute('class', classe);
  trilhasEl.append(p);
}

function criarNo({ classe, x, y, tam, icone, rotulo, conta, ver, arte }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  b.style.left = x - tam / 2 + 'px';
  b.style.top = y - tam / 2 + 'px';
  b.style.width = b.style.height = tam + 'px';
  b.setAttribute('aria-label', rotulo);
  b.innerHTML = `<svg class="hab_icone" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[icone] || ICONES.chip}"/></svg>`
    + (conta ? `<span class="hab_conta">${conta}</span>` : '');
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

function mostrarCategoria(i) {
  atual = i;
  const cat = CATEGORIAS[i];
  [...abasEl.children].forEach((b, k) => b.classList.toggle('hab_aba--ativa', k === i));
  esconderCard();
  trilhasEl.innerHTML = '';
  const porId = Object.fromEntries(cat.nos.map((n) => [n.id, n]));
  const nos = [];

  // trilhos grossos entre principais
  for (const n of cat.nos) {
    const pai = porId[n.pai];
    if (!pai) continue;
    const est = n.nivel > 0 && pai.nivel > 0 ? 'aceso' : n.nivel === 0 ? 'meta' : 'frio';
    const d = trilho(posNo(pai), posNo(n));
    linha(d, 'hab_trilho hab_trilho--fundo');
    linha(d, `hab_trilho hab_trilho--${est}`);
  }

  for (const n of cat.nos) {
    const { x, y } = posNo(n);
    const est = ESTADO(n);
    // satélites e as ligações curtas até eles
    for (const s of posSatelites(n)) {
      // ligação reta na altura do satélite, da borda do principal até a borda dele
      const borda = x + s.lado * (TAM.principal / 2);
      const bordaSat = s.x - s.lado * (TAM.sat / 2);
      const d = `M${borda} ${s.y}H${bordaSat}`;
      linha(d, `hab_ramal hab_ramal--${s.ok ? 'aceso' : 'meta'}`);
      nos.push(criarNo({
        classe: `hab_no hab_no--sat hab_no--${s.ok ? 'dominado' : 'meta'}`,
        x: s.x, y: s.y, tam: TAM.sat, icone: s.icone,
        rotulo: `${s.nome}, ${s.ok ? 'tenho' : 'ainda não'}`,
        ver: () => mostrarCard(s.x, s.y, TAM.sat, {
          nome: s.nome, estado: s.ok ? 'dominado' : 'meta', nivel: null,
          texto: `Parte de ${n.nome}.`, onde: [s.ok ? 'Já uso' : 'Próximo passo'],
        }),
      }));
    }
    const tam = n.lenda ? TAM.lenda : TAM.principal;
    const no = criarNo({
      classe: `hab_no hab_no--${n.lenda ? 'lenda' : 'principal'} hab_no--${est}`,
      x, y, tam, icone: n.icone, arte: `img/perks/${cat.id}-${n.id}.webp`,
      conta: n.lenda ? null : `${n.nivel}/3`,
      rotulo: `${n.nome}, ${NOME_ESTADO[est]}`,
      ver: () => mostrarCard(x, y, tam, { nome: n.nome, estado: est, nivel: n.lenda ? null : n.nivel, texto: n.texto, onde: n.onde, lenda: n.lenda }),
    });
    no.style.setProperty('--enche', (n.nivel / 3) * 100 + '%');
    const nome = document.createElement('span');
    nome.className = 'hab_nome';
    nome.textContent = n.nome;
    no.append(nome);
    nos.push(no);
    no.style.animationDelay = (3 - n.lin) * 60 + 'ms';
  }
  arvoreEl.replaceChildren(...nos);

  // progressão: níveis conquistados nos principais
  const principais = cat.nos.filter((n) => !n.lenda);
  const feitos = principais.reduce((s, n) => s + n.nivel, 0), total = principais.length * 3;
  $('[data-hab-prog-nome]').textContent = cat.nome;
  $('[data-hab-prog-num]').textContent = principais.filter((n) => n.nivel >= 3).length;
  $('[data-hab-prog-txt]').textContent = `${feitos}/${total}`;
  $('[data-hab-prog-pct]').textContent = Math.round((feitos / total) * 100) + '%';
  $('[data-hab-prog-barra]').style.width = (feitos / total) * 100 + '%';
  $('[data-hab-pontos]').textContent = cat.nos.filter((n) => n.nivel === 0).length;
}

function mostrarCard(x, y, tam, d) {
  card.className = `hab_card hab_card--${d.estado}`;
  $('[data-hab-cnome]').textContent = d.nome;
  $('[data-hab-cestado]').textContent = d.lenda ? 'Lenda · meta' : NOME_ESTADO[d.estado];
  const nivel = $('[data-hab-cnivel]');
  nivel.parentElement.hidden = d.nivel === null;
  nivel.textContent = `${d.nivel}/3`;
  $('[data-hab-ctexto]').textContent = d.texto;
  $('[data-hab-conde]').replaceChildren(...d.onde.map((o) => { const li = document.createElement('li'); li.textContent = o; return li; }));
  card.hidden = false;
  const direita = x + tam / 2 + 18 + card.offsetWidth < 1570;
  card.style.left = (direita ? x + tam / 2 + 18 : x - tam / 2 - 18 - card.offsetWidth) + 'px';
  card.style.top = Math.min(900 - card.offsetHeight - 60, Math.max(110, y - tam / 2)) + 'px';
}
function esconderCard() { card.hidden = true; }

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
