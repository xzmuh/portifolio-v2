/* Escolha de experiência: as fatias de mundos (css/escolha.css).
   - Lente: com o mouse sobre a faixa, cada fatia ganha peso pela distância ao cursor (uma curva suave);
     a mais perto abre e acorda (--vida), as vizinhas se apertam. Sem o mouse, todas iguais.
   - Clique: a fatia sai da faixa (fica uma vaga no lugar), cresce até tomar a tela e termina no fundo
     da primeira imagem da experiência, que abre por cima sem emenda. Voltando, tudo volta ao lugar.
   Funciona com qualquer número de fatias. */
(function () {
  var faixa = document.querySelector('[data-mundos]');
  if (!faixa) return;
  var mundos = Array.prototype.slice.call(faixa.querySelectorAll('.mundo'));
  var calma = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var estreita = window.matchMedia('(max-width: 760px)');

  var alvoX = null; // cursor na faixa (0 a 1) ou null
  var pesos = mundos.map(function () { return 1; });
  var vidas = mundos.map(function () { return 0; });
  var rodando = false;
  var focado = null;

  function quadro() {
    var n = mundos.length;
    var alvoP = [], alvoV = [];
    for (var i = 0; i < n; i++) {
      var centro = (i + 0.5) / n;
      var x = alvoX != null ? alvoX : focado != null ? (focado + 0.5) / n : null;
      if (x == null) { alvoP.push(1); alvoV.push(0); continue; }
      // perto do cursor pesa mais: a fatia de baixo dele fica ~3x a vizinha
      var d = (x - centro) * n;
      var w = Math.exp(-d * d * 1.1);
      alvoP.push(1 + w * 2.4);
      alvoV.push(w);
    }
    var mexeu = false;
    for (var k = 0; k < n; k++) {
      var dp = alvoP[k] - pesos[k], dv = alvoV[k] - vidas[k];
      if (Math.abs(dp) > 0.002 || Math.abs(dv) > 0.002) mexeu = true;
      pesos[k] += dp * 0.12;
      vidas[k] += dv * 0.12;
      mundos[k].style.setProperty('--peso', pesos[k].toFixed(3));
      mundos[k].style.setProperty('--vida', vidas[k].toFixed(3));
    }
    if (mexeu) requestAnimationFrame(quadro);
    else rodando = false;
  }
  function anima() {
    if (calma || estreita.matches) return;
    if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
  }

  faixa.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var b = faixa.getBoundingClientRect();
    alvoX = (e.clientX - b.left) / b.width;
    anima();
  });
  faixa.addEventListener('pointerleave', function () { alvoX = null; anima(); });
  // pelo teclado: a fatia focada abre
  mundos.forEach(function (m, i) {
    m.addEventListener('focus', function () { focado = i; anima(); });
    m.addEventListener('blur', function () { focado = null; anima(); });
  });

  /* ---------- o clique: a fatia toma a tela ---------- */
  var saindo = null;
  mundos.forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (calma || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      if (saindo) return;
      var destino = m.getAttribute('href');
      var b = m.getBoundingClientRect();
      // a vaga segura o lugar na faixa, para as outras não pularem
      var vaga = document.createElement('div');
      vaga.className = 'mundo_vaga';
      vaga.style.setProperty('--peso', m.style.getPropertyValue('--peso') || 1);
      m.parentNode.insertBefore(vaga, m);
      // (no body: algum pai com transform faria o position: fixed ficar preso nele)
      document.body.appendChild(m);
      m.style.top = b.top + 'px';
      m.style.left = b.left + 'px';
      m.style.width = b.width + 'px';
      m.style.height = b.height + 'px';
      m.style.setProperty('--vida', 1);
      m.classList.add('tomando');
      saindo = { m: m, vaga: vaga };
      requestAnimationFrame(function () { requestAnimationFrame(function () { m.classList.add('cheio'); }); });
      // a navegação começa no meio da expansão: a página atual segue animando até a nova pintar a primeira
      // imagem, que é igual ao fim da fatia (css: --fundo-final); sem tela parada no meio
      setTimeout(function () { window.location.href = destino; }, 520);
    });
  });

  // voltou pelo botão Voltar (a página veio do cache): a fatia volta para a faixa
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted || !saindo) return;
    var s = saindo;
    s.m.classList.remove('tomando', 'cheio');
    s.m.style.top = s.m.style.left = s.m.style.width = s.m.style.height = '';
    s.vaga.parentNode.insertBefore(s.m, s.vaga);
    s.vaga.remove();
    saindo = null;
    alvoX = null;
    anima();
  });
})();
