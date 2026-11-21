// GreenNird — recursos do app: avisos, menu das conversas, projetos, configurações, ajuda
(function () {
  const $ = id => document.getElementById(id);
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- avisos dentro do app (sem janela do navegador) ----------
  const toasts = document.createElement('div'); toasts.className = 'toasts'; document.body.appendChild(toasts);
  function toast(msg, opts = {}) {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<span class="ti">${opts.icon || '💚'}</span><span class="tm"></span>`;
    t.querySelector('.tm').textContent = msg;
    if (opts.action) {
      const b = document.createElement('button'); b.textContent = opts.action;
      b.onclick = () => { opts.onAction && opts.onAction(); close(); };
      t.appendChild(b);
    }
    toasts.appendChild(t);
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 250); };
    const timer = setTimeout(() => { close(); opts.onTimeout && opts.onTimeout(); }, opts.ms || 3500);
    t.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') { clearTimeout(timer); close(); opts.onTimeout && opts.onTimeout(); } });
    return close;
  }
  window.toast = toast;
  window.alert = msg => toast(String(msg), { icon: '⚠️', ms: 4500 });

  // caixa de texto dentro do app (renomear, PIN, novo projeto…)
  function ask(title, value = '', opts = {}) {
    return new Promise(res => {
      const m = document.createElement('div'); m.className = 'modal';
      m.innerHTML = `<div class="mcard small"><h2></h2><input class="minput" ${opts.type ? `type="${opts.type}" inputmode="numeric" maxlength="8"` : ''}><div class="mrow"><button class="btn btn-white mbtn" data-x>Cancelar</button><button class="btn btn-lime mbtn" data-ok>${opts.ok || 'Salvar'}</button></div></div>`;
      m.querySelector('h2').textContent = title;
      const inp = m.querySelector('input'); inp.value = value; inp.placeholder = opts.placeholder || '';
      const done = v => { m.remove(); res(v); };
      m.querySelector('[data-x]').onclick = () => done(null);
      m.querySelector('[data-ok]').onclick = () => done(inp.value.trim());
      inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value.trim()); if (e.key === 'Escape') done(null); };
      m.onclick = e => { if (e.target === m) done(null); };
      document.body.appendChild(m); setTimeout(() => inp.focus(), 30);
    });
  }

  // ---------- projetos e PIN ----------
  let projects = ls.get('gn-projects', []);
  const saveProjects = () => ls.set('gn-projects', projects);
  let showArchived = false;
  let unlocked = new Set();
  async function sha(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gn-pin:' + s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function checkPin() {
    const saved = ls.get('gn-pin', null);
    if (!saved) {
      const p = await ask('Crie um PIN para bloquear conversas', '', { type: 'password', placeholder: '4 a 8 números', ok: 'Criar PIN' });
      if (!p || !/^\d{4,8}$/.test(p)) { if (p !== null) toast('O PIN precisa ter de 4 a 8 números.', { icon: '⚠️' }); return false; }
      ls.set('gn-pin', await sha(p)); toast('PIN criado 🔒'); return true;
    }
    const p = await ask('Digite seu PIN', '', { type: 'password', ok: 'Abrir' });
    if (p === null) return false;
    if ((await sha(p)) === saved) return true;
    toast('PIN errado.', { icon: '⛔' }); window.fx && fx.error(); return false;
  }

  // ---------- lista de conversas (substitui a original) ----------
  const ICON = {
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  };
  window.renderList = function () {
    const list = $('list'); list.innerHTML = '';
    const f = (filter || '').toLowerCase();
    const visible = chats.filter(c => !!c.archived === showArchived && (c.locked ? 'conversa bloqueada' : c.title).toLowerCase().includes(f));
    const sorted = visible.sort((a, b) => b.updated - a.updated);
    const sections = [];
    const pinned = sorted.filter(c => c.pinned);
    if (pinned.length) sections.push(['📌 Fixadas', pinned]);
    projects.forEach(p => { const items = sorted.filter(c => !c.pinned && c.projectId === p.id); sections.push(['📁 ' + p.name, items, p]); });
    const rest = sorted.filter(c => !c.pinned && !projects.some(p => p.id === c.projectId));
    let lastG = '';
    sections.forEach(([title, items, proj]) => {
      const h = document.createElement('div'); h.className = 'group';
      h.innerHTML = '<span></span>' + (proj ? `<button class="gbtn" title="Opções do projeto">${ICON.dots}</button>` : '');
      h.querySelector('span').textContent = title;
      if (proj) h.querySelector('.gbtn').onclick = e => projectMenu(e, proj);
      list.appendChild(h);
      if (!items.length) { const e = document.createElement('div'); e.className = 'empty-proj'; e.textContent = 'Arraste conversas pelo menu ⋯ → Mover para projeto'; list.appendChild(e); }
      items.forEach(c => list.appendChild(item(c)));
    });
    rest.forEach(c => {
      const g = showArchived ? '🗄 Arquivadas' : groupOf(c.updated);
      if (g !== lastG) { const h = document.createElement('div'); h.className = 'group'; h.textContent = g; list.appendChild(h); lastG = g; }
      list.appendChild(item(c));
    });
    if (!list.children.length) list.innerHTML = `<div class="group">${showArchived ? 'Nenhuma conversa arquivada' : 'Nenhuma conversa ainda'}</div>`;
    const arch = chats.filter(c => c.archived).length;
    const ab = document.createElement('button'); ab.className = 'archbtn';
    ab.textContent = showArchived ? '← Voltar às conversas' : (arch ? `🗄 Arquivadas (${arch})` : '');
    ab.onclick = () => { showArchived = !showArchived; renderList(); };
    if (ab.textContent) list.appendChild(ab);
  };
  function item(c) {
    const it = document.createElement('div');
    it.className = 'item' + (current && c.id === current.id ? ' on' : '');
    it.innerHTML = `<svg class="bub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5Z"/></svg><span></span><button class="more" title="Opções">${ICON.dots}</button>`;
    it.querySelector('span').textContent = (c.locked ? '🔒 ' : '') + (c.locked && !unlocked.has(c.id) ? 'Conversa bloqueada' : c.title);
    it.onclick = async () => {
      if (busy) return;
      if (c.locked && !unlocked.has(c.id)) { if (!(await checkPin())) return; unlocked.add(c.id); }
      current = c; render(); scrollEnd(); closeOnMobile();
    };
    it.querySelector('.more').onclick = e => { e.stopPropagation(); chatMenu(e, c); };
    return it;
  }

  // ícones de linha com detalhe na cor do tema
  const LI = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const A = 'stroke="var(--lime)"', F = 'fill="var(--lime)" stroke="none"';
  const MI = {
    pin: LI(`<path d="M14.5 3.5 20.5 9.5l-2.2.8-3.4 3.4.3 3.8-1.4 1.4-3.6-3.6L5 20.5M8.6 12.6 5.2 9.2l1.4-1.4 3.8.3 3.4-3.4z" ${A}/><path d="M10.2 15.3 5 20.5"/>`),
    edit: LI(`<path d="m15 4 5 5L9 20H4v-5L15 4Z"/><path d="M4 15v5h5" ${A} stroke-width="2.4"/>`),
    link: LI(`<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" ${A}/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>`),
    lock: LI(`<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.5" ${F}/><path d="M12 16v2" ${A} stroke-width="2"/>`),
    unlock: LI(`<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/><circle cx="12" cy="15" r="1.5" ${F}/>`),
    folder: LI(`<path d="M3 8V6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2" ${A}/><rect x="3" y="8" width="18" height="12" rx="2.5"/>`),
    archive: LI(`<rect x="3.5" y="4" width="17" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4" ${A} stroke-width="2.4"/>`),
    trash: LI(`<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>`),
    layers: LI(`<path d="m12 3 9 5-9 5-9-5 9-5Z" ${A}/><path d="m3 13 9 5 9-5M3 17l9 5 9-5"/>`),
    wa: LI(`<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2.1-2.1l.8-1-1-2Z" ${A}/>`),
    shield: LI(`<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"/><circle cx="12" cy="11" r="1.6" ${F}/><path d="M12 12v3" ${A} stroke-width="2"/>`),
    notes: LI(`<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 12.5h8M8 16h5" ${A}/>`),
    phone: LI(`<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M12 7v6m-2.5-2.5L12 13l2.5-2.5" ${A}/><path d="M11 18.5h2"/>`),
    keyboard: LI(`<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M8 14h8" ${A} stroke-width="2.2"/>`),
    doc: LI(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4" ${A}/>`),
    plock: LI(`<rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.5" ${F}/>`),
    bug: LI(`<rect x="8" y="7" width="8" height="12" rx="4" ${F} opacity=".35"/><rect x="8" y="7" width="8" height="12" rx="4"/><path d="M12 7v12M8 11H4M16 11h4M8 15H5M16 15h3M9 7 7 4M15 7l2-3"/>`),
    plus: LI(`<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8" ${A}/>`),
    check: LI(`<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6" ${A} stroke-width="2.2"/>`),
    back: LI(`<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2" ${A}/>`),
  };
  window.GN_ICONS = MI;
  // menu flutuante
  function popMenu(anchorEvent, entries) {
    document.querySelectorAll('.pmenu').forEach(x => x.remove());
    const m = document.createElement('div'); m.className = 'pmenu big';
    entries.forEach(en => {
      if (en === '-') { const s = document.createElement('hr'); m.appendChild(s); return; }
      const b = document.createElement('button'); b.className = (en.danger ? 'danger ' : '') + (en.hl ? 'hl' : '');
      b.innerHTML = `<span class="pmi">${en.icon || ''}</span><span></span>${en.sub ? '<span class="pmc">›</span>' : ''}`;
      b.children[1].textContent = en.label;
      b.onclick = ev => { ev.stopPropagation(); if (en.sub) { popMenu(anchorEvent, en.sub); return; } m.remove(); en.run && en.run(); };
      m.appendChild(b);
    });
    document.body.appendChild(m);
    const r = anchorEvent.currentTarget ? anchorEvent.currentTarget.getBoundingClientRect() : { left: anchorEvent.clientX, bottom: anchorEvent.clientY, top: anchorEvent.clientY };
    const mw = m.offsetWidth, mh = m.offsetHeight;
    let x = Math.min(r.left, innerWidth - mw - 10), y = r.bottom + 6;
    if (y + mh > innerHeight - 10) y = Math.max(10, r.top - mh - 6);
    m.style.left = x + 'px'; m.style.top = y + 'px';
    setTimeout(() => document.addEventListener('click', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
  }

  function chatMenu(e, c) {
    const save = () => { store.set(chats); renderList(); };
    popMenu(e, [
      { icon: MI.pin, label: c.pinned ? 'Desafixar' : 'Fixar', run: () => { c.pinned = !c.pinned; save(); toast(c.pinned ? 'Conversa fixada 📌' : 'Conversa desafixada'); } },
      { icon: MI.edit, label: 'Renomear', run: async () => { const n = await ask('Renomear conversa', c.title); if (n) { c.title = n.slice(0, 80); save(); toast('Conversa renomeada ✏️'); } } },
      { icon: MI.link, label: 'Compartilhar', run: () => shareChat(c) },
      { icon: c.locked ? MI.unlock : MI.lock, label: c.locked ? 'Desbloquear' : 'Bloquear com PIN', run: async () => {
        if (!(await checkPin())) return;
        c.locked = !c.locked; if (!c.locked) unlocked.delete(c.id); else { unlocked.delete(c.id); if (current && current.id === c.id) { current = null; render(); } }
        save(); toast(c.locked ? 'Conversa bloqueada 🔒' : 'Conversa desbloqueada 🔓');
      } },
      { icon: MI.folder, label: 'Mover para projeto', sub: [
        ...projects.map(p => ({ icon: c.projectId === p.id ? MI.check : MI.folder, label: p.name, run: () => { c.projectId = p.id; save(); toast('Movida para ' + p.name); } })),
        ...(c.projectId ? [{ icon: MI.back, label: 'Tirar do projeto', run: () => { delete c.projectId; save(); toast('Removida do projeto'); } }] : []),
        { icon: MI.plus, label: 'Novo projeto…', run: async () => { const p = await newProject(); if (p) { c.projectId = p.id; save(); } } },
      ] },
      { icon: MI.archive, label: c.archived ? 'Desarquivar' : 'Arquivar', run: () => {
        c.archived = !c.archived; if (c.archived && current && current.id === c.id) { current = null; render(); }
        save(); toast(c.archived ? 'Conversa arquivada 🗄' : 'Conversa desarquivada', c.archived ? { action: 'Desfazer', onAction: () => { c.archived = false; save(); } } : {});
      } },
      '-',
      { icon: MI.trash, label: 'Excluir', danger: true, run: () => deleteChat(c) },
    ]);
  }

  function deleteChat(c) {
    const idx = chats.indexOf(c);
    chats = chats.filter(x => x.id !== c.id); store.set(chats);
    const wasCurrent = current && current.id === c.id;
    if (wasCurrent) current = null;
    render(); window.fx && fx.toggle();
    toast('Conversa excluída', { icon: '🗑', action: 'Desfazer', ms: 6000, onAction: () => {
      chats.splice(Math.max(0, idx), 0, c); store.set(chats); if (wasCurrent) current = c; render(); toast('Conversa restaurada ✨');
    } });
  }

  async function shareChat(c) {
    const text = `${c.title}\n\n` + c.messages.filter(m => !m.blocked).map(m => (m.role === 'user' ? '🙋 Você: ' : '🐋 GreenNird: ') + (m.display ?? m.content)).join('\n\n') + '\n\n— conversa feita no GreenNird (greennird.vercel.app)';
    try {
      if (navigator.share) { await navigator.share({ title: c.title, text }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Conversa copiada para compartilhar 🔗'); } catch { toast('Não consegui copiar.', { icon: '⚠️' }); }
  }

  async function newProject() {
    const n = await ask('Nome do projeto', '', { placeholder: 'Ex.: Loja, Faculdade, Campanhas…', ok: 'Criar' });
    if (!n) return null;
    const p = { id: crypto.randomUUID(), name: n.slice(0, 40) };
    projects.push(p); saveProjects(); renderList(); toast('Projeto criado 📁');
    return p;
  }
  function projectMenu(e, p) {
    popMenu(e, [
      { icon: '✏️', label: 'Renomear projeto', run: async () => { const n = await ask('Renomear projeto', p.name); if (n) { p.name = n.slice(0, 40); saveProjects(); renderList(); } } },
      { icon: '🗑', label: 'Excluir projeto (mantém as conversas)', danger: true, run: () => {
        projects = projects.filter(x => x.id !== p.id); saveProjects();
        chats.forEach(c => { if (c.projectId === p.id) delete c.projectId; }); store.set(chats); renderList();
        toast('Projeto excluído', { action: 'Desfazer', onAction: () => { projects.push(p); saveProjects(); renderList(); } });
      } },
    ]);
  }

  // ---------- barra lateral: busca, atalhos, projetos ----------
  const side = $('side');
  const newBtn = $('new');
  const extra = document.createElement('div'); extra.className = 'sidenav';
  const SV = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  extra.innerHTML = `
    <div class="sbox" id="sbox" hidden><input id="sinput" placeholder="Buscar conversas…"></div>
    <button class="snav" id="navAgenda" data-go="agenda">${SV('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>')}Agendamentos</button>
    <button class="snav" id="navSpace" data-go="/espaco">${SV('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>')}Meu espaço</button>
    <button class="snav" id="navConn" data-go="/conexoes">${SV('<path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7ZM12 17v5"/>')}Conexões</button>
    <button class="snav sub" data-go="ligar">${SV('<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>')}Ligar para clientes</button>
    <button class="snav sub" data-go="pedidos">${SV('<path d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>')}Fechar pedidos</button>
    <button class="snav sub" data-go="meta">${SV('<path d="M3 11v3a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>')}Campanha Meta Ads</button>
    <button class="snav" id="navImages" data-go="imagens">${SV('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>')}Imagens <em>Em breve</em></button>
    <button class="snav" id="navNewProject">${SV('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>')}Novo projeto</button>
    <hr class="snsep">`;
  newBtn.after(extra);
  $('findBtn').onclick = () => { const b = $('sbox'); b.hidden = !b.hidden; if (!b.hidden) $('sinput').focus(); else { filter = ''; $('sinput').value = ''; renderList(); } };
  $('sinput').oninput = e => { filter = e.target.value.toLowerCase(); renderList(); };
  $('navNewProject').onclick = () => newProject();

  // ---------- menu da conta (rodapé) ----------
  const acct = $('acct');
  acct.removeAttribute('href');
  acct.setAttribute('role', 'button'); acct.style.cursor = 'pointer';
  acct.onclick = e => {
    e.preventDefault();
    const acc = typeof account !== 'undefined' ? account : null;
    const logged = acc && acc.loggedIn;
    const SVG = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    const IC = {
      user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0Z" fill="var(--lime)"/>'),
      star: SVG('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" fill="var(--lime)"/>'),
      palette: SVG('<path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-1.4-1.2-1.6-1.2-2.8 0-.9.8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1.3" fill="var(--lime)" stroke="none"/><circle cx="10" cy="7.3" r="1.3" fill="var(--lime)" stroke="none"/><circle cx="14.5" cy="7.3" r="1.3" fill="var(--lime)" stroke="none"/>'),
      gear: SVG('<circle cx="12" cy="12" r="3" stroke="var(--lime)" stroke-width="2.4"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
      help: SVG('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" stroke="var(--lime)" stroke-width="2.2"/><path d="M12 17.5v.01" stroke="var(--lime)" stroke-width="2.6"/>'),
      out: SVG('<path d="M14 4h-7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7M10 12h11M17 8l4 4-4 4"/>'),
    };
    popMenu({ currentTarget: acct }, [
      ...(logged ? [{ icon: IC.user, label: 'Conta ' + acc.id, hl: true, run: () => openSettings('conta') }] : [{ icon: IC.user, label: 'Entrar / Criar conta', hl: true, run: () => location.href = '/conta' }]),
      { icon: IC.star, label: 'Fazer upgrade do plano', run: () => location.href = '/conta#planos' },
      { icon: IC.palette, label: 'Personalização', run: () => openSettings('persona') },
      { icon: IC.gear, label: 'Configurações', run: () => openSettings('apar') },
      { icon: IC.help, label: 'Ajuda', sub: [
        { icon: MI.layers, label: 'Central de ajuda', run: () => location.href = '/ajuda#central' },
        { icon: MI.wa, label: 'Falar no WhatsApp', run: () => location.href = '/ajuda#contato' },
        { icon: MI.shield, label: 'Central de privacidade', run: () => location.href = '/ajuda#privacidade' },
        { icon: MI.notes, label: 'Notas de versão', run: () => location.href = '/ajuda#notas' },
        { icon: MI.phone, label: 'Baixar aplicativo', run: installApp },
        { icon: MI.keyboard, label: 'Atalhos de teclado', run: showShortcuts },
        { icon: MI.doc, label: 'Termos de serviço', run: () => location.href = '/ajuda#termos' },
        { icon: MI.plock, label: 'Política de privacidade', run: () => location.href = '/ajuda#politica' },
        { icon: MI.bug, label: 'Relatar um bug', run: reportBug },
      ] },
      ...(logged ? ['-', { icon: IC.out, label: 'Sair', danger: true, run: async () => {
        await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
        toast('Você saiu da conta'); setTimeout(() => location.reload(), 800);
      } }] : []),
    ]);
  };

  // ---------- baixar aplicativo (PWA) ----------
  let installEvt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  function installApp() {
    if (installEvt) { installEvt.prompt(); installEvt = null; return; }
    toast(/iphone|ipad/i.test(navigator.userAgent) ? 'No iPhone: toque em Compartilhar → "Adicionar à Tela de Início"' : 'No Chrome: menu ⋮ → "Instalar GreenNird" (ou "Adicionar à tela inicial")', { icon: '📲', ms: 7000 });
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

  function reportBug() {
    ask('Conte o que deu errado', '', { placeholder: 'Ex.: o microfone parou depois de…', ok: 'Enviar' }).then(t => {
      if (!t) return;
      const info = `Bug no GreenNird:\n${t}\n\nNavegador: ${navigator.userAgent}\nPágina: ${location.pathname}`;
      navigator.clipboard.writeText(info).catch(() => {});
      location.href = '/ajuda#contato';
      toast('Relato copiado — cole na conversa com o suporte 🐞', { ms: 6000 });
    });
  }

  // ---------- atalhos de teclado ----------
  function showShortcuts() {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="mcard"><button class="mclose">×</button><h2>⌨️ Atalhos de teclado</h2>
      <table class="kbd">
        <tr><td><kbd>Enter</kbd></td><td>Enviar mensagem</td></tr>
        <tr><td><kbd>Shift</kbd> + <kbd>Enter</kbd></td><td>Nova linha</td></tr>
        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd></td><td>Nova conversa</td></tr>
        <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>Buscar conversas</td></tr>
        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd></td><td>Abrir/fechar barra lateral</td></tr>
        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd></td><td>Modo voz</td></tr>
        <tr><td><kbd>Ctrl</kbd> + <kbd>,</kbd></td><td>Configurações</td></tr>
        <tr><td><kbd>Ctrl</kbd> + <kbd>/</kbd></td><td>Ver atalhos</td></tr>
        <tr><td><kbd>Esc</kbd></td><td>Fechar janelas</td></tr>
      </table></div>`;
    m.onclick = e => { if (e.target === m || e.target.classList.contains('mclose')) m.remove(); };
    document.body.appendChild(m);
  }
  document.addEventListener('keydown', e => {
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.shiftKey && k === 'o') { e.preventDefault(); $('new').click(); }
    else if (ctrl && k === 'k') { e.preventDefault(); $('sbox').hidden = false; $('sinput').focus(); side.classList.remove('closed'); }
    else if (ctrl && e.shiftKey && k === 's') { e.preventDefault(); side.classList.toggle('closed'); }
    else if (ctrl && e.shiftKey && k === 'v') { e.preventDefault(); document.getElementById('voiceMode').click(); }
    else if (ctrl && k === ',') { e.preventDefault(); openSettings('geral'); }
    else if (ctrl && k === '/') { e.preventDefault(); showShortcuts(); }
    else if (k === 'escape') { document.querySelectorAll('.modal:not(#signup), .pmenu').forEach(x => x.remove()); }
  });

  // ---------- personalização (vai junto com cada mensagem) ----------
  const PERSONA_DEFAULT = { tone: 'descontraido', profanity: false, emojis: true, length: 'normal', nickname: '', about: '', custom: '' };
  window.getPersona = () => ({ ...PERSONA_DEFAULT, ...ls.get('gn-persona', {}), maps: !!ls.get('gn-connections', { maps: true }).maps });

  // ---------- configurações ----------
  const TABS = [
    ['geral', '⚙️', 'Geral'], ['persona', '🎨', 'Personalização'], ['voz', '🎙', 'Voz'], ['uso', '📊', 'Uso e limites'],
    ['plugins', '🔌', 'Conexões'], ['dados', '🗂', 'Dados'], ['conta', '👤', 'Conta'],
  ];
  function openSettings(tab = 'geral') {
    const map = { geral: 'geral', persona: 'pers', voz: 'voz', uso: 'uso', plugins: 'conex', dados: 'priv', conta: 'conta' };
    window.openSettingsModal ? openSettingsModal(map[tab] || tab || 'apar') : (location.href = '/configuracoes#' + (map[tab] || 'apar')); return;
    document.querySelectorAll('#settings').forEach(x => x.remove());
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'settings';
    m.innerHTML = `<div class="scard"><button class="mclose" aria-label="Fechar">×</button>
      <nav class="stabs">${TABS.map(([id, i, l]) => `<button data-t="${id}"><span>${i}</span>${l}</button>`).join('')}</nav>
      <section class="sbody" id="sbody"></section></div>`;
    m.onclick = e => { if (e.target === m || e.target.classList.contains('mclose')) m.remove(); };
    m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => showTab(b.dataset.t));
    document.body.appendChild(m);
    showTab(tab);
  }
  window.openSettings = openSettings;

  function showTab(t) {
    document.querySelectorAll('.stabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    const b = $('sbody');
    const p = getPersona();
    if (t === 'geral') {
      b.innerHTML = `<h3>Geral</h3>
        <label class="srow"><span>Sons e vibração</span><input type="checkbox" id="sSound" ${window.fx && fx.enabled ? 'checked' : ''}></label>
        <label class="srow"><span>Pesquisa na web ligada por padrão</span><input type="checkbox" id="sSearch" ${ls.get('gn-search-default', true) ? 'checked' : ''}></label>
        <label class="srow"><span>Enviar com Enter</span><input type="checkbox" checked disabled></label>
        <div class="srow"><span>Idioma</span><b>Português (Brasil)</b></div>
        <div class="srow"><span>Atalhos de teclado</span><button class="sbtn" id="sKeys">Ver atalhos</button></div>`;
      $('sSound').onchange = () => { window.fx && fx.toggleSound(); };
      $('sSearch').onchange = e => { ls.set('gn-search-default', e.target.checked); toast('Salvo'); };
      $('sKeys').onclick = showShortcuts;
    }
    if (t === 'persona') {
      b.innerHTML = `<h3>Personalização da IA</h3>
        <p class="sdesc">Escolha como o GreenNird conversa com você.</p>
        <div class="sfield"><span>Jeito de falar</span>
          <div class="chips2" id="pTone">
            ${[['descontraido', '😎 Descontraído'], ['amigavel', '🤗 Amigável'], ['profissional', '💼 Profissional'], ['direto', '🎯 Direto ao ponto'], ['engracado', '😂 Engraçado'], ['professor', '🧑‍🏫 Professor']].map(([v, l]) => `<button data-v="${v}" class="${p.tone === v ? 'on' : ''}">${l}</button>`).join('')}
          </div></div>
        <div class="sfield"><span>Tamanho das respostas</span>
          <div class="chips2" id="pLen">${[['curta', 'Curtas'], ['normal', 'Normais'], ['detalhada', 'Detalhadas']].map(([v, l]) => `<button data-v="${v}" class="${p.length === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <label class="srow"><span>Pode falar palavrão</span><input type="checkbox" id="pProf" ${p.profanity ? 'checked' : ''}></label>
        <label class="srow"><span>Usar emojis</span><input type="checkbox" id="pEmo" ${p.emojis ? 'checked' : ''}></label>
        <label class="sfield"><span>Como a IA deve te chamar</span><input id="pNick" maxlength="40" placeholder="Ex.: Gabriel, chefe, mano…" value="${esc(p.nickname)}"></label>
        <label class="sfield"><span>Sobre você (a IA usa para te ajudar melhor)</span><textarea id="pAbout" maxlength="600" rows="3" placeholder="Ex.: tenho uma loja de roupas e faço campanhas no Instagram">${esc(p.about)}</textarea></label>
        <label class="sfield"><span>Instruções personalizadas</span><textarea id="pCustom" maxlength="1000" rows="3" placeholder="Ex.: sempre me dê exemplos práticos">${esc(p.custom)}</textarea></label>
        <button class="btn btn-lime sbig" id="pSave">Salvar personalização</button>`;
      const pick = (id, key) => $(id).querySelectorAll('button').forEach(x => x.onclick = () => { $(id).querySelectorAll('button').forEach(y => y.classList.remove('on')); x.classList.add('on'); x.dataset.sel = key; });
      pick('pTone', 'tone'); pick('pLen', 'length');
      $('pSave').onclick = () => {
        ls.set('gn-persona', {
          tone: $('pTone').querySelector('.on')?.dataset.v || 'descontraido',
          length: $('pLen').querySelector('.on')?.dataset.v || 'normal',
          profanity: $('pProf').checked, emojis: $('pEmo').checked,
          nickname: $('pNick').value.trim(), about: $('pAbout').value.trim(), custom: $('pCustom').value.trim(),
        });
        toast('Personalização salva 🎨'); window.fx && fx.done();
      };
    }
    if (t === 'voz') {
      b.innerHTML = `<h3>Voz</h3>
        <div class="srow"><span>Voz da IA</span><b>${esc(voice.name || 'nenhuma escolhida')}</b></div>
        <button class="btn btn-white sbig" id="vChoose">🎙 Escolher voz (até 7)</button>
        <label class="srow"><span>Ler respostas em voz alta automaticamente</span><input type="checkbox" id="vAuto" ${voice.autoRead ? 'checked' : ''}></label>
        <label class="srow"><span>Interromper a IA quando eu falar (modo voz)</span><input type="checkbox" checked disabled></label>
        <p class="sdesc">Quando os créditos de voz acabam, o GreenNird usa a voz do próprio navegador.</p>`;
      $('vChoose').onclick = () => { $('settings').remove(); openVoices(); };
      $('vAuto').onchange = e => { voice.autoRead = e.target.checked; saveVoice(); $('autoRead').checked = e.target.checked; toast('Salvo'); };
    }
    if (t === 'uso') {
      b.innerHTML = `<h3>Uso e limites</h3><div id="usage" class="sdesc">Carregando…</div>`;
      fetch('/api/account').then(r => r.json()).then(a => {
        const u = a.usage || {};
        const plan = a.plan || 'Grátis';
        const bar = (used, lim) => `<div class="ubar"><i style="width:${lim ? Math.min(100, used / lim * 100) : 0}%"></i></div>`;
        $('usage').innerHTML = `
          <div class="srow"><span>Seu plano</span><b>${esc(plan)}</b></div>
          ${a.isAdmin ? '<p class="sdesc">Você é o dono: sem limites. ♾️</p>' : `
          <div class="ublock"><div class="srow"><span>Mensagens hoje</span><b>${u.today ?? 0} de ${u.dailyLimit ?? 3}</b></div>${bar(u.today ?? 0, u.dailyLimit ?? 3)}<small>Renova à meia-noite (horário de Brasília)</small></div>
          <div class="ublock"><div class="srow"><span>Limite semanal</span><b>${u.week ?? 0} de ${u.weeklyLimit ?? 15}</b></div>${bar(u.week ?? 0, u.weeklyLimit ?? 15)}<small>Renova toda segunda-feira</small></div>
          <div class="ublock"><div class="srow"><span>Janela de 5 horas</span><b>Planos pagos</b></div><small>No Pro: 50 mensagens a cada 5 horas · Turbo: 150 · Empresa: uso livre</small></div>
          <div class="ublock"><div class="srow"><span>Créditos de voz</span><b>${plan === 'Grátis' ? 'Trechos curtos' : 'Incluídos no plano'}</b></div></div>`}
          <a class="btn btn-lime sbig" href="/conta#planos">⭐ Fazer upgrade do plano</a>`;
      }).catch(() => { $('usage').textContent = 'Não foi possível carregar o uso agora.'; });
    }
    if (t === 'plugins') {
      b.innerHTML = `<h3>Conexões</h3><p class="sdesc">Conecte o GreenNird às suas ferramentas.</p>
        <a class="btn btn-lime sbig" href="/conexoes">🔌 Abrir Conexões</a>`;
    }
    if (t === 'dados') {
      b.innerHTML = `<h3>Dados</h3>
        <p class="sdesc">Suas conversas ficam salvas neste aparelho (navegador).</p>
        <div class="srow"><span>Exportar conversas</span><button class="sbtn" id="dExp">Baixar arquivo</button></div>
        <div class="srow"><span>Arquivadas</span><button class="sbtn" id="dArch">Ver arquivadas</button></div>
        <div class="srow"><span>Apagar todas as conversas</span><button class="sbtn danger" id="dDel">Apagar tudo</button></div>`;
      $('dExp').onclick = () => {
        const blob = new Blob([JSON.stringify({ chats, projects }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'greennird-conversas.json'; a.click();
        toast('Arquivo baixado 📦');
      };
      $('dArch').onclick = () => { $('settings').remove(); showArchived = true; side.classList.remove('closed'); renderList(); };
      $('dDel').onclick = () => {
        const backup = chats.slice();
        chats = []; store.set(chats); current = null; render(); $('settings').remove();
        toast('Todas as conversas foram apagadas', { icon: '🗑', action: 'Desfazer', ms: 8000, onAction: () => { chats = backup; store.set(chats); render(); toast('Conversas restauradas ✨'); } });
      };
    }
    if (t === 'conta') {
      const a = (typeof account !== 'undefined' && account) || {};
      b.innerHTML = `<h3>Conta</h3>
        ${a.loggedIn ? `<div class="srow"><span>Seu código</span><b>${esc(a.id)}</b></div>
        <div class="srow"><span>Plano</span><b>${esc(a.plan)}</b></div>
        <p class="sdesc">🔒 Guarde seu código: é a única forma de entrar na conta.</p>
        <a class="btn btn-white sbig" href="/conta">Gerenciar conta</a>` : `<p class="sdesc">Você ainda não entrou.</p><a class="btn btn-lime sbig" href="/conta">Entrar / Criar conta</a>`}
        <a class="btn btn-white sbig" href="/conta#planos">⭐ Ver planos</a>`;
    }
  }

  // re-renderiza a lista com os recursos novos
  renderList();
})();
