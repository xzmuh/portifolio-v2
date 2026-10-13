/*
 * Sons (Web Audio, para o hover não atrasar nem cortar o anterior).
 * O navegador só libera áudio depois do primeiro clique ou tecla, então o
 * ambiente começa aí. Cada tela tem o seu ambiente em loop: o do menu
 * principal e o das telas internas, trocados com fade. M liga e desliga tudo.
 */
const ARQUIVOS = {
  hover: 'sons/hover.mp3',
  abrir: 'sons/abrir.mp3',
  ambiente: 'sons/ambiente.mp3',
  glitch: 'sons/glitch.mp3', // entrada do site, junto do glitch do nome
  instalar: 'sons/instalar.mp3', // implante entrando no slot (3 variações, sorteadas)
  'instalar-2': 'sons/instalar-2.mp3',
  'instalar-3': 'sons/instalar-3.mp3',
  mensagem: 'sons/mensagem.mp3', // mensagem nova (tela Contato)
  'sandy-entra': 'sons/sandy-entra.mp3', // Sandevistan ligando (mapa da História)
  'sandy-sai': 'sons/sandy-sai.mp3',
  'menu-ambiente': 'sons/menu-ambiente.wav', // wav: mp3 tem silêncio no começo e o loop "pula"
};
const VOLUME = { hover: 0.35, abrir: 0.6, ambiente: 0.18, 'menu-ambiente': 0.3, glitch: 0.7, instalar: 0.7, 'instalar-2': 0.7, 'instalar-3': 0.6, mensagem: 0.3, 'sandy-entra': 0.6, 'sandy-sai': 0.5 };

let ctx = null;
let mudo = false;
let ambiente = null; // { nome, src, gain }
const buffers = {};

const ambienteDaTela = () => (document.body.dataset.tela === 'menu' ? 'menu-ambiente' : 'ambiente');

let iniciouEm = 0;
/* O áudio é criado já na abertura e os sons já são baixados. Se o navegador
   deixar tocar sem gesto (o Chrome deixa em site onde a pessoa costuma ouvir
   som), o ambiente começa sozinho; se não deixar, o contexto fica suspenso e
   liga no primeiro clique ou tecla. */
function criar() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.onstatechange = () => { atualizarBotao(); if (ctx.state === 'running') trocarAmbiente(); };
  for (const [nome, url] of Object.entries(ARQUIVOS)) {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => {
        buffers[nome] = buf;
        if (nome === ambienteDaTela()) trocarAmbiente();
        if (nome === 'glitch' && glitchPendente) { glitchPendente = false; tocar('glitch'); }
      })
      .catch(() => {});
  }
}
function iniciar() {
  criar();
  if (ctx.state !== 'running') {
    iniciouEm = performance.now();
    ctx.resume().then(() => { atualizarBotao(); trocarAmbiente(); });
  }
}

function pararAmbiente(fade = 0.6) {
  if (!ambiente) return;
  const { src, gain } = ambiente;
  gain.gain.cancelScheduledValues(ctx.currentTime);
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + fade);
  src.stop(ctx.currentTime + fade + 0.05);
  ambiente = null;
}

function trocarAmbiente() {
  if (!ctx || mudo || ctx.state !== 'running') return;
  const nome = ambienteDaTela();
  if (ambiente && ambiente.nome === nome) return;
  if (!buffers[nome]) return;
  pararAmbiente();
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffers[nome];
  src.loop = true;
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(VOLUME[nome], ctx.currentTime + 1.2);
  src.connect(gain).connect(ctx.destination);
  src.start();
  ambiente = { nome, src, gain };
}

// sons com variações: sorteia uma, sem repetir a anterior
const VARIACOES = { instalar: ['instalar', 'instalar-2', 'instalar-3'] };
const ultimaVariacao = {};
function variar(nome) {
  const lista = (VARIACOES[nome] || [nome]).filter((n) => buffers[n] && n !== ultimaVariacao[nome]);
  if (!lista.length) return nome;
  const escolhido = lista[Math.floor(Math.random() * lista.length)];
  ultimaVariacao[nome] = escolhido;
  return escolhido;
}

export function tocar(nome) {
  nome = variar(nome);
  if (mudo || !ctx || ctx.state !== 'running' || !buffers[nome]) return;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffers[nome];
  gain.gain.value = VOLUME[nome];
  src.connect(gain).connect(ctx.destination);
  src.start();
}

// tecla de teclado mecânico, sintetizada (sem arquivo): um estalo curto de
// ruído filtrado, com o timbre variando um pouco a cada letra
let ruido = null;
export function tecla() {
  if (mudo || !ctx || ctx.state !== 'running') return;
  if (!ruido) {
    ruido = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
  }
  const src = ctx.createBufferSource();
  src.buffer = ruido;
  src.playbackRate.value = 0.8 + Math.random() * 0.5;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 2200 + Math.random() * 1600;
  filtro.Q.value = 1.4;
  const gain = ctx.createGain();
  gain.gain.value = 0.18 + Math.random() * 0.06;
  src.connect(filtro).connect(gain).connect(ctx.destination);
  src.start();
}

export function alternarMudo() {
  if (!ctx || ctx.state !== 'running') { iniciar(); return false; }
  // o mesmo gesto (clique ou M) que acabou de liberar o áudio não desliga de novo
  if (performance.now() - iniciouEm < 400) return mudo;
  mudo = !mudo;
  if (mudo) pararAmbiente(0.3);
  else trocarAmbiente();
  atualizarBotao();
  return mudo;
}

/* botão do canto: mostra se tem som e liga/desliga */
const botao = document.querySelector('[data-som]');
function atualizarBotao() {
  if (!botao) return;
  const liberado = ctx && ctx.state === 'running';
  const ligado = liberado && !mudo;
  botao.classList.toggle('som--desligado', !ligado);
  botao.querySelector('[data-som-texto]').textContent = !liberado ? 'Som desligado · ligar' : mudo ? 'Som mudo' : 'Som ligado';
  botao.setAttribute('aria-pressed', String(!!ligado));
}
botao?.addEventListener('click', alternarMudo);
atualizarBotao();

// o glitch de entrada avisa quando começa (js/glitch-intro.js); se o som
// ainda está baixando, toca assim que chegar (só se ainda der tempo)
let glitchPendente = false;
addEventListener('intro-comecou', () => {
  // o áudio pode estar terminando de ligar (resume é assíncrono): espera ele
  if (buffers.glitch && ctx?.state === 'running') tocar('glitch');
  else if (ctx && ctx.state !== 'running') ctx.resume().then(() => tocar('glitch')).catch(() => {});
  else { glitchPendente = true; setTimeout(() => { glitchPendente = false; }, 800); }
});

// tenta tocar já na abertura; se o navegador segurar, o primeiro gesto libera
criar();
for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, iniciar, { once: true });
// trocou de tela: troca o ambiente se for outro
addEventListener('tela', trocarAmbiente);
