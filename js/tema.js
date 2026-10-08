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

  // Outras versões do currículo: passando num item da lista, o palco do meio mostra aquela versão
  var palco = document.querySelector('[data-foto-palco]');
  if (palco) {
    var troca = palco.querySelector('.curriculo_troca');
    var selo = palco.querySelector('[data-selo]'), seloPadrao = selo.textContent;
    var moldura = palco.querySelector('.curriculo_moldura'), base = palco.querySelector('.curriculo_eu');
    var atual = base.getAttribute('src'), fimVira;
    // as peças do mosaico (frente: a versão que sai; verso: a que entra)
    var mosaico = palco.querySelector('[data-mosaico]'), N = 7, pecas = [];
    for (var p = 0; p < N * N; p++) {
      var peca = document.createElement('i');
      peca.innerHTML = '<b></b><b></b>';
      mosaico.appendChild(peca);
      pecas.push(peca);
    }
    // tamanhos reais das imagens, para recortar cada peça como object-fit: cover
    var cache = {};
    var imagem = function (src) {
      if (!cache[src]) { cache[src] = new Image(); cache[src].src = src; }
      return cache[src];
    };
    Array.prototype.forEach.call(document.querySelectorAll('[data-foto]'), function (el) { imagem(el.getAttribute('data-foto')); });
    imagem(atual);
    var pinta = function (face, src, col, lin, W, H) {
      var img = imagem(src), r = img.naturalWidth / img.naturalHeight;
      var bw = r > W / H ? H * r : W, bh = r > W / H ? H : W / r;
      var ox = (W - bw) / 2, oy = (H - bh) / 2, tw = W / N, th = H / N;
      face.style.backgroundImage = 'url("' + src + '")';
      face.style.backgroundSize = bw + 'px ' + bh + 'px';
      face.style.backgroundPosition = (ox - col * tw) + 'px ' + (oy - lin * th) + 'px';
    };
    var vira = function (src) {
      if (src === atual) return;
      var de = atual;
      atual = src;
      var pronta = imagem(de).naturalWidth && imagem(src).naturalWidth;
      if (calma || !pronta) return;
      var W = moldura.clientWidth, H = moldura.clientHeight;
      mosaico.classList.add('sem');
      mosaico.classList.remove('virou');
      pecas.forEach(function (peca, n) {
        var col = n % N, lin = Math.floor(n / N);
        pinta(peca.children[0], de, col, lin, W, H);
        pinta(peca.children[1], src, col, lin, W, H);
        // onda diagonal do canto de cima à esquerda, com um pouco de acaso
        peca.style.setProperty('--d', ((col + lin) * 38 + Math.random() * 70) + 'ms');
      });
      mosaico.classList.add('on');
      void mosaico.offsetWidth;
      mosaico.classList.remove('sem');
      mosaico.classList.add('virou');
      clearTimeout(fimVira);
      fimVira = setTimeout(function () { mosaico.classList.remove('on', 'virou'); }, 1150);
    };
    var solta;
    Array.prototype.forEach.call(document.querySelectorAll('[data-foto]'), function (item) {
      var mostra = function () {
        clearTimeout(solta);
        troca.src = item.getAttribute('data-foto');
        selo.textContent = item.getAttribute('data-selo');
        palco.classList.add('trocando');
        vira(item.getAttribute('data-foto'));
      };
      var volta = function () {
        solta = setTimeout(function () {
          palco.classList.remove('trocando');
          selo.textContent = seloPadrao;
          vira(base.getAttribute('src'));
        }, 120);
      };
      item.addEventListener('pointerenter', mostra);
      item.addEventListener('focus', mostra);
      item.addEventListener('pointerleave', volta);
      item.addEventListener('blur', volta);
    });
  }

  // Projetos em destaque: cada card sobe e aparece junto com o scroll (vai e volta com a rolagem),
  // em vez de estalar de uma vez quando entra na tela
  if (window.gsap && window.ScrollTrigger && !calma) {
    Array.prototype.forEach.call(document.querySelectorAll('.works-item'), function (item) {
      gsap.fromTo(item, { opacity: 0, y: 140, scale: .94 }, {
        opacity: 1, y: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: item, start: 'top 105%', end: 'top 55%', scrub: 0.6 }
      });
    });
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
