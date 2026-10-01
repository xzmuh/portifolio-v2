/* Efeitos sonoros sintetizados na hora (Web Audio), sem arquivos: clique,
   rangido de porta, papel, rabisco de lápis e passos. O navegador só libera
   áudio depois de um gesto do usuário, então o contexto nasce no primeiro
   clique, tecla ou rolagem. */

let ctx = null;
let saida = null;
let ligado = true;
let ruidoBranco = null;

function prepara() {
  if (ctx) return ctx.state === 'suspended' ? ctx.resume() : null;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  saida = ctx.createGain();
  saida.gain.value = 0.55;
  saida.connect(ctx.destination);
  // 2 s de ruído branco reaproveitado por todos os efeitos
  ruidoBranco = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const dados = ruidoBranco.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
  return null;
}
for (const ev of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(ev, prepara, { passive: true });

export function alternaSom() {
  ligado = !ligado;
  if (saida) saida.gain.value = ligado ? 0.55 : 0;
  return ligado;
}

const pronto = () => ctx && ctx.state === 'running' && ligado;

// ruído filtrado com envelope: base de quase todos os efeitos
function ruido({ dur, freq, q = 1, tipo = 'bandpass', vol = 0.3, ataque = 0.005, freqFim = null, quando = 0 }) {
  const t0 = ctx.currentTime + quando;
  const fonte = ctx.createBufferSource();
  fonte.buffer = ruidoBranco;
  const filtro = ctx.createBiquadFilter();
  filtro.type = tipo;
  filtro.frequency.setValueAtTime(freq, t0);
  if (freqFim) filtro.frequency.exponentialRampToValueAtTime(freqFim, t0 + dur);
  filtro.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + ataque);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  fonte.connect(filtro).connect(g).connect(saida);
  fonte.start(t0, Math.random() * 1.5);
  fonte.stop(t0 + dur + 0.05);
  return g;
}

export function clique() {
  if (!pronto()) return;
  ruido({ dur: 0.05, freq: 2500, q: 2, vol: 0.35 });
  const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime;
  o.frequency.setValueAtTime(180, t0);
  o.frequency.exponentialRampToValueAtTime(70, t0 + 0.08);
  g.gain.setValueAtTime(0.25, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
  o.connect(g).connect(saida);
  o.start(t0); o.stop(t0 + 0.12);
}

// rangido: dente-de-serra grave com a afinação "engasgando", passando por um filtro
export function rangido() {
  if (!pronto()) return;
  const t0 = ctx.currentTime, dur = 0.9;
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(95, t0);
  for (let i = 1; i <= 12; i++) o.frequency.linearRampToValueAtTime(80 + Math.random() * 70, t0 + (i / 12) * dur);
  f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.12, t0 + 0.08);
  g.gain.linearRampToValueAtTime(0.06, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f).connect(g).connect(saida);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

export function papel() {
  if (!pronto()) return;
  ruido({ dur: 0.28, freq: 1800, freqFim: 4200, q: 0.8, vol: 0.18, ataque: 0.04 });
}

// rabisco: ruído agudo "picotado" a 14–20 Hz, como grafite raspando no papel
export function rabisco(duracao = 0.45) {
  if (!pronto()) return;
  const riscos = Math.round(duracao * (14 + Math.random() * 6));
  for (let i = 0; i < riscos; i++) {
    ruido({ dur: 0.05 + Math.random() * 0.04, freq: 3200 + Math.random() * 2500, q: 1.4, vol: 0.05 + Math.random() * 0.05, quando: (i / riscos) * duracao });
  }
}

export function passo() {
  if (!pronto()) return;
  ruido({ dur: 0.12, freq: 380 + Math.random() * 120, tipo: 'lowpass', q: 0.7, vol: 0.22, ataque: 0.01 });
}

// miado: dois tons deslizando com um tremidinho
export function miau() {
  if (!pronto()) return;
  const t0 = ctx.currentTime, dur = 0.55;
  const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(520, t0);
  o.frequency.linearRampToValueAtTime(780, t0 + 0.18);
  o.frequency.exponentialRampToValueAtTime(430, t0 + dur);
  vib.frequency.value = 7; vg.gain.value = 12;
  vib.connect(vg).connect(o.frequency);
  f.type = 'bandpass'; f.frequency.setValueAtTime(1100, t0); f.frequency.linearRampToValueAtTime(1800, t0 + 0.2); f.Q.value = 3;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.12, t0 + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f).connect(g).connect(saida);
  o.start(t0); vib.start(t0); o.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05);
}
