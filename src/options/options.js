const PADRAO = { tema: true, horarios: true };
const SIGAA = { origins: ['https://sig.ufabc.edu.br/sigaa/*'] };
const status = document.getElementById('status');
let timer;

// O acesso ao site pode ser revogado pelo usuário (Firefox: about:addons › Permissões;
// Chrome/Edge/Opera: "Acesso ao site"). Sem ele, os scripts registrados não são injetados.
const acesso = document.getElementById('acesso');
const conferirAcesso = () => chrome.permissions.contains(SIGAA).then((ok) => (acesso.hidden = ok));
document.getElementById('permitir').addEventListener('click', () => chrome.permissions.request(SIGAA).then(conferirAcesso));
chrome.permissions.onAdded.addListener(conferirAcesso);
chrome.permissions.onRemoved.addListener(conferirAcesso);
conferirAcesso();

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
