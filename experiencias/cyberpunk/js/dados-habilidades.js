/*
 * Árvore de habilidades (tela Habilidades), no molde da árvore de perks do
 * Cyberpunk 2077 2.0. Cada categoria é uma aba. Diferente da Cibernética
 * (ferramentas), aqui é o que eu sei FAZER.
 *
 * Nó principal:
 *   nivel    0 a 3: 3 dominado, 1-2 em evolução, 0 meta (estudando)
 *   col,lin  posição: col -3..3 (0 = centro), lin 0 (topo) .. 3 (base)
 *   pai      principal de onde sai o trilho
 *   lenda    true = nó grande octogonal do topo (meta maior)
 *   sat      satélites: sub-habilidades presas ao lado (ok = já tenho)
 *
 * Para pôr um nó: copie um bloco e troque id/col/lin/pai. Para tirar: apague
 * o bloco (e mude o pai de quem saía dele).
 */
export const CATEGORIAS = [
  {
    id: 'backend', nome: 'Back-end',
    nos: [
      { id: 'api', nome: 'APIs REST', icone: 'api', nivel: 3, col: 0, lin: 3,
        texto: 'Desenho e manutenção de APIs completas, do contrato à documentação.', onde: ['I-SINC', 'SigmaCX'],
        sat: [{ nome: 'Node.js', icone: 'hex', ok: true }, { nome: 'NestJS', icone: 'camadas', ok: true }, { nome: 'PHP', icone: 'doc', ok: true }, { nome: 'Documentação', icone: 'lista', ok: true }] },
      { id: 'regras', nome: 'Regras de negócio', icone: 'balanca', nivel: 3, col: 0, lin: 2, pai: 'api',
        texto: 'Transformar regra complexa (fiscal, tributária, operacional) em código seguro.', onde: ['I-SINC'],
        sat: [{ nome: 'NF-e e SPED', icone: 'selo', ok: true }, { nome: 'Sistemas ERP', icone: 'tabela', ok: true }] },
      { id: 'integra', nome: 'Integrações', icone: 'plugue', nivel: 3, col: 0, lin: 1, pai: 'regras',
        texto: 'Ligar sistemas entre si e com serviços externos.', onde: ['I-SINC'],
        sat: [{ nome: 'AWS S3 e SES', icone: 'nuvem', ok: true }, { nome: 'Webhooks', icone: 'raio', ok: true }] },
      { id: 'filas', nome: 'Filas e jobs', icone: 'lista', nivel: 1, col: -2, lin: 2, pai: 'regras',
        texto: 'Processamento em segundo plano e tarefas agendadas.', onde: ['Projetos próprios'],
        sat: [{ nome: 'Tarefas agendadas', icone: 'relogio', ok: true }, { nome: 'Processamento em lote', icone: 'cubos', ok: false }] },
      { id: 'eventos', nome: 'Eventos e tempo real', icone: 'raio', nivel: 1, col: 2, lin: 2, pai: 'regras',
        texto: 'Arquiteturas orientadas a eventos e telas que atualizam na hora.', onde: ['Projetos próprios'],
        sat: [{ nome: 'Atualização ao vivo', icone: 'relogio', ok: true }, { nome: 'Mensageria', icone: 'plugue', ok: false }] },
      { id: 'arquiteto', nome: 'Arquiteto de sistemas', icone: 'cubos', nivel: 0, col: 0, lin: 0, pai: 'integra', lenda: true,
        texto: 'Meta: desenhar sistemas inteiros de ponta a ponta, em escala.', onde: ['Estudando'] },
      { id: 'micro', nome: 'Microsserviços', icone: 'cubo', nivel: 0, col: -2, lin: 0, pai: 'filas', lenda: true,
        texto: 'Meta: serviços independentes operando em alta escala.', onde: ['Estudando'] },
    ],
  },
  {
    id: 'dados', nome: 'Dados',
    nos: [
      { id: 'sql', nome: 'SQL otimizado', icone: 'banco', nivel: 3, col: 0, lin: 3,
        texto: 'Consultas pesadas reescritas para rodar rápido em base grande.', onde: ['I-SINC'],
        sat: [{ nome: 'PostgreSQL', icone: 'banco', ok: true }, { nome: 'MySQL', icone: 'banco', ok: true }, { nome: 'Índices', icone: 'lista', ok: true }, { nome: 'Planos de execução', icone: 'grafico', ok: true }] },
      { id: 'modelo', nome: 'Modelagem relacional', icone: 'tabela', nivel: 3, col: 0, lin: 2, pai: 'sql',
        texto: 'Tabelas, chaves, índices e integridade.', onde: ['I-SINC'],
        sat: [{ nome: 'Normalização', icone: 'camadas', ok: true }, { nome: 'Migrações', icone: 'foguete', ok: true }] },
      { id: 'relat', nome: 'Relatórios dinâmicos', icone: 'doc', nivel: 3, col: -2, lin: 2, pai: 'modelo',
        texto: 'Relatórios com filtros e agrupamentos montados na hora.', onde: ['I-SINC'],
        sat: [{ nome: 'Filtros dinâmicos', icone: 'lista', ok: true }, { nome: 'Exportação', icone: 'doc', ok: true }] },
      { id: 'dash', nome: 'Dashboards', icone: 'grafico', nivel: 2, col: -2, lin: 1, pai: 'relat',
        texto: 'Painéis para quem decide, com os números certos.', onde: ['I-SINC'],
        sat: [{ nome: 'Indicadores', icone: 'grafico', ok: true }, { nome: 'Tempo real', icone: 'relogio', ok: false }] },
      { id: 'fiscal', nome: 'Documentos fiscais', icone: 'selo', nivel: 3, col: 2, lin: 2, pai: 'modelo',
        texto: 'Leitura e geração de NF-e e arquivos SPED.', onde: ['I-SINC'],
        sat: [{ nome: 'NF-e', icone: 'selo', ok: true }, { nome: 'SPED', icone: 'doc', ok: true }] },
      { id: 'nosql', nome: 'NoSQL', icone: 'folha', nivel: 1, col: 0, lin: 1, pai: 'modelo',
        texto: 'Dados sem esquema fixo em projetos próprios.', onde: ['Projetos próprios'],
        sat: [{ nome: 'MongoDB', icone: 'folha', ok: true }, { nome: 'Redis', icone: 'raio', ok: false }] },
      { id: 'eng', nome: 'Engenharia de dados', icone: 'cubos', nivel: 0, col: 0, lin: 0, pai: 'nosql', lenda: true,
        texto: 'Meta: pipelines e bases analíticas separadas da operação.', onde: ['Estudando'] },
    ],
  },
  {
    id: 'frontend', nome: 'Front-end',
    nos: [
      { id: 'resp', nome: 'Interfaces responsivas', icone: 'tela', nivel: 3, col: 0, lin: 3,
        texto: 'Sites e sistemas que funcionam em qualquer tamanho de tela.', onde: ['Next SI', 'Portfólio'],
        sat: [{ nome: 'HTML', icone: 'doc', ok: true }, { nome: 'CSS', icone: 'paleta', ok: true }, { nome: 'Tailwind', icone: 'camadas', ok: true }, { nome: 'Mobile first', icone: 'celular', ok: true }] },
      { id: 'react', nome: 'React', icone: 'atomo', nivel: 3, col: 0, lin: 2, pai: 'resp',
        texto: 'As telas de todos os produtos atuais.', onde: ['Next SI', 'Dialogi', 'SigmaCX'],
        sat: [{ nome: 'TypeScript', icone: 'chip', ok: true }, { nome: 'Hooks e estado', icone: 'engrenagem', ok: true }] },
      { id: 'angular', nome: 'Angular', icone: 'escudo', nivel: 2, col: -2, lin: 3, pai: 'resp',
        texto: 'Front do ERP fiscal por anos.', onde: ['I-SINC'],
        sat: [{ nome: 'RxJS', icone: 'raio', ok: true }, { nome: 'Formulários', icone: 'lista', ok: true }] },
      { id: 'anim', nome: 'Animação', icone: 'play', nivel: 2, col: 2, lin: 3, pai: 'resp',
        texto: 'Movimento com propósito, sem pesar a página.', onde: ['Portfólio'],
        sat: [{ nome: 'GSAP', icone: 'play', ok: true }, { nome: 'CSS', icone: 'paleta', ok: true }] },
      { id: 'tres', nome: '3D na web', icone: 'cubo', nivel: 2, col: 2, lin: 1, pai: 'anim',
        texto: 'Three.js: o RPG e os mini-sites deste currículo.', onde: ['Portfólio'],
        sat: [{ nome: 'Three.js', icone: 'cubo', ok: true }, { nome: 'Shaders', icone: 'chip', ok: false }] },
      { id: 'design', nome: 'Design system', icone: 'paleta', nivel: 1, col: 0, lin: 1, pai: 'react',
        texto: 'Componentes e tokens reaproveitados entre telas.', onde: ['Dialogi'],
        sat: [{ nome: 'Componentes', icone: 'camadas', ok: true }, { nome: 'Tokens', icone: 'paleta', ok: false }] },
      { id: 'acess', nome: 'Acessibilidade', icone: 'olho', nivel: 1, col: -2, lin: 1, pai: 'react',
        texto: 'Teclado, leitores de tela e contraste.', onde: ['Projetos próprios'],
        sat: [{ nome: 'Teclado', icone: 'lista', ok: true }, { nome: 'Leitor de tela', icone: 'olho', ok: false }] },
      { id: 'gpu', nome: 'WebGPU', icone: 'chip', nivel: 0, col: 2, lin: 0, pai: 'tres', lenda: true,
        texto: 'Meta: cenas e efeitos pesados direto na placa de vídeo.', onde: ['Estudando'] },
      { id: 'ref', nome: 'Front-end de referência', icone: 'tela', nivel: 0, col: 0, lin: 0, pai: 'design', lenda: true,
        texto: 'Meta: interfaces que viram referência de qualidade.', onde: ['Estudando'] },
    ],
  },
  {
    id: 'produto', nome: 'Produto & IA',
    nos: [
      { id: 'saas', nome: 'Produtos SaaS', icone: 'nuvem', nivel: 2, col: 0, lin: 3,
        texto: 'Produtos com vários clientes na mesma base.', onde: ['Dialogi', 'SigmaCX'],
        sat: [{ nome: 'Multi-cliente', icone: 'cubos', ok: true }, { nome: 'Planos e assinaturas', icone: 'selo', ok: false }] },
      { id: 'ia', nome: 'IA em produtos', icone: 'cerebro', nivel: 2, col: 0, lin: 2, pai: 'saas',
        texto: 'Recursos de IA dentro do produto, não só demo.', onde: ['Dialogi', 'SigmaCX'],
        sat: [{ nome: 'LLMs em produção', icone: 'cerebro', ok: true }, { nome: 'Prompts e avaliação', icone: 'lista', ok: true }] },
      { id: 'cloud', nome: 'Cloud', icone: 'nuvem', nivel: 2, col: -2, lin: 2, pai: 'saas',
        texto: 'AWS (S3, SES) e Cloudflare (Workers, Pages).', onde: ['I-SINC', 'Dialogi'],
        sat: [{ nome: 'AWS', icone: 'nuvem', ok: true }, { nome: 'Cloudflare', icone: 'escudo', ok: true }] },
      { id: 'deploy', nome: 'Deploy contínuo', icone: 'foguete', nivel: 2, col: -2, lin: 1, pai: 'cloud',
        texto: 'Push na main publica: GitHub Actions, Pages, Vercel.', onde: ['Projetos próprios'],
        sat: [{ nome: 'GitHub Actions', icone: 'engrenagem', ok: true }, { nome: 'Vercel e Pages', icone: 'foguete', ok: true }] },
      { id: 'auto', nome: 'Automações', icone: 'engrenagem', nivel: 2, col: 2, lin: 2, pai: 'ia',
        texto: 'Tarefas repetidas que passam a rodar sozinhas.', onde: ['Projetos próprios'],
        sat: [{ nome: 'Scripts', icone: 'doc', ok: true }, { nome: 'Integrações', icone: 'plugue', ok: true }] },
      { id: 'mobile', nome: 'Apps mobile', icone: 'celular', nivel: 1, col: 2, lin: 3, pai: 'saas',
        texto: 'React Native com Expo.', onde: ['Beauty'],
        sat: [{ nome: 'Expo', icone: 'celular', ok: true }, { nome: 'Publicar nas lojas', icone: 'foguete', ok: false }] },
      { id: 'ferramentas', nome: 'IA no fluxo de trabalho', icone: 'robo', nivel: 2, col: 0, lin: 1, pai: 'ia',
        texto: 'Assistentes de código no dia a dia, com revisão humana.', onde: ['Dia a dia'],
        sat: [{ nome: 'Assistentes de código', icone: 'robo', ok: true }, { nome: 'MCP', icone: 'plugue', ok: false }] },
      { id: 'agentes', nome: 'Agentes autônomos', icone: 'robo', nivel: 0, col: 0, lin: 0, pai: 'ferramentas', lenda: true,
        texto: 'Meta: agentes que executam fluxos inteiros com ferramentas.', onde: ['Estudando'] },
    ],
  },
];
