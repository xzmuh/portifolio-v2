/*
 * Árvore de habilidades (tela Habilidades), no molde da árvore de perks do
 * Cyberpunk 2077 2.0. Cada aba é uma parte da stack. Só entram tecnologias
 * que já estão na História (stack das empresas) ou nos Projetos; sem nível
 * e sem dizer onde, para não inventar nada.
 *
 *   col,lin  posição: col -3..3 (0 = centro), lin 0 (topo) .. 3 (base)
 *   pai      nó de onde sai o trilho
 *   arte     ilustração em img/perks/<arte>.webp (sem ela, fica o ícone)
 *   texto    o que é a tecnologia, em uma frase
 *   bloqueado  nó trancado no topo (lin 0): o projeto de quem está vendo,
 *              que só abre no contato (clicar leva para a tela Contato)
 */
const TEXTO_BLOQUEADO = 'Esse slot abre quando a gente começar um projeto juntos. Clique para falar comigo.';

export const CATEGORIAS = [
  {
    id: 'backend', nome: 'Back-end',
    nos: [
      { id: 'node', nome: 'Node.js', icone: 'hex', arte: 'backend-eventos', col: 0, lin: 3,
        texto: 'JavaScript rodando no servidor.' },
      { id: 'nest', nome: 'NestJS', icone: 'camadas', arte: 'backend-arquiteto', col: 0, lin: 2, pai: 'node',
        texto: 'Framework para organizar APIs em Node.js.' },
      { id: 'api', nome: 'APIs REST', icone: 'api', arte: 'backend-api', col: 0, lin: 1, pai: 'nest',
        texto: 'Como os sistemas conversam entre si.' },
      { id: 'php', nome: 'PHP', icone: 'doc', arte: 'backend-regras', col: -2, lin: 2, pai: 'node',
        texto: 'Linguagem de servidor de muitos sistemas web.' },
      { id: 'postgres', nome: 'PostgreSQL', icone: 'banco', arte: 'dados-sql', col: 2, lin: 2, pai: 'node',
        texto: 'Banco de dados relacional.' },
      { id: 'mysql', nome: 'MySQL', icone: 'tabela', arte: 'dados-modelo', col: 2, lin: 1, pai: 'postgres',
        texto: 'Banco de dados relacional.' },
      { id: 'seu-sistema', nome: 'Seu sistema', bloqueado: true, col: -2, lin: 0, pai: 'php',
        texto: TEXTO_BLOQUEADO },
      { id: 'seu-api', nome: 'Sua API', bloqueado: true, col: 0, lin: 0, pai: 'api',
        texto: TEXTO_BLOQUEADO },
    ],
  },
  {
    id: 'frontend', nome: 'Front-end',
    nos: [
      { id: 'js', nome: 'JavaScript', icone: 'chip', arte: 'frontend-resp', col: 0, lin: 3,
        texto: 'A linguagem da web.' },
      { id: 'ts', nome: 'TypeScript', icone: 'chip', arte: 'frontend-design', col: 0, lin: 2, pai: 'js',
        texto: 'JavaScript com tipos, para pegar erro antes de rodar.' },
      { id: 'react', nome: 'React', icone: 'atomo', arte: 'frontend-react', col: 0, lin: 1, pai: 'ts',
        texto: 'Biblioteca para montar interfaces em componentes.' },
      { id: 'angular', nome: 'Angular', icone: 'escudo', arte: 'frontend-angular', col: -2, lin: 2, pai: 'ts',
        texto: 'Framework completo para aplicações web.' },
      { id: 'html', nome: 'HTML e CSS', icone: 'paleta', arte: 'frontend-ref', col: -2, lin: 3, pai: 'js',
        texto: 'Estrutura e visual de toda página.' },
      { id: 'tres', nome: 'Three.js', icone: 'cubo', arte: 'frontend-tres', col: 2, lin: 2, pai: 'js',
        texto: '3D no navegador, como o mapa da História.' },
      { id: 'expo', nome: 'React Native', icone: 'celular', arte: 'produto-mobile', col: 2, lin: 1, pai: 'react',
        texto: 'React para apps de iOS e Android, com Expo.' },
      { id: 'seu-site', nome: 'Seu site', bloqueado: true, col: -2, lin: 0, pai: 'angular',
        texto: TEXTO_BLOQUEADO },
      { id: 'seu-app', nome: 'Seu app', bloqueado: true, col: 0, lin: 0, pai: 'react',
        texto: TEXTO_BLOQUEADO },
    ],
  },
  {
    id: 'ferramentas', nome: 'Nuvem & IA',
    nos: [
      { id: 'git', nome: 'Git', icone: 'foguete', arte: 'produto-deploy', col: 0, lin: 3,
        texto: 'Controle de versão do código.' },
      { id: 'aws', nome: 'AWS', icone: 'nuvem', arte: 'produto-cloud', col: -2, lin: 2, pai: 'git',
        texto: 'Nuvem da Amazon (arquivos, e-mails e mais).' },
      { id: 'cloudflare', nome: 'Cloudflare', icone: 'escudo', arte: 'produto-saas', col: 2, lin: 2, pai: 'git',
        texto: 'Hospedagem e rede na borda.' },
      { id: 'ia', nome: 'IA', icone: 'cerebro', arte: 'produto-ia', col: 0, lin: 2, pai: 'git',
        texto: 'Modelos de linguagem dentro de produtos.' },
      { id: 'ollama', nome: 'Ollama', icone: 'robo', arte: 'produto-agentes', col: 0, lin: 1, pai: 'ia',
        texto: 'IA rodando local, sem mandar dados para fora.' },
      { id: 'seu-ia', nome: 'Sua IA', bloqueado: true, col: 0, lin: 0, pai: 'ollama',
        texto: TEXTO_BLOQUEADO },
      { id: 'seu-automacao', nome: 'Sua automação', bloqueado: true, col: -2, lin: 0, pai: 'aws',
        texto: TEXTO_BLOQUEADO },
    ],
  },
];
