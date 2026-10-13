/*
 * Tela Projetos (molde do Journal): lista de trabalhos agrupada à esquerda,
 * detalhe à direita. W/S ou ↑/↓ trocam de projeto; clicar no grupo recolhe.
 */
import { GRUPOS, PROJETOS } from './dados-projetos.js';
import { tocar } from './som.js';
import { telaAtual } from './menu.js';

const raiz = document.querySelector('.projetos');
const $ = (s) => raiz.querySelector(s);
const lista = $('[data-proj-lista]');
const detalhe = $('[data-proj-detalhe]');
const mini = raiz.querySelector('.proj_mini');
const ICONE = {
  Sistema: 'M4 5h16v10H4zM8 19h8M12 15v4',
  API: 'M4 8h6M4 16h6M14 8h6M14 16h6M10 8l4 8M10 16l4-8',
  IA: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-1V4z',
  Site: 'M3 5h18v14H3zM3 9h18M7 7h.5',
};
let sel = 0;
const botoes = [];

for (const g of GRUPOS) {
  const cab = document.createElement('button');
  cab.type = 'button';
  cab.className = 'proj_grupo';
  cab.innerHTML = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9l7 7 7-7" /></svg>';
  cab.firstChild.textContent = g.nome;
  cab.setAttribute('aria-expanded', 'true');
  cab.addEventListener('click', () => {
    const fechado = cab.classList.toggle('proj_grupo--fechado');
    cab.setAttribute('aria-expanded', String(!fechado));
    // reabre os itens em cascata
    if (!fechado) miolo.querySelectorAll('.proj_item').forEach((el) => { el.classList.remove('proj_item--entra'); void el.offsetWidth; el.classList.add('proj_item--entra'); });
    tocar('abrir');
  });
  const itens = document.createElement('div');
  itens.className = 'proj_itens';
  const miolo = document.createElement('div'); // o grid anima a altura deste miolo
  itens.append(miolo);
  for (const p of PROJETOS.filter((x) => x.grupo === g.id)) {
    const i = PROJETOS.indexOf(p);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'proj_item';
    b.innerHTML = `<span class="proj_icone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONE[p.tipo] || ICONE.Sistema}" /></svg></span>
      <span class="proj_item_texto"><span class="proj_item_nome"></span><span class="proj_item_perigo">Complexidade: <b></b></span></span>
      <span class="proj_tipo"></span>`;
    b.querySelector('.proj_item_nome').textContent = p.nome;
    b.querySelector('.proj_item_perigo b').textContent = p.complexidade;
    b.querySelector('.proj_tipo').textContent = p.tipo;
    b.addEventListener('click', () => escolher(i));
    b.addEventListener('mouseenter', () => { if (i !== sel) tocar('hover'); });
    botoes[i] = b;
    b.style.setProperty('--ordem', miolo.children.length);
    miolo.append(b);
  }
  lista.append(cab, itens);
}

function escolher(i, som = true) {
  if (som && i !== sel) tocar('abrir');
  sel = i;
  const p = PROJETOS[i];
  botoes.forEach((b, k) => b.classList.toggle('proj_item--sel', k === i));
  $('[data-proj-titulo]').textContent = p.nome;
  $('[data-proj-objetivos]').replaceChildren(...p.objetivos.map((o) => {
    const li = document.createElement('li');
    li.textContent = o.texto + (o.feito ? '' : ' [em andamento]');
    if (o.feito) li.className = 'feito';
    return li;
  }));
  // texto: o que o projeto é
  const caixa = $('[data-proj-texto]');
  caixa.replaceChildren(...p.texto.map((t) => Object.assign(document.createElement('p'), { textContent: t })));
  $('[data-proj-texto]').scrollTop = 0;
  const img = $('[data-proj-img]');
  img.src = `img/projetos/${p.imagem}`;
  img.alt = p.nome;
  const link = $('[data-proj-link]');
  link.hidden = !p.url;
  if (p.url) link.href = p.url;
  for (const el of [detalhe, mini]) {
    const c = el === detalhe ? 'proj_detalhe--troca' : 'proj_mini--troca';
    el.classList.remove(c); void el.offsetWidth; el.classList.add(c);
  }
}

addEventListener('keydown', (e) => {
  if (telaAtual() !== 'projetos') return;
  const k = e.key.toLowerCase();
  if (k === 's' || k === 'arrowdown') { e.preventDefault(); escolher((sel + 1) % PROJETOS.length); }
  else if (k === 'w' || k === 'arrowup') { e.preventDefault(); escolher((sel - 1 + PROJETOS.length) % PROJETOS.length); }
});

escolher(0, false);
