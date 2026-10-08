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

  // IA: o chat, com a resposta sendo digitada
  var chat = document.querySelector('[data-chat]');
  if (chat) {
    var CONVERSA = [
      ['Qual CFOP uso numa devolução de venda?', 'Dentro do estado, 1.202; para fora, 2.202. Quer que eu já monte a nota?'],
      ['Resume os leads parados há 7 dias', '12 leads, 5 com proposta enviada. Sugiro retomar pelos 3 de maior valor.'],
      ['O deploy de hoje passou?', 'Passou: build ok, testes verdes e a versão nova já está no ar.']
    ];
    var c = 0, ocupado = false;
    var balao = function (classe, texto) {
      var p = document.createElement('p');
      p.className = classe; p.textContent = texto;
      chat.appendChild(p);
      while (chat.children.length > 4) chat.removeChild(chat.firstChild);
      return p;
    };
    if (calma) {
      balao('eu', CONVERSA[0][0]); balao('ia', CONVERSA[0][1]);
    } else {
      enquantoVisivel(chat, 7000, function () {
        if (ocupado) return;
        ocupado = true;
        var par = CONVERSA[c++ % CONVERSA.length];
        balao('eu', par[0]);
        setTimeout(function () {
          var p = balao('ia digitando', ''), i = 0;
          var t = setInterval(function () {
            i += 2;
            p.textContent = par[1].slice(0, i);
            if (i >= par[1].length) { clearInterval(t); p.classList.remove('digitando'); ocupado = false; }
          }, 35);
        }, 700);
      });
    }
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
