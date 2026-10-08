/* O que eu faço: cada aba tem uma tela genérica com uma interação pequena, para quem tiver
   curiosidade de clicar. A troca de abas fica em js/tema.js. */
(function () {
  var raiz = document.querySelector('[data-oficio]');
  if (!raiz) return;
  var $ = function (sel, el) { return (el || raiz).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || raiz).querySelectorAll(sel)); };
  var acorda = function (el) { el.classList.remove('pisca'); void el.offsetWidth; el.classList.add('pisca'); };

  // ---------- Mobile: agenda (toque confirma o horário; os chips trocam o dia) ----------
  var DIAS = [
    { titulo: 'Hoje', itens: [['08:00', 'AC', 'Ana Costa', 'Consulta', 1], ['09:30', 'BR', 'Bruno Reis', 'Retorno', 1], ['11:00', 'CL', 'Carla Lima', 'Avaliação', 0], ['14:00', 'DM', 'Diego Melo', 'Consulta', 1], ['16:30', 'EP', 'Elisa Prado', 'Retorno', 0]] },
    { titulo: 'Amanhã', itens: [['08:30', 'FS', 'Fábio Souza', 'Avaliação', 0], ['10:00', 'GA', 'Gabi Alves', 'Consulta', 1], ['13:30', 'HN', 'Hugo Nunes', 'Retorno', 0], ['15:00', 'IR', 'Ivo Rocha', 'Consulta', 0]] },
    { titulo: 'Sexta', itens: [['09:00', 'JM', 'Júlia Matos', 'Consulta', 1], ['11:30', 'KP', 'Kaio Pires', 'Avaliação', 1], ['17:00', 'LB', 'Lia Barros', 'Retorno', 1]] }
  ];
  var lista = $('[data-agenda-lista]'), tituloAgenda = $('[data-agenda-titulo]');
  var mostraDia = function (d) {
    tituloAgenda.textContent = DIAS[d].titulo;
    lista.innerHTML = '';
    DIAS[d].itens.forEach(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ag' + (it[4] ? ' ok' : '');
      b.style.setProperty('--i', i);
      b.innerHTML = '<b>' + it[0] + '</b><span class="ag_av">' + it[1] + '</span><span class="ag_nome">' + it[2] +
        '<small>' + it[3] + '</small></span><em></em>';
      b.addEventListener('click', function () { b.classList.toggle('ok'); acorda(b); });
      lista.appendChild(b);
    });
  };
  if (lista) {
    $$('[data-dia]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $$('[data-dia]').forEach(function (c) { c.classList.toggle('on', c === chip); });
        mostraDia(+chip.getAttribute('data-dia'));
      });
    });
    mostraDia(0);
  }

  // ---------- Mobile: painel (toque numa barra mostra o dia; + registra pedido) ----------
  var valor = $('[data-painel-valor]'), rotulo = $('[data-painel-rotulo]'), pedidos = $('[data-painel-pedidos]');
  var DIAS_SEMANA = ['Vendas seg', 'Vendas ter', 'Vendas qua', 'Vendas qui', 'Vendas sex', 'Vendas sáb', 'Vendas dom', 'Vendas hoje'];
  $$('.app_barras button').forEach(function (barra, i) {
    barra.addEventListener('click', function () {
      $$('.app_barras button').forEach(function (b) { b.classList.toggle('on', b === barra); });
      valor.textContent = barra.getAttribute('data-valor');
      rotulo.textContent = DIAS_SEMANA[i];
    });
  });
  var mais = $('[data-painel-mais]');
  if (mais) mais.addEventListener('click', function () {
    pedidos.textContent = +pedidos.textContent + 1;
    acorda(pedidos);
  });

  // ---------- Web: o menu troca a página; o botão responde ----------
  var site = $('[data-site]'), url = $('[data-site-url]'), toast = $('[data-site-toast]');
  var ROTAS = ['seusite.com', 'seusite.com/planos', 'seusite.com/contato'];
  $$('[data-pagina]').forEach(function (link) {
    link.addEventListener('click', function () {
      var n = link.getAttribute('data-pagina');
      $$('[data-pagina]').forEach(function (l) { l.classList.toggle('on', l === link); });
      $$('[data-pagina-corpo]').forEach(function (pg) { pg.classList.toggle('on', pg.getAttribute('data-pagina-corpo') === n); });
      url.textContent = ROTAS[n];
    });
  });
  var timerToast;
  var avisa = function (texto) {
    toast.textContent = texto;
    toast.classList.add('on');
    clearTimeout(timerToast);
    timerToast = setTimeout(function () { toast.classList.remove('on'); }, 1800);
  };
  $$('[data-site-acao]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var plano = b.closest('.site_plano');
      if (plano) $$('.site_plano', site).forEach(function (p) { p.classList.toggle('on', p === plano); });
      avisa(b.getAttribute('data-site-acao'));
    });
  });
  if (site) {
    // planos: clicar no card escolhe; mensal/anual recalcula os preços
    $$('.site_plano', site).forEach(function (plano) {
      plano.addEventListener('click', function () {
        $$('.site_plano', site).forEach(function (p) { p.classList.toggle('on', p === plano); });
      });
    });
    $$('[data-periodo]', site).forEach(function (bt) {
      bt.addEventListener('click', function () {
        var anual = bt.getAttribute('data-periodo') === 'ano';
        $$('[data-periodo]', site).forEach(function (o) { o.classList.toggle('on', o === bt); });
        $$('[data-preco]', site).forEach(function (pr) {
          var base = +pr.getAttribute('data-preco');
          pr.textContent = anual ? Math.round(base * 0.8) : base;
          acorda(pr.parentNode);
        });
      });
    });

    // contato: clicar num campo "digita" um exemplo; enviar completa o que faltar
    var form = $('[data-site-form]');
    var timersForm = [];
    var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var digita = function (campo, depois) {
      var alvo = campo.querySelector('span'), texto = campo.getAttribute('data-campo');
      if (campo.classList.contains('cheio')) { if (depois) depois(); return; }
      campo.classList.add('foco', 'cheio');
      var k = 0;
      var passo = function () {
        alvo.textContent = texto.slice(0, ++k);
        if (k < texto.length) timersForm.push(setTimeout(passo, calmo ? 0 : 28));
        else { campo.classList.remove('foco'); if (depois) depois(); }
      };
      passo();
    };
    var campos = $$('[data-campo]', form);
    campos.forEach(function (c) { c.addEventListener('click', function () { digita(c); }); });
    var enviar = $('[data-site-enviar]', form), enviando = false;
    enviar.addEventListener('click', function () {
      if (enviando) return;
      enviando = true;
      var i = 0;
      var proximo = function () {
        if (i < campos.length) return digita(campos[i++], proximo);
        enviar.classList.add('ok');
        enviar.textContent = 'Enviado ✓';
        avisa('Mensagem enviada ✓');
        timersForm.push(setTimeout(function () {
          campos.forEach(function (c) { c.classList.remove('cheio'); c.querySelector('span').textContent = ''; });
          enviar.classList.remove('ok');
          enviar.textContent = 'Enviar mensagem →';
          enviando = false;
        }, 2200));
      };
      proximo();
    });
  }

  // ---------- Desktop: cada aba de agente mostra outro trabalho ----------
  var AGENTES = [
    { tarefas: 12, lat: '212ms', linha: 'M0 50 L20 42 L40 46 L60 30 L80 35 L100 22 L120 27 L140 14 L160 21 L180 9 L200 15',
      log: [['›', 'buscando leads sem resposta'], ['✓', '12 encontrados no CRM'], ['›', 'escrevendo um follow-up para cada'], ['✓', '9 enviados'], ['›', 'agendando retorno']] },
    { tarefas: 31, lat: '148ms', linha: 'M0 30 L20 34 L40 22 L60 28 L80 18 L100 24 L120 16 L140 20 L160 12 L180 18 L200 10',
      log: [['›', 'lendo chamados abertos'], ['✓', '31 classificados por assunto'], ['›', 'respondendo dúvidas frequentes'], ['✓', '24 resolvidos sem fila'], ['›', 'passando 7 para o time']] },
    { tarefas: 6, lat: '390ms', linha: 'M0 40 L20 40 L40 36 L60 44 L80 30 L100 32 L120 26 L140 30 L160 24 L180 28 L200 20',
      log: [['›', 'conferindo boletos do mês'], ['✓', '6 vencendo esta semana'], ['›', 'gerando lembretes de pagamento'], ['✓', 'relatório pronto'], ['›', 'enviando para o financeiro']] }
  ];
  var dkLog = $('[data-dk-log]');
  var mostraAgente = function (n) {
    var ag = AGENTES[n];
    dkLog.innerHTML = '';
    ag.log.forEach(function (l, i) {
      var li = document.createElement('li');
      li.className = 'entra';
      li.style.setProperty('--i', i + 1);
      li.innerHTML = '<b' + (l[0] === '✓' ? ' class="ok"' : '') + '>' + l[0] + '</b>' + l[1] +
        (i === ag.log.length - 1 ? '<span class="dk_cursor"></span>' : '');
      dkLog.appendChild(li);
    });
    $('[data-dk-tarefas]').textContent = ag.tarefas;
    $('[data-dk-lat]').textContent = ag.lat;
    var linha = $('[data-dk-linha]');
    linha.setAttribute('d', ag.linha);
    acorda(linha);
  };
  if (dkLog) {
    $$('[data-agente]').forEach(function (aba) {
      aba.addEventListener('click', function () {
        $$('[data-agente]').forEach(function (a) { a.classList.toggle('on', a === aba); });
        mostraAgente(+aba.getAttribute('data-agente'));
      });
    });
    mostraAgente(0);
  }

  // ---------- Sistemas: funil (clique leva o card para a próxima coluna) ----------
  var kanban = $('[data-kanban]');
  if (kanban) {
    var cols = $$('.kb_col', kanban);
    var CARDS = [['Mercado Bom', 'R$ 4.200', 0], ['Studio Aurora', 'R$ 1.900', 0], ['Oficina Leve', 'R$ 2.750', 1], ['Clínica Vida', 'R$ 6.300', 1], ['Padaria Sol', 'R$ 980', 2]];
    var conta = function () {
      cols.forEach(function (c) { c.querySelector('.kb_topo b').textContent = c.querySelectorAll('.kb_card').length; });
    };
    CARDS.forEach(function (cd) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'kb_card';
      card.innerHTML = '<b>' + cd[0] + '</b><span>' + cd[1] + '</span>';
      card.addEventListener('click', function () {
        var atual = cols.indexOf(card.parentNode);
        var prox = cols[(atual + 1) % cols.length];
        prox.insertBefore(card, prox.children[1] || null);
        card.classList.toggle('fechado', prox === cols[2]);
        acorda(card);
        conta();
      });
      if (cd[2] === 2) card.classList.add('fechado');
      cols[cd[2]].appendChild(card);
    });
    conta();
  }

  // ---------- APIs: clicar num serviço manda uma requisição e ela entra no log ----------
  var log = $('[data-log]');
  var ROTAS_API = {
    ERP: ['POST', '/erp/pedidos'], IA: ['POST', '/ia/responder'], AWS: ['PUT', '/s3/arquivos'],
    CLOUDFLARE: ['GET', '/cdn/purge'], WHATSAPP: ['POST', '/whatsapp/enviar'], WEBHOOKS: ['EVT', 'webhook.recebido']
  };
  $$('[data-no]').forEach(function (no) {
    no.addEventListener('click', function () {
      var r = ROTAS_API[no.getAttribute('data-no')];
      if (!r || !log) return;
      acorda(no);
      var li = document.createElement('li');
      li.className = 'nova';
      li.innerHTML = '<b></b><span></span><em></em>';
      li.children[0].textContent = r[0];
      li.children[1].textContent = r[1];
      li.children[2].textContent = (r[0] === 'POST' ? '201' : '200') + ' · ' + (12 + Math.round(Math.random() * 40)) + 'ms';
      log.appendChild(li);
      while (log.children.length > 9) log.removeChild(log.firstChild);
    });
  });

  // ---------- IA: as perguntas sugeridas recebem resposta ----------
  var zap = $('[data-zap]'), fontes = $('[data-ia-fontes]');
  var RESPOSTAS = [
    { r: 'Tem sim: 10h e 15h30 estão livres. Quer que eu reserve uma delas?', f: ['agenda', 'lista de espera'] },
    { r: 'O pedido 412 saiu para entrega hoje às 9h12. A previsão é até as 18h.', f: ['pedidos', 'transportadora'] },
    { r: 'Foram R$ 18,4 mil na semana, 12% acima da anterior. Sexta foi o melhor dia.', f: ['vendas', 'relatórios'] }
  ];
  var ocupado = false;
  var fala = function (texto, cliente) {
    var m = document.createElement('div');
    m.className = 'zap_msg' + (cliente ? '' : ' zap_msg--in') + ' nova';
    m.textContent = texto;
    zap.appendChild(m);
    while (zap.children.length > 6) zap.removeChild(zap.firstChild);
    return m;
  };
  $$('[data-pergunta]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (ocupado || !zap) return;
      ocupado = true;
      var resp = RESPOSTAS[+b.getAttribute('data-pergunta')];
      fala(b.textContent, true);
      var digitando = fala('', false);
      digitando.classList.add('zap_msg--digitando');
      digitando.innerHTML = '<i></i><i></i><i></i>';
      fontes.innerHTML = '<span>consultando ' + resp.f.join(' e ') + '…</span>';
      setTimeout(function () {
        zap.removeChild(digitando);
        fala(resp.r, false);
        fontes.innerHTML = '<span><b>✓</b> ' + resp.f.join(' · ') + ' · 1,2s</span>';
        ocupado = false;
      }, 1100);
    });
  });
})();
