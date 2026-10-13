/*
 * Dados da tela Cibernética: perfil (topo e medidores), partes do corpo com
 * os implantes, builds e os closes do zoom.
 */
export const PERFIL = {
  nome: 'Murilo Gonzales',
  nivel: 25,          // minha idade
  credibilidade: 8,   // projetos particulares em destaque
  // medidor da direita (armadura): experiência de campo, empresas por onde passei
  armadura: ['I-SINC', 'Next SI', 'Dialogi', 'SigmaCX'],
  contatos: [
    { rotulo: 'GitHub', icone: 'github', href: 'https://github.com/xzmuh' },
    { rotulo: 'LinkedIn', icone: 'linkedin', href: 'https://www.linkedin.com/in/murilo-trigo-6205b3190/' },
    { rotulo: 'WhatsApp', icone: 'whatsapp', href: 'https://wa.me/5514981647336' },
    { rotulo: 'E-mail', icone: 'gmail', href: 'mailto:murilo_agudos@hotmail.com' },
  ],
};

/*
 * Partes do corpo e os implantes de cada uma. A Cibernética mostra COMO eu
 * trabalho (as ferramentas ficam na tela Habilidades). Cada implante tem um
 * nome que diz o que é e um significado real; `builds` diz para quais vagas ele
 * conta (as builds equipam sozinhas os implantes certos).
 *
 * A ORDEM das partes é a ordem na tela (posições calculadas em js/tela.js).
 * Para tirar uma parte, apague o bloco; para pôr, copie um bloco, troque o
 * id e escolha um `close` de CLOSES. Ícone de cada implante:
 * img/implantes/<id>.webp.
 *
 *   slots    quantos implantes cabem instalados
 *   regiao   contorno do corpo que acende (img/regioes/<regiao>.webp)
 *   opcoes   todos os implantes possíveis da parte (os que sobram ficam
 *            como "disponíveis" no zoom, prontos para instalar)
 *   sub      o que o nome quer dizer, em uma linha (aparece no card)
 *   nivel    1 a 5: raridade (Comum .. Lendário) e o custo no medidor da esquerda
 *   armadura quanto segura o tranco em produção (medidor da direita)
 *   prova    linhas em ciano no card: onde isso aparece de verdade
 */
export const BUILDS = [
  { id: 'back', nome: 'Back-end' },
  { id: 'front', nome: 'Front-end' },
  { id: 'produto', nome: 'Produto & IA' },
];

