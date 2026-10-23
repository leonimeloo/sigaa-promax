/* Portal do Discente: painel com próxima aula, horário semanal, turmas, atividades e novidades. */
(() => {
  const SX = window.SX;
  const { h, $, $$ } = SX;

  /** "Campus S.B.C.|Bloco Tau|Sala de Aula|A2-S208-SB ou Campus S.B.C.|..." -> partes legíveis */
  function local(raw) {
    const opcoes = [...new Set((raw || '').split(/\s+ou\s+/i).map((s) => s.trim()).filter(Boolean))];
    const [primeiro] = opcoes;
    if (!primeiro) return { sala: '', resumo: '', completo: '' };
    const partes = primeiro.split('|').map((s) => s.trim());
    const sala = partes.at(-1);
    const bloco = partes.find((p) => /^bloco/i.test(p));
    const campus = partes.find((p) => /^campus/i.test(p))?.replace(/^campus\s*/i, '');
    return { sala, resumo: [bloco, campus].filter(Boolean).join(' · '), completo: opcoes.join(' ou ') };
  }

  function lerTurmas() {
    const tabela = $$('#turmas-portal > table').find((t) => !t.classList.contains('subFormulario'));
    if (!tabela) return [];
    return $$('tbody > tr', tabela)
      .filter((tr) => tr.querySelector('td.descricao a'))
      .map((tr, i) => {
        const link = tr.querySelector('td.descricao a');
        const [, tdLocal, tdHorario] = tr.querySelectorAll(':scope > td');
        const nomeOriginal = SX.text(link);
        const loc = local(SX.text(tdLocal));
        return {
          nomeOriginal,
          nome: SX.titleCase(nomeOriginal),
          horario: SX.horario.parse(SX.text(tdHorario)),
          local: loc.completo,
          sala: loc.sala,
          localResumo: loc.resumo,
          hue: SX.hueAt(i),
          link,
          onOpen: SX.proxyClick(link),
        };
      });
  }

  function lerAtualizacoes() {
    return $$('#atualizacoes-turma .rotator > table').map((t) => {
      const [linha1, linha2] = t.querySelectorAll('tr');
      const link = linha1?.querySelector('a');
      const turma = SX.text(link).replace(/\s*\(\d{4}\.\d\)\s*$/, '');
      return {
        data: SX.parseDate(SX.text(linha1)),
        turma,
        texto: SX.text(linha2),
        link,
      };
    });
  }

  function lerAtividades() {
    const tabela = $('#avaliacao-portal table');
    if (!tabela) return [];
    return $$('tbody > tr', tabela)
      .filter((tr) => tr.querySelectorAll('td').length >= 3)
      .map((tr) => {
        const [, tdData, tdAtiv] = tr.querySelectorAll('td');
        const link = tdAtiv.querySelector('a');
        const tipo = SX.text(tdAtiv.querySelector('strong')).replace(/:$/, '');
        const turma = SX.text(tdAtiv.querySelector('font')?.firstChild) || SX.text(tdAtiv).split(tipo)[0];
        return {
          data: SX.parseDate(SX.text(tdData)),
          tipo,
          titulo: SX.text(link) || SX.text(tdAtiv),
          turma: turma.trim(),
          link,
        };
      });
  }

  function proximaAulaCard(turmas) {
    const prox = SX.horario.proximaAula(turmas);
    if (!prox) return null;
    const { turma, bloco, start, agora } = prox;
    const hhmm = SX.horario.hhmm;
    return h(
      'button.sx-next',
      { type: 'button', style: { '--sx-hue': turma.hue }, onclick: turma.onOpen, title: 'Abrir turma virtual' },
      h('span.sx-next-label', agora ? h('span.sx-live', 'Acontecendo agora') : ['Próxima aula · ', h('b', SX.relative(start))]),
      h('strong.sx-next-title', turma.nome),
      h(
        'span.sx-next-meta',
        h('span', SX.icon('calendar'), `${SX.horario.DIAS[bloco.dia]}, ${SX.fmtDate(start)}`),
        h('span', SX.icon('clock'), `${hhmm(bloco.inicio)}–${hhmm(bloco.fim)}`),
        turma.sala ? h('span', SX.icon('pin'), turma.sala) : null
      )
    );
  }

  function turmasGrid(turmas, atualizacoes) {
    return h(
      'section.sx-card',
      h('header.sx-card-head', h('div', h('h3', SX.icon('book'), 'Turmas do Período'), h('p.sx-muted', `${turmas.length} componentes curriculares`))),
      h(
        'div.sx-turmas',
        turmas.map((t) => {
          const ultima = atualizacoes.find((a) => a.turma === t.nomeOriginal);
          return h(
            'article.sx-turma',
            { style: { '--sx-hue': t.hue } },
            h('button.sx-turma-open', { type: 'button', onclick: t.onOpen, 'aria-label': `Abrir ${t.nome}` }),
            h('h4', t.nome),
            SX.horario.chips(t.horario),
            h('p.sx-turma-local', SX.icon('pin'), h('span', h('b', t.sala || '—'), t.localResumo ? ` · ${t.localResumo}` : '')),
            ultima
              ? h('p.sx-turma-update', SX.icon('bell'), h('span', ultima.texto), h('time', SX.fmtDate(ultima.data)))
              : null,
            h('span.sx-turma-cta', 'Acessar turma', SX.icon('chevron'))
          );
        })
      )
    );
  }

  function atividadesCard(atividades, turmas) {
    const now = new Date();
    // a entregar primeiro (mais próximas no topo), depois as encerradas (mais recentes no topo)
    const lista = [
      ...atividades.filter((a) => !a.data || a.data >= now).sort((a, b) => (a.data || Infinity) - (b.data || Infinity)),
      ...atividades.filter((a) => a.data && a.data < now).sort((a, b) => b.data - a.data),
    ];
    const futuras = lista.filter((a) => a.data && a.data >= now);
    return h(
      'section.sx-card',
      h(
        'header.sx-card-head',
        h('div', h('h3', SX.icon('check'), 'Minhas atividades'), h('p.sx-muted', futuras.length ? `${futuras.length} a entregar` : 'Nada pendente por enquanto'))
      ),
      lista.length
        ? h(
            'ul.sx-tasks',
            lista.map((a) => {
              const vencida = a.data && a.data < now;
              const turma = turmas.find((t) => t.nomeOriginal === a.turma);
              const dias = a.data ? (a.data - now) / 86400e3 : Infinity;
              return h(
                `li.sx-task${vencida ? '.sx-task-done' : ''}`,
                h('span.sx-task-dot', { 'aria-hidden': 'true' }),
                h(
                  'div.sx-task-body',
                  h('a', { href: '#', onclick: SX.proxyClick(a.link) }, a.titulo),
                  h(
                    'div.sx-task-meta',
                    h('span.sx-tag', { style: { '--sx-hue': turma?.hue ?? SX.hueFor(a.turma) } }, turma?.nome || SX.titleCase(a.turma)),
                    a.tipo ? h('span.sx-muted', a.tipo) : null
                  )
                ),
                a.data
                  ? h(
                      `time.sx-due${vencida ? '.sx-due-past' : dias < 3 ? '.sx-due-soon' : ''}`,
                      { title: a.data.toLocaleString('pt-BR') },
                      h('b', `${SX.fmtDate(a.data)} · ${SX.fmtTime(a.data)}`),
                      h('small', vencida ? 'encerrada' : SX.relative(a.data))
                    )
                  : null
              );
            })
          )
        : h('p.sx-empty', 'Nenhuma atividade cadastrada.'),
      $('#avaliacao-portal a.mais') ? h('footer.sx-card-foot', $('#avaliacao-portal a.mais')) : null
    );
  }

  function novidadesCard(atualizacoes, turmas) {
    if (!atualizacoes.length) return null;
    return h(
      'section.sx-card',
      h('header.sx-card-head', h('div', h('h3', SX.icon('bell'), 'Últimas Atualizações'))),
      h(
        'ol.sx-feed',
        atualizacoes.map((a) => {
          const turma = turmas.find((t) => t.nomeOriginal === a.turma);
          return h(
            'li',
            { style: { '--sx-hue': turma?.hue ?? SX.hueFor(a.turma) } },
            h('time', SX.fmtDate(a.data)),
            h('div', h('a', { href: '#', onclick: SX.proxyClick(a.link) }, turma?.nome || SX.titleCase(a.turma)), h('p', a.texto))
          );
        })
      )
    );
  }

  function hero(turmas, atividades) {
    const nome = SX.text($('#perfil-docente .info-docente .nome')) || SX.text($('#info-usuario p.usuario'));
    const periodo = SX.text($('#info-usuario p.periodo-atual strong'));
    const dados = Object.fromEntries(
      $$('#perfil-docente #agenda-docente tr').map((tr) => [...tr.querySelectorAll('td')].map((td) => SX.text(td).replace(/:$/, '')))
    );
    let horas = 0;
    for (const t of turmas) for (const b of t.horario.blocos) horas += b.fim - b.inicio;
    const pendentes = atividades.filter((a) => a.data && a.data >= new Date()).length;
    const curso = (dados['Curso'] || '').split(' - ')[0];

    return h(
      'section.sx-hero',
      h(
        'div.sx-hero-text',
        h('p.sx-eyebrow', new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })),
        h('h1', `${SX.greeting()}, `, h('mark', SX.firstName(nome)), '.'),
        h('p.sx-muted', [curso && SX.titleCase(curso), periodo && `Período ${periodo}`, dados['Status'] && SX.titleCase(dados['Status'])].filter(Boolean).join(' · '))
      ),
      proximaAulaCard(turmas),
      h(
        'div.sx-stats',
        h('div.sx-stat', h('b', turmas.length), h('span', 'turmas')),
        h('div.sx-stat', h('b', `${horas}h`), h('span', 'de aula por semana')),
        h('div.sx-stat', h('b', pendentes), h('span', pendentes === 1 ? 'atividade a entregar' : 'atividades a entregar'))
      )
    );
  }

  /** Reúne foto, atalhos, links e dados institucionais em um único cartão. */
  function perfilCard() {
    const perfil = $('#perfil-docente');
    if (!perfil) return null;
    const foto = perfil.querySelector('.foto img');
    const nome = SX.text(perfil.querySelector('.info-docente .nome'));
    const atalhos = perfil.querySelector('.pessoal-docente ul');
    const dados = perfil.querySelector(':scope > #agenda-docente table');
    const links = $$(':scope > p > a', perfil);
    const extras = perfil.querySelector('#form_links');
    return h(
      'section.sx-card.sx-profile',
      h(
        'header.sx-profile-head',
        foto ? h('div.sx-profile-photo', foto) : h('span.sx-avatar', SX.initials(nome)),
        h('div', h('strong', SX.titleCase(nome)), h('span.sx-muted', 'Discente'))
      ),
      atalhos ? h('div.sx-profile-actions', atalhos) : null,
      dados ? h('div.sx-profile-data', h('h4.sx-eyebrow', 'Dados Institucionais'), dados) : null,
      links.length ? h('nav.sx-profile-links', links) : null,
      extras ? h('div.sx-profile-extras', extras) : null
    );
  }

  SX.portal = function portal() {
    const main = $('#main-docente');
    if (!main || !$('#turmas-portal') || main.dataset.sx) return;
    main.dataset.sx = '1';
    document.body.classList.add('sx-portal');

    const turmas = lerTurmas();
    const atualizacoes = lerAtualizacoes();
    const atividades = lerAtividades();

    const dash = h(
      'div.sx-dash',
      hero(turmas, atividades),
      turmas.some((t) => t.horario.blocos.length) ? SX.horario.painel(turmas) : null,
      turmasGrid(turmas, atualizacoes),
      h('div.sx-dash-cols', atividadesCard(atividades, turmas), novidadesCard(atualizacoes, turmas), perfilCard())
    );

    main.prepend(dash);
    SX.hide($('#turmas-portal'), $('#avaliacao-portal'), $('#perfil-docente'));
    // notícias vazias não ocupam espaço
    const noticias = $('#noticias-portal');
    if (noticias && /não há notícias/i.test(SX.text(noticias))) SX.hide(noticias);
  };
})();
