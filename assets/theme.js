// Aplica o tema escolhido em Configurações → Aparência (roda antes da página aparecer)
(function () {
  function apply() {
    let t = {};
    try { t = JSON.parse(localStorage.getItem('gn-theme') || '{}'); } catch {}
    const root = document.documentElement;
    const mode = t.mode || 'dark';
    const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    const acc = t.accent || '#d4ff00';
    root.style.setProperty('--lime', acc);
    // texto em cima da cor de destaque: escuro para cores claras, branco para cores fortes
    const n = parseInt(acc.slice(1), 16), lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    root.style.setProperty('--on-accent', lum > 0.62 ? '#111' : '#fff');
    t.bg && !dark ? root.style.setProperty('--bg', t.bg) : root.style.removeProperty('--bg');
    t.text && !dark ? root.style.setProperty('--ink', t.text) : root.style.removeProperty('--ink');
    root.style.fontSize = t.font === 'grande' ? '17.5px' : '';
    root.dataset.motion = t.reduceMotion ? 'reduce' : '';
  }
  window.applyTheme = apply;
  apply();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', apply);
  addEventListener('storage', e => { if (e.key === 'gn-theme') apply(); });
  addEventListener('message', e => { if (e.origin === location.origin && e.data === 'gn-theme') apply(); });
})();