export const PARTES = [
  // ---------- coluna da esquerda ----------
  {
    id: 'cortex', nome: 'Córtex frontal', lado: 'esq', slots: 2, close: 'cerebro', regiao: 'cortex',
    area: 'Como eu penso',
    opcoes: [
      { id: 'sandevistan-debug', nome: 'Caça-Bug', sub: 'Desacelera o caos e acha o bug', nivel: 5, armadura: 4, builds: ['back', 'produto'],
        texto: 'Quando produção quebra, o tempo desacelera: isolo o bug com calma em vez de sair chutando.', prova: ['Incidentes no ERP fiscal (I-SINC)'] },
      { id: 'coprocessador-regras', nome: 'Tradutor Fiscal', sub: 'Regra fiscal vira código sem erro', nivel: 4, armadura: 3, builds: ['back'],
        texto: 'Traduz regra fiscal e tributária cabeluda em código que não erra a conta.', prova: ['NF-e e SPED (I-SINC)'] },
      { id: 'nucleo-ux', nome: 'Sensor de Usuário', sub: 'Pensa pelo lado de quem usa', nivel: 4, armadura: 1, builds: ['front', 'produto'],
        texto: 'Pensa a tela pelo lado de quem usa antes de escrever a primeira linha.', prova: ['Telas da Dialogi e SigmaCX'] },
    ],
  },
  {
    id: 'bracos', nome: 'Braços', lado: 'esq', slots: 1, close: 'braco', regiao: 'bracos',
    area: 'Força bruta no código',
    opcoes: [
      { id: 'gorila-refatoracao', nome: 'Restaurador de Legado', sub: 'Reconstrói legado sem derrubar', nivel: 4, armadura: 4, builds: ['back'],
        texto: 'Arranca código legado e reconstrói sem derrubar o que está rodando.', prova: ['Refatorações no ERP (I-SINC)'] },
      { id: 'mantis-componentes', nome: 'Fatiador de Telas', sub: 'Corta tela em componentes', nivel: 4, armadura: 2, builds: ['front'],
        texto: 'Corta tela grande em componentes pequenos e reaproveitáveis.', prova: ['Next SI', 'Dialogi'] },
      { id: 'lancador-integracoes', nome: 'Ponte de APIs', sub: 'Conecta sistemas e APIs', nivel: 3, armadura: 2, builds: ['produto'],
        texto: 'Dispara conexões entre sistemas: APIs, webhooks e serviços de nuvem.', prova: ['AWS S3/SES', 'Cloudflare'] },
    ],
  },
  {
    id: 'esqueleto', nome: 'Esqueleto', lado: 'esq', slots: 1, close: 'tronco', regiao: 'tronco',
    area: 'O que me sustenta',
    opcoes: [
      { id: 'chassi-fullstack', nome: 'Coluna Full Stack', sub: 'Aguenta do banco até a tela', nivel: 5, armadura: 8, builds: ['back', 'front', 'produto'],
        texto: 'Aguenta o peso do banco de dados até a tela, sem trincar no meio.', prova: ['6 anos em sistemas reais'] },
    ],
  },
  {
    id: 'nervoso', nome: 'Sistema nervoso', lado: 'esq', slots: 2, close: 'tronco', regiao: 'tronco',
    area: 'Reflexos',
    opcoes: [
      { id: 'kerenzikov-incidente', nome: 'Modo Plantão', sub: 'Reflexo em chamado urgente', nivel: 4, armadura: 5, builds: ['back'],
        texto: 'Reflexo rápido quando o chamado é urgente: diagnóstico primeiro, pânico nunca.', prova: ['Suporte a sistema em produção'] },
      { id: 'estabilizador-prazo', nome: 'Blindagem de Prazo', sub: 'Prazo com data de lei não escapa', nivel: 4, armadura: 5, builds: ['back', 'produto'],
        texto: 'Entrega com data de lei (obrigação fiscal) não atrasa.', prova: ['Prazos de SPED (I-SINC)'] },
      { id: 'sinapse-tempo-real', nome: 'Sinal ao Vivo', sub: 'Tela que atualiza na hora', nivel: 3, armadura: 2, builds: ['front', 'produto'],
        texto: 'Pensa em eventos e telas que atualizam na hora, sem recarregar.', prova: ['Projetos próprios'] },
    ],
  },

  // ---------- coluna da direita ----------
  {
    id: 'so', nome: 'Sistema operacional', lado: 'dir', slots: 1, close: 'so', regiao: 'so',
    area: 'O que roda por trás',
    opcoes: [
      { id: 'deck-ia', nome: 'Núcleo de IA', sub: 'IA rodando no fluxo de trabalho', nivel: 5, armadura: 2, builds: ['produto', 'front'],
        texto: 'IA rodando no fluxo de trabalho: gera, revisa e automatiza, sempre com olho humano no fim.', prova: ['Dialogi', 'SigmaCX'] },
      { id: 'deck-automacao', nome: 'Piloto Automático', sub: 'Trabalho repetido roda sozinho', nivel: 4, armadura: 3, builds: ['back'],
        texto: 'Scripts e pipelines que fazem sozinhos o trabalho repetido.', prova: ['GitHub Actions', 'Deploys automáticos'] },
    ],
  },
  {
    id: 'rosto', nome: 'Rosto', lado: 'dir', slots: 1, close: 'rosto', regiao: 'rosto',
    area: 'Como eu enxergo',
    opcoes: [
      { id: 'optica-pixel', nome: 'Olho de Pixel', sub: 'Vê o 1px fora do lugar', nivel: 5, armadura: 1, builds: ['front', 'produto'],
        texto: 'Enxerga o desalinhamento de 1px e o fluxo de UX que trava o usuário.', prova: ['Este portfólio', 'Next SI'] },
      { id: 'scanner-requisitos', nome: 'Leitor de Entrelinhas', sub: 'Lê o que o cliente não disse', nivel: 3, armadura: 2, builds: ['back'],
        texto: 'Lê o pedido do cliente e acha o que não foi dito.', prova: ['Regras de negócio (I-SINC)'] },
    ],
  },
  {
    id: 'maos', nome: 'Mãos', lado: 'dir', slots: 1, close: 'mao', regiao: 'maos',
    area: 'Como eu entrego',
    opcoes: [
      { id: 'maos-deploy', nome: 'Rampa de Produção', sub: 'Leva o sistema até produção', nivel: 4, armadura: 3, builds: ['back', 'produto'],
        texto: 'Faz o sistema sair do papel e ir para produção, com o deploy redondo.', prova: ['Push na main publica (Pages, Vercel)'] },
      { id: 'maos-prototipo', nome: 'Prototipador', sub: 'Do rascunho ao clicável em horas', nivel: 3, armadura: 1, builds: ['front', 'produto'],
        texto: 'Do rascunho a algo clicável em horas, para testar a ideia cedo.', prova: ['Mini-sites deste currículo'] },
    ],
  },
  {
    id: 'pernas', nome: 'Pernas', lado: 'dir', slots: 1, close: 'joelhos', regiao: 'pernas',
    area: 'Até onde eu vou',
    opcoes: [
      { id: 'salto-stack', nome: 'Adaptador de Stack', sub: 'Troca de stack sem travar', nivel: 5, armadura: 1, builds: ['front', 'produto'],
        texto: 'Pula para tecnologia nova rápido: mobile, 3D, IA.', prova: ['Expo', 'Three.js', 'IA'] },
      { id: 'pernas-maratona', nome: 'Fôlego de Maratona', sub: 'Anos de sistema de pé', nivel: 3, armadura: 6, builds: ['back'],
        texto: 'Anos mantendo sistema grande de pé, sem cair no meio do caminho.', prova: ['ERP fiscal por anos (I-SINC)'] },
    ],
  },
];

/*
 * Imagens de perto (img/close-<nome>.webp) e onde cada uma fica sobre o
 * corpo: centro (cx, cy) e largura (w) em % do corpo, medidos comparando o
 * close com img/corpo.webp. `tela` é o tamanho final do close em px.
 */
export const CLOSES = {
  cerebro: { cx: 50, cy: 4.4, w: 12.2, tela: 760 },
  cabeca: { cx: 50, cy: 10.7, w: 31.2, tela: 780 }, // sem uso agora; fica para quando quiser
  rosto: { cx: 50, cy: 5.8, w: 15, tela: 700 },
  so: { cx: 50, cy: 13.2, w: 15, tela: 720 },
  tronco: { cx: 50, cy: 32, w: 58, tela: 660 },
  braco: { cx: 25.7, cy: 32.6, w: 39.8, tela: 640 },
  mao: { cx: 79.5, cy: 48.7, w: 31.7, tela: 720 },
  joelhos: { cx: 49.3, cy: 65.6, w: 57.5, tela: 760 },
};

export const NIVEL = ['', 'Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'];
