/* Utilitários compartilhados entre os scripts da extensão (mesmo "isolated world"). */
(() => {
  const SX = (window.SX = window.SX || {});

  /** Cria um elemento: h('div.classe#id', {attr}, filhos...) */
  SX.h = (tag, attrs, ...children) => {
    const [, name = 'div', rest = ''] = tag.match(/^([a-z0-9-]*)(.*)$/i);
    const node = document.createElement(name || 'div');
    for (const part of rest.match(/[.#][^.#]+/g) || []) {
      if (part[0] === '.') node.classList.add(part.slice(1));
      else node.id = part.slice(1);
    }
    if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs);
      attrs = null;
    }
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
      else if (key === 'style' && typeof value === 'object') {
        for (const [prop, v] of Object.entries(value)) {
          if (v == null) continue;
          if (prop.startsWith('--')) node.style.setProperty(prop, String(v));
          else node.style[prop] = v;
        }
      }
      else node.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  };

  SX.$ = (sel, root = document) => root.querySelector(sel);
  SX.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  SX.text = (node) => (node?.textContent || '').replace(/\s+/g, ' ').trim();

  /** Dispara o clique original (handlers inline rodam no contexto da página). */
  SX.proxyClick = (target) => (event) => {
    event?.preventDefault();
    target?.click();
  };

  /** Marca o elemento original como substituído (fica no DOM para manter forms/JSF). */
  SX.hide = (...nodes) => nodes.flat().forEach((n) => n?.classList.add('sx-hidden'));

  const LOWER = new Set(['a', 'à', 'ao', 'aos', 'as', 'às', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'pela', 'pelo', 'por', 'sem', 'sob']);
  const SIGLAS = new Set(['UFABC', 'CECS', 'CMCC', 'CCNH', 'PROGRAD', 'BCT', 'BCH', 'TI', 'ABC', 'S.B.C.', 'SB', 'SA', 'II', 'III', 'IV']);

  /** "ÁFRICA NAS RELAÇÕES" -> "África nas Relações" (somente apresentação). */
  SX.titleCase = (value) => {
    const str = (value || '').trim();
    if (!str || str !== str.toUpperCase()) return str;
    return str
      .toLowerCase()
      .split(/(\s+|\/|-|\(|\))/)
      .map((word, i) => {
        const upper = word.toUpperCase();
        if (SIGLAS.has(upper) || /^[IVX]{2,}$/.test(upper)) return upper;
        if (i > 0 && LOWER.has(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join('');
  };

  SX.firstName = (full) => SX.titleCase((full || '').split(/\s+/)[0] || '');

  SX.initials = (name) => {
    const words = (name || '?').split(/\s+/).filter((w) => w.length > 2);
    const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words;
    return picked.map((w) => w[0]).join('').toUpperCase() || '?';
  };

  /** Cor estável por texto (índice em uma paleta de matizes). */
  const HUES = [262, 158, 28, 312, 72, 198, 348, 120, 232, 48];
  SX.hueAt = (i) => HUES[i % HUES.length];
  SX.hueFor = (key) => {
    let hash = 0;
    for (const ch of key || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return HUES[hash % HUES.length];
  };

  /** "19/10/2026 23:59" | "19/10/2026 às 23h59" -> Date */
  SX.parseDate = (str) => {
    const m = (str || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\D+(\d{1,2})[h:](\d{2}))?/);
    if (!m) return null;
    return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  };

  SX.parseDates = (str) => {
    const out = [];
    const re = /(\d{2})\/(\d{2})\/(\d{4})(?:\D{1,5}(\d{1,2})[h:](\d{2}))?/g;
    let m;
    while ((m = re.exec(str || ''))) out.push(new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)));
    return out;
  };

  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  SX.relative = (date, now = new Date()) => {
    if (!date) return '';
    const diff = date - now;
    const abs = Math.abs(diff);
    const min = 60e3, hour = 60 * min, day = 24 * hour;
    if (abs < hour) return rtf.format(Math.round(diff / min), 'minute');
    if (abs < day) return rtf.format(Math.round(diff / hour), 'hour');
    if (abs < 60 * day) return rtf.format(Math.round(diff / day), 'day');
    if (abs < 365 * day) return rtf.format(Math.round(diff / (30 * day)), 'month');
    return rtf.format(Math.round(diff / (365 * day)), 'year');
  };

  SX.fmtDate = (date, opts = { day: '2-digit', month: 'short' }) =>
    date ? date.toLocaleDateString('pt-BR', opts).replace('.', '') : '';

  SX.fmtTime = (date) => (date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');

  SX.store = {
    get: (key, fallback) => {
      try {
        return JSON.parse(localStorage.getItem('sx:' + key)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('sx:' + key, JSON.stringify(value));
      } catch {
        /* armazenamento indisponível */
      }
    },
  };

  /** Ícones (traço 1.75, estilo lucide) */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    swap: '<path d="M17 3l4 4-4 4"/><path d="M3 7h18"/><path d="M7 21l-4-4 4-4"/><path d="M21 17H3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
    sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 17l.9 2.1L22 20l-2.1.9L19 23l-.9-2.1L16 20l2.1-.9z"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
  };

  // SVGs estáticos acima; DOMParser em vez de innerHTML (exigência da revisão do Firefox)
  const svgCache = new Map();
  const svg = (name) => {
    if (!svgCache.has(name)) {
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
      svgCache.set(name, new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement);
    }
    return document.importNode(svgCache.get(name), true);
  };

  SX.icon = (name, cls = '') => {
    const span = document.createElement('span');
    span.className = 'sx-icon ' + cls;
    span.setAttribute('aria-hidden', 'true');
    span.append(svg(name in ICONS ? name : 'file'));
    return span;
  };

  SX.greeting = (now = new Date()) => {
    const h = now.getHours();
    return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  };
})();
