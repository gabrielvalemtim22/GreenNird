// GreenNird — avatar do perfil, Agendamentos dentro do chat e transições 3D entre telas
(function () {
  const $ = id => document.getElementById(id);
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  // ---------- avatar ----------
  const COLORS = [['verde', '#c6f500'], ['azul', '#2f9bff'], ['roxo', '#8b3dff'], ['rosa', '#ff3d9a'], ['laranja', '#ff7a1a']];
  const avatarUrl = c => `/assets/avatars/${c}.webp`;
  window.GNAvatar = { get: () => get('gn-avatar', 'verde'), url: avatarUrl, COLORS };

  function paintAvatar() {
    const av = document.querySelector('#acct .avatar');
    if (!av) return;
    av.textContent = '';
    av.style.background = `center/cover url(${avatarUrl(GNAvatar.get())})`;
    av.classList.add('img');
  }
  paintAvatar();

  // nome e plano do rodapé (o chat.js também preenche ao carregar a conta)
  fetch('/api/account').then(r => r.ok ? r.json() : null).then(a => {
    if (!a || !a.loggedIn) return;
    $('acctName').textContent = 'Conta ' + a.id.replace(/\s/g, '').slice(-4);
    $('acctPlan').textContent = a.isAdmin ? 'Dono' : a.plan;
    paintAvatar();
  }).catch(() => {});

  // janela "Personalizar perfil" ao clicar no avatar
  const avEl = document.querySelector('#acct .avatar');
  if (avEl) avEl.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); openProfile(); }, true);
  function openProfile() {
    document.querySelectorAll('.profile-pop, .pmenu').forEach(x => x.remove());
    let pick = GNAvatar.get();
    const p = document.createElement('div'); p.className = 'profile-pop';
    p.innerHTML = `<div class="pp-head"><b>Personalizar perfil</b><button class="pp-x" aria-label="Fechar">×</button></div>
      <div class="pp-big"><img alt="Seu avatar"></div>
      <div class="pp-label">Cor do avatar</div>
      <div class="pp-colors">${COLORS.map(([n, c]) => `<button data-c="${n}" style="background:${c}" aria-label="${n}"></button>`).join('')}</div>
      <button class="btn btn-lime pp-save">Salvar</button>`;
    document.body.appendChild(p);
    const img = p.querySelector('img');
    const show = () => {
      img.src = avatarUrl(pick);
      p.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === pick));
      img.parentElement.classList.remove('bump'); void img.offsetWidth; img.parentElement.classList.add('bump');
    };
    p.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { pick = b.dataset.c; show(); window.fx && fx.boop(); });
    p.querySelector('.pp-x').onclick = () => p.remove();
    p.querySelector('.pp-save').onclick = () => {
      set('gn-avatar', pick); paintAvatar(); p.remove();
      window.toast && toast('Avatar atualizado ✨'); window.fx && (fx.done(), fx.burst(document.querySelector('#acct .avatar'), 20));
    };
    show();
    setTimeout(() => document.addEventListener('click', function off(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('click', off); } }), 0);
  }

  // ---------- transição 3D ----------
  const main = $('main');
  function flip3d(change) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { change(); return Promise.resolve(); }
    return new Promise(res => {
      main.classList.add('t3d-out');
      window.fx && fx.toggle();
      setTimeout(() => {
        change();
        main.classList.remove('t3d-out'); main.classList.add('t3d-in');
        setTimeout(() => { main.classList.remove('t3d-in'); res(); }, 520);
      }, 380);
    });
  }
  window.flip3d = flip3d;

  // ---------- Agendamentos dentro do chat ----------
  const view = document.createElement('section'); view.className = 'agenda-view'; view.id = 'agendaView'; view.hidden = true;
  main.appendChild(view);
  const SUG = [
    ['reuniao', 'Agendar reunião', 'Defina dia, hora e participantes', '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'],
    ['lembrete', 'Criar lembrete', 'Receba um aviso no momento certo', '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2ZM10 21h4"/>'],
    ['recorrente', 'Tarefa recorrente', 'Programe tarefas automáticas', '<path d="M4 8h13l-3-3M20 16H7l3 3"/>'],
    ['agenda', 'Organizar agenda', 'Visualize e priorize seus compromissos', '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'],
  ];
  const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  function renderAgenda() {
    const tasks = (window.GNTasks ? GNTasks.get() : []);
    const active = tasks.filter(t => t.status === 'active');
    view.innerHTML = `
      <div class="spark ag-spark"><svg viewBox="0 0 24 24"><path fill="#d4ff00" d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z"/></svg></div>
      <div class="ag-head"><h1>${SV('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>')}Agende uma tarefa</h1>
        <button class="ag-new" data-t="novo">${SV('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>')}Nova tarefa</button></div>
      <p class="ag-sub">Crie, organize e acompanhe suas tarefas e compromissos.</p>
      <div class="ag-label">Sugestões para começar</div>
      <div class="ag-grid">${SUG.map(([k, t, d, ic]) => `<button class="ag-card" data-t="${k}"><span class="ag-ic">${SV(ic)}</span><span class="ag-tx"><b>${t}</b><small>${d}</small></span><span class="ag-go">›</span></button>`).join('')}</div>
      <div class="ag-label">Suas tarefas ativas (${active.length})</div>
      <div class="ag-list">${active.length ? active.map(t => `<a class="ag-task" href="/agendamentos#t=${t.id}"><span>${t.icon || '🗓'}</span><b></b><small>${GNTasks.describe(t)}</small></a>`).join('') : '<div class="ag-empty">Nenhuma ainda — escolha uma sugestão acima ✨</div>'}</div>
      <a class="ag-all" href="/agendamentos">Ver todos os agendamentos →</a>`;
    view.querySelectorAll('.ag-task b').forEach((b, i) => b.textContent = active[i].title);
    view.querySelectorAll('[data-t]').forEach(b => b.onclick = () => openAgendaPanel('/agendamentos#novo=' + b.dataset.t));
    view.querySelectorAll('.ag-task, .ag-all').forEach(a => a.onclick = e => { e.preventDefault(); openAgendaPanel(a.getAttribute('href')); });
  }
  function openAgendaPanel(url) {
    const [path, hash] = url.split('#');
    flip3d(() => {
      view.hidden = true;
      const pv = document.querySelector('.panel-view'); pv.hidden = false;
      const f = pv.querySelector('iframe'); f.src = path + '?embed=1' + (hash ? '#' + hash : ''); f.dataset.u = url;
      main.classList.add('in-agenda'); setNav('agenda');
    });
  }
  function setNav(k) { document.querySelectorAll('.snav[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === k)); }
  function showAgenda() {
    flip3d(() => { renderAgenda(); view.hidden = false; main.classList.add('in-agenda'); setNav('agenda'); });
  }
  function showChat() {
    if (!main.classList.contains('in-agenda')) return;
    flip3d(() => { view.hidden = true; document.querySelectorAll('.panel-view').forEach(p => p.hidden = true); main.classList.remove('in-agenda'); setNav(''); });
  }
  window.showChatView = showChat;
  function go(url) {
    main.classList.add('t3d-out'); window.fx && fx.toggle();
    try { sessionStorage.setItem('gn-enter3d', '1'); } catch {}
    setTimeout(() => { location.href = url; }, 360);
  }
  window.go3d = go;

  const panel = document.createElement('section'); panel.className = 'agenda-view panel-view'; panel.hidden = true;
  panel.innerHTML = '<iframe title="GreenNird"></iframe>';
  main.appendChild(panel);
  function showPanel(url, key) {
    flip3d(() => {
      view.hidden = true; panel.hidden = false;
      const f = panel.querySelector('iframe'); if (f.dataset.u !== url) { f.src = url + (url.includes('?') ? '&' : '?') + 'embed=1'; f.dataset.u = url; }
      main.classList.add('in-agenda'); setNav(key);
    });
  }
  document.querySelectorAll('.snav[data-go]').forEach(b => b.onclick = () => {
    const to = b.dataset.go;
    if (main.classList.contains('in-agenda') && b.classList.contains('on')) return showChat();
    if (to === 'agenda') { panel.hidden = true; return showAgenda(); }
    showPanel(to, to);
  });
  // voltar ao chat ao clicar em Nova conversa ou numa conversa
  $('new').addEventListener('click', () => showChat());
  $('list').addEventListener('click', e => { if (e.target.closest('.item') && !e.target.closest('.more')) showChat(); });
  addEventListener('gn-tasks', () => { if (!view.hidden) renderAgenda(); });
  // ---------- Configurações em janela (estilo ChatGPT) ----------
  window.openSettingsModal = (tab = 'apar') => {
    document.querySelectorAll('.set-modal').forEach(x => x.remove());
    const m = document.createElement('div'); m.className = 'set-modal';
    m.innerHTML = `<div class="set-card"><button class="set-x" aria-label="Fechar">×</button><iframe src="/configuracoes?embed=1#${tab}" title="Configurações"></iframe></div>`;
    const close = () => { m.classList.add('closing'); setTimeout(() => m.remove(), 300); window.applyTheme && applyTheme(); };
    m.querySelector('.set-x').onclick = close;
    m.onclick = e => { if (e.target === m) close(); };
    addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', esc); } });
    document.body.appendChild(m); window.fx && fx.toggle();
    window.closeSettingsModal = close;
  };
  addEventListener('message', e => {
    if (e.origin !== location.origin) return;
    if (e.data === 'gn-close') { window.closeSettingsModal && closeSettingsModal(); showChat(); }
    if (e.data === 'gn-theme') window.applyTheme && applyTheme();
  });
  // engrenagem no topo da barra lateral
  const gear = document.createElement('button'); gear.className = 'icon-btn'; gear.title = 'Configurações';
  gear.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>';
  gear.onclick = () => openSettingsModal('apar');
  $('toggle').before(gear);

  if (location.hash === '#agendamentos') showAgenda();
})();
