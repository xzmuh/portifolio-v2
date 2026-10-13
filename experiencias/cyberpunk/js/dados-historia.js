/*
 * História: as empresas por onde passei, como pontos num mapa de cidade
 * (molde do mapa do Cyberpunk 2077). A ordem é a ordem da rota amarela.
 *
 *   lote     onde fica no mapa, em cruzamentos da grade (x, z): 0,0 é o centro
 *   bairro   nome que aparece no mapa, como as avenidas do jogo
 *   feitos   tópicos do que fiz lá
 *   marca    identidade no mapa: cores, logo (img/empresas) e a forma do prédio-marco
 */
export const EMPRESAS = [
  {
    id: 'isinc', nome: 'I-SINC', cargo: 'Full Stack Developer', local: 'Agudos, SP',
    periodo: 'Mai 2021 — Fev 2026', duracao: '4 anos e 10 meses', bairro: 'Distrito Agudos',
    marca: { cor: 0x7b3cff, cor2: 0x2f6bff, logo: 'isinc.png', forma: 'anel' },
    lote: [-20, 16],
    resumo: 'Sistemas web com foco em ERP, back-end, front-end, banco de dados, integrações e regras de negócio, usados em operação real.',
    feitos: ['APIs REST entre módulos do sistema', 'Front-end com Angular, HTML, CSS e TypeScript', 'Regras de negócio para ERP e relatórios dinâmicos', 'Otimização de consultas em PostgreSQL e MySQL', 'Integrações com AWS S3 e SES'],
    stack: ['Angular', 'Node.js', 'NestJS', 'PostgreSQL', 'MySQL', 'AWS'],
  },
  {
    id: 'nextsi', nome: 'Next SI', cargo: 'Full Stack Developer', local: 'Bauru, SP · Híbrido',
    periodo: 'Mai 2026 — hoje', duracao: 'atual', bairro: 'Centro Bauru',
    marca: { cor: 0x86c440, cor2: 0x4f8f1f, logo: 'next.png', forma: 'setas' },
    lote: [0, 6],
    resumo: 'Desenvolvimento e manutenção de sistemas web, principalmente com React no front-end e PHP no back-end.',
    feitos: ['Telas e funcionalidades com React', 'Manutenção e evolução de sistemas em PHP', 'Regras de negócio e correção de bugs', 'IA aplicada nos fluxos'],
    stack: ['React', 'PHP', 'JavaScript', 'HTML', 'CSS', 'Git'],
  },
  {
    id: 'dialogi', nome: 'Dialogi', cargo: 'Front-end Engineer', local: 'Remoto',
    periodo: 'Ago 2026 — hoje', duracao: 'atual', bairro: 'Rede Dialogi',
    marca: { cor: 0x1ee06f, cor2: 0x0fa356, logo: 'dialogi.png', forma: 'barras' },
    lote: [16, -12],
    resumo: 'Sites, landing pages e interfaces web para a dialogi.ai, com experiências interativas e IA no dia a dia.',
    feitos: ['Sites, landing pages e interfaces web', 'Experiências interativas e minigames', 'Integração com APIs e serviços externos', 'IA em desenvolvimento e automações'],
    stack: ['React', 'TypeScript', 'JavaScript', 'Cloudflare', 'IA'],
  },
  {
    id: 'sigmacx', nome: 'SigmaCX', cargo: 'Front-end Engineer', local: 'Remoto',
    periodo: 'Ago 2026 — hoje', duracao: 'atual', bairro: 'Torre SigmaCX',
    marca: { cor: 0x3fd6b4, cor2: 0x5aa8e6, logo: 'sigmacx.png', forma: 'sigma' },
    lote: [4, -26],
    resumo: 'Interfaces web e aplicações front-end da SigmaCX, com soluções digitais para campanhas e projetos.',
    feitos: ['Interfaces web e aplicações front-end', 'Experiências interativas para campanhas', 'Integração com APIs e serviços externos', 'IA em desenvolvimento e automações'],
    stack: ['React', 'TypeScript', 'JavaScript', 'APIs', 'IA'],
  },
];
