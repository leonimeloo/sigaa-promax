const PADRAO = { tema: true, horarios: true };
const status = document.getElementById('status');
let timer;

chrome.storage.sync.get(PADRAO).then((opcoes) => {
  for (const [chave, valor] of Object.entries(opcoes)) {
    const input = document.getElementById(chave);
    if (!input) continue;
    input.checked = valor;
    input.addEventListener('change', async () => {
      await chrome.storage.sync.set({ [chave]: input.checked });
      status.textContent = 'Salvo. Recarregue a página do SIGAA para aplicar.';
      clearTimeout(timer);
      timer = setTimeout(() => (status.textContent = ''), 4000);
    });
  }
});
