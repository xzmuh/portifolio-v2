/*
 * Árvore de habilidades (tela Habilidades), no molde da árvore de perks do
 * Cyberpunk 2077 2.0. Cada categoria é uma aba. Diferente da Cibernética
 * (como eu trabalho), aqui é o que eu sei FAZER e onde já usei.
 *
 * Nó principal:
 *   col,lin  posição: col -3..3 (0 = centro), lin 1 (topo) .. 3 (base)
 *   pai      principal de onde sai o trilho
 *   onde     empresas (História) e projetos (Projetos) em que usei
 *   sat      satélites: ferramentas daquela habilidade
 *
 * Só entra o que já foi usado de verdade em algum lugar listado.
 */
export const CATEGORIAS = [
  {
    id: 'backend', nome: 'Back-end',
    nos: [
      { id: 'api', nome: 'APIs REST', icone: 'api', col: 0, lin: 3,
        texto: 'Desenho e manutenção de APIs completas, do contrato à documentação.', onde: ['I-SINC', 'Next SI', 'API de Notificações', 'Beauty Exp'],
        sat: [{ nome: 'Node.js', icone: 'hex' }, { nome: 'NestJS', icone: 'camadas' }, { nome: 'PHP', icone: 'doc' }, { nome: 'Documentação', icone: 'lista' }] },
      { id: 'regras', nome: 'Regras de negócio', icone: 'balanca', col: 0, lin: 2, pai: 'api',
        texto: 'Transformar regra complexa (fiscal, tributária, operacional) em código seguro.', onde: ['I-SINC', 'Next SI'],
        sat: [{ nome: 'NF-e e SPED', icone: 'selo' }, { nome: 'Sistemas ERP', icone: 'tabela' }] },
      { id: 'integra', nome: 'Integrações', icone: 'plugue', col: 0, lin: 1, pai: 'regras',
        texto: 'Ligar sistemas entre si e com serviços externos.', onde: ['I-SINC', 'API de Notificações'],
        sat: [{ nome: 'AWS S3 e SES', icone: 'nuvem' }, { nome: 'Webhooks', icone: 'raio' }] },
      { id: 'eventos', nome: 'Eventos e alertas', icone: 'raio', col: 2, lin: 2, pai: 'regras',
        texto: 'Sistemas disparam eventos e os avisos chegam a quem precisa, por onde precisa.', onde: ['API de Notificações'] },
    ],
  },
  {
    id: 'dados', nome: 'Dados',
    nos: [
      { id: 'sql', nome: 'SQL otimizado', icone: 'banco', col: 0, lin: 3,
        texto: 'Consultas pesadas reescritas para rodar rápido em base grande.', onde: ['I-SINC'],
        sat: [{ nome: 'PostgreSQL', icone: 'banco' }, { nome: 'MySQL', icone: 'banco' }, { nome: 'Índices', icone: 'lista' }, { nome: 'Planos de execução', icone: 'grafico' }] },
      { id: 'modelo', nome: 'Modelagem relacional', icone: 'tabela', col: 0, lin: 2, pai: 'sql',
        texto: 'Tabelas, chaves, índices e integridade.', onde: ['I-SINC', 'Beauty Exp', 'Velox CRM'],
        sat: [{ nome: 'Normalização', icone: 'camadas' }, { nome: 'Migrações', icone: 'foguete' }] },
      { id: 'relat', nome: 'Relatórios dinâmicos', icone: 'doc', col: -2, lin: 2, pai: 'modelo',
        texto: 'Relatórios com filtros e agrupamentos montados na hora.', onde: ['I-SINC'],
        sat: [{ nome: 'Filtros dinâmicos', icone: 'lista' }, { nome: 'Exportação', icone: 'doc' }] },
      { id: 'dash', nome: 'Dashboards', icone: 'grafico', col: -2, lin: 1, pai: 'relat',
        texto: 'Painéis para quem decide, com os números certos.', onde: ['I-SINC'] },
      { id: 'fiscal', nome: 'Documentos fiscais', icone: 'selo', col: 2, lin: 2, pai: 'modelo',
        texto: 'Leitura e geração de NF-e e arquivos SPED.', onde: ['I-SINC', 'Mini Chat IA'],
        sat: [{ nome: 'NF-e', icone: 'selo' }, { nome: 'SPED', icone: 'doc' }] },
    ],
  },
  {
    id: 'frontend', nome: 'Front-end',
    nos: [
      { id: 'resp', nome: 'Interfaces responsivas', icone: 'tela', col: 0, lin: 3,
        texto: 'Sites e sistemas que funcionam em qualquer tamanho de tela.', onde: ['Next SI', 'Tecnoglass', 'Freplan', 'Portfólio'],
        sat: [{ nome: 'HTML', icone: 'doc' }, { nome: 'CSS', icone: 'paleta' }, { nome: 'Tailwind', icone: 'camadas' }, { nome: 'Mobile first', icone: 'celular' }] },
      { id: 'react', nome: 'React', icone: 'atomo', col: 0, lin: 2, pai: 'resp',
        texto: 'As telas dos produtos em que trabalho hoje.', onde: ['Next SI', 'Dialogi', 'SigmaCX', 'Beauty Exp'],
        sat: [{ nome: 'TypeScript', icone: 'chip' }, { nome: 'Hooks e estado', icone: 'engrenagem' }] },
      { id: 'angular', nome: 'Angular', icone: 'escudo', col: -2, lin: 3, pai: 'resp',
        texto: 'Front do ERP fiscal por anos.', onde: ['I-SINC'],
        sat: [{ nome: 'RxJS', icone: 'raio' }, { nome: 'Formulários', icone: 'lista' }] },
      { id: 'anim', nome: 'Animação', icone: 'play', col: 2, lin: 3, pai: 'resp',
        texto: 'Movimento com propósito, sem pesar a página.', onde: ['Dialogi', 'SigmaCX', 'Portfólio'],
        sat: [{ nome: 'GSAP', icone: 'play' }, { nome: 'CSS', icone: 'paleta' }] },
      { id: 'tres', nome: '3D na web', icone: 'cubo', col: 2, lin: 1, pai: 'anim',
        texto: 'Cenas 3D com Three.js, como o mapa da História.', onde: ['SigmaCX', 'Portfólio'] },
      { id: 'design', nome: 'Design system', icone: 'paleta', col: 0, lin: 1, pai: 'react',
        texto: 'Componentes reaproveitados entre telas.', onde: ['Dialogi'] },
    ],
  },
  {
    id: 'produto', nome: 'Produto & IA',
    nos: [
      { id: 'saas', nome: 'Sistemas completos', icone: 'nuvem', col: 0, lin: 3,
        texto: 'Produtos inteiros, do banco à tela, usados no dia a dia de quem atende e vende.', onde: ['Beauty Exp', 'Velox CRM'],
        sat: [{ nome: 'Login e acessos', icone: 'escudo' }, { nome: 'PDF', icone: 'doc' }] },
      { id: 'ia', nome: 'IA em produtos', icone: 'cerebro', col: 0, lin: 2, pai: 'saas',
        texto: 'Recursos de IA dentro do produto, não só demo.', onde: ['Dialogi', 'SigmaCX', 'Mini Chat IA'],
        sat: [{ nome: 'IA local (Ollama)', icone: 'cerebro' }, { nome: 'Prompts', icone: 'lista' }] },
      { id: 'cloud', nome: 'Cloud', icone: 'nuvem', col: -2, lin: 2, pai: 'saas',
        texto: 'AWS (S3, SES) e Cloudflare.', onde: ['I-SINC', 'Dialogi'],
        sat: [{ nome: 'AWS', icone: 'nuvem' }, { nome: 'Cloudflare', icone: 'escudo' }] },
      { id: 'deploy', nome: 'Deploy contínuo', icone: 'foguete', col: -2, lin: 1, pai: 'cloud',
        texto: 'Push na main publica sozinho.', onde: ['SigmaCX', 'Portfólio'],
        sat: [{ nome: 'GitHub Actions', icone: 'engrenagem' }, { nome: 'Pages', icone: 'foguete' }] },
      { id: 'mobile', nome: 'Apps mobile', icone: 'celular', col: 2, lin: 3, pai: 'saas',
        texto: 'React Native com Expo.', onde: ['Beauty Exp'] },
      { id: 'ferramentas', nome: 'IA no fluxo de trabalho', icone: 'robo', col: 0, lin: 1, pai: 'ia',
        texto: 'IA aplicada nos fluxos do dia a dia, com revisão humana.', onde: ['Next SI'] },
    ],
  },
];
