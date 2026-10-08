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

  // nada de arrastar imagem ou link para fora da página (o Firefox ignora o -webkit-user-drag)
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // O que eu faço: cada aba mostra um exemplo daquele tipo de trabalho e troca o título e o texto
  var oficio = document.querySelector('[data-oficio]');
  if (oficio) {
    var abasOficio = oficio.querySelectorAll('.oficio_aba');
    var tituloOficio = oficio.querySelector('[data-oficio-titulo]');
    var textoOficio = oficio.querySelector('[data-oficio-texto]');
    Array.prototype.forEach.call(abasOficio, function (aba) {
      aba.addEventListener('click', function () {
        Array.prototype.forEach.call(abasOficio, function (a) { a.setAttribute('aria-selected', a === aba ? 'true' : 'false'); });
        Array.prototype.forEach.call(oficio.querySelectorAll('.oficio_tela'), function (t) {
          t.classList.toggle('on', t.getAttribute('data-tela') === aba.getAttribute('data-aba'));
        });
        tituloOficio.textContent = aba.getAttribute('data-titulo');
        textoOficio.textContent = aba.getAttribute('data-texto');
        // no celular, a aba escolhida vem para a vista na fileira
        if (aba.scrollIntoView && window.innerWidth <= 600) aba.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      });
    });
  }

  // Versões do currículo no celular: a lista vira carrossel de lado; as setinhas passam um card
  var carrossel = document.querySelector('.curriculo_lista');
  if (carrossel) {
    var cartoes = carrossel.children;
    var setasCarrossel = document.createElement('div');
    setasCarrossel.className = 'curriculo_setas';
    var svgSetaCarrossel = function (d) { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '" /></svg>'; };
    setasCarrossel.innerHTML = '<span class="curriculo_contagem"><b>1</b> / ' + cartoes.length + '</span>' +
      '<span class="curriculo_setas_botoes">' +
      '<button class="curriculo_seta" type="button" aria-label="Versão anterior">' + svgSetaCarrossel('M20 12H5M11 6l-6 6 6 6') + '</button>' +
      '<button class="curriculo_seta" type="button" aria-label="Próxima versão">' + svgSetaCarrossel('M4 12h15M13 6l6 6-6 6') + '</button></span>';
    carrossel.parentNode.insertBefore(setasCarrossel, carrossel.nextSibling);
    var botoesCarrossel = setasCarrossel.querySelectorAll('button'), contagemCarrossel = setasCarrossel.querySelector('b');
    var cartaoAtual = function () {
      var passo = cartoes[1] ? cartoes[1].offsetLeft - cartoes[0].offsetLeft : 1;
      return Math.round(carrossel.scrollLeft / Math.max(1, passo));
    };
    var marcaCarrossel = function () {
      var i = Math.min(cartoes.length - 1, cartaoAtual());
      contagemCarrossel.textContent = i + 1;
      botoesCarrossel[0].disabled = i <= 0;
      botoesCarrossel[1].disabled = carrossel.scrollLeft >= carrossel.scrollWidth - carrossel.clientWidth - 2;
    };
    var passaCartao = function (d) {
      var i = Math.max(0, Math.min(cartoes.length - 1, cartaoAtual() + d));
      carrossel.scrollTo({ left: cartoes[i].offsetLeft - cartoes[0].offsetLeft, behavior: 'smooth' });
    };
    botoesCarrossel[0].addEventListener('click', function () { passaCartao(-1); });
    botoesCarrossel[1].addEventListener('click', function () { passaCartao(1); });
    carrossel.addEventListener('scroll', marcaCarrossel, { passive: true });
    // arrastar de lado: o navegador só cuida da rolagem vertical (touch-action: pan-y no css), então
    // um gesto de lado não desce a página; aqui o card segue o dedo e, ao soltar, encaixa no vizinho
    var toque = null;
    carrossel.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      toque = { x: t.clientX, y: t.clientY, left: carrossel.scrollLeft, eixo: null, i: cartaoAtual() };
    }, { passive: true });
    carrossel.addEventListener('touchmove', function (e) {
      if (!toque) return;
      var t = e.touches[0], dx = t.clientX - toque.x, dy = t.clientY - toque.y;
      if (!toque.eixo && Math.abs(dx) + Math.abs(dy) > 6) toque.eixo = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (toque.eixo !== 'x') return;
      carrossel.classList.add('arrastando');
      carrossel.scrollLeft = toque.left - dx;
    }, { passive: true });
    carrossel.addEventListener('touchend', function (e) {
      if (!toque) return;
      var foi = toque.eixo === 'x', dx = e.changedTouches[0].clientX - toque.x, i = toque.i;
      toque = null;
      if (!foi) return;
      carrossel.classList.remove('arrastando');
      var alvo = Math.abs(dx) > 40 ? i + (dx < 0 ? 1 : -1) : i;
      alvo = Math.max(0, Math.min(cartoes.length - 1, alvo));
      carrossel.scrollTo({ left: cartoes[alvo].offsetLeft - cartoes[0].offsetLeft, behavior: 'smooth' });
    });
    carrossel.addEventListener('touchcancel', function () { toque = null; carrossel.classList.remove('arrastando'); });
    window.addEventListener('resize', marcaCarrossel);
    marcaCarrossel();
  }

  // Projetos no celular: mostra 5 e o resto fica atrás do "Ver mais projetos" (css/tema.css)
  var projetos = document.querySelectorAll('.flow-grid > .project_item');
  if (projetos.length > 5) {
    Array.prototype.forEach.call(projetos, function (el, i) { if (i >= 5) el.classList.add('projeto-extra'); });
    var maisProjetos = document.createElement('div');
    maisProjetos.className = 'projetos_mais';
    maisProjetos.innerHTML = '<button class="botao" type="button">Ver mais projetos <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>';
    var grade = document.querySelector('.flow-grid');
    grade.parentNode.insertBefore(maisProjetos, grade.nextSibling);
    maisProjetos.querySelector('button').addEventListener('click', function () {
      document.querySelector('.section.projects').classList.add('mostra-todos');
      // a página cresceu: as seções fixadas mais abaixo precisam recalcular onde começam
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  // "Fascinado pelo universo gamer...": cada palavra entra de uma vez (pequena e torta -> no lugar,
  // rápido e sem quique) quando passa de 85% da altura da tela, e volta a sair se a rolagem voltar
  var palavras = Array.prototype.slice.call(document.querySelectorAll('.grow-text'));
  if (palavras.length && !calma) {
    palavras.forEach(function (el) { el.classList.add('entra'); });
    var pedidoPal = false;
    var mostraPalavras = function () {
      pedidoPal = false;
      var linha = window.innerHeight * 0.85;
      palavras.forEach(function (el) {
        el.classList.toggle('on', el.getBoundingClientRect().top < linha);
      });
    };
    window.addEventListener('scroll', function () {
      if (!pedidoPal) { pedidoPal = true; requestAnimationFrame(mostraPalavras); }
    }, { passive: true });
    window.addEventListener('resize', mostraPalavras);
    mostraPalavras();
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
