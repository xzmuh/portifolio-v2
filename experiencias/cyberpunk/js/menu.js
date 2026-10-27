/*
 * Menu principal e troca de telas. body[data-tela] diz qual tela está no ar
 * ('menu' ou 'cibernetica'); o CSS esconde o resto.
 */
import { tocar } from './som.js';

const SAIR = '../../#experiencias';

const itens = [...document.querySelectorAll('.menu_item')];
let sel = 0;

export function telaAtual() {
  return document.body.dataset.tela;
}

// telas internas na ordem das abas da barra de cima
const ABAS = ['cibernetica', 'habilidades', 'historia', 'projetos'];
const NOMES = { cibernetica: 'Cibernética', habilidades: 'Habilidades', historia: 'História', projetos: 'Projetos' };
// telas fora das abas, que também podem ser abertas pelo endereço
const OUTRAS = ['contato'];
// o que cada tela mostra, em uma linha (aparece embaixo da barra de cima)
const INTRO = {
  cibernetica: '<b>Como eu trabalho.</b> Cada implante é um traço meu. Escolha a vaga embaixo ou clique numa parte do corpo para trocar.',
  habilidades: '<b>O que eu sei fazer.</b> As tecnologias com que trabalho. Segure num nó para liberar, passe o mouse para ler.',
  historia: '<b>Por onde passei.</b> Cada prédio é uma empresa. Clique numa ou use A/D.',
  projetos: '<b>O que eu entreguei.</b> Escolha um projeto na lista para ver o que ele é.',
  contato: '',
};
const calmoNav = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let trocando = null;

function aplicar(tela) {
  document.body.dataset.tela = tela;
  // o endereço guarda a tela: recarregar volta nela (e sem repetir o glitch)
  history.replaceState(null, '', tela === 'menu' ? location.pathname + location.search : '#' + tela);
  document.querySelectorAll('.aba').forEach((a) => {
    const ativa = a.dataset.ir === tela;
    a.classList.toggle('aba--ativa', ativa);
    if (ativa) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const intro = document.querySelector('[data-tela-intro]');
  if (intro) intro.innerHTML = INTRO[tela] || '';
  const titulo = document.querySelector('[data-breve-titulo]');
  if (titulo && NOMES[tela]) titulo.textContent = NOMES[tela];
  // avisa quem depende da tela (o palco recalcula a escala, a cibernética fecha o zoom)
  window.dispatchEvent(new CustomEvent('tela', { detail: tela }));
  window.dispatchEvent(new Event('resize'));
}

/* Troca de tela com glitch: a tela nova entra na hora e é revelada em
   faixas tremidas (.revela no #app inteiro: menu, palco e mapa 3D), com as
   faixas coloridas varrendo por cima. */
const camada = () => document.getElementById('app');
const faixas = document.querySelector('.troca_fx');
export function mostrar(tela) {
  if (tela === telaAtual() || trocando) return;
  if (calmoNav) { aplicar(tela); return; }
  aplicar(tela);
  const app = camada();
  app.classList.remove('revela');
  void app.offsetWidth;
  app.classList.add('revela');
  if (faixas) { faixas.classList.remove('troca_fx--on'); void faixas.offsetWidth; faixas.classList.add('troca_fx--on'); }
  trocando = setTimeout(() => { app.classList.remove('revela'); trocando = null; }, 450);
}

function selecionar(i, som = true) {
  i = (i + itens.length) % itens.length;
  if (i === sel && itens[i].classList.contains('menu_item--sel')) return;
  itens[sel].classList.remove('menu_item--sel', 'menu_item--entrando');
  sel = i;
  const it = itens[sel];
  it.classList.add('menu_item--sel');
  // reinicia a animação de entrada mesmo se o item já tinha sido selecionado antes
  void it.offsetWidth;
  it.classList.add('menu_item--entrando');
  if (som) tocar('hover');
}

function ativar(item) {
  const destino = item.dataset.ir;
  tocar('abrir');
  if (destino === 'sair') location.href = SAIR;
  else mostrar(destino);
}

itens.forEach((item, i) => {
  item.addEventListener('mouseenter', () => selecionar(i));
  item.addEventListener('focus', () => selecionar(i, false));
  item.addEventListener('click', () => ativar(item));
});
selecionar(0, false);

/* ---------- barra de cima: abas e teclas 1 / 3 ---------- */
document.querySelectorAll('.aba').forEach((a) => {
  a.addEventListener('click', () => { tocar('abrir'); mostrar(a.dataset.ir); });
  a.addEventListener('mouseenter', () => { if (!a.classList.contains('aba--ativa')) tocar('hover'); });
});
addEventListener('keydown', (e) => {
  const tela = telaAtual();
  if (tela === 'menu') return;
  const k = e.key;
  const i = ABAS.indexOf(tela);
  if ((k === '1' || k === '3') && i >= 0) {
    tocar('abrir');
    mostrar(ABAS[(i + (k === '1' ? -1 : 1) + ABAS.length) % ABAS.length]);
  } else if (k === 'Escape' && tela !== 'cibernetica') {
    tocar('abrir');
    mostrar('menu');
  }
});

addEventListener('keydown', (e) => {
  if (telaAtual() !== 'menu') return;
  const k = e.key.toLowerCase();
  if (k === 'arrowdown' || k === 's') { e.preventDefault(); selecionar(sel + 1); }
  else if (k === 'arrowup' || k === 'w') { e.preventDefault(); selecionar(sel - 1); }
  else if (k === 'enter' || k === ' ') { e.preventDefault(); ativar(itens[sel]); }
});

/* ---------- glitch do fundo ----------
 * Rajadas curtas em intervalos aleatórios: duas cópias do wallpaper aparecem
 * recortadas em faixas horizontais, deslocadas para os lados e tingidas
 * (magenta e ciano), por uns quadros. Só roda com o menu na tela. */
const menu = document.querySelector('.menu');
const camadas = [...document.querySelectorAll('.menu_glitch')];
const calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sorte = (a, b) => a + Math.random() * (b - a);

function quadroDeFalha() {
  for (const c of camadas) {
    const y = sorte(0, 90), h = sorte(2, 16);
    c.style.clipPath = `inset(${y}% 0 ${Math.max(0, 100 - y - h)}% 0)`;
    c.style.transform = `translateX(${sorte(-4, 4)}%)`;
    c.style.opacity = sorte(0.35, 0.9);
  }
}
function limpar() {
  for (const c of camadas) c.style.opacity = 0;
  menu.classList.remove('menu--falha');
}
function rajada() {
  if (telaAtual() === 'menu' && !document.hidden) {
    const quadros = Math.round(sorte(3, 8));
    menu.classList.toggle('menu--falha', Math.random() < 0.5);
    for (let i = 0; i < quadros; i++) setTimeout(quadroDeFalha, i * 55);
    setTimeout(limpar, quadros * 55 + 40);
  }
  setTimeout(rajada, sorte(1400, 4200));
}
if (!calmo) setTimeout(rajada, 3500);

// link direto para uma tela: index.html#cibernetica
if ([...ABAS, ...OUTRAS].includes(location.hash.slice(1))) aplicar(location.hash.slice(1));
