/* Ponto de entrada: lê as opções e aplica cada melhoria isoladamente (uma falha não derruba as outras). */
(() => {
  const SX = window.SX;
  const PADRAO = { tema: true, horarios: true };
  const etapas = ['login', 'shell', 'menuPrincipal', 'portal', 'turma', 'notas', 'forumLista', 'forumTopico'];

  const executar = () => {
    if (SX.config.tema) {
      for (const nome of etapas) {
        try {
          SX[nome]?.();
        } catch (err) {
          console.warn(`[SIGAA Moderno] falha em "${nome}":`, err);
        }
      }
    }
    try {
      SX.horario.enhance(document.getElementById('conteudo') || document.body);
    } catch (err) {
      console.warn('[SIGAA Moderno] falha nos horários:', err);
    }
    document.documentElement.classList.add('sx-ready');
  };

  const iniciar = (opcoes) => {
    SX.config = { ...PADRAO, ...opcoes };
    executar();

    // Conteúdo atualizado via AJAX (RichFaces) dentro da área central
    const alvo = document.getElementById('conteudo');
    if (alvo) {
      let timer;
      // ignora apenas o que a própria extensão inseriu dentro da área de conteúdo
      const nosso = (n) => {
        if (n.nodeType !== 1) return true;
        const el = n.closest('[class*="sx-"]');
        return !!el && alvo.contains(el);
      };
      new MutationObserver((muts) => {
        if (muts.every((m) => [...m.addedNodes].every(nosso))) return;
        clearTimeout(timer);
        timer = setTimeout(executar, 150);
      }).observe(alvo, { childList: true, subtree: true });
    }
  };

  if (globalThis.chrome?.storage?.sync) chrome.storage.sync.get(PADRAO).then(iniciar, () => iniciar(PADRAO));
  else iniciar(PADRAO);
})();
