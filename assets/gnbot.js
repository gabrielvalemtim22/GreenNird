// GreenNird — o bot. Formatos e cores escolhidos pelo usuário ficam em gn-botlook.
(function () {
  const SHAPES = {"nuvem": "<circle cx=\"49.91\" cy=\"27.76\" r=\"20.52\"/><circle cx=\"25.04\" cy=\"46.54\" r=\"22.09\"/><circle cx=\"74.78\" cy=\"46.54\" r=\"22.09\"/><rect x=\"18.61\" y=\"43.06\" width=\"62.78\" height=\"50.43\" rx=\"19.48\"/><rect x=\"22.26\" y=\"30.89\" width=\"55.48\" height=\"34.78\"/>", "bola": "<circle cx=\"50\" cy=\"52\" r=\"40\"/>", "quadrado": "<rect x=\"15\" y=\"17\" width=\"70\" height=\"70\" rx=\"20\" transform=\"rotate(-10 50 52)\"/>", "estrela": "<circle cx=\"50.00\" cy=\"28.00\" r=\"19\"/><circle cx=\"74.00\" cy=\"52.00\" r=\"19\"/><circle cx=\"50.00\" cy=\"76.00\" r=\"19\"/><circle cx=\"26.00\" cy=\"52.00\" r=\"19\"/><circle cx=\"50\" cy=\"52\" r=\"26\"/>", "travesseiro": "<rect x=\"9\" y=\"20\" width=\"82\" height=\"64\" rx=\"28\"/>", "feijao": "<ellipse cx=\"50\" cy=\"52\" rx=\"42\" ry=\"34\" transform=\"rotate(-12 50 52)\"/>", "pipoca": "<circle cx=\"76.00\" cy=\"52.00\" r=\"17\"/><circle cx=\"63.00\" cy=\"74.52\" r=\"17\"/><circle cx=\"37.00\" cy=\"74.52\" r=\"17\"/><circle cx=\"24.00\" cy=\"52.00\" r=\"17\"/><circle cx=\"37.00\" cy=\"29.48\" r=\"17\"/><circle cx=\"63.00\" cy=\"29.48\" r=\"17\"/><circle cx=\"50\" cy=\"52\" r=\"28\"/>", "gota": "<path d=\"M50 10 C 66 30 86 44 86 62 a36 32 0 0 1 -72 0 C 14 44 34 30 50 10 Z\"/>", "pedra": "<path d=\"M22 34 Q30 14 56 16 Q86 20 88 50 Q90 82 56 86 Q18 90 12 62 Q10 46 22 34 Z\"/>", "triangulo": "<path d=\"M44 16 Q50 6 56 16 L90 76 Q96 88 82 88 L18 88 Q4 88 10 76 Z\"/>", "hexagono": "<polygon points=\"50,12 84,31 84,71 50,90 16,71 16,31\" stroke-width=\"14\" stroke-linejoin=\"round\"/>", "flor": "<circle cx=\"80.00\" cy=\"52.00\" r=\"13\"/><circle cx=\"71.21\" cy=\"73.21\" r=\"13\"/><circle cx=\"50.00\" cy=\"82.00\" r=\"13\"/><circle cx=\"28.79\" cy=\"73.21\" r=\"13\"/><circle cx=\"20.00\" cy=\"52.00\" r=\"13\"/><circle cx=\"28.79\" cy=\"30.79\" r=\"13\"/><circle cx=\"50.00\" cy=\"22.00\" r=\"13\"/><circle cx=\"71.21\" cy=\"30.79\" r=\"13\"/><circle cx=\"50\" cy=\"52\" r=\"30\"/>", "cupula": "<path d=\"M12 84 V54 a38 38 0 0 1 76 0 V84 Q88 90 80 90 H20 Q12 90 12 84 Z\"/>"};
  const ORDER = ["nuvem", "bola", "quadrado", "estrela", "travesseiro", "feijao", "pipoca", "gota", "pedra", "triangulo", "hexagono", "flor", "cupula"];
  const COLORS = ['#d4ff00', '#f2f2f2', '#9a5b34', '#ef4444', '#f97316', '#f59e0b', '#16a34a', '#0d9488', '#2563eb', '#8b5cf6', '#ec4899', '#6b7280'];
  const DEF = { shape: 'nuvem', color: '#d4ff00' };
  // a cor do bot é sempre a cor de destaque do site (Configurações → Aparência ou o seletor do bot)
  const look = () => {
    let L = { ...DEF };
    try { Object.assign(L, JSON.parse(localStorage.getItem('gn-botlook') || '{}')); } catch {}
    try { const t = JSON.parse(localStorage.getItem('gn-theme') || '{}'); if (t.accent) L.color = t.accent; } catch {}
    return L;
  };
  function eyes(shape) {
    if (shape === 'nuvem') return '<rect x="34.26" y="38.71" width="8.0" height="23.48" rx="4.0"/><rect x="57.04" y="38.71" width="8.0" height="23.48" rx="4.0"/>';
    return '<rect x="37" y="40" width="8" height="21" rx="4"/><rect x="55" y="40" width="8" height="21" rx="4"/>';
  }
  // GNBot(cor, { shape, eyes }) — sem argumentos usa o bot escolhido pelo usuário
  window.GNBot = function (color, o = {}) {
    const L = look(); const c = color || L.color; const sh = o.shape || L.shape;
    const body = SHAPES[sh] || SHAPES.nuvem;
    const eye = o.eyes || (['#f2f2f2', '#ffffff', '#c8f400', '#f59e0b'].includes(String(c).toLowerCase()) ? '#111' : '#111');
    return `<svg class="gnbot" data-shape="${sh}" viewBox="0 0 100 100" aria-hidden="true"><g class="gnbot-body" fill="${c}" stroke="${c}" stroke-width="0">${body}</g><g class="gnbot-eyes" fill="${eye}">${eyes(sh)}</g></svg>`;
  };
  window.GNBotLook = {
    get: look, ORDER, COLORS, DEF,
    set(v) {
      const n = Object.assign(look(), v);
      try { localStorage.setItem('gn-botlook', JSON.stringify(n)); } catch {}
      // a cor do bot vira a cor de destaque do site
      try { const t = JSON.parse(localStorage.getItem('gn-theme') || '{}'); t.accent = n.color; localStorage.setItem('gn-theme', JSON.stringify(t)); } catch {}
      window.applyTheme && applyTheme();
      dispatchEvent(new Event('gn-botlook'));
    },
  };
  // mudou a cor nas Configurações (outra aba ou a janela de configurações) → repinta os bots
  const repaint = () => setTimeout(() => dispatchEvent(new Event('gn-botlook')), 30);
  addEventListener('storage', e => { if (e.key === 'gn-theme' || e.key === 'gn-botlook') repaint(); });
  addEventListener('message', e => { if (e.origin === location.origin && e.data === 'gn-theme') repaint(); });
})();
