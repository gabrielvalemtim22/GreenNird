// Utilidades comuns das páginas: trilho de ícones, avisos, menus e caixas de texto
(function () {
  const ICONS = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3v-9Z"/></svg>',
    espaco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/></svg>',
    agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    conexoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7ZM12 17v5"/></svg>',
    planos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/></svg>',
    ajuda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5v.01"/></svg>',
  };
  window.renderRail = (active, dark) => {
    const r = document.getElementById('rail'); if (!r) return;
    r.className = 'rail' + (dark ? ' dark' : '');
    const links = [['chat', '/chat', 'Chat'], ['espaco', '/espaco', 'Meu espaço'], ['agenda', '/agendamentos', 'Agendamentos'], ['conexoes', '/conexoes', 'Conexões']];
    r.innerHTML = links.map(([k, h, t]) => `<a href="${h}" title="${t}" class="${k === active ? 'on' : ''}">${ICONS[k]}</a>`).join('') +
      `<span class="sp"></span><a href="/conta#planos" title="Planos">${ICONS.planos}</a><a href="/ajuda" title="Ajuda">${ICONS.ajuda}</a><a href="/configuracoes#conta" title="Perfil"><span class="rail-av" style="background-image:url(/assets/avatars/${(localStorage.getItem('gn-avatar') || '"verde"').replace(/\W/g, '')}.webp)"></span></a>`;
  };

  const toasts = document.createElement('div'); toasts.className = 'toasts';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(toasts));
  window.toast = (msg, opts = {}) => {
    if (!toasts.isConnected) document.body.appendChild(toasts);
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span>${opts.icon || '💚'}</span><span class="tm"></span>`;
    t.querySelector('.tm').textContent = msg;
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 250); };
    if (opts.action) { const b = document.createElement('button'); b.textContent = opts.action; b.onclick = e => { e.stopPropagation(); opts.onAction && opts.onAction(); close(); }; t.appendChild(b); }
    t.onclick = close;
    toasts.appendChild(t); setTimeout(close, opts.ms || 3500);
    window.fx && (opts.icon === '⚠️' ? fx.error() : fx.toggle());
  };
  window.alert = m => toast(String(m), { icon: '⚠️' });

  window.askText = (title, value = '', opts = {}) => new Promise(res => {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="mcard"><h2></h2><div class="mfield"><input></div><div class="mrow"><button class="btn btn-white" data-x>Cancelar</button><button class="btn btn-lime" data-ok>${opts.ok || 'Salvar'}</button></div></div>`;
    m.querySelector('h2').textContent = title;
    const inp = m.querySelector('input'); inp.value = value; inp.placeholder = opts.placeholder || '';
    const done = v => { m.remove(); res(v); };
    m.querySelector('[data-x]').onclick = () => done(null);
    m.querySelector('[data-ok]').onclick = () => done(inp.value.trim());
    inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value.trim()); if (e.key === 'Escape') done(null); };
    m.onclick = e => { if (e.target === m) done(null); };
    document.body.appendChild(m); setTimeout(() => inp.focus(), 30);
  });

  window.popMenu = (anchor, entries) => {
    document.querySelectorAll('.pmenu').forEach(x => x.remove());
    const m = document.createElement('div'); m.className = 'pmenu';
    entries.forEach(en => {
      if (en === '-') { m.appendChild(document.createElement('hr')); return; }
      const b = document.createElement('button'); if (en.danger) b.className = 'danger';
      b.innerHTML = `<span>${en.icon || ''}</span><span></span>`; b.children[1].textContent = en.label;
      b.onclick = e => { e.stopPropagation(); m.remove(); en.run && en.run(); };
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect();
    let x = Math.min(r.right - m.offsetWidth, innerWidth - m.offsetWidth - 10); x = Math.max(10, x);
    let y = r.bottom + 6; if (y + m.offsetHeight > innerHeight - 10) y = Math.max(10, r.top - m.offsetHeight - 6);
    m.style.left = x + 'px'; m.style.top = y + 'px';
    setTimeout(() => document.addEventListener('click', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
  };

  // transição 3D: entra animando e sai animando ao trocar de página
  document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('.pmain');
    if (!main) return;
    let flag = null; try { flag = sessionStorage.getItem('gn-enter3d'); sessionStorage.removeItem('gn-enter3d'); } catch {}
    if (flag) main.classList.add('enter3d');
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="/"]');
      if (!a || a.target || e.ctrlKey || e.metaKey || a.getAttribute('href').startsWith('/#') || a.closest('.pside') && a.getAttribute('href').includes('#')) return;
      if (a.pathname === location.pathname) return;
      e.preventDefault();
      try { sessionStorage.setItem('gn-enter3d', '1'); } catch {}
      main.classList.add('leave3d'); window.fx && fx.toggle();
      setTimeout(() => { location.href = a.href; }, 340);
    });
  });

  window.store2 = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  window.escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.fmtDate = ts => new Date(ts).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
})();
