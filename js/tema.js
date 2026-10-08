/* Tema: entrada dos blocos novos (.surge), marca-texto laranja (.hl) e cor do menu conforme
   o fundo que está embaixo dele. */
(function () {
  var alvos = document.querySelectorAll('.surge, .hl');

  // irmãos que entram juntos ganham um atraso em escada
  Array.prototype.forEach.call(document.querySelectorAll('.surge'), function (el) {
    var irmaos = Array.prototype.filter.call(el.parentNode.children, function (c) {
      return c.classList.contains('surge');
    });
    el.style.setProperty('--i', irmaos.indexOf(el));
  });

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(alvos, function (el) { el.classList.add('on'); });
  } else {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('on');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    Array.prototype.forEach.call(alvos, function (el) { obs.observe(el); });
  }

  /* ---------- cenas dos cards da intro ---------- */
  var calma = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // roda fn a cada `ms` só enquanto o elemento está na tela
  function enquantoVisivel(el, ms, fn) {
    var id = null;
    function liga() { if (!id) { fn(); id = setInterval(fn, ms); } }
    function desliga() { clearInterval(id); id = null; }
    if (calma || !('IntersectionObserver' in window)) { fn(); return; }
    new IntersectionObserver(function (e) { e[0].isIntersecting ? liga() : desliga(); }).observe(el);
  }

  // Sistemas: o log da API
  var log = document.querySelector('[data-log]');
  if (log) {
    var LINHAS = [
      ['GET', '/clientes?page=3', '200 · 24ms'],
      ['POST', '/nfe/emitir', '201 · 38ms'],
      ['EVT', 'pedido.criado → 3 filas', 'ok'],
      ['PUT', '/agenda/412', '200 · 19ms'],
      ['SQL', 'relatorio_fiscal 1.2M linhas', '41ms'],
      ['POST', '/leads', '201 · 22ms'],
      ['WS', 'painel: 18 conectados', 'live'],
      ['JOB', 'SPED gerado · 0 erros', 'ok'],
      ['S3', 'upload xml 2.4MB', '200'],
      ['SES', 'e-mail de cobrança × 120', 'ok']
    ];
    var k = 0;
    var poe = function () {
      var l = LINHAS[k++ % LINHAS.length], li = document.createElement('li');
      li.innerHTML = '<b></b><span></span><em></em>';
      li.children[0].textContent = l[0]; li.children[1].textContent = l[1]; li.children[2].textContent = l[2];
      log.appendChild(li);
      while (log.children.length > 9) log.removeChild(log.firstChild);
    };
    for (var n = 0; n < 6; n++) poe();
    enquantoVisivel(log, 1300, poe);
  }

  // Sistemas: as barras de requisições por segundo andando junto com o log
  var barras = document.querySelector('[data-barras]');
  if (barras) {
    for (var b = 0; b < 32; b++) barras.appendChild(document.createElement('i'));
    var alturas = [];
    for (var b2 = 0; b2 < 32; b2++) alturas.push(30 + Math.random() * 50);
    var mexe = function () {
      alturas.shift();
      var ult = alturas[alturas.length - 1];
      alturas.push(Math.max(12, Math.min(100, ult + (Math.random() - 0.45) * 30)));
      Array.prototype.forEach.call(barras.children, function (el, i) { el.style.setProperty('--h', alturas[i] + '%'); });
    };
    mexe();
    enquantoVisivel(barras, 650, mexe);
  }

  // Experiências: a escultura gira e desliza seguindo o mouse
  var tilt = document.querySelector('[data-tilt]');
  if (tilt && !calma) {
    var img = tilt.querySelector('.cena_escultura');
    tilt.addEventListener('pointermove', function (e) {
      var r = tilt.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      // (a imagem está girada 90°: o x da tela é o y dela)
      img.style.setProperty('--tx', (x * -40) + 'px');
      img.style.setProperty('--ty', (y * 30) + 'px');
      img.style.setProperty('--zoom', 1.08);
    });
    tilt.addEventListener('pointerleave', function () {
      img.style.setProperty('--tx', '0px');
      img.style.setProperty('--ty', '0px');
      img.style.setProperty('--zoom', 1);
    });
  }

  // Outras versões do currículo: passando num item da lista, o palco do meio mostra aquela versão.
  // A troca: fecha as partes laranja, gira 90° (acumulando), troca a imagem escondida e abre.
  var palco = document.querySelector('[data-foto-palco]');
  if (palco) {
    var giro = palco.querySelector('[data-giro]'), img = palco.querySelector('.curriculo_eu');
    var selo = palco.querySelector('[data-selo]');
    var padrao = { src: img.getAttribute('src'), selo: selo.textContent };
    var graus = 0, atual = padrao.src, t1, t2, solta;
    var vai = function (src, nome) {
      if (src === atual) return;
      atual = src;
      clearTimeout(t1); clearTimeout(t2);
      if (calma) { img.src = src; selo.textContent = nome; return; }
      giro.classList.add('ativo', 'esmaga');
      // espremida: gira, troca a imagem ainda espremida e abre
      t1 = setTimeout(function () {
        graus += 90;
        giro.style.setProperty('--giro', graus + 'deg');
        t2 = setTimeout(function () {
          img.src = src;
          selo.textContent = nome;
          t2 = setTimeout(function () { giro.classList.remove('esmaga'); }, 230);
        }, 250);
      }, 260);
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-foto]'), function (item) {
      var mostra = function () { clearTimeout(solta); vai(item.getAttribute('data-foto'), item.getAttribute('data-selo')); };
      var volta = function () { solta = setTimeout(function () { vai(padrao.src, padrao.selo); }, 160); };
      item.addEventListener('pointerenter', mostra);
      item.addEventListener('focus', mostra);
      item.addEventListener('pointerleave', volta);
      item.addEventListener('blur', volta);
    });
    // (pré-carrega as versões para a troca não piscar em branco)
    Array.prototype.forEach.call(document.querySelectorAll('[data-foto]'), function (item) { new Image().src = item.getAttribute('data-foto'); });
  }

  // Projetos em destaque: cada card sobe e aparece conforme a posição real dele na tela (medida a cada
  // quadro, já com o parallax do card), na velocidade da rolagem. Depois de aparecer, não some mais.
  var cards = Array.prototype.slice.call(document.querySelectorAll('.works-item'));
  if (cards.length && !calma) {
    var feito = cards.map(function () { return 0; });
    var pinta = function () {
      var vh = window.innerHeight, faltam = 0;
      cards.forEach(function (el, n) {
        if (feito[n] >= 1) return;
        faltam++;
        var topo = el.getBoundingClientRect().top;
        // 0 quando o topo encosta no pé da tela, 1 quando chega a 40% dela
        var p = Math.min(1, Math.max(0, (vh - topo) / (vh * 0.6)));
        if (p <= feito[n]) return;
        feito[n] = p;
        var e = 1 - Math.pow(1 - p, 3);
        el.style.opacity = e;
        el.style.transform = 'translate3d(0,' + ((1 - e) * 120) + 'px,0) scale(' + (0.94 + 0.06 * e) + ')';
      });
      if (faltam) requestAnimationFrame(pinta);
    };
    cards.forEach(function (el) { el.style.opacity = 0; el.style.transform = 'translate3d(0,120px,0) scale(.94)'; });
    requestAnimationFrame(pinta);
  }

  // header: texto escuro sobre as seções claras, claro sobre as escuras
  var header = document.querySelector('.header');
  var claras = document.querySelectorAll('.section.hero, .section.projects, .numeros, .section.about, .section.call-to-action_mid');
  if (!header || !claras.length) return;
  var pedido = false;
  function conferir() {
    pedido = false;
    var y = 36, claro = false;
    for (var i = 0; i < claras.length; i++) {
      var r = claras[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { claro = true; break; }
    }
    header.classList.toggle('header--claro', claro);
  }
  function agendar() {
    if (!pedido) { pedido = true; requestAnimationFrame(conferir); }
  }
  window.addEventListener('scroll', agendar, { passive: true });
  window.addEventListener('resize', agendar);
  conferir();
})();
