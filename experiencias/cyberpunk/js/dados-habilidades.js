/*
 * Árvore de habilidades (tela Habilidades), no molde da árvore de perks do
 * Cyberpunk 2077 (a árvore Relic). Cada aba é uma parte da stack. Só entram tecnologias
 * que já estão na História (stack das empresas) ou nos Projetos; sem nível
 * e sem dizer onde, para não inventar nada.
 *
 *   x,y      posição em px a partir do nó central (o que não tem pai);
 *            as vagas seguem a Relic: par de dentro em cima (±90,-170),
 *            par de fora (±300,-110), pontas (±520,-110), embaixo (±130,140)
 *            e (±370,140)
 *   pai      nó de onde sai o trilho
 *   arte     ilustração em img/perks/<arte>.webp (sem ela, fica o ícone)
 *   texto    o que é a tecnologia, em uma frase
 *   bloqueado  nó trancado na ponta de um galho: o projeto de quem está vendo,
 *              que só abre no contato (clicar leva para a tela Contato)
 */
const TEXTO_BLOQUEADO = 'Esse slot abre quando a gente começar um projeto juntos. Clique para falar comigo.';

export const CATEGORIAS = [
  {
    id: 'backend', nome: 'Back-end',
    nos: [
      { id: 'node', nome: 'Node.js', icone: 'hex', arte: 'backend-eventos', x: 0, y: 0,
        texto: 'JavaScript rodando no servidor.' },
      { id: 'nest', nome: 'NestJS', icone: 'camadas', arte: 'backend-arquiteto', x: -90, y: -170, pai: 'node',
        texto: 'Framework para organizar APIs em Node.js.' },
      { id: 'api', nome: 'APIs REST', icone: 'api', arte: 'backend-api', x: -300, y: -110, pai: 'nest',
        texto: 'Como os sistemas conversam entre si.' },
      { id: 'php', nome: 'PHP', icone: 'doc', arte: 'backend-regras', x: -130, y: 140, pai: 'node',
        texto: 'Linguagem de servidor de muitos sistemas web.' },
      { id: 'rust', nome: 'Rust', icone: 'engrenagem', arte: 'backend-micro', x: 90, y: -170, pai: 'node',
        texto: 'Linguagem rápida e segura para código que não pode falhar.' },
      { id: 'bevy', nome: 'Bevy', icone: 'play', arte: 'backend-filas', x: 300, y: -110, pai: 'rust',
        texto: 'Engine de jogos feita em Rust.' },
      { id: 'postgres', nome: 'PostgreSQL', icone: 'banco', arte: 'dados-sql', x: 130, y: 140, pai: 'node',
        texto: 'Banco de dados relacional.' },
      { id: 'mysql', nome: 'MySQL', icone: 'tabela', arte: 'dados-modelo', x: 370, y: 140, pai: 'postgres',
        texto: 'Banco de dados relacional.' },
      { id: 'seu-sistema', nome: 'Seu sistema', bloqueado: true, x: 520, y: -110, pai: 'bevy',
        texto: TEXTO_BLOQUEADO },
      { id: 'seu-api', nome: 'Sua API', bloqueado: true, x: -520, y: -110, pai: 'api',
        texto: TEXTO_BLOQUEADO },
    ],
  },
  {
    id: 'frontend', nome: 'Front-end',
    nos: [
      { id: 'js', nome: 'JavaScript', icone: 'chip', arte: 'frontend-resp', x: 0, y: 0,
        texto: 'A linguagem da web.' },
      { id: 'ts', nome: 'TypeScript', icone: 'chip', arte: 'frontend-design', x: -90, y: -170, pai: 'js',
        texto: 'JavaScript com tipos, para pegar erro antes de rodar.' },
      { id: 'react', nome: 'React', icone: 'atomo', arte: 'frontend-react', x: -300, y: -110, pai: 'ts',
        texto: 'Biblioteca para montar interfaces em componentes.' },
      { id: 'angular', nome: 'Angular', icone: 'escudo', arte: 'frontend-angular', x: 90, y: -170, pai: 'js',
        texto: 'Framework completo para aplicações web.' },
      { id: 'html', nome: 'HTML e CSS', icone: 'paleta', arte: 'frontend-ref', x: -130, y: 140, pai: 'js',
        texto: 'Estrutura e visual de toda página.' },
      { id: 'tres', nome: 'Three.js', icone: 'cubo', arte: 'frontend-tres', x: 130, y: 140, pai: 'js',
        texto: '3D no navegador, como o mapa da História.' },
      { id: 'expo', nome: 'React Native', icone: 'celular', arte: 'produto-mobile', x: -370, y: 140, pai: 'react',
        texto: 'React para apps de iOS e Android, com Expo.' },
      { id: 'seu-site', nome: 'Seu site', bloqueado: true, x: 300, y: -110, pai: 'angular',
        texto: TEXTO_BLOQUEADO },
      { id: 'seu-app', nome: 'Seu app', bloqueado: true, x: -520, y: -110, pai: 'react',
        texto: TEXTO_BLOQUEADO },
    ],
  },
  {
    id: 'ferramentas', nome: 'Nuvem & IA',
    nos: [
      { id: 'git', nome: 'Git', icone: 'foguete', arte: 'produto-deploy', x: 0, y: 0,
        texto: 'Controle de versão do código.' },
      { id: 'aws', nome: 'AWS', icone: 'nuvem', arte: 'produto-cloud', x: -130, y: 140, pai: 'git',
        texto: 'Nuvem da Amazon (arquivos, e-mails e mais).' },
      { id: 'cloudflare', nome: 'Cloudflare', icone: 'escudo', arte: 'produto-saas', x: 90, y: -170, pai: 'git',
        texto: 'Hospedagem e rede na borda.' },
      { id: 'ia', nome: 'IA', icone: 'cerebro', arte: 'produto-ia', x: -90, y: -170, pai: 'git',
        texto: 'Modelos de linguagem dentro de produtos.' },
      { id: 'ollama', nome: 'Ollama', icone: 'robo', arte: 'produto-agentes', x: -300, y: -110, pai: 'ia',
        texto: 'IA rodando local, sem mandar dados para fora.' },
      { id: 'seu-ia', nome: 'Sua IA', bloqueado: true, x: -520, y: -110, pai: 'ollama',
        texto: TEXTO_BLOQUEADO },
      { id: 'seu-automacao', nome: 'Sua automação', bloqueado: true, x: -370, y: 140, pai: 'aws',
        texto: TEXTO_BLOQUEADO },
    ],
  },
];
