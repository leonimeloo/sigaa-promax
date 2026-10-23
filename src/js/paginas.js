/* Páginas avulsas: login, relatório de notas, fórum (lista e tópico). */
(() => {
  const SX = window.SX;
  const { h, $, $$ } = SX;

  /* ----------------------------------------------------------------- login */
  SX.login = function login() {
    const logon = $('.logon');
    if (!logon || document.body.classList.contains('sx-login-page')) return;
    document.body.classList.add('sx-login-page');
    const conteudo = $('#conteudo');
    const aviso = $$('#conteudo > div[align="center"]').find((d) => /aten/i.test(SX.text(d)));
    const sistemas = $$('td.painel');

    const brand = h(
      'section.sx-login-brand',
      h('div.sx-brand.sx-brand-lg', h('span.sx-brand-mark', 'S'), h('span.sx-brand-text', h('strong', 'SIGAA'), h('small', 'UFABC'))),
      h('h1', 'Sistema Integrado de Gestão de ', h('mark', 'Atividades Acadêmicas')),
      h('p.sx-muted', 'Turmas, notas, frequência, tarefas e fóruns em um só lugar.'),
      sistemas.length
        ? h(
            'nav.sx-systems',
            { 'aria-label': 'Sistemas' },
            sistemas.map((td) => {
              const a = td.querySelector('a');
              const desc = SX.text(td).replace(SX.text(a), '').replace(/[()]/g, '').trim();
              return h(`a.sx-system${td.classList.contains('sistemaAtual') ? '.sx-system-current' : ''}`, { href: a.href }, h('b', SX.text(a)), h('span', desc));
            })
          )
        : null
    );
    const card = h('section.sx-login-card', logon);
    if (aviso) {
      const texto = SX.text(aviso).replace(/^ATENÇÃO!\s*/i, '');
      card.append(h('p.sx-login-note', SX.icon('alert'), h('span', h('b', 'Atenção: '), texto)));
      SX.hide(aviso);
    }
    conteudo.prepend(h('div.sx-login', brand, card));
    SX.hide(sistemas[0]?.closest('div[align="center"]'));
  };

  /* ------------------------------------------------- seleção de módulos/portais */
  SX.menuPrincipal = function menuPrincipal() {
    const menu = $('#menu_principal');
    if (!menu || menu.dataset.sx || !$('#portais', menu)) return;
    menu.dataset.sx = '1';
    const disponiveis = $$('li.on', menu).filter((li) => li.querySelector('a[href]:not([href="#"])'));
    const nome = SX.text($('#info-usuario p.usuario'));
    const icone = (li) => getComputedStyle(li).backgroundImage;

    const destaque = h(
      'section.sx-access',
      h('p.sx-eyebrow', 'Bem-vindo'),
      h('h1', `${SX.greeting()}, `, h('mark', SX.firstName(nome)), '. Para onde vamos?'),
      h(
        'div.sx-access-grid',
        disponiveis.map((li) => {
          const a = li.querySelector('a');
          return h(
            'a.sx-access-card',
            { href: a.href },
            h('span.sx-access-icon', { style: { backgroundImage: icone(li) } }),
            h('strong', SX.text(a)),
            h('span.sx-access-cta', 'Acessar', SX.icon('chevron'))
          );
        })
      )
    );
    const todos = h('details.sx-all-modules', h('summary', SX.icon('grid'), 'Todos os módulos e portais', h('span.sx-count', $$('li', menu).length)));
    menu.before(destaque, todos);
    todos.append(menu);
  };

  /* --------------------------------------------------------- relatório de notas */
  const CONCEITO = {
    A: { cor: 'ok', peso: 4 },
    B: { cor: 'good', peso: 3 },
    C: { cor: 'mid', peso: 2 },
    D: { cor: 'warn', peso: 1 },
    F: { cor: 'bad', peso: 0 },
    O: { cor: 'bad', peso: 0 },
  };

  const situacaoTipo = (s) =>
    /reprovado/i.test(s) ? 'reprovado' : /aprovado/i.test(s) ? 'aprovado' : /cancelad|trancad/i.test(s) ? 'cancelado' : 'andamento';

  SX.notas = function notas() {
    const tabelas = $$('table.tabelaRelatorio');
    const container = $('#relatorio-paisagem-container, #relatorio-container');
    if (!tabelas.length || !container || container.dataset.sx || !/notas/i.test(SX.text($('#relatorio h3')))) return;
    container.dataset.sx = '1';
    document.body.classList.add('sx-notas-page');

    const periodos = tabelas.map((t) => {
      const cols = $$('thead th', t).map((th) => SX.text(th));
      const col = (re) => cols.findIndex((c) => re.test(c));
      const iCod = col(/código/i), iNome = col(/disciplina/i), iRes = col(/resultado/i), iFaltas = col(/faltas/i), iSit = col(/situação/i), iRec = col(/recupera/i);
      const iUnid = cols.map((c, i) => (/unidade/i.test(c) ? i : -1)).filter((i) => i >= 0);
      return {
        nome: SX.text(t.querySelector('caption')),
        disciplinas: $$('tbody tr', t).map((tr) => {
          const td = [...tr.children].map((c) => SX.text(c));
          return {
            codigo: td[iCod],
            nome: td[iNome],
            resultado: td[iRes],
            faltas: td[iFaltas],
            situacao: td[iSit],
            recuperacao: td[iRec],
            unidades: iUnid.map((i, n) => [cols[i].replace(/\.\s*/, ' '), td[i]]).filter(([, v]) => v && v !== '--'),
          };
        }),
      };
    });

    const todas = periodos.flatMap((p) => p.disciplinas);
    const conta = (tipo) => todas.filter((d) => situacaoTipo(d.situacao) === tipo).length;
    const comConceito = todas.filter((d) => CONCEITO[d.resultado]);
    const dist = Object.keys(CONCEITO).map((k) => [k, comConceito.filter((d) => d.resultado === k).length]);

    const voltar = $('#relatorio-rodape td.voltar a');
    const imprimir = $('#relatorio-rodape td.naoImprimir a');
    const portal = $('#relatorio-cabecalho a[href*="Portal"], #relatorio-cabecalho a');

    const barra = h(
      'nav.sx-report-bar',
      voltar ? h('button.sx-btn.sx-btn-ghost', { type: 'button', onclick: SX.proxyClick(voltar) }, SX.icon('back'), 'Voltar') : null,
      portal ? h('a.sx-btn.sx-btn-ghost', { href: portal.href }, SX.icon('home'), SX.text(portal) || 'Portal do Discente') : null,
      h('div.sx-topbar-spacer'),
      h('span.sx-muted', SX.text($('#relatorio-cabecalho .dataAtual'))),
      imprimir ? h('button.sx-btn', { type: 'button', onclick: SX.proxyClick(imprimir) }, SX.icon('print'), 'Imprimir') : null
    );

    const aluno = SX.text($$('#identificacao td').find((td) => /aluno/i.test(SX.text(td)))?.nextElementSibling) ||
      SX.text($('#identificacao')).match(/Aluno\(a\):\s*(.*?)\s*Curso/i)?.[1];

    const resumo = h(
      'section.sx-report-hero',
      h('div', h('p.sx-eyebrow', 'Relatório de Notas do Aluno(a)'), h('h1', aluno ? SX.titleCase(aluno.split(' - ')[0]) : 'Minhas notas'), h('p.sx-muted', `${periodos.length} períodos · ${todas.length} disciplinas cursadas`)),
      h(
        'div.sx-stats',
        h('div.sx-stat.sx-stat-ok', h('b', conta('aprovado')), h('span', 'aprovações')),
        h('div.sx-stat.sx-stat-bad', h('b', conta('reprovado')), h('span', 'reprovações')),
        h('div.sx-stat', h('b', conta('cancelado')), h('span', 'canceladas')),
        h('div.sx-stat', h('b', conta('andamento')), h('span', 'em andamento'))
      ),
      comConceito.length
        ? h(
            'div.sx-dist',
            { title: 'Distribuição de conceitos' },
            dist.filter(([, n]) => n).map(([k, n]) => h(`span.sx-dist-bar.sx-grade-${CONCEITO[k].cor}`, { style: { flexGrow: n } }, h('b', k), ` ${n}`))
          )
        : null
    );

    const filtros = h('div.sx-segmented.sx-filters');
    const FILTROS = [['todas', 'Todas'], ['aprovado', 'Aprovado'], ['reprovado', 'Reprovado'], ['cancelado', 'Cancelado'], ['andamento', 'Em andamento']];
    const lista = h('div.sx-periods');
    const aplicar = (f) => {
      lista.dataset.filtro = f;
      filtros.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === f));
      for (const sec of lista.children) sec.hidden = f !== 'todas' && !sec.querySelector(`.sx-course[data-tipo="${f}"]`);
    };
    for (const [f, label] of FILTROS) filtros.append(h('button', { type: 'button', 'data-f': f, onclick: () => aplicar(f) }, label));

    for (const p of periodos) {
      lista.append(
        h(
          'section.sx-period',
          h('h2', p.nome, h('span.sx-count', p.disciplinas.length)),
          h(
            'div.sx-courses',
            p.disciplinas.map((d) => {
              const tipo = situacaoTipo(d.situacao);
              const conceito = CONCEITO[d.resultado];
              return h(
                `article.sx-course.sx-course-${tipo}`,
                { 'data-tipo': tipo },
                h('div.sx-grade' + (conceito ? `.sx-grade-${conceito.cor}` : '.sx-grade-none'), { title: 'Resultado' }, d.resultado || '--'),
                h(
                  'div.sx-course-info',
                  h('span.sx-code', d.codigo),
                  h('h3', SX.titleCase(d.nome)),
                  h(
                    'div.sx-course-meta',
                    h(`span.sx-status.sx-status-${tipo}`, d.situacao && d.situacao !== '--' ? SX.titleCase(d.situacao) : 'Em andamento'),
                    h('span', SX.icon('calendar'), `${d.faltas || 0} faltas`),
                    d.recuperacao && d.recuperacao !== '--' ? h('span', `Recuperação: ${d.recuperacao}`) : null
                  ),
                  d.unidades.length ? h('div.sx-units', d.unidades.map(([k, v]) => h('span', h('small', k), h('b', v)))) : null
                )
              );
            })
          )
        )
      );
    }

    const view = h('div.sx-report', barra, resumo, filtros, lista);
    container.before(view);
    container.classList.add('sx-print-only');
    aplicar('todas');
  };

  /* ------------------------------------------------------------ fórum: lista */
  SX.forumLista = function forumLista() {
    const tabela = $$('#conteudo table.listagem').find((t) => t.querySelector('td.nomeUsuario') && /tópicos/i.test(SX.text(t.querySelector('caption'))));
    if (!tabela || tabela.dataset.sx) return;
    tabela.dataset.sx = '1';
    const now = new Date();

    const topicos = $$('tbody tr', tabela).map((tr) => {
      const tds = [...tr.children];
      const link = tds[0].querySelector('a');
      const flag = tr.querySelector('img[src*="flag_"]');
      const remover = [...tr.querySelectorAll('td.icon a')].find((a) => !a.querySelector('img[src*="flag_"]'));
      return {
        titulo: SX.text(link),
        link,
        autor: SX.text(tr.querySelector('td.nomeUsuario')),
        respostas: Number(SX.text(tds[2])) || 0,
        data: SX.parseDate(SX.text(tds[3])),
        seguindo: /flag_green/.test(flag?.src || ''),
        remover,
      };
    });

    const novo = $$('#conteudo .infoAltRem a').find((a) => /cadastrar novo tópico/i.test(SX.text(a)));
    const busca = $('[id="listagem:filtro"]');
    const buscar = $('[id="listagem:buscar"]');
    const toolbar = h('div.sx-forum-toolbar');
    if (busca) {
      busca.placeholder = 'Buscar tópicos…';
      toolbar.append(h('label.sx-search.sx-search-inline', SX.icon('search'), busca), buscar);
    }
    toolbar.append(h('div.sx-topbar-spacer'));
    if (novo) toolbar.append(h('button.sx-btn.sx-btn-primary', { type: 'button', onclick: SX.proxyClick(novo) }, SX.icon('plus'), 'Cadastrar novo tópico'));

    const lista = h(
      'ul.sx-topics',
      topicos.map((t) =>
        h(
          'li.sx-topic-row',
          h('span.sx-avatar', { style: { '--sx-hue': SX.hueFor(t.autor) } }, SX.initials(t.autor)),
          h(
            'div.sx-topic-main',
            h('a', { href: '#', onclick: SX.proxyClick(t.link) }, t.titulo),
            h('p.sx-muted', SX.titleCase(t.autor), t.data ? ` · última postagem ${SX.relative(t.data, now)}` : '')
          ),
          h(
            `span.sx-replies${t.respostas ? '' : '.sx-replies-zero'}`,
            { title: 'Respostas' },
            SX.icon('message'),
            t.respostas
          ),
          t.seguindo ? h('span.sx-badge.sx-badge-ok', { title: 'Seguindo tópico' }, SX.icon('flag'), 'Seguindo') : null,
          t.remover ? (t.remover.classList.add('sx-icon-btn'), t.remover) : null
        )
      )
    );

    const sec = h(
      'section.sx-card.sx-forum',
      h('header.sx-card-head', h('div', h('h3', SX.icon('message'), SX.text(tabela.querySelector('caption'))), h('p.sx-muted', `${topicos.length} tópicos`))),
      toolbar,
      lista
    );
    tabela.before(sec);
    SX.hide(tabela, $('#conteudo .infoAltRem'), busca?.closest('div[align="right"]'));
  };

  /* ----------------------------------------------------------- fórum: tópico */
  SX.forumTopico = function forumTopico() {
    const tabela = $$('#conteudo table.formulario').find((t) => t.querySelector('tr.bg-claro') && t.querySelector('td.bg-super-claro'));
    if (!tabela || tabela.dataset.sx) return;
    tabela.dataset.sx = '1';

    const linhas = $$(':scope > tbody > tr', tabela);
    const msgs = [];
    for (let i = 0; i < linhas.length; i++) {
      const tr = linhas[i];
      if (!tr.classList.contains('bg-claro')) continue;
      const corpo = linhas[i + 1];
      const [tdData, tdAutor, tdAcoes] = tr.children;
      const autorTxt = SX.text(tdAutor).replace(/^Postado por:\s*/i, '');
      const [nome, matricula] = autorTxt.split(/\s+-\s+(?=\d+$)/);
      const foto = corpo?.querySelector('td.bg-super-claro img');
      const conteudo = corpo?.querySelector('td[colspan]');
      msgs.push({
        data: SX.parseDate(SX.text(tdData)),
        nome,
        matricula,
        foto: foto && !/no_picture/.test(foto.src) ? foto.src : null,
        conteudo,
        acoes: [...(tdAcoes?.querySelectorAll('a') || [])],
      });
    }

    const autorTopico = msgs[0]?.nome;
    const thread = h(
      'ol.sx-thread',
      msgs.map((m, i) =>
        h(
          `li.sx-msg${i === 0 ? '.sx-msg-first' : ''}${m.nome === autorTopico ? '.sx-msg-op' : ''}`,
          h(
            'div.sx-msg-avatar',
            { style: { '--sx-hue': SX.hueFor(m.nome) } },
            m.foto ? h('img', { src: m.foto, alt: '', loading: 'lazy' }) : h('span', SX.initials(m.nome))
          ),
          h(
            'div.sx-msg-bubble',
            h(
              'header',
              h('strong', SX.titleCase(m.nome)),
              m.nome === autorTopico ? h('span.sx-badge', 'Autor do tópico') : null,
              m.matricula ? h('span.sx-muted', m.matricula) : null,
              h('time.sx-muted', { title: m.data?.toLocaleString('pt-BR') }, m.data ? SX.relative(m.data) : ''),
              h('span.sx-msg-actions', m.acoes.map((a) => (a.classList.add('sx-icon-btn'), a)))
            ),
            h('div.sx-msg-body', m.conteudo ? [...m.conteudo.childNodes] : null)
          )
        )
      )
    );

    const titulo = SX.text($('#conteudo h2')).split('>').pop().trim() || SX.text($('.sx-page-head h1'));
    const legenda = $('#conteudo .infoAltRem');
    const seguir = legenda?.querySelector('a[id$="seguirTopico"], a');
    const head = h(
      'header.sx-thread-head',
      h('div', h('p.sx-eyebrow', 'Fórum'), h('h1', titulo), h('p.sx-muted', `${msgs.length} mensagens · ${new Set(msgs.map((m) => m.nome)).size} participantes`)),
      seguir ? h('button.sx-btn', { type: 'button', onclick: SX.proxyClick(seguir) }, SX.icon('flag'), SX.text(seguir)) : null
    );
    tabela.before(head, thread);
    SX.hide(tabela, legenda);
    document.body.classList.add('sx-topic-page');
  };
})();
