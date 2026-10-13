import { PERFIL, PARTES, NIVEL, CLOSES, BUILDS } from './dados.js';
import { tocar, alternarMudo } from './som.js';
import { mostrar, telaAtual } from './menu.js';
import { criarEfeitos } from './efeitos.js';

const W = 1600, H = 900;
const SLOT = 82;
// cor da barra do slot pela raridade (nível 1 a 5), como no jogo
const COR = ['', '#9a9da0', '#3ccb6b', '#3b9cff', '#b25cff', '#e0832f'];


const palco = document.getElementById('palco');
const zoom = document.getElementById('zoom');
const card = document.getElementById('card');
const $ = (sel, raiz = palco) => raiz.querySelector(sel);
const mundo = document.getElementById('mundo');
// dois closes que se revezam: um some enquanto o outro aparece
const closes = [...document.querySelectorAll('.mundo_close')];
let closeAtivo = 0;
const canvasEfeitos = document.querySelector('.efeitos');
const efeitos = criarEfeitos(canvasEfeitos);
let trocaEfeito = null;
// o canvas dos efeitos fica sobre o close já no lugar final (centro ALVO, lado `tela`)
function ligarEfeitos(nome) {
  const e = CLOSES[nome];
  clearTimeout(trocaEfeito);
  const ligar = () => {
    canvasEfeitos.style.left = ALVO.x - e.tela / 2 + 'px';
    canvasEfeitos.style.top = ALVO.y - e.tela / 2 + 'px';
    efeitos.iniciar(nome, e.tela);
    canvasEfeitos.classList.add('efeitos--on');
  };
  if (canvasEfeitos.classList.contains('efeitos--on')) {
    canvasEfeitos.classList.remove('efeitos--on');
    trocaEfeito = setTimeout(ligar, 300);
  } else ligar();
}
function desligarEfeitos() {
  clearTimeout(trocaEfeito);
  canvasEfeitos.classList.remove('efeitos--on');
  trocaEfeito = setTimeout(() => efeitos.parar(), 400);
}

/*
 * Câmera do zoom. O mundo (corpo + close) fica em MUNDO no palco. Cada
 * enquadramento diz onde o close fica sobre o corpo: centro (cx, cy) e
 * largura (w), em % do corpo. A câmera aumenta o mundo até o close ter
 * `tela` px e leva o centro dele até ALVO, à direita, como no jogo.
 */
const MUNDO = { x: 560, y: 92, w: 480, h: 720 };
// o close fica entre o painel da esquerda e o medidor da direita
const ALVO = { x: 1045, y: 468 };
function posicionarClose(img, nome) {
  const e = CLOSES[nome];
  const lado = (e.w / 100) * MUNDO.w;
  img.style.width = img.style.height = lado + 'px';
  img.style.left = (e.cx / 100) * MUNDO.w - lado / 2 + 'px';
  img.style.top = (e.cy / 100) * MUNDO.h - lado / 2 + 'px';
}
function camera(nome) {
  if (!nome) { mundo.style.transform = ''; return; }
  const e = CLOSES[nome];
  const lado = (e.w / 100) * MUNDO.w;
  const cx = (e.cx / 100) * MUNDO.w, cy = (e.cy / 100) * MUNDO.h;
  const s = e.tela / lado;
  mundo.style.transform = `translate(${ALVO.x - MUNDO.x - s * cx}px, ${ALVO.y - MUNDO.y - s * cy}px) scale(${s})`;
}
// já baixa os closes para o zoom não piscar
Object.keys(CLOSES).forEach((n) => { new Image().src = `img/close-${n}.webp`; });

/*
 * Posição das linhas na tela geral, calculada: cada coluna empilha as partes
 * na ordem de PARTES, e a borda virada para o corpo recua onde passam os
 * braços do boneco (contorno de fora do braço esquerdo, em % do corpo; o
 * direito é o espelho). Assim dá para pôr e tirar partes sem refazer nada.
 */
