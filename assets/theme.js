// Aplica o tema escolhido em Configurações → Aparência (roda antes da página aparecer)
(function () {
  let t = {};
  try { t = JSON.parse(localStorage.getItem('gn-theme') || '{}'); } catch {}
  const root = document.documentElement;
  const mode = t.mode || 'system';
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  if (t.accent) { root.style.setProperty('--lime', t.accent); root.style.setProperty('--accent-soft', t.accent + '33'); }
  if (t.bg && !dark) root.style.setProperty('--bg', t.bg);
  if (t.text && !dark) root.style.setProperty('--ink', t.text);
  if (t.font === 'grande') root.style.fontSize = '17.5px';
  if (t.reduceMotion) root.dataset.motion = 'reduce';
  if (mode === 'system') matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', e => { root.dataset.theme = e.matches ? 'dark' : 'light'; });
})();
