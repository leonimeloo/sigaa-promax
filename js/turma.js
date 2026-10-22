/* Turma Virtual (layout RichFaces/jQuery Layout em #baseLayout). */
(() => {
  const SX = window.SX;
  const { h, $, $$ } = SX;

  const MENU_ICONES = { Turma: 'home', Alunos: 'users', Materiais: 'folder', Atividades: 'check', Estatística: 'chart', Ajuda: 'help' };

  /* ---------------------------------------------------------------- cabeçalho */
  function cabecalho() {
    const cab = $('#cabecalho');
    if (!cab || cab.dataset.sx) return;
    cab.dataset.sx = '1';

    const nome = SX.text($('#linkNomeTurma'));
    const codigo = SX.text($('#linkCodigoTurma')).replace(/\s*-\s*$/, '');
    const periodoTxt = SX.text($('#linkPeriodoTurma'));
    const turmaCod = periodoTxt.match(/-\s*(\S+)\s*\(/)?.[1] || '';
    const ano = periodoTxt.match(/\((\d{4}\.\d)/)?.[1] || '';
    const horario = SX.horario.parse($('#linkNomeTurma')?.title || periodoTxt);

    const btn = (id, icon, label, extra = '') =>
      $(id) ? h(`button.sx-btn${extra}`, { type: 'button', onclick: SX.proxyClick($(id)), title: label }, SX.icon(icon), h('span', label)) : null;

    const portal = $('[id="formAcoesTurma:botaoPortalDiscente"]');
    const sair = $('#info-sistema a[href*="logOff"]');
    if (sair) {
      sair.classList.add('sx-btn', 'sx-btn-ghost', 'sx-btn-sm');
      sair.prepend(SX.icon('logout'));
    }

    const head = h(
      'div.sx-turma-head',
      h(
        'div.sx-turma-head-main',
        portal
          ? h('button.sx-icon-btn.sx-back', { type: 'button', onclick: SX.proxyClick(portal), title: 'Voltar ao Portal do Discente' }, SX.icon('back'))
          : null,
        h(
          'div.sx-turma-title',
          h('div.sx-turma-codes', codigo ? h('span.sx-code', codigo) : null, turmaCod ? h('span.sx-muted', turmaCod) : null, ano ? h('span.sx-pill', ano) : null),
          h('h1', SX.titleCase(nome) || 'Turma Virtual')
        )
      ),
      horario.blocos.length ? SX.horario.chips(horario) : null,
      h(
        'div.sx-turma-head-actions',
        btn('[id="formAcoesTurma:botaoTrocarTurma"]', 'swap', 'Trocar Turma'),
        btn('[id="formAcoesTurma:botaoImprimir"]', 'print', 'Imprimir', '.sx-btn-ghost.sx-btn-icon'),
        btn('[id="formAcoesTurma:botaoExibirOpcoes"]', 'menu', 'Opções', '.sx-btn-ghost.sx-btn-icon'),
        $('#spanRelogio') ? h('span.sx-session', { title: 'Tempo restante da sessão' }, SX.icon('clock'), $('#spanRelogio')) : null,
        sair
      )
    );
    cab.prepend(head);
  }

  /* ---------------------------------------------------------- menu lateral */
  function menu() {
    const barra = $('#barraEsquerda');
    if (!barra || barra.dataset.sx) return;
    barra.dataset.sx = '1';

    // textos soltos no form viram itens do grid (display: contents); embrulha e oculta
    for (const node of [...($('#formMenu')?.childNodes || [])]) {
      if (node.nodeType === 3 && node.nodeValue.trim()) node.replaceWith(h('span.sx-hidden', node.nodeValue));
    }

    for (const header of $$('.rich-panelbar-header, .rich-panelbar-header-act', barra)) {
      const label = SX.text(header);
      if (!header.querySelector('.sx-icon')) header.prepend(SX.icon(MENU_ICONES[label] || 'folder'));
    }

    const atual = sessionStorage.getItem('sx:turma-item') || ($('#formAva .topico-aula, #ultimaNoticia') ? 'Principal' : '');
    for (const a of $$('a', barra)) {
      const label = SX.text(a);
      if (!label) continue;
      a.classList.add('sx-menu-link');
      if (label === atual) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', () => sessionStorage.setItem('sx:turma-item', label), { capture: true });
    }
    // o botão "voltar ao portal" limpa o item atual
    $('[id="formAcoesTurma:botaoPortalDiscente"]')?.addEventListener('click', () => sessionStorage.removeItem('sx:turma-item'));
  }

  /* --------------------------------------------------------------- início */
  function inicio() {
    const form = $('#formAva');
    if (!form || form.dataset.sx) return;
    form.dataset.sx = '1';

    const noticia = $('#ultimaNoticia');
    if (noticia) {
      const h4 = noticia.querySelector('h4');
      const titulo = SX.text(h4).replace(/^Última Notícia\s*/i, '');
      const data = SX.parseDate(titulo);
      const tituloLimpo = titulo.replace(/\s*-\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*$/, '');
      const corpo = noticia.querySelector('.conteudoNoticia');
      const autor = SX.text(noticia.querySelector('small i'));
      const card = h(
        'article.sx-announce',
        h(
          'header',
          h('span.sx-announce-icon', SX.icon('megaphone')),
          h('div', h('p.sx-eyebrow', 'Última Notícia', data ? ` · ${SX.relative(data)}` : ''), h('h2', tituloLimpo))
        ),
        corpo ? h('div.sx-announce-body', corpo) : null,
        h(
          'footer',
          autor ? h('span.sx-muted', 'Cadastrado por ', h('b', SX.titleCase(autor))) : null,
          data ? h('time.sx-muted', data.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })) : null
        )
      );
      noticia.before(card);
      SX.hide(noticia);
      // recolhe textos longos
      requestAnimationFrame(() => {
        const body = card.querySelector('.sx-announce-body');
        if (body && body.scrollHeight > 220) {
          body.classList.add('sx-collapsed');
          const toggle = h('button.sx-link-btn', { type: 'button' }, 'Ler mais');
          toggle.addEventListener('click', () => {
            const fechado = body.classList.toggle('sx-collapsed');
            toggle.textContent = fechado ? 'Ler mais' : 'Mostrar menos';
          });
          body.after(toggle);
        }
      });
    }

    const now = new Date();
    const topicos = $$('.topico-aula', form);
    topicos.forEach((topico) => {
      const tituloEl = topico.querySelector(':scope > .titulo');
      if (!tituloEl) return;
      const texto = SX.text(tituloEl);
      const [ini, fim] = SX.parseDates(texto);
      topico.classList.add('sx-topic');
      if (ini) {
        const fimDia = new Date((fim || ini).getTime() + 86400e3 - 1);
        topico.classList.add(fimDia < now ? 'sx-topic-past' : ini > now ? 'sx-topic-future' : 'sx-topic-current');
        tituloEl.before(
          h(
            'div.sx-topic-date',
            { title: texto.match(/\(([^)]*\d{4}[^)]*)\)/)?.[1] || '' },
            h('b', String(ini.getDate()).padStart(2, '0')),
            h('span', SX.fmtDate(ini, { month: 'short' }))
          )
        );
        // remove o intervalo de datas do título (fica no selo)
        for (const node of tituloEl.childNodes) {
          if (node.nodeType === 3) node.nodeValue = node.nodeValue.replace(/\s*\(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}\)\s*/, ' ');
        }
      }
    });
    // destaca o tópico mais próximo de hoje
    const atual = topicos.find((t) => t.classList.contains('sx-topic-current')) || topicos.find((t) => t.classList.contains('sx-topic-future'));
    atual?.classList.add('sx-topic-next');
    form.classList.add('sx-timeline');
  }

  /* ---------------------------------------------------------- participantes */
  function participantes() {
    const tabelas = $$('#conteudo table.participantes');
    if (!tabelas.length || tabelas[0].dataset.sx) return;

    const pessoas = (tabela) => {
      const lista = [];
      for (const td of $$(':scope > tbody > tr > td', tabela)) {
        const strong = td.querySelector(':scope > strong');
        if (!strong) continue;
        const foto = td.previousElementSibling?.querySelector('img');
        const acao = td.nextElementSibling?.querySelector('a');
        const status = td.querySelector(':scope > img')?.title || '';
        const campos = [];
        for (const em of td.querySelectorAll(':scope > em')) {
          let label = '';
          for (let n = em.previousSibling; n && n.nodeType === 3; n = n.previousSibling) label = n.nodeValue + label;
          campos.push([label.replace(/[:\s]+$/, '').trim(), SX.text(em)]);
        }
        lista.push({
          nome: SX.text(strong),
          link: strong.querySelector('a'),
          foto: foto && !/no_picture/.test(foto.src) ? foto.src : null,
          online: /on-?line/i.test(status) && !/off/i.test(status),
          campos,
          acao,
        });
      }
      return lista;
    };

    const card = (p, docente) =>
      h(
        `article.sx-person${docente ? '.sx-person-lg' : ''}`,
        { 'data-busca': [p.nome, ...p.campos.map((c) => c[1])].join(' ').toLowerCase() },
        h(
          'div.sx-person-avatar',
          { style: { '--sx-hue': SX.hueFor(p.nome) } },
          p.foto ? h('img', { src: p.foto, alt: '', loading: 'lazy' }) : h('span', SX.initials(p.nome)),
          h(`span.sx-presence${p.online ? '.sx-online' : ''}`, { title: p.online ? 'On-line no SIGAA' : 'Off-line no SIGAA' })
        ),
        h(
          'div.sx-person-info',
          p.link ? h('a.sx-person-name', { href: p.link.href, target: '_blank', title: p.link.title }, SX.titleCase(p.nome)) : h('strong.sx-person-name', SX.titleCase(p.nome)),
          h(
            'dl',
            p.campos
              .filter(([k]) => docente || k !== 'Curso' || true)
              .map(([k, v]) => [h('dt', k), h('dd', /^(curso|departamento|formação)$/i.test(k) ? SX.titleCase(v) : v)])
          )
        ),
        p.acao ? h('div.sx-person-actions', (p.acao.classList.add('sx-icon-btn'), p.acao)) : null
      );

    const wrap = h('div.sx-people');
    tabelas.forEach((tabela, i) => {
      tabela.dataset.sx = '1';
      const legend = tabela.previousElementSibling?.matches('fieldset') ? tabela.previousElementSibling : $$('#conteudo fieldset')[i];
      const titulo = SX.text(legend?.querySelector('legend')) || (i === 0 ? 'Docentes' : 'Discentes');
      const docente = /docente/i.test(titulo);
      const lista = pessoas(tabela);
      const grid = h(`div.sx-people-grid${docente ? '.sx-people-docentes' : ''}`, lista.map((p) => card(p, docente)));
      const head = h('header.sx-section-head', h('h2', titulo.replace(/\s*\(\d+\)/, ''), h('span.sx-count', lista.length)));
      if (!docente) {
        const busca = h('input', { type: 'search', placeholder: 'Buscar por nome, curso ou matrícula…' });
        const vazio = h('p.sx-empty', { hidden: true }, 'Ninguém encontrado.');
        busca.addEventListener('input', () => {
          const q = busca.value.trim().toLowerCase();
          let n = 0;
          for (const c of grid.children) {
            const ok = !q || c.dataset.busca.includes(q);
            c.hidden = !ok;
            n += ok;
          }
          vazio.hidden = n > 0;
        });
        head.append(h('label.sx-search.sx-search-inline', SX.icon('search'), busca));
        wrap.append(h('section.sx-people-section', head, grid, vazio));
      } else {
        wrap.append(h('section.sx-people-section', head, grid));
      }
      SX.hide(tabela, legend);
    });
    tabelas[0].before(wrap);
  }

  /* ------------------------------------------------------------ frequência */
  function anel(pct, label, meta = 75) {
    const ok = pct >= meta;
    return h(
      `div.sx-ring${ok ? '.sx-ring-ok' : '.sx-ring-low'}`,
      { style: { '--sx-pct': Math.min(100, pct), '--sx-meta': meta }, role: 'img', 'aria-label': `${label}: ${pct}%` },
      h('div.sx-ring-inner', h('b', `${pct}%`), h('span', label))
    );
  }

  function frequencia() {
    const form = $$('#conteudo form').find((f) => /FrequenciaAluno/.test(f.action));
    if (!form || form.dataset.sx) return;
    form.dataset.sx = '1';

    const tabela = form.querySelector('table.listing');
    const resumo = form.querySelector('.botoes-show');
    const regras = form.querySelector('.descricaoOperacao');
    const txt = SX.text(resumo);
    const num = (re) => Number(txt.match(re)?.[1] ?? NaN);
    const presencas = num(/Presenças Registradas:\s*(\d+)/i);
    const registradas = num(/Aulas com Registro de Frequência:\s*(\d+)/i);
    const pctRegistro = num(/Aulas com Registro de Frequência:\s*\d+.*?Registro de Frequência:\s*(\d+)%/i);
    const totalCH = num(/definidas pela CH do Componente:\s*(\d+)/i);
    const pctCH = num(/relação a CH:\s*(\d+)%/i);

    const aulas = tabela
      ? $$('tbody tr', tabela).map((tr) => {
          const [tdData, tdSit] = tr.querySelectorAll('td');
          const situacao = SX.text(tdSit);
          const tipo = /presente/i.test(situacao) ? 'presente' : /não registrada/i.test(situacao) ? 'pendente' : 'falta';
          return { data: SX.parseDate(SX.text(tdData)), situacao, tipo };
        })
      : [];
    const faltas = aulas.filter((a) => a.tipo === 'falta').length;
    const pendentes = aulas.filter((a) => a.tipo === 'pendente').length;

    const porMes = new Map();
    for (const a of aulas) {
      const key = a.data ? a.data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '—';
      porMes.set(key, [...(porMes.get(key) || []), a]);
    }

    const painel = h(
      'div.sx-freq',
      h('header.sx-section-head', h('h2', 'Mapa de Frequências')),
      h(
        'div.sx-freq-top',
        h(
          'div.sx-card.sx-freq-rings',
          Number.isFinite(pctCH) ? anel(pctCH, 'da carga horária') : null,
          Number.isFinite(pctRegistro) ? anel(pctRegistro, 'das aulas registradas') : null,
          h('p.sx-muted', 'Aprovação por assiduidade: 75% da carga horária ', h('b', 'ou'), ' 75% das aulas ministradas.')
        ),
        h(
          'div.sx-freq-stats',
          h('div.sx-stat.sx-stat-ok', h('b', Number.isFinite(presencas) ? presencas : aulas.filter((a) => a.tipo === 'presente').length), h('span', 'Presenças Registradas')),
          h('div.sx-stat.sx-stat-bad', h('b', faltas), h('span', 'faltas')),
          h('div.sx-stat', h('b', pendentes), h('span', 'aulas sem registro')),
          Number.isFinite(registradas) ? h('div.sx-stat', h('b', registradas), h('span', 'aulas com registro de frequência')) : null,
          Number.isFinite(totalCH) ? h('div.sx-stat', h('b', totalCH), h('span', 'aulas pela CH do componente')) : null
        )
      ),
      h(
        'section.sx-card',
        h(
          'header.sx-card-head',
          h('div', h('h3', SX.icon('calendar'), 'Aulas')),
          h(
            'div.sx-legend',
            h('span.sx-legend-item.sx-att-presente', 'Presente'),
            h('span.sx-legend-item.sx-att-falta', 'Falta'),
            h('span.sx-legend-item.sx-att-pendente', 'Não Registrada')
          )
        ),
        [...porMes].map(([mes, lista]) =>
          h(
            'div.sx-att-month',
            h('h4', mes),
            h(
              'div.sx-att-days',
              lista.map((a) =>
                h(
                  `div.sx-att.sx-att-${a.tipo}`,
                  { title: `${a.data?.toLocaleDateString('pt-BR')} — ${a.situacao}` },
                  h('small', a.data ? SX.horario.DIAS_CURTO[a.data.getDay() + 1] : ''),
                  h('b', a.data ? String(a.data.getDate()).padStart(2, '0') : '?'),
                  h('span', a.situacao)
                )
              )
            )
          )
        )
      ),
      regras ? h('details.sx-card.sx-rules', h('summary', SX.icon('help'), 'Regras de frequência'), regras) : null
    );
    form.prepend(painel);
    SX.hide(tabela, resumo, form.querySelector(':scope > fieldset > legend'));
  }

  /* --------------------------------------------------------------- tarefas */
  function tarefas() {
    const form = $$('#conteudo form').find((f) => /TarefaTurma\/listar/.test(f.action));
    if (!form || form.dataset.sx) return;
    form.dataset.sx = '1';
    const now = new Date();

    const secoes = $$('table.listing', form).map((tabela) => {
      const titulo = SX.text(tabela.closest('fieldset')?.querySelector(':scope > legend')) || 'Tarefas';
      const cols = $$('thead th', tabela).map((th) => SX.text(th));
      const idx = (re) => cols.findIndex((c) => re.test(c));
      const iTitulo = idx(/^título$/i), iPeriodo = idx(/período/i), iNota = idx(/nota/i), iEnvios = idx(/envios/i);
      const linhas = $$(':scope > tbody > tr', tabela);
      const itens = [];
      for (let i = 0; i < linhas.length; i++) {
        const tds = [...linhas[i].children];
        if (tds.length < cols.length - 1) continue; // linha de descrição já consumida
        const desc = linhas[i + 1] && linhas[i + 1].children.length === 1 ? linhas[i + 1].children[0] : null;
        if (desc) i++;
        const periodo = SX.text(tds[iPeriodo]);
        const [ini, fim] = SX.parseDates(periodo);
        const status = !ini ? 'sem-data' : now < ini ? 'futura' : fim && now > fim ? 'encerrada' : 'aberta';
        const acoes = tds.flatMap((td) => [...td.querySelectorAll('a[title], a:has(img)')]);
        const corrigida = tds.some((td) => /accept\.png/.test(td.querySelector('img')?.src || ''));
        itens.push({
          titulo: SX.text(tds[iTitulo]),
          desc,
          ini,
          fim,
          status,
          corrigida,
          envios: iEnvios >= 0 ? SX.text(tds[iEnvios]) : '',
          nota: iNota >= 0 ? SX.text(tds[iNota]) : '',
          acoes,
        });
      }
      const ordem = { aberta: 0, futura: 1, 'sem-data': 2, encerrada: 3 };
      itens.sort((a, b) => ordem[a.status] - ordem[b.status] || (a.status === 'encerrada' ? (b.fim || 0) - (a.fim || 0) : (a.fim || 0) - (b.fim || 0)));
      return { titulo, itens, tabela };
    });

    const STATUS = { aberta: 'Aberta', futura: 'Em breve', encerrada: 'Encerrada', 'sem-data': 'Sem prazo' };
    const ICONE_ACAO = (t) => (/enviar/i.test(t) ? 'upload' : /visualizar|corrigida/i.test(t) ? 'eye' : 'file');

    const card = (t) => {
      const prazo =
        t.status === 'aberta' && t.fim
          ? `Encerra ${SX.relative(t.fim, now)}`
          : t.status === 'futura' && t.ini
            ? `Abre ${SX.relative(t.ini, now)}`
            : t.status === 'encerrada' && t.fim
              ? `Encerrou ${SX.relative(t.fim, now)}`
              : '';
      const urgente = t.status === 'aberta' && t.fim && t.fim - now < 3 * 86400e3;
      const descEl = t.desc ? h('div.sx-task-desc', [...t.desc.childNodes]) : null;
      const el = h(
        `article.sx-assign.sx-assign-${t.status}${urgente ? '.sx-assign-urgent' : ''}`,
        h(
          'header',
          h('span.sx-badge', STATUS[t.status]),
          t.corrigida ? h('span.sx-badge.sx-badge-ok', SX.icon('check'), 'Tarefa Corrigida') : null,
          prazo ? h('span.sx-assign-countdown', SX.icon('clock'), prazo) : null
        ),
        h('h3', t.titulo),
        descEl,
        h(
          'footer',
          h(
            'div.sx-assign-meta',
            t.ini && t.fim
              ? h('span', SX.icon('calendar'), `${SX.fmtDate(t.ini)} ${SX.fmtTime(t.ini)} → ${SX.fmtDate(t.fim)} ${SX.fmtTime(t.fim)}`)
              : null,
            t.envios ? h('span', SX.icon('upload'), `${t.envios} ${t.envios === '1' ? 'envio' : 'envios'}`) : null,
            t.nota ? h('span', SX.icon('award'), `Possui Nota: ${t.nota}`) : null
          ),
          h(
            'div.sx-assign-actions',
            t.acoes.map((a) => {
              const label = a.title || a.querySelector('img')?.title || 'Abrir';
              return h(
                `button.sx-btn${/enviar/i.test(label) && t.status === 'aberta' ? '.sx-btn-primary' : ''}`,
                { type: 'button', onclick: SX.proxyClick(a) },
                SX.icon(ICONE_ACAO(label)),
                label
              );
            })
          )
        )
      );
      if (descEl) {
        requestAnimationFrame(() => {
          if (descEl.scrollHeight > 160) {
            descEl.classList.add('sx-collapsed');
            const tg = h('button.sx-link-btn', { type: 'button' }, 'Ver descrição completa');
            tg.addEventListener('click', () => {
              const c = descEl.classList.toggle('sx-collapsed');
              tg.textContent = c ? 'Ver descrição completa' : 'Mostrar menos';
            });
            descEl.after(tg);
          }
        });
      }
      return el;
    };

    const painel = h(
      'div.sx-assigns',
      h('header.sx-section-head', h('h2', 'Tarefas')),
      secoes.map((s) =>
        h(
          'section.sx-assign-section',
          h('h3.sx-subhead', s.titulo, h('span.sx-count', s.itens.length)),
          s.itens.length ? h('div.sx-assign-list', s.itens.map(card)) : h('p.sx-empty', 'Nenhuma tarefa.')
        )
      )
    );
    form.prepend(painel);
    SX.hide(form.querySelector('.infoAltRem'), form.querySelector('table.tarefas'), form.querySelector(':scope > fieldset > legend'));
  }

  SX.turma = function turma() {
    if (!$('#baseLayout')) return;
    document.body.classList.add('sx-ava');
    cabecalho();
    menu();
    inicio();
    participantes();
    frequencia();
    tarefas();
  };
})();
