/*
 * Casca da aplicação para as páginas "clássicas" (#container): barra superior +
 * barra lateral montada a partir do menu JSCookMenu (ThemeOffice).
 * Os elementos originais são movidos (mantêm handlers) ou acionados por proxy.
 */
(() => {
  const SX = window.SX;
  const { h, $, $$ } = SX;

  /** Lê "cmSubMenuIDx" do handler inline de um item do JSCookMenu. */
  const subMenuId = (node) => (node.getAttribute('onmouseover') || '').match(/'(cmSubMenuID\d+)'/)?.[1];

  /** Aciona um item do JSCookMenu como se o usuário clicasse nele. */
  const acionar = (node) => {
    for (const type of ['mouseover', 'mousedown', 'mouseup']) node.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  };

  function lerSubmenu(id) {
    const menu = document.getElementById(id);
    if (!menu) return [];
    const itens = [];
    for (const tr of $$(':scope > table > tbody > tr', menu)) {
      if (tr.querySelector('.ThemeOfficeMenuSplit')) {
        itens.push({ separador: true });
        continue;
      }
      const label = SX.text(tr.querySelector('.ThemeOfficeMenuItemText, .ThemeOfficeMenuFolderText'));
      if (!label) continue;
      const filho = subMenuId(tr);
      itens.push({ label, node: tr, filhos: filho ? lerSubmenu(filho) : null });
    }
    // remove separadores nas pontas/duplicados
    return itens.filter((it, i) => !it.separador || (i > 0 && i < itens.length - 1 && !itens[i - 1].separador));
  }

  function lerMenu() {
    return $$('table.ThemeOfficeMenu > tbody > tr > td').map((td) => ({
      label: SX.text(td.querySelector('.ThemeOfficeMainFolderText, .ThemeOfficeMainItemText')),
      img: td.querySelector('img')?.src,
      itens: lerSubmenu(subMenuId(td)),
      node: td,
    }));
  }

  function renderItens(itens, depth = 0) {
    const ul = h(`ul.sx-nav-list.sx-depth-${depth}`);
    for (const it of itens) {
      if (it.separador) {
        ul.append(h('li.sx-nav-sep', { role: 'separator' }));
      } else if (it.filhos?.length) {
        ul.append(
          h(
            'li.sx-nav-folder',
            h('details', h('summary', h('span', it.label), SX.icon('chevron', 'sx-chev')), renderItens(it.filhos, depth + 1))
          )
        );
      } else {
        ul.append(
          h('li', h('a.sx-nav-link', { href: '#', 'data-label': it.label.toLowerCase(), onclick: (e) => (e.preventDefault(), acionar(it.node)) }, it.label))
        );
      }
    }
    return ul;
  }

  function sidebar() {
    const grupos = lerMenu();
    if (!grupos.length) return null;
    const abertos = SX.store.get('nav-abertos', ['Ensino']);
    const nav = h('nav.sx-nav', { 'aria-label': 'Menu do discente' });

    const home = h(
      'a.sx-nav-home',
      { href: '/sigaa/verPortalDiscente.do', 'aria-current': /discente\.jsf|verPortalDiscente/.test(location.pathname) ? 'page' : null },
      SX.icon('home'),
      'Portal do Discente'
    );
    nav.append(home);

    for (const g of grupos) {
      const details = h(
        'details.sx-nav-group',
        { open: abertos.includes(g.label) },
        h('summary', g.img ? h('img', { src: g.img, alt: '' }) : SX.icon('folder'), h('span', g.label), SX.icon('chevron', 'sx-chev')),
        renderItens(g.itens)
      );
      details.addEventListener('toggle', () => {
        const set = new Set(SX.store.get('nav-abertos', ['Ensino']));
        details.open ? set.add(g.label) : set.delete(g.label);
        SX.store.set('nav-abertos', [...set]);
      });
      nav.append(details);
    }

    // Busca no menu: filtra todos os itens folha
    const busca = h('input.sx-nav-search', { type: 'search', placeholder: 'Buscar no menu…', 'aria-label': 'Buscar no menu' });
    busca.addEventListener('input', () => {
      const q = busca.value.trim().toLowerCase();
      nav.classList.toggle('sx-filtering', !!q);
      for (const a of $$('.sx-nav-link', nav)) a.parentElement.hidden = !!q && !a.dataset.label.includes(q);
      for (const d of $$('details', nav)) {
        const visivel = $$('.sx-nav-link', d).some((a) => !a.parentElement.hidden);
        d.closest('li, .sx-nav-group').hidden = !!q && !visivel;
        if (q) d.open = visivel;
      }
    });

    return h('aside.sx-sidebar', h('label.sx-search', SX.icon('search'), busca), nav);
  }

  function topbar() {
    const info = $('#info-usuario');
    const usuario = SX.text($('#info-usuario p.usuario')) || SX.text($('.info-docente .nome'));
    const periodo = SX.text($('#info-usuario p.periodo-atual strong'));
    const unidade = SX.text($('#info-usuario p.unidade'));

    const acoes = h('div.sx-topbar-actions');
    const tempo = $('#tempoSessao');
    if (tempo) acoes.append(h('span.sx-session', { title: 'Tempo restante da sessão' }, SX.icon('clock'), $('#spanRelogio') || tempo));
    for (const a of $$('#info-sistema span.acessibilidade a')) acoes.append(a.classList.add('sx-icon-btn') || a);

    // Menu do usuário (itens originais movidos para um popover)
    const menuUsuario = $('#menu-usuario ul');
    let conta = null;
    if (menuUsuario || usuario) {
      const pop = h('div.sx-popover', { id: 'sx-conta', popover: 'auto' });
      if (usuario) pop.append(h('div.sx-popover-head', h('strong', SX.titleCase(usuario)), unidade ? h('small', unidade) : null));
      if (menuUsuario) pop.append(menuUsuario);
      conta = h(
        'button.sx-avatar-btn',
        { type: 'button', popovertarget: 'sx-conta', title: 'Conta e atalhos' },
        h('span.sx-avatar', SX.initials(usuario || '?')),
        h('span.sx-avatar-name', SX.firstName(usuario))
      );
      acoes.append(conta, pop);
    }
    const sair = $('#info-sistema span.sair-sistema a');
    if (sair) {
      sair.classList.add('sx-btn', 'sx-btn-ghost', 'sx-btn-sm');
      sair.prepend(SX.icon('logout'));
      sair.title = 'Sair do sistema';
      acoes.append(sair);
    }

    return h(
      'header.sx-topbar',
      h(
        'a.sx-brand',
        { href: '/sigaa/verPortalDiscente.do', title: 'Sistema Integrado de Gestão de Atividades Acadêmicas' },
        h('span.sx-brand-mark', 'S'),
        h('span.sx-brand-text', h('strong', 'SIGAA'), h('small', 'UFABC'))
      ),
      periodo ? h('span.sx-pill.sx-pill-highlight', 'Período ', h('b', periodo)) : null,
      h('div.sx-topbar-spacer'),
      acoes
    );
  }

  /** "Portal do Discente > Título" (h2 do SIGAA) -> trilha + título grande */
  function breadcrumb() {
    for (const h2 of $$('#conteudo h2')) {
      const link = h2.querySelector(':scope > a');
      if (!link || h2.dataset.sx || !/>/.test(h2.textContent)) continue;
      h2.dataset.sx = '1';
      const partes = h2.textContent.split('>').map((t) => t.trim()).filter(Boolean);
      const titulo = partes.pop();
      const nav = h(
        'nav.sx-crumbs',
        { 'aria-label': 'Trilha' },
        h('a', { href: link.href }, SX.icon('home'), SX.text(link)),
        partes.slice(1).map((p) => [SX.icon('chevron'), h('span', p)])
      );
      h2.before(h('header.sx-page-head', nav, h('h1', SX.titleCase(titulo))));
      SX.hide(h2);
    }
  }

  SX.shell = function shell() {
    const container = $('#container');
    const body = document.body.classList;
    if (!container || !$('#cabecalho', container) || body.contains('sx-app') || body.contains('sx-login-page')) return;
    document.body.classList.add('sx-app');

    const bar = topbar();
    const side = $('#menu-dropdown') ? sidebar() : null;
    const main = h('main.sx-main');
    const shellEl = h(`div.sx-shell${side ? '.sx-has-sidebar' : ''}`, side, main);

    container.before(bar, shellEl);
    breadcrumb();
    main.append(container);
    SX.hide($('#cabecalho'), $('#menu-dropdown'));

    // botão para abrir/fechar a lateral em telas estreitas
    if (side) {
      bar.prepend(
        h('button.sx-icon-btn.sx-menu-toggle', { type: 'button', 'aria-label': 'Menu', onclick: () => document.body.classList.toggle('sx-nav-open') }, SX.icon('menu'))
      );
    }
  };
})();
