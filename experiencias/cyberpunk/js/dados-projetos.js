/*
 * Projetos (tela no molde do Journal do Cyberpunk 2077: lista de "trabalhos"
 * à esquerda, detalhes à direita). Textos tirados do portfólio; quando tiver
 * mais detalhe de um projeto, é só completar aqui.
 *
 *   grupo        em qual lista ele aparece (GRUPOS)
 *   complexidade Baixa | Moderada | Alta (o "perigo" do jogo)
 *   objetivos    entregas do projeto; feito: false = em andamento
 *   imagem       img/projetos/<arquivo>
 *   url          link do site, quando é público
 */
export const GRUPOS = [
  { id: 'sistemas', nome: 'Trabalhos principais' },
  { id: 'sites', nome: 'Trabalhos paralelos' },
];

export const PROJETOS = [
  {
    id: 'velox', nome: 'Velox CRM', grupo: 'sistemas', tipo: 'Sistema', complexidade: 'Alta',
    imagem: 'velox-crm.webp',
    objetivos: [
      { texto: 'Montar o funil de vendas para concessionárias', feito: true },
      { texto: 'Gestão de leads do primeiro contato até a venda', feito: true },
      { texto: 'Acompanhar as negociações em andamento', feito: true },
    ],
    texto: [
      'CRM feito para concessionárias acompanharem cada venda do primeiro contato até o fechamento.',
      'O funil mostra em que etapa está cada cliente, os leads ficam organizados por origem e responsável, e as negociações em andamento ficam à vista para o time agir no tempo certo.',
    ],
  },
  {
    id: 'beauty', nome: 'Beauty Exp', grupo: 'sistemas', tipo: 'Sistema', complexidade: 'Alta',
    imagem: 'beauty-exp.webp',
    objetivos: [
      { texto: 'Agenda de atendimentos da clínica', feito: true },
      { texto: 'Pacientes, procedimentos e protocolos', feito: true },
      { texto: 'Financeiro da clínica', feito: true },
      { texto: 'Site público com pedido de demonstração', feito: true },
      { texto: 'App para iOS e Android', feito: false },
    ],
    texto: [
      'Sistema completo de gestão para clínicas de estética, pensado para o dia a dia de quem atende.',
      'Reúne em um só lugar a agenda de atendimentos, o cadastro de pacientes com histórico, os procedimentos e protocolos de cada tratamento e o financeiro da clínica. Gera documentos dos atendimentos em PDF e tem login com controle de acesso.',
      'Funciona no navegador e está ganhando versão em app para iOS e Android. Tem também um site público separado, que apresenta o produto e recebe pedidos de demonstração.',
    ],
  },
  {
    id: 'notificacoes', nome: 'API de Notificações', grupo: 'sistemas', tipo: 'API', complexidade: 'Moderada',
    imagem: 'api-notificacoes.webp',
    objetivos: [
      { texto: 'Receber eventos dos sistemas internos', feito: true },
      { texto: 'Distribuir alertas para várias plataformas e clientes', feito: true },
    ],
    texto: [
      'API interna que centraliza os avisos dos sistemas da empresa.',
      'Cada sistema só dispara um evento; a API decide para quem e por onde avisar, distribuindo os alertas para várias plataformas e clientes sem que cada sistema precise saber disso.',
    ],
  },
  {
    id: 'chat', nome: 'Mini Chat IA', grupo: 'sistemas', tipo: 'IA', complexidade: 'Moderada',
    imagem: 'mini-chat-ia.webp',
    objetivos: [
      { texto: 'Rodar IA local (Ollama / Llama)', feito: true },
      { texto: 'Tirar dúvidas sobre processos fiscais', feito: true },
      { texto: 'Sugerir rotinas', feito: true },
    ],
    texto: [
      'Chat com inteligência artificial rodando localmente, sem mandar dados para fora (Ollama com modelos Llama).',
      'Responde dúvidas sobre processos fiscais e sugere rotinas, servindo de apoio rápido para quem lida com essas obrigações no dia a dia.',
    ],
  },
  {
    id: 'dialogi', nome: 'Dialogi', grupo: 'sites', tipo: 'Site', complexidade: 'Alta', url: 'https://dialogi.ai',
    imagem: 'dialogi.webp',
    objetivos: [
      { texto: 'Home da plataforma', feito: true },
      { texto: 'Páginas de Plataforma e de Setores', feito: true },
      { texto: 'Redesign com seções grandes e animadas', feito: true },
    ],
    texto: [
      'Site do Dialogi, a plataforma de IA para atendimento da SigmaCX.',
      'Tem home, páginas da plataforma e páginas por setor, com seções grandes, animações de rolagem e experiências interativas que mostram o produto funcionando.',
    ],
  },
  {
    id: 'sigmacx', nome: 'SigmaCX', grupo: 'sites', tipo: 'Site', complexidade: 'Moderada', url: 'https://sigmacx.ai',
    imagem: 'sigmacx.webp',
    objetivos: [
      { texto: 'Site institucional da plataforma de CX', feito: true },
      { texto: 'Landing pages de canais e de carreiras', feito: true },
      { texto: 'Home mais leve e rápida', feito: true },
    ],
    texto: [
      'Site institucional da SigmaCX, plataforma de experiência do cliente que unifica canais, automação e IA.',
      'Além da home, tem landing pages de canais e de carreiras, com cenas 3D e animações, e uma home otimizada para carregar rápido.',
    ],
  },
  {
    id: 'tecnoglass', nome: 'Tecnoglass', grupo: 'sites', tipo: 'Site', complexidade: 'Baixa', url: 'https://tecnoglassbrasil.com.br',
    imagem: 'tecnoglass.webp',
    objetivos: [
      { texto: 'Site institucional da Tecnoglass Brasil', feito: true },
    ],
    texto: [
      'Site institucional da Tecnoglass Brasil, apresentando a empresa e o que ela oferece.',
    ],
  },
  {
    id: 'freplan', nome: 'Freplan', grupo: 'sites', tipo: 'Site', complexidade: 'Baixa',
    imagem: 'freplan.webp',
    objetivos: [
      { texto: 'Site institucional e catálogo de usinagem sob medida', feito: true },
      { texto: 'Orçamento direto pelo WhatsApp', feito: true },
    ],
    texto: [
      'Site institucional e catálogo da Freplan, de usinagem sob medida.',
      'O cliente navega pelo catálogo e pede orçamento direto pelo WhatsApp, sem formulário no meio.',
    ],
  },
];
