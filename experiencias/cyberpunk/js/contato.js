/*
 * Tela Contato: ao abrir, toca o som de mensagem nova com o "digitando..."
 * na tela e, quando ele acaba, o texto é digitado no balão. Depois, as formas de contato viram
 * opções de resposta, como os diálogos do jogo.
 */
import { PERFIL } from './dados.js';
import { tocar, tecla } from './som.js';

const MENSAGEM = [
  'E aí, aqui é o Murilo. Dev full stack.',
  'Precisa de um sistema ou site? Me chama:',
];
const RESPOSTA = { 'E-mail': 'Mandar um e-mail', WhatsApp: 'Chamar no WhatsApp', LinkedIn: 'Ver o LinkedIn', GitHub: 'Ver o código no GitHub' };

const conversa = document.querySelector('[data-msg-conversa]');
const respostas = document.querySelector('[data-msg-respostas]');
const calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let rodada = 0; // cada abertura cancela a anterior

respostas.append(...PERFIL.contatos.map((c) => {
  const a = document.createElement('a');
  a.className = 'msg_opcao';
  a.href = c.href;
  if (!c.href.startsWith('mailto:')) { a.target = '_blank'; a.rel = 'noopener'; }
  a.innerHTML = `<img src="img/icones/${c.icone}.svg" alt="" /><span></span><small></small>`;
  a.querySelector('span').textContent = RESPOSTA[c.rotulo] || c.rotulo;
  a.querySelector('small').textContent = c.rotulo;
  a.addEventListener('mouseenter', () => tocar('hover'));
  return a;
}));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function receber() {
  const minha = ++rodada;
  conversa.replaceChildren();
  respostas.hidden = true;
  // o som de mensagem nova toca sozinho primeiro; as teclas só começam
  // depois que ele acaba (o "digitando..." fica na tela enquanto isso)
  const somMsg = tocar('mensagem');
  for (const [i, frase] of MENSAGEM.entries()) {
    if (!calmo) {
      const dig = document.createElement('div');
      dig.className = 'msg_digitando';
      dig.innerHTML = '<i></i><i></i><i></i>';
      conversa.append(dig);
      await espera(i === 0 ? Math.max(700, somMsg * 1000 + 120) : 450);
      if (minha !== rodada) return;
      dig.remove();
    }
    const balao = document.createElement('p');
    balao.className = 'msg_balao';
    conversa.append(balao);
    if (calmo) balao.textContent = frase;
    else {
      for (let k = 1; k <= frase.length; k++) {
        balao.textContent = frase.slice(0, k);
        // uma tecla a cada letra (espaço não faz barulho)
        if (frase[k - 1] !== ' ') tecla();
        await espera(32);
        if (minha !== rodada) return;
      }
    }
    balao.classList.add('msg_balao--fim');
  }
  respostas.hidden = false;
}

addEventListener('tela', (e) => { if (e.detail === 'contato') receber(); else rodada++; });
if (document.body.dataset.tela === 'contato') receber();
