/*
 * Footer: letras do headline que mudam de cor com o mouse + posição do botão + relógio local.
 * (O bulge em WebGL que entortava o texto saiu; está no histórico do git.)
 */
(function () {
  var footer = document.querySelector('.site-footer');
  if (!footer) return;
  var cta = footer.querySelector('.footer-cta');
  var cols = footer.querySelector('.footer-cols');
  var pill = footer.querySelector('.footer-pill');
  var lines = Array.prototype.slice.call(footer.querySelectorAll('.footer-line'));

  // Relógio de Agudos (America/Sao_Paulo) na barra final.
  var clock = footer.querySelector('[data-footer-clock]');
  if (clock) {
    var fmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  // Cada letra do headline vira um span, que troca de cor embaixo do mouse (css/tema.css).
  function quebra(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (no) {
      if (no.nodeType === 1) { quebra(no); return; }
      if (no.nodeType !== 3 || !no.textContent.trim()) return;
      var frag = document.createDocumentFragment();
      no.textContent.split('').forEach(function (ch) {
        if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); return; }
        var l = document.createElement('span');
        l.className = 'letra';
        l.textContent = ch;
        frag.appendChild(l);
      });
      el.replaceChild(frag, no);
    });
  }
  lines.forEach(quebra);

  // Desktop: botão na direita, na altura da última linha.
  function layoutPill() {
    if (!pill || !lines.length) return;
    if (window.innerWidth <= 991) {
      pill.style.left = pill.style.top = pill.style.marginTop = '';
      return;
    }
    var last = lines[lines.length - 1];
    var lr = last.getBoundingClientRect();
    var cr = cta.getBoundingClientRect();
    var direita = cols ? cols.getBoundingClientRect().right : cr.right;
    pill.style.marginTop = '0px';
    pill.style.left = (direita - cr.left - pill.offsetWidth) + 'px';
    pill.style.top = (lr.top - cr.top + (lr.height - pill.offsetHeight) / 2) + 'px';
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutPill, 150);
  });

  // A Inter Tight chega assíncrona (WebFont loader): mede de novo quando ela carregar.
  layoutPill();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutPill);
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', layoutPill);
})();
