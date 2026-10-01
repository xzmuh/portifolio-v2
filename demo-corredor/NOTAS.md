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
