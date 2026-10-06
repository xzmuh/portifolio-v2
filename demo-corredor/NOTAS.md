# Corredor — onde paramos (29/09/2026)

## Estado atual
- Corredor a nanquim com rolagem (passeio), WASD (andar livre), joystick no celular.
- Salas: Projetos (varal com 8 cartões que viram), Habilidades (bilhetes), Trajetória
  (I-SINC, Next SI, Dialogi, SigmaCX), Sobre mim (retrato em gravura), Contato
  (formulário de papel que abre o WhatsApp + etiquetas LinkedIn/GitHub/WhatsApp).
- Vida: bonequinho com piadas, gato no banco, aviõezinhos de papel, janelas com nuvens,
  luminárias, plantas, poeira. Sons sintetizados em src/som.js (não testados com áudio).
- Rodar: `npm run dev -- --port 5181`

## O que aprendi navegando no itomdev.com (referência)
1. Entrada = fachada de casa (tijolos, árvore com mouse pendurado, gato, floreira, porta
   dupla com adesivos de tecnologias). Rolagem não faz nada: "EXPLORER — clique numa porta".
2. Hover na porta = o rascunho cinza vira PINTADO (madeira colorida). A cor é o destaque.
3. Dentro: logo "ITOM" desenhado + avatar dele + "creative developer/>".
4. HUD gamificado: rodapé muda de título (EXPLORER → WANDERER...), ícones de menu/som/conquistas.
5. Corredor BRANCO, limpo, muito respiro; poucos objetos detalhados (luminária fluorescente,
   grade de ventilação, mesinha com planta, rabiscos "while(true){ explore(); }",
   "IDEA → DEV → BUG!"). Corredor parece infinito (volta pro logo).
6. Cada porta é temática (Studio com ícones sociais coloridos; Contact com carta na fenda;
   Gallery com plantas coladas) e tem SETAS desenhadas apontando para ela.
7. Clicar na porta: ela abre, a câmera atravessa e entra num MUNDO (Contact = píer no mar
   com farol, nuvens, barquinho de papel e placas em barris: GitHub, LinkedIn, Message...).
   Botão "←" no canto para voltar.

## Feito em 30/09
- Traço leve (grafite cinza, pouca hachura, muito branco); modo "cor" no lápis para pintar no hover.
- Entrada em fachada de casa (tijolos, árvore com mouse pendurado, gato, janela, floreira com patinho,
  placa PORTFÓLIO, porta dupla com adesivos que pinta no hover e abre ao clicar).
- Logo "MURILO < dev full stack />" no começo do corredor; luminárias fluorescentes, grades, rabiscos.
- Portas temáticas (papéis colados, adesivos, mapa, polaroid, carta na fenda) + placa de madeira +
  setas rabiscadas; tudo ganha cor no hover.
- HUD com título que evolui: EXPLORADOR → ANDARILHO → CURIOSO (n de 5) → VETERANO.
- Contato virou mundo: píer no mar com farol, nuvens, barquinho e placas em barris
  (GitHub, LinkedIn, WhatsApp, Mensagem → formulário de papel).

## Feito em 06/10
- Móveis e objetos do corredor em 3D de papel dobrado (src/dobradura.js): banco com gato, mesa, vasos, luminárias.
  Na parede só fica o que é de parede (quadros, janelas, grades, rabiscos).
- Fachada: floreira virou imagem no estilo do gato/árvore (public/facade/planter.png), sem toldo, placa "PORTFÓLIO".
- Píer: farol maior com brilho e fachos girando; mar azul.
- Habilidades: estante de livros (uma prateleira por área, um livro por tecnologia; clicar abre o livro).
  Textos em ESTANTE no main.js — revisar com o Murilo.
- Trajetória: não é sala, é uma plataforma de lançamento; entrar pela porta já decola o aviãozinho. No céu a câmera
  fica parada atrás do avião e o mundo anda com a rolagem (inércia, para trás também), como no portfolio-itom:
  trechos de 40 m de nuvens criados/descartados, paradas (TRAJETORIA) repetindo a cada 160 m — voo infinito.
  "pular"/Esc cai de volta na sala.
- Voo: céu de papel (sem azul), com folha desenhada ao fundo: hachura a lápis no alto.
- Objetos 3D (dobradura.js) desenhados: papel quase branco, hachura presa à superfície conforme a luz,
  contorno à mão (passa da quina, torto, "ferve" a 7 qps) com segundo traço de esboço.
- Voo anda sozinho (cruzeiro) e a rolagem acelera; perto das placas o cruzeiro cai.
- Portas com espessura (tábua + contorno); janelas e quadros do corredor continuam desenhados na parede (3D ali ficou forçado).
- Mar do píer em grafite (cinza esfumado). Materiais e texturas pré-carregados no carregamento (sem tranco ao entrar).
- Sobre mim: escrivaninha de dobradura (monitor digitando CODIGO_MONITOR, teclado, caneca, controle que treme)
  e quadro de cortiça com BILHETES que vêm até a frente ao clicar.
- Carregamento (antigo): folha amassada que se desamassa (script inline no index.html).
- Livros: capas, miolo de páginas e lombada com faixas; clicar traz o livro voando e ele abre em 3D.
- Referência: github.com/ITomPoland/portfolio-itom (MIT, Tomasz Szmajda). Do voo dele veio a ideia da câmera
  colada no avião, do impulso com inércia e a forma do avião (adaptada em dobradura.js, com crédito no código).

## Próximos passos
- Projetos, Habilidades, Trajetória e Sobre ainda são "salas"; transformar cada uma num mundo
  (ex.: Trajetória como ilhas flutuando no céu, como o "Journey" dele; Projetos como galeria/varal
  numa cidade; Sobre como um quarto/estúdio).

## Diferenças do nosso (a corrigir)
- Nosso está pesado demais: nanquim preto + muita hachura. O dele é cinza claro, suave,
  com cor só nos detalhes. → clarear traço, menos hachura, fundo mais branco.
- Portas todas iguais → fazer portas temáticas + setas rabiscadas + "pintar" no hover.
- Salas são caixas com coisas na parede → cada porta levar a um mundo (ex.: contato no píer).
- Falta entrada (fachada) e HUD com "título" que evolui.
- Arte dele são ilustrações detalhadas (imagens). Por código não chega nesse nível;
  considerar ilustrações geradas/desenhadas e usar pares nome.webp / nome_painted.webp.

Screenshots da navegação: /tmp/.../scratchpad/ref/ (temporário — pode sumir).
