/*
 * Horários do SIGAA: "3N34" = terça (3), noturno (N), 3º e 4º horários.
 *   Dias: 2 = segunda … 7 = sábado. Turnos: M (matutino), T (vespertino), N (noturno).
 *   Cada horário dura 1h e cada turno tem 4 blocos regulares na UFABC:
 *     M 08–12 (M12 = 08–10, M34 = 10–12)
 *     T 14–18 (T12 = 14–16, T34 = 16–18)
 *     N 19–23 (N12 = 19–21, N34 = 21–23)
 *   Algumas turmas numeram o turno a partir de 2 (ex.: "2N45 5N23"): o último bloco
 *   continua terminando no fim do turno, então N45 = 21–23 e N23 = 19–21. O ajuste é
 *   detectado por turma e por turno (se algum horário passar de 4).
 */
(() => {
  const SX = window.SX;
  const { h } = SX;

  SX.config = SX.config || { tema: true, horarios: true };
  const ativo = () => SX.config.horarios !== false;

  const TURNOS = {
    M: { nome: 'Manhã', inicio: 8, blocos: 4 },
    T: { nome: 'Tarde', inicio: 14, blocos: 4 },
    N: { nome: 'Noite', inicio: 19, blocos: 4 },
  };
  const DIAS = { 1: 'Domingo', 2: 'Segunda', 3: 'Terça', 4: 'Quarta', 5: 'Quinta', 6: 'Sexta', 7: 'Sábado' };
  const DIAS_CURTO = { 1: 'Dom', 2: 'Seg', 3: 'Ter', 4: 'Qua', 5: 'Qui', 6: 'Sex', 7: 'Sáb' };

  const TOKEN = /\b([1-7]{1,6})([MTN])([1-6]{1,6})\b/g;
  const SEQUENCE = /\b[1-7]{1,6}[MTN][1-6]{1,6}(?:\s+[1-7]{1,6}[MTN][1-6]{1,6})*\b/;

  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (hour) => `${pad(Math.floor(hour))}:${pad(Math.round((hour % 1) * 60))}`;

  /** Converte o código em blocos contínuos { dia, turno, inicio, fim } (horas decimais). */
  function parse(raw) {
    const blocos = [];
    let m;
    // deslocamento por turno: maior horário usado acima de 4 indica numeração deslocada
    const maior = {};
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(raw || ''))) maior[m[2]] = Math.max(maior[m[2]] || 0, ...[...m[3]].map(Number));
    const desloc = (turno) => Math.max(0, (maior[turno] || 0) - TURNOS[turno].blocos);

    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(raw || ''))) {
      const [, dias, turno, aulas] = m;
      const nums = [...aulas].map(Number).sort((a, b) => a - b);
      // agrupa horários consecutivos (ex.: 1,2,4 -> [1-2], [4])
      const grupos = [];
      for (const n of nums) {
        const last = grupos.at(-1);
        if (last && n === last.at(-1) + 1) last.push(n);
        else grupos.push([n]);
      }
      for (const dia of [...dias].map(Number)) {
        for (const g of grupos) {
          const inicio = TURNOS[turno].inicio + g[0] - 1 - desloc(turno);
          blocos.push({ dia, turno, aulas: g, inicio, fim: inicio + g.length, codigo: `${dia}${turno}${g.join('')}` });
        }
      }
    }
    blocos.sort((a, b) => a.dia - b.dia || a.inicio - b.inicio);
    const [ini, fim] = SX.parseDates(raw);
    return { raw: (raw || '').trim(), blocos, periodo: ini && fim ? { inicio: ini, fim } : null };
  }

  const descreve = (b) => `${DIAS[b.dia]}, ${hhmm(b.inicio)}–${hhmm(b.fim)} (${TURNOS[b.turno].nome.toLowerCase()})`;

  /** Chips legíveis: "Ter 21:00–23:00" */
  function chips(info, { compact = false } = {}) {
    if (!ativo()) return h('span.sx-hchips', h('span.sx-hchip.sx-hchip-raw', info.raw));
    const wrap = h('span.sx-hchips', { title: info.blocos.map(descreve).join('\n') + `\nCódigo SIGAA: ${info.raw}` });
    for (const b of info.blocos) {
      wrap.append(
        h(`span.sx-hchip.sx-turno-${b.turno}`, h('b', DIAS_CURTO[b.dia]), ` ${hhmm(b.inicio)}${compact ? '' : '–' + hhmm(b.fim)}`)
      );
    }
    if (info.periodo) {
      wrap.append(h('span.sx-hchip.sx-hchip-periodo', `${SX.fmtDate(info.periodo.inicio)} – ${SX.fmtDate(info.periodo.fim)}`));
    }
    return wrap;
  }

  /** Substitui códigos soltos em texto por código + chips (apenas onde é seguro). */
  function enhance(root = document.body) {
    if (!ativo()) return;
    const skip = 'script,style,textarea,input,select,option,.sx-hchips,.sx-hcode,.ThemeOfficeMenu,.ThemeOfficeSubMenu,.sx-skip-horario';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        SEQUENCE.test(node.nodeValue) && !node.parentElement?.closest(skip) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const m = node.nodeValue.match(SEQUENCE);
      // inclui o período "(dd/mm/aaaa - dd/mm/aaaa)" logo após o código, se existir
      const after = node.nodeValue.slice(m.index + m[0].length);
      const range = after.match(/^\s*\(\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}\)/);
      const info = parse(m[0] + (range ? range[0] : ''));
      if (!info.blocos.length) continue;
      const before = node.nodeValue.slice(0, m.index);
      const rest = after.slice(range ? range[0].length : 0);
      const frag = document.createDocumentFragment();
      if (before) frag.append(before);
      frag.append(h('abbr.sx-hcode', { title: info.blocos.map(descreve).join('\n') }, m[0]), chips(info));
      if (rest.trim()) frag.append(rest);
      node.replaceWith(frag);
    }
  }

  /** Próxima ocorrência a partir de agora. */
  function proximaAula(turmas, now = new Date()) {
    if (!ativo()) return null;
    let best = null;
    for (const t of turmas) {
      for (const b of t.horario.blocos) {
        const jsDay = b.dia - 1; // SIGAA: 2=segunda; JS: 1=segunda
        for (let add = 0; add < 8; add++) {
          const d = new Date(now);
          d.setDate(now.getDate() + add);
          if (d.getDay() !== jsDay) continue;
          const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(b.inicio), (b.inicio % 1) * 60);
          const end = new Date(start.getTime() + (b.fim - b.inicio) * 3600e3);
          if (end <= now) continue;
          const periodo = t.horario.periodo;
          if (periodo && (start < periodo.inicio || start > new Date(periodo.fim.getTime() + 86400e3))) continue;
          if (!best || start < best.start) best = { turma: t, bloco: b, start, end, agora: start <= now };
          break;
        }
      }
    }
    return best;
  }

  /** Grade semanal (estilo calendário). turmas: [{ nome, horario, local, hue, onOpen }] */
  function semana(turmas, now = new Date()) {
    const blocos = turmas.flatMap((t) => t.horario.blocos.map((b) => ({ ...b, turma: t })));
    if (!blocos.length) return h('p.sx-empty', 'Nenhum horário encontrado.');
    const dias = [2, 3, 4, 5, 6];
    if (blocos.some((b) => b.dia === 7)) dias.push(7);
    if (blocos.some((b) => b.dia === 1)) dias.unshift(1);
    const min = Math.floor(Math.min(...blocos.map((b) => b.inicio)));
    const max = Math.ceil(Math.max(...blocos.map((b) => b.fim)));
    const hoje = now.getDay() + 1;

    const grid = h('div.sx-week', { style: { '--sx-cols': dias.length, '--sx-rows': max - min } });
    grid.append(h('div.sx-week-corner'));
    dias.forEach((d, i) =>
      grid.append(
        h(`div.sx-week-day${d === hoje ? '.sx-today' : ''}`, { style: { gridColumn: i + 2 } }, h('span', DIAS_CURTO[d]), h('small', DIAS[d]))
      )
    );
    for (let hour = min; hour < max; hour++) {
      grid.append(h('div.sx-week-hour', { style: { gridRow: hour - min + 2 } }, hhmm(hour)));
      dias.forEach((d, i) =>
        grid.append(h(`div.sx-week-cell${d === hoje ? '.sx-today' : ''}`, { style: { gridRow: hour - min + 2, gridColumn: i + 2 } }))
      );
    }
    for (const b of blocos) {
      const col = dias.indexOf(b.dia);
      if (col < 0) continue;
      grid.append(
        h(
          'button.sx-week-event',
          {
            type: 'button',
            style: {
              gridColumn: col + 2,
              gridRow: `${b.inicio - min + 2} / span ${b.fim - b.inicio}`,
              '--sx-hue': b.turma.hue,
            },
            title: `${b.turma.nome}\n${descreve(b)}${b.turma.local ? '\n' + b.turma.local : ''}`,
            onclick: b.turma.onOpen,
          },
          h('strong', b.turma.nome),
          h('span', `${hhmm(b.inicio)}–${hhmm(b.fim)}`),
          b.turma.sala ? h('span.sx-week-room', b.turma.sala) : null
        )
      );
    }
    // linha do "agora"
    const nowH = now.getHours() + now.getMinutes() / 60;
    if (dias.includes(hoje) && nowH >= min && nowH <= max) {
      grid.append(
        h('div.sx-week-now', {
          style: { gridColumn: dias.indexOf(hoje) + 2, gridRow: `2 / span ${max - min}`, '--sx-now': (nowH - min) / (max - min) },
        })
      );
    }
    return grid;
  }

  /** Lista por dia (alternativa à grade). */
  function lista(turmas) {
    const porDia = new Map();
    for (const t of turmas) for (const b of t.horario.blocos) porDia.set(b.dia, [...(porDia.get(b.dia) || []), { ...b, turma: t }]);
    const wrap = h('div.sx-agenda');
    for (const dia of [...porDia.keys()].sort()) {
      const itens = porDia.get(dia).sort((a, b) => a.inicio - b.inicio);
      wrap.append(
        h(
          'div.sx-agenda-day',
          h('div.sx-agenda-label', DIAS[dia]),
          h(
            'div.sx-agenda-items',
            itens.map((b) =>
              h(
                'button.sx-agenda-item',
                { type: 'button', style: { '--sx-hue': b.turma.hue }, onclick: b.turma.onOpen },
                h('span.sx-agenda-time', `${hhmm(b.inicio)}–${hhmm(b.fim)}`),
                h('span.sx-agenda-name', b.turma.nome),
                b.turma.sala ? h('span.sx-agenda-room', b.turma.sala) : null
              )
            )
          )
        )
      );
    }
    return wrap;
  }

  /** Exporta um .ics com eventos semanais recorrentes. */
  function exportarIcs(turmas, { inicioPadrao, fimPadrao } = {}) {
    const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
    const BYDAY = { 1: 'SU', 2: 'MO', 3: 'TU', 4: 'WE', 5: 'TH', 6: 'FR', 7: 'SA' };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SIGAA UFABC Pro Max//PT-BR', 'CALSCALE:GREGORIAN'];
    const now = new Date();
    for (const t of turmas) {
      const ini = t.horario.periodo?.inicio || inicioPadrao || now;
      const fim = t.horario.periodo?.fim || fimPadrao || new Date(now.getTime() + 120 * 86400e3);
      for (const b of t.horario.blocos) {
        const first = new Date(ini);
        while (first.getDay() !== b.dia - 1) first.setDate(first.getDate() + 1);
        first.setHours(Math.floor(b.inicio), (b.inicio % 1) * 60, 0, 0);
        const end = new Date(first.getTime() + (b.fim - b.inicio) * 3600e3);
        const until = new Date(fim);
        until.setHours(23, 59, 0, 0);
        lines.push(
          'BEGIN:VEVENT',
          `UID:${esc(t.nome).replace(/\W+/g, '')}-${b.codigo}@sigaa-ufabc`,
          `DTSTAMP:${stamp(now)}`,
          `DTSTART:${stamp(first)}`,
          `DTEND:${stamp(end)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[b.dia]};UNTIL=${stamp(until)}`,
          `SUMMARY:${esc(t.nome)}`,
          t.local ? `LOCATION:${esc(t.local)}` : '',
          `DESCRIPTION:${esc('Horário SIGAA: ' + t.horario.raw)}`,
          'END:VEVENT'
        );
      }
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.filter(Boolean).join('\r\n')], { type: 'text/calendar' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'horarios-sigaa.ics' });
    document.body.append(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  }

  /** Cartão completo: alterna Semana/Lista + exportação. */
  function painel(turmas) {
    if (!ativo()) return null;
    const modo = SX.store.get('horario-modo', 'semana');
    const body = h('div.sx-horario-body');
    const render = (m) => {
      body.replaceChildren(m === 'lista' ? lista(turmas) : semana(turmas));
      tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.modo === m));
      SX.store.set('horario-modo', m);
    };
    const tabs = h(
      'div.sx-segmented',
      h('button', { type: 'button', 'data-modo': 'semana', onclick: () => render('semana') }, SX.icon('grid'), 'Semana'),
      h('button', { type: 'button', 'data-modo': 'lista', onclick: () => render('lista') }, SX.icon('list'), 'Lista')
    );
    const card = h(
      'section.sx-card.sx-horario',
      h(
        'header.sx-card-head',
        h('div', h('h3', SX.icon('calendar'), 'Horário semanal'), h('p.sx-muted', 'Códigos do SIGAA convertidos em dias e horários reais.')),
        h(
          'div.sx-card-actions',
          tabs,
          h('button.sx-btn.sx-btn-ghost', { type: 'button', onclick: () => exportarIcs(turmas), title: 'Baixar arquivo .ics para Google Agenda, Outlook ou Apple Calendário' }, SX.icon('download'), 'Exportar .ics')
        )
      ),
      body,
      h(
        'footer.sx-legend',
        Object.entries(TURNOS).map(([k, t]) => h(`span.sx-legend-item.sx-turno-${k}`, h('b', k), ` ${t.nome} · 1º horário às ${hhmm(t.inicio)}`))
      )
    );
    render(modo);
    return card;
  }

  SX.horario = { ativo, parse, chips, enhance, semana, lista, painel, proximaAula, exportarIcs, descreve, hhmm, DIAS, DIAS_CURTO, TURNOS, SEQUENCE };
})();