const BRACO = [[0, 30], [18.5, 30], [46, 17], [52, 11], [57, 13], [59, 50]]; // [y%, x%]
const BORDA = { esq: 701, dir: 930 };
const TOPO_LINHAS = 128, PASSO_MAX = 162, FIM_LINHAS = 700, ALTURA_LINHA = 112;
function braçoX(yPx) {
  const y = ((yPx - MUNDO.y) / MUNDO.h) * 100;
  for (let i = 1; i < BRACO.length; i++) {
    const [y0, x0] = BRACO[i - 1], [y1, x1] = BRACO[i];
    if (y <= y1) return MUNDO.x + (MUNDO.w * (x0 + ((x1 - x0) * (y - y0)) / (y1 - y0))) / 100;
  }
  return MUNDO.x + MUNDO.w / 2;
}
function layoutColuna(partes, lado) {
  const passo = partes.length > 1 ? Math.min(PASSO_MAX, (FIM_LINHAS - TOPO_LINHAS) / (partes.length - 1)) : 0;
  return partes.map((p, i) => {
    const topo = TOPO_LINHAS + i * passo;
    let menor = Infinity;
    for (let y = topo + 20; y <= topo + ALTURA_LINHA; y += 6) menor = Math.min(menor, braçoX(y));
    const esq = Math.min(BORDA.esq, menor - 18);
    return { parte: p, topo, borda: lado === 'esq' ? esq : W - esq + (BORDA.dir - (W - BORDA.esq)) };
  });
}

/* ---------- escala do palco ---------- */
// mede o #app e não a janela: no celular em pé o app está girado
const app = document.getElementById('app');
// A altura manda (900 de desenho) e a largura acompanha a janela; abaixo de
// LARGURA_MIN tudo encolhe junto para os lados não invadirem o centro.
// Cada tela precisa de uma largura mínima diferente: o conteúdo do centro da
// Cibernética e da árvore cabe em ~1180; Projetos tem a miniatura à direita.
const LARGURA_MIN = { cibernetica: 1180, habilidades: 1180, historia: 1180, contato: 1100, projetos: 1180 };
function escalar() {
  const min = LARGURA_MIN[document.body.dataset.tela] || 1520;
  const k = Math.min(app.clientHeight / H, app.clientWidth / min);
  palco.style.setProperty('--escala', k);
  const largura = app.clientWidth / k;
  palco.style.width = largura + 'px';
  // janela estreita: medidores mais perto da borda
  palco.classList.toggle('palco--estreito', largura < 1500);
}
addEventListener('resize', escalar);
escalar();


