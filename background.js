/*
 * Registra os content scripts de acordo com as opções do usuário.
 * Com o tema desativado nenhum CSS/JS do tema é injetado; se os horários legíveis
 * continuarem ativos, apenas o módulo de horários roda sobre o layout original.
 */
const MATCHES = ['https://sig.ufabc.edu.br/sigaa/*'];
const PADRAO = { tema: true, horarios: true };

const TEMA_CSS = ['css/base.css', 'css/shell.css', 'css/portal.css', 'css/turma.css', 'css/paginas.css', 'css/horario.css'];
const TEMA_JS = ['js/util.js', 'js/horario.js', 'js/shell.js', 'js/portal.js', 'js/turma.js', 'js/paginas.js', 'js/main.js'];
const HORARIO_CSS = ['css/horario.css'];
const HORARIO_JS = ['js/util.js', 'js/horario.js', 'js/main.js'];

function scriptsPara({ tema, horarios }) {
  if (!tema && !horarios) return [];
  const css = tema ? TEMA_CSS : HORARIO_CSS;
  const js = tema ? TEMA_JS : HORARIO_JS;
  return [
    { id: 'sx-css', matches: MATCHES, css, runAt: 'document_start', allFrames: true },
    { id: 'sx-js', matches: MATCHES, js, runAt: 'document_end' },
  ];
}

// serializa as atualizações (install/startup/alteração podem disparar juntos)
let fila = Promise.resolve();
function sincronizar() {
  fila = fila
    .then(async () => {
      const opcoes = await chrome.storage.sync.get(PADRAO);
      const novos = scriptsPara(opcoes);
      const existentes = await chrome.scripting.getRegisteredContentScripts();
      // nada mudou: mantém o registro (evita janela sem scripts na abertura do navegador)
      const assinatura = (lista) => JSON.stringify(lista.map((s) => [s.id, s.css || [], s.js || []]).sort());
      if (assinatura(existentes) === assinatura(novos)) return;
      if (existentes.length) await chrome.scripting.unregisterContentScripts({ ids: existentes.map((s) => s.id) });
      if (novos.length) await chrome.scripting.registerContentScripts(novos);
    })
    .catch((err) => console.error('[SIGAA Moderno] falha ao registrar scripts:', err));
  return fila;
}

chrome.runtime.onInstalled.addListener(sincronizar);
chrome.runtime.onStartup.addListener(sincronizar);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && ('tema' in changes || 'horarios' in changes)) sincronizar();
});
