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