/* ---------- topo ---------- */
$('[data-nivel]').textContent = PERFIL.nivel;
$('[data-cred]').textContent = PERFIL.credibilidade;
$('[data-contatos]').append(...PERFIL.contatos.map(({ rotulo, icone, href }) => {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = href;
  if (!href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
  a.innerHTML = `<img src="img/icones/${icone}.svg" alt="" />`;
  a.append(rotulo);
  li.append(a);
  return li;
}));

/* ---------- implantes instalados e builds ----------
 * `instalado[parte] = [ids]` é o estado da tela. As builds preenchem tudo
 * de uma vez; instalar à mão no zoom vira a build "personalizada". */
const IMPLANTE = {};
for (const p of PARTES) for (const o of p.opcoes) IMPLANTE[o.id] = { ...o, parte: p };
const instalado = {};
let buildAtiva = BUILDS[0].id;

function equiparBuild(id) {
  for (const p of PARTES) {
    const daBuild = p.opcoes.filter((o) => o.builds.includes(id)).sort((a, b) => b.nivel - a.nivel);
    const resto = p.opcoes.filter((o) => !daBuild.includes(o)).sort((a, b) => b.nivel - a.nivel);
    instalado[p.id] = [...daBuild, ...resto].slice(0, p.slots).map((o) => o.id);
  }
  buildAtiva = id;
}
equiparBuild(buildAtiva);

/* ---------- slots ---------- */
const sigla = (nome) => nome.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function criarSlot(parte, imp, { disponivel = false, alvo = false } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'slot slot--cheio' + (alvo ? ' slot--alvo' : '') + (disponivel ? ' slot--disponivel' : '');
  b.dataset.implante = imp.id;
  b.style.setProperty('--cor', COR[imp.nivel]);
  b.setAttribute('aria-label', `${imp.nome}: ${imp.sub}, ${NIVEL[imp.nivel]}${disponivel ? ', disponível para instalar' : ''}`);
  b.innerHTML = `<span class="slot_barra"></span><span class="slot_seta"></span>${disponivel ? '' : '<span class="slot_canto"></span>'}`;
  const img = document.createElement('img');
  img.className = 'slot_arte';
  img.src = `img/implantes/${imp.id}.webp`;
  img.alt = '';
  // sem a arte ainda: mostra a sigla do nome
  img.onerror = () => { img.replaceWith(Object.assign(document.createElement('span'), { className: 'slot_sigla', textContent: sigla(imp.nome) })); };
  b.append(img);
  const mostrar = () => { mostrarCard(b, parte, imp, disponivel); acender(parte, true); };
  b.addEventListener('mouseenter', mostrar);
  b.addEventListener('focus', mostrar);
  b.addEventListener('mouseleave', () => { esconderCard(); acender(parte, false); });
  b.addEventListener('blur', () => { esconderCard(); acender(parte, false); });
  return b;
}
function criarVago() {
  const d = document.createElement('div');
  d.className = 'slot slot--vazio';
  d.innerHTML = '<span class="slot_mais">+</span>';
  return d;
}

/* ---------- contornos das regiões do corpo ---------- */
const regioesEl = document.querySelector('[data-regioes]');
const regiao = {};
for (const r of new Set(PARTES.map((p) => p.regiao))) {
  const img = document.createElement('img');
  img.className = 'regiao';
  img.src = `img/regioes/${r}.webp`;
  img.alt = '';
  regioesEl.append(img);
  regiao[r] = img;
}
function acender(parte, on) { regiao[parte.regiao]?.classList.toggle('regiao--hover', on); }
function piscar(r) {
  const el = regiao[r];
  if (!el) return;
  el.classList.remove('regiao--pisca');
  void el.offsetWidth;
  el.classList.add('regiao--pisca');
}

/* ---------- tela geral ---------- */
const capacidade = PARTES.reduce((s, p) => s + p.slots * 5, 0);
const LAYOUT = [
  ...layoutColuna(PARTES.filter((p) => p.lado === 'esq'), 'esq'),
  ...layoutColuna(PARTES.filter((p) => p.lado === 'dir'), 'dir'),
];
const linhas = {};
const legendas = {}; // significado dos implantes instalados, escrito embaixo dos slots
for (const { parte, topo: y, borda: x } of LAYOUT) {
  const linha = document.createElement('div');
  linha.className = 'parte';
  linha.style.top = y + 'px';
  if (parte.lado === 'esq') linha.style.right = (W - x) + 'px';
  else linha.style.left = x + 'px';

  const nome = document.createElement('button');
  nome.type = 'button';
  nome.className = 'parte_nome';
  nome.textContent = parte.nome;
  // o pontinho ciano marca parte que tem implante sobrando para trocar
  if (parte.opcoes.length > parte.slots) {
    const ponto = document.createElement('span');
    ponto.className = 'parte_ponto';
    parte.lado === 'esq' ? nome.append(ponto) : nome.prepend(ponto);
  }
  nome.addEventListener('click', () => abrir(parte));

  const slots = document.createElement('div');
  slots.className = 'slots';
  // clicar em qualquer slot da parte abre o zoom dela
  slots.addEventListener('click', () => abrir(parte));
  const legenda = document.createElement('span');
  legenda.className = 'parte_legenda';
  linha.append(nome, slots, legenda);
  linha.addEventListener('mouseenter', () => acender(parte, true));
  linha.addEventListener('mouseleave', () => acender(parte, false));
  document.getElementById(parte.lado === 'esq' ? 'col-esq' : 'col-dir').append(linha);
  linhas[parte.id] = slots;
  legendas[parte.id] = legenda;
}
function desenharGeral(novo) {
  for (const p of PARTES) {
    const ids = instalado[p.id];
    linhas[p.id].replaceChildren(...ids.map((id) => {
      const s = criarSlot(p, IMPLANTE[id]);
      if (id === novo) s.classList.add('slot--instalando');
      return s;
    }));
    for (let k = ids.length; k < p.slots; k++) linhas[p.id].append(criarVago());
    // o que cada implante quer dizer, em português claro (o nome de jogo fica no card)
    legendas[p.id].replaceChildren(...ids.map((id) => Object.assign(document.createElement('span'), { textContent: IMPLANTE[id].sub })));
  }
  desenharMedidores();
  desenharBuilds();
}

/* ---------- builds (barra de baixo) ---------- */
const barraBuilds = document.querySelector('[data-builds]');
function desenharBuilds() {
  barraBuilds.querySelectorAll('[data-build]').forEach((b) => b.classList.toggle('build--ativa', b.dataset.build === buildAtiva));
  barraBuilds.querySelector('[data-build-custom]').hidden = buildAtiva !== 'custom';
}
for (const b of BUILDS) {
  const bt = document.createElement('button');
  bt.type = 'button';
  bt.className = 'build';
  bt.dataset.build = b.id;
  bt.textContent = b.nome;
  bt.addEventListener('click', () => {
    if (buildAtiva === b.id) return;
    tocar('instalar');
    const velho = JSON.parse(JSON.stringify(instalado));
    equiparBuild(b.id);
    for (const p of PARTES) if (velho[p.id].join() !== instalado[p.id].join()) piscar(p.regiao);
    // todos os slots que mudaram piscam como recém-instalados
    desenharGeral();
    barraBuilds.closest('.palco_centro').querySelectorAll('.geral .slot--cheio').forEach((s) => {
      s.classList.remove('slot--instalando'); void s.offsetWidth; s.classList.add('slot--instalando');
    });
    if (atual) desenharZoom(atual);
  });
  barraBuilds.querySelector('[data-build-custom]').before(bt);
}

/* ---------- medidores ----------
 * Esquerda: capacidade (soma do custo dos implantes, raro custa mais).
 * Direita: armadura (quanto o conjunto segura o tranco em produção).
 * Os números contam até o valor novo; passar o mouse num disponível mostra
 * a prévia (+/-) de como fica se ele entrar no lugar do slot marcado. */
const REGUA = { topo: 42, alt: 400 };
const LIMITE = 0.3; // a linha do limite fica a 30% da base, como no jogo
// faixa possível de cada medidor (menor e maior soma com os implantes que
// existem): as barras andam dentro dela, então toda troca aparece
const faixa = (campo) => {
  const soma = (ordem) => PARTES.reduce((s, p) => s + [...p.opcoes].sort((a, b) => ordem * (b[campo] - a[campo])).slice(0, p.slots).reduce((t, o) => t + o[campo], 0), 0);
  return { min: soma(-1), max: soma(1) };
};
const FAIXA_ARM = faixa('armadura');
const ARM_MAX = FAIXA_ARM.max;
const naFaixa = (v, f) => 0.12 + 0.8 * ((v - f.min) / Math.max(1, f.max - f.min));
const somar = (campo) => PARTES.reduce((s, p) => s + instalado[p.id].reduce((t, id) => t + IMPLANTE[id][campo], 0), 0);
// conta até o valor novo; uma contagem nova cancela a anterior e o valor
// final sempre fica certo, mesmo se a animação não rodar
function contar(el, alvoN) {
  const de = Number(el.dataset.valor ?? el.textContent) || 0;
  el.dataset.valor = alvoN;
  const meu = (el._contagem = (el._contagem || 0) + 1);
  if (de === alvoN) { el.textContent = alvoN; return; }
  const ini = performance.now();
  const passo = (agora) => {
    if (el._contagem !== meu) return;
    const k = Math.min(1, (agora - ini) / 450);
    el.textContent = Math.round(de + (alvoN - de) * k);
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
  setTimeout(() => { if (el._contagem === meu) el.textContent = alvoN; }, 600);
}
// depois de trocar de build: mostra por um instante quanto cada medidor mudou
let ultimos = null;
function mostrarMudanca(cap, arm) {
  if (!ultimos) { ultimos = { cap, arm }; return; }
  const dc = cap - ultimos.cap, da = arm - ultimos.arm;
  ultimos = { cap, arm };
  if (!dc && !da) return;
  const pinta = (el, d) => {
    el.hidden = d === 0;
    el.textContent = (d > 0 ? '+' : '') + d;
    el.classList.toggle('medidor_delta--sobe', d > 0);
    el.classList.toggle('medidor_delta--desce', d < 0);
  };
  pinta($('[data-cap-delta]'), dc);
  pinta($('[data-arm-delta]'), da);
  clearTimeout(mostrarMudanca.t);
  mostrarMudanca.t = setTimeout(semPrevia, 1600);
  document.querySelectorAll('.medidor').forEach((m) => { m.classList.remove('medidor--mudou'); void m.offsetWidth; m.classList.add('medidor--mudou'); });
}
function desenharMedidores() {
  const usados = somar('nivel'), arm = somar('armadura');
  // capacidade: a barra amarela enche a régua toda (limite = topo)
  const barras = $('[data-barras-cap]');
  // proporção real: em uso / capacidade total (a linha do limite fica no topo)
  const fracCap = (usados / capacidade) * 0.92;
  barras.style.setProperty('--limite', '92%');
  barras.style.setProperty('--uso', fracCap * 100 + '%');
  const yLimite = REGUA.topo + REGUA.alt * (1 - 0.92);
  const yUso = REGUA.topo + REGUA.alt * (1 - fracCap);
  const total = $('[data-cap-total]');
  total.textContent = capacidade;
  total.style.top = (yLimite - 26) + 'px';
  const uso = $('[data-cap-uso]');
  contar(uso, usados);
  uso.style.top = (yUso - 12) + 'px';
  $('[data-cap-delta]').style.top = (yUso + 16) + 'px';
  $('[data-info-cap]').innerHTML = `<b>Capacidade</b>${usados} de ${capacidade} em uso. Implante mais raro custa mais. Troque no zoom de cada parte ou escolha uma build embaixo.`;

  // armadura: proporcional ao máximo possível
  const fracArm = naFaixa(arm, FAIXA_ARM);
  $('[data-barras-arm]').style.setProperty('--uso', fracArm * 100 + '%');
  const yArm = REGUA.topo + REGUA.alt * (1 - fracArm);
  const valor = $('[data-armadura]');
  contar(valor, arm);
  valor.style.top = (yArm - 12) + 'px';
  $('[data-arm-delta]').style.top = (yArm + 16) + 'px';
  $('[data-info-arm]').innerHTML = `<b>Armadura</b>${arm} de ${ARM_MAX}: o quanto o conjunto segura o tranco em produção. Coluna Full Stack e Fôlego de Maratona seguram mais.`;
  mostrarMudanca(usados, arm);
}
// prévia de troca: diferença entre o implante que entraria e o do slot marcado
function previa(parte, imp) {
  const atualId = instalado[parte.id][alvo];
  const sai = atualId ? IMPLANTE[atualId] : { nivel: 0, armadura: 0 };
  const mostra = (el, d) => {
    el.hidden = d === 0;
    el.textContent = (d > 0 ? '+' : '') + d;
    el.classList.toggle('medidor_delta--sobe', d > 0);
    el.classList.toggle('medidor_delta--desce', d < 0);
  };
  mostra($('[data-cap-delta]'), imp.nivel - sai.nivel);
  mostra($('[data-arm-delta]'), imp.armadura - sai.armadura);
}
function semPrevia() { $('[data-cap-delta]').hidden = true; $('[data-arm-delta]').hidden = true; }
desenharGeral();

/* ---------- zoom ---------- */
let atual = null;
let alvo = 0; // qual slot instalado recebe o próximo implante

function desenharZoom(parte, novo) {
  const ids = instalado[parte.id];
  alvo = Math.min(alvo, parte.slots - 1);
  const inst = $('[data-zinstalados]');
  inst.replaceChildren(...ids.map((id, k) => {
    const s = criarSlot(parte, IMPLANTE[id], { alvo: parte.slots > 1 && k === alvo });
    if (id === novo) s.classList.add('slot--instalando');
    // com mais de um slot, clicar escolhe qual será trocado
    s.addEventListener('click', () => { if (parte.slots > 1 && alvo !== k) { alvo = k; tocar('hover'); desenharZoom(parte); } });
    return s;
  }));
  for (let k = ids.length; k < parte.slots; k++) inst.append(criarVago());
  const livres = parte.opcoes.filter((o) => !ids.includes(o.id));
  $('[data-zextras]').replaceChildren(...livres.map((o) => {
    const s = criarSlot(parte, o, { disponivel: true });
    s.addEventListener('click', () => instalar(parte, o.id));
    s.addEventListener('mouseenter', () => previa(parte, o));
    s.addEventListener('focus', () => previa(parte, o));
    s.addEventListener('mouseleave', semPrevia);
    s.addEventListener('blur', semPrevia);
    return s;
  }));
  $('[data-zvazio]').hidden = livres.length > 0;
  $('[data-zdica]').hidden = livres.length === 0;
}

function instalar(parte, id) {
  instalado[parte.id][alvo] = id;
  buildAtiva = 'custom';
  tocar('instalar');
  piscar(parte.regiao);
  const c = closes[closeAtivo];
  c.classList.remove('mundo_close--instala'); void c.offsetWidth; c.classList.add('mundo_close--instala');
  esconderCard();
  semPrevia();
  desenharZoom(parte, id);
  desenharGeral(id);
}

function abrir(parte) {
  esconderCard();
  tocar('abrir');
  if (atual !== parte) alvo = 0;
  atual = parte;
  const i = PARTES.indexOf(parte);

  $('[data-ztitulo]').textContent = parte.nome;
  $('[data-znome]').textContent = parte.area;
  const trilho = $('[data-trilho]');
  trilho.style.width = 100 / PARTES.length + '%';
  trilho.style.left = (i * 100) / PARTES.length + '%';
  desenharZoom(parte);
  zoom.hidden = false;
  $('[data-fechar]').textContent = 'Voltar';
  // troca o close só se a região mudou: o novo entra enquanto o antigo sai,
  // os dois presos ao corpo, então a câmera andando leva os dois juntos
  const src = `img/close-${parte.close}.webp`;
  if (closes[closeAtivo].getAttribute('src') !== src) {
    closes[closeAtivo].classList.remove('mundo_close--on');
    closeAtivo = 1 - closeAtivo;
    const img = closes[closeAtivo];
    img.src = src;
    posicionarClose(img, parte.close);
    img.classList.add('mundo_close--on');
  }
  camera(parte.close);
  if (canvasEfeitos.dataset.close !== parte.close || !canvasEfeitos.classList.contains('efeitos--on')) {
    canvasEfeitos.dataset.close = parte.close;
    ligarEfeitos(parte.close);
  }
  palco.classList.add('palco--zoom');
}

function fecharZoom() {
  esconderCard();
  tocar('abrir');
  atual = null;
  palco.classList.remove('palco--zoom');
  closes.forEach((c) => c.classList.remove('mundo_close--on'));
  camera(null);
  desligarEfeitos();
  canvasEfeitos.dataset.close = '';
  $('[data-fechar]').textContent = 'Fechar';
  setTimeout(() => {
    if (atual) return;
    zoom.hidden = true;
    closes.forEach((c) => c.removeAttribute('src'));
  }, 900);
}

function passo(n) {
  if (!atual) return;
  const i = PARTES.indexOf(atual);
  abrir(PARTES[(i + n + PARTES.length) % PARTES.length]);
}
zoom.querySelectorAll('[data-passo]').forEach((b) => b.addEventListener('click', () => passo(+b.dataset.passo)));

/* ---------- card do implante ---------- */
function mostrarCard(slot, parte, imp, disponivel) {
  card.style.setProperty('--cor', COR[imp.nivel]);
  $('[data-cnome]', card).textContent = imp.nome;
  $('[data-ccat]', card).textContent = NIVEL[imp.nivel];
  $('[data-ctipo]', card).textContent = imp.sub;
  $('[data-cnivel]', card).textContent = imp.nivel;
  $('[data-carm]', card).textContent = imp.armadura;
  $('[data-ctexto]', card).textContent = imp.texto;
  $('[data-conde]', card).replaceChildren(...imp.prova.map((o) => {
    const li = document.createElement('li');
    li.textContent = o;
    return li;
  }));
  $('[data-cdica]', card).hidden = !disponivel;
  card.hidden = false;

  // posição do slot no container do centro (onde o card também mora),
  // somando offsets: getBoundingClientRect mente com o app girado no celular
  const centro = card.offsetParent;
  let sx = 0, sy = 0;
  for (let el = slot; el && el !== centro; el = el.offsetParent) { sx += el.offsetLeft; sy += el.offsetTop; }
  const cw = card.offsetWidth, ch = card.offsetHeight;
  const praEsquerda = !atual && parte.lado === 'dir';
  let x = praEsquerda ? sx - cw - 12 : sx + SLOT + 12;
  let y = sy;
  x = Math.max(20, Math.min(W - cw - 20, x));
  y = Math.max(70, Math.min(H - ch - 50, y));
  card.style.left = x + 'px';
  card.style.top = y + 'px';
}
function esconderCard() { card.hidden = true; }

/* ---------- teclado ---------- */
const fechar = document.getElementById('fechar');
fechar.addEventListener('click', (e) => {
  e.preventDefault();
  if (atual) fecharZoom();
  else { tocar('abrir'); mostrar('menu'); }
});
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'm') { alternarMudo(); return; }
  if (telaAtual() !== 'cibernetica') return;
  if (k === 'escape') {
    if (atual) fecharZoom();
    else { tocar('abrir'); mostrar('menu'); }
  } else if (atual && (k === 'a' || k === 'arrowleft')) passo(-1);
  else if (atual && (k === 'd' || k === 'arrowright')) passo(1);
});

// saiu da cibernética com o zoom aberto: volta para a tela geral calado
addEventListener('tela', (e) => {
  if (e.detail !== 'cibernetica' && atual) {
    atual = null;
    esconderCard();
    palco.classList.remove('palco--zoom');
    closes.forEach((c) => c.classList.remove('mundo_close--on'));
    camera(null);
    desligarEfeitos();
    canvasEfeitos.dataset.close = '';
    zoom.hidden = true;
    $('[data-fechar]').textContent = 'Fechar';
  }
});

/* ---------- som de hover em tudo que é clicável ---------- */
const CLICAVEL = '.slot, .parte_nome, .zoom_seta, .contatos a, .acao';  // (as abas tocam pelo menu.js)
let sobre = null;
palco.addEventListener('mouseover', (e) => {
  const alvo = e.target.closest(CLICAVEL);
  if (alvo && alvo !== sobre) tocar('hover');
  sobre = alvo;
});
