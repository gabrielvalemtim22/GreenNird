// GreenNird — o bot (nuvem com dois olhos). GNBot(cor, {bar}) devolve o SVG inline.
window.GNBot = function (color = 'var(--lime)', o = {}) {
  const vb = o.bar ? '340 320 575 600' : '340 320 575 520';
  return `<svg class="gnbot" viewBox="${vb}" aria-hidden="true"><g fill="${color}"><circle cx="627" cy="452" r="118"/><circle cx="484" cy="560" r="127"/><circle cx="770" cy="560" r="127"/><rect x="447" y="540" width="361" height="290" rx="112"/><rect x="468" y="470" width="319" height="200"/></g><g class="gnbot-eyes" fill="${o.eyes || '#0e0e0e'}"><rect x="537" y="515" width="46" height="135" rx="23"/><rect x="668" y="515" width="46" height="135" rx="23"/></g>${o.bar ? `<rect x="537" y="862" width="180" height="44" rx="22" fill="${color}"/>` : ''}</svg>`;
};
