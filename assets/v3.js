// GreenNird v3 — estilo Grok: barra lateral nova, cabeçalho, painel Atividade/Biblioteca e janelas
(function () {
  const $ = id => document.getElementById(id);
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    chat: SV('<path d="M4 5h16v11H9l-5 4V5Z"/>'),
    folder: SV('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>'),
    apps: SV('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>'),
    bots: SV('<path d="M12 3c.4 4.2 3.8 7.6 8 8-4.2.4-7.6 3.8-8 8-.4-4.2-3.8-7.6-8-8 4.2-.4 7.6-3.8 8-8Z"/>'),
    tools: SV('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
    gear: SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'),
    chev: SV('<path d="m6 9 6 6 6-6"/>'),
    spark: SV('<path d="M12 3c.4 4.2 3.8 7.6 8 8-4.2.4-7.6 3.8-8 8-.4-4.2-3.8-7.6-8-8 4.2-.4 7.6-3.8 8-8Z"/>'),
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    x: SV('<path d="M6 6l12 12M18 6 6 18"/>'),
    clock: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    panel: SV('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/>'),
    share: SV('<path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'),
    page: SV('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>'),
  };
  const BOT = GNBot();
  const BOTC = ['#ff8a1f', '#a78bfa', '#4aa3ff', '#ff5a6a', '#ffffff'];
  const botImg = c => GNBot(c);

  // ---------------- barra lateral ----------------
  const side = $('side');
  document.body.classList.add('v3');
  const top = side.querySelector('.side-top');
  top.querySelector('.logo').innerHTML = '<img class="mark" src="/assets/logo-mark.webp" alt="">Green <b>Nird</b>';
  const nav = document.createElement('nav'); nav.className = 'v3-nav';
  nav.innerHTML = `
    <button class="v3n on" data-v="chat">${I.chat}Chat</button>
    <button class="v3n" data-v="proj">${I.folder}Projetos</button>
    <button class="v3n" data-v="apps">${I.apps}Conectar aplicativos</button>
    <button class="v3n" data-v="bots">${I.bots}Modelos de bots</button>
    <button class="v3n" data-v="tools">${I.tools}Ferramentas<span class="chev">${I.chev}</span></button>`;
  const oldNav = side.querySelector('.sidenav');
  top.after(nav);
  const toolsBox = document.createElement('div'); toolsBox.className = 'v3-tools'; toolsBox.hidden = true;
  nav.after(toolsBox);
  if (oldNav) toolsBox.appendChild(oldNav);           // Agendamentos, Meu espaço, Ligar, Pedidos, Meta Ads, Imagens…
  nav.hidden = true;                                   // os atalhos agora ficam no menu do rodapé (igual ao vídeo)
  const topBtns = document.createElement('div'); topBtns.className = 'v4-top';
  topBtns.innerHTML = `<button class="v4-ib" id="v4Find" title="Buscar conversas">${I.search}</button><button class="v4-ib" id="v4New" title="Nova conversa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>`;
  top.appendChild(topBtns);
  const hero = document.createElement('button'); hero.className = 'v4-me'; hero.title = 'Modelos de bots';
  hero.innerHTML = `<span class="v4-me-bot">${GNBot()}<i>★</i></span><b>Green Nird</b>`;
  top.after(hero);
  hero.onclick = () => openBots();
  $('v4New').onclick = () => { $('new').click(); };
  $('v4Find').onclick = () => { const f = $('findBtn'); if (f) f.click(); };
  const more = document.createElement('button'); more.className = 'v3-more'; more.innerHTML = I.chev + '<span>Mostrar mais</span>';
  $('list').after(more);
  let showAll = false;
  more.onclick = () => { showAll = !showAll; renderList(); };

  const setOn = v => nav.querySelectorAll('.v3n').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  nav.querySelectorAll('.v3n').forEach(b => b.onclick = () => {
    const v = b.dataset.v;
    if (v === 'chat') { setOn('chat'); window.showChatView && showChatView(); }
    if (v === 'proj') { const p = oldNav && oldNav.querySelector('[data-go="/espaco"]'); if (p) p.click(); setOn('proj'); }
    if (v === 'apps') openApps();
    if (v === 'bots') openBots();
    if (v === 'tools') { toolsBox.hidden = !toolsBox.hidden; b.classList.toggle('open', !toolsBox.hidden); }
  });

  // lista: só as 6 mais recentes até clicar em "Mostrar mais"
  const baseRender = window.renderList;
  window.renderList = function () {
    baseRender();
    const items = [...$('list').querySelectorAll('.item')];
    const sorted = chats.filter(c => c.title.toLowerCase().includes(filter)).sort((a, b) => b.updated - a.updated);
    items.forEach((it, i) => {
      const c = sorted[i]; if (!c) return;
      const last = [...c.messages].reverse().find(m => m.role === 'assistant' || m.role === 'user');
      const sp = it.querySelector('span'); const t = sp.textContent;
      sp.className = 'v4-txt'; sp.innerHTML = '<b></b><small></small>';
      sp.firstChild.textContent = t; sp.lastChild.textContent = last ? String(last.display ?? last.content).replace(/[#*_`>]/g, '').slice(0, 80) : 'Nova conversa';
      const ic = document.createElement('span'); ic.className = 'v4-ic'; ic.innerHTML = GNBot('#ffffff'); it.prepend(ic);
    });
    items.forEach((it, i) => it.classList.toggle('extra', !showAll && i >= 6));
    $('list').querySelectorAll('.group').forEach(g => g.classList.add('v3-hide'));
    more.hidden = items.length <= 6;
    more.querySelector('span').textContent = showAll ? 'Mostrar menos' : 'Mostrar mais';
    more.classList.toggle('up', showAll);
  };
  renderList();

  // rodapé: engrenagem abre as configurações
  const acct = $('acct');
  const gearFoot = document.createElement('button'); gearFoot.className = 'v3-gear'; gearFoot.title = 'Conectar aplicativos';
  gearFoot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><path d="M17 14v6M14 17h6"/></svg>';
  gearFoot.onclick = e => { e.stopPropagation(); e.preventDefault(); openApps(); };
  const MI2 = {
    plan: SV('<path d="M12 3c.4 4.2 3.8 7.6 8 8-4.2.4-7.6 3.8-8 8-.4-4.2-3.8-7.6-8-8 4.2-.4 7.6-3.8 8-8Z"/>'),
    up: SV('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    phone: SV('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>'),
    help: SV('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5v.01"/>'),
    add: SV('<circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 12-4.9M19 14v6M16 17h6"/>'),
    out: SV('<path d="M14 4h-7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7M10 12h11M17 8l4 4-4 4"/>'),
  };
  acct.onclick = e => {
    e.preventDefault(); e.stopPropagation();
    const a = typeof account !== 'undefined' && account ? account : {}; const u = a.usage || {};
    const pct = a.isAdmin ? 0 : Math.round(Math.min(100, (u.week || 0) / (u.weeklyLimit || 15) * 100));
    const tools = oldNav ? [...oldNav.querySelectorAll('[data-go], a.snav, button.snav')].map(x => ({ icon: x.querySelector('svg') ? x.querySelector('svg').outerHTML : '', label: x.textContent.trim(), run: () => x.click() })).filter(x => x.label) : [];
    gnPopMenu({ currentTarget: acct }, [
      { icon: MI2.plan, label: (a.isAdmin ? 'Dono · sem limite' : (a.plan || 'Grátis') + ' · ' + pct + '% usado'), run: () => openSettingsModal('uso') },
      { icon: MI2.up, label: 'Fazer upgrade do plano', run: () => location.href = '/conta#planos' },
      '-',
      { icon: I.folder, label: 'Projetos', run: () => { const p = oldNav && oldNav.querySelector('[data-go="/espaco"]'); if (p) p.click(); } },
      { icon: I.apps, label: 'Conectar aplicativos', run: openApps },
      { icon: I.bots, label: 'Modelos de bots', run: openBots },
      ...(tools.length ? [{ icon: I.tools, label: 'Ferramentas', sub: tools }] : []),
      '-',
      { icon: MI2.phone, label: 'Obter o Green Nird para celular', run: () => toast('No celular, abra o site e toque em “Adicionar à tela inicial” 📱', { ms: 5000 }) },
      { icon: MI2.help, label: 'Suporte', sub: [
        { icon: MI2.help, label: 'Central de ajuda', run: () => location.href = '/ajuda#central' },
        { icon: MI2.help, label: 'Falar no WhatsApp', run: () => location.href = '/ajuda#contato' },
        { icon: MI2.help, label: 'Relatar um bug', run: () => location.href = '/ajuda#contato' },
      ] },
      { icon: I.gear, label: 'Configurações', run: () => openSettingsModal('geral') },
      '-',
      { icon: MI2.add, label: a.loggedIn ? 'Adicionar conta' : 'Entrar / Criar conta', run: () => location.href = '/conta' },
      ...(a.loggedIn ? [{ icon: MI2.out, label: 'Sair', danger: true, run: async () => { await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); toast('Você saiu da conta'); setTimeout(() => location.reload(), 800); } }] : []),
    ]);
  };
  acct.appendChild(gearFoot);

  // ---------------- cabeçalho do chat ----------------
  const main = $('main');
  const head = document.createElement('header'); head.className = 'v3-head';
  head.innerHTML = `<span class="spacer"></span><button class="v3-model" id="v3Model">${BOT}<b id="v3ModelName">Green Nird</b></button>
    <span class="spacer"></span>
    <button class="v3-pill" id="v3Share">Compartilhar</button>
    <button class="v3-pill" id="v3New" hidden>Novo chat</button>
    <button class="v3-round" id="v3Panel" title="Atividade e Biblioteca">${I.panel}</button>
    <button class="v3-round" id="v3More" title="Mais">${I.dots}</button>`;
  main.prepend(head);
  const modelName = () => ((window.getModel ? getModel() : 'pro') === 'pro' ? 'Green Nird Pro' : 'Green Nird');
  const paintModel = () => { $('v3ModelName').textContent = modelName(); const q2 = document.querySelector('#f textarea'); if (q2) q2.placeholder = 'Mensagem para Green Nird'; };
  paintModel(); addEventListener('gn-model', paintModel);
  $('v3Model').onclick = () => gnPopMenu({ currentTarget: $('v3Model') }, [
    { icon: BOT, label: 'Green Nird · rápido', run: () => window.setModel && setModel('ia') },
    { icon: BOT, label: 'Green Nird Pro · pensa mais', run: () => window.setModel && setModel('pro') },
  ]);
  $('v3New').onclick = () => { $('new').click(); setOn('chat'); };
  $('v3Share').onclick = async () => {
    if (!current || !current.messages.length) return toast('Abra uma conversa para compartilhar', { icon: 'ℹ️' });
    const text = current.title + '\n\n' + current.messages.map(m => (m.role === 'user' ? 'Você: ' : 'Green Nird: ') + (m.display ?? m.content)).join('\n\n');
    try { if (navigator.share) { await navigator.share({ title: current.title, text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Conversa copiada para compartilhar 🔗'); } catch {}
  };
  $('v3More').onclick = () => gnPopMenu({ currentTarget: $('v3More') }, [
    { icon: I.panel, label: panelOpen() ? 'Fechar painel lateral' : 'Abrir painel lateral', run: togglePanel },
    { icon: I.share, label: 'Compartilhar conversa', run: () => $('v3Share').click() },
    { icon: I.gear, label: 'Configurações', run: () => openSettingsModal('geral') },
  ]);

  // ---------------- painel da direita: Atividade / Biblioteca ----------------
  const rp = document.createElement('aside'); rp.className = 'v3-right'; rp.id = 'v3Right';
  document.body.appendChild(rp);
  let tab = get('gn-rtab', 'atividade'), libFilter = 'todos';
  const panelOpen = () => !document.body.classList.contains('rp-off');
  function togglePanel() { document.body.classList.toggle('rp-off'); set('gn-rp-off', !panelOpen()); window.fx && fx.toggle(); }
  if (get('gn-rp-off', false)) document.body.classList.add('rp-off');
  $('v3Panel').onclick = togglePanel;

  function renderRight() {
    rp.innerHTML = `<button class="v3-round rp-x" title="Fechar">${I.x}</button>
      <div class="rp-id"><span class="rp-av">${GNBot('#ffffff')}</span><h2>Green Nird</h2></div>
      <div class="rp-tabs"><button data-t="atividade" class="${tab === 'atividade' ? 'on' : ''}">Atividade</button><button data-t="biblioteca" class="${tab === 'biblioteca' ? 'on' : ''}">Biblioteca</button></div>
      <div class="rp-body"></div>`;
    rp.querySelector('.rp-x').onclick = togglePanel;
    rp.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; set('gn-rtab', tab); renderRight(); window.fx && fx.toggle(); });
    const body = rp.querySelector('.rp-body');
    if (tab === 'atividade') {
      const tasks = (window.GNTasks ? GNTasks.get() : []).filter(t => t.status !== 'done').slice(0, 4);
      body.innerHTML = `
        <h4>Em breve</h4>
        <div class="rp-card">${tasks.length ? tasks.map(t => `<div class="rp-task">${I.clock}<span><b></b><small>${esc(GNTasks.describe(t))}</small></span><label class="sw2"><input type="checkbox" data-id="${t.id}" ${t.status === 'active' ? 'checked' : ''}><i></i></label></div>`).join('') : `<div class="rp-empty">Nenhuma tarefa agendada. <button class="rp-link" id="rpNewTask">Criar uma</button></div>`}</div>
        <h4>Computador</h4>
        <button class="rp-card rp-pc" id="rpPc"><span><b>Computador do Green Nird</b><small>Em repouso</small></span><span class="rp-av sm">${BOT}</span></button>
        <h4>Chat de voz</h4>
        <div class="rp-card rp-voice">
          <label>Voz<select id="rpVoice"><option>${esc(voice.name ? voice.name.split(' - ')[0] : 'Carregando…')}</option></select></label>
          <label>Idioma<select><option>Português (BR)</option></select></label>
        </div>`;
      body.querySelectorAll('.rp-task b').forEach((b, i) => b.textContent = tasks[i].title);
      body.querySelectorAll('.sw2 input').forEach(inp => inp.onchange = () => {
        const all = GNTasks.get(); const x = all.find(y => y.id === inp.dataset.id); if (!x) return;
        x.status = inp.checked ? 'active' : 'paused'; if (inp.checked) x.next = GNTasks.nextRun(x); GNTasks.set(all);
        toast(inp.checked ? 'Tarefa ligada ▶' : 'Tarefa pausada ⏸'); window.fx && fx.toggle();
      });
      const nt = $('rpNewTask'); if (nt) nt.onclick = () => { const a = oldNav && oldNav.querySelector('[data-go="agenda"]'); if (a) a.click(); };
      $('rpPc').onclick = openComputer;
      fetch('/api/voices').then(r => r.json()).then(j => {
        const sel = $('rpVoice'); if (!sel || !j.voices) return;
        sel.innerHTML = j.voices.map(v => `<option value="${v.id}" ${v.id === voice.id ? 'selected' : ''}>${esc(v.name.split(' - ')[0].split(' — ')[0])}</option>`).join('');
        sel.onchange = () => { const v = j.voices.find(x => x.id === sel.value); voice.id = v.id; voice.name = v.name; voice.owner = v.owner; saveVoice(); showVoiceName(); toast('Voz: ' + v.name.split(' - ')[0] + ' 🎙'); };
      }).catch(() => {});
    } else {
      // Biblioteca: arquivos enviados nas conversas + itens do Meu espaço
      const items = [];
      chats.forEach(c => c.messages.forEach(m => (m.files || []).forEach(f => items.push({ kind: /\.(png|jpe?g|webp|gif|mp4)$/i.test(f) ? 'midia' : 'arquivos', title: f, at: c.updated, chat: c }))));
      get('gn-space', []).filter(i => !i.trashed).forEach(i => items.push({ kind: i.type === 'image' ? 'midia' : 'paginas', title: i.title, at: i.updated, space: true }));
      const list = items.filter(i => libFilter === 'todos' || i.kind === libFilter).sort((a, b) => b.at - a.at);
      const day = 864e5, now = Date.now();
      const groups = [['Hoje', list.filter(i => now - i.at < day)], ['Esta semana', list.filter(i => now - i.at >= day && now - i.at < 7 * day)], ['Antes', list.filter(i => now - i.at >= 7 * day)]];
      body.innerHTML = `<div class="rp-filters">${[['todos', 'Todos'], ['paginas', 'Páginas'], ['midia', 'Mídia'], ['arquivos', 'Arquivos']].map(([k, l]) => `<button data-f="${k}" class="${libFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div>` +
        (list.length ? groups.filter(g => g[1].length).map(([g, arr]) => `<h4>${g}</h4><div class="rp-card rp-lib">${arr.slice(0, 6).map((i, k) => `<button class="rp-file" data-g="${g}" data-k="${k}">${I.page}<span></span></button>`).join('')}</div>`).join('')
          : '<div class="rp-empty">Arquivos que você enviar e páginas do Meu espaço aparecem aqui.</div>');
      body.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { libFilter = b.dataset.f; renderRight(); });
      groups.forEach(([g, arr]) => body.querySelectorAll(`.rp-file[data-g="${g}"]`).forEach(b => {
        const it = arr[+b.dataset.k]; b.querySelector('span').textContent = it.title;
        b.onclick = () => { if (it.chat) { current = it.chat; render(); window.showChatView && showChatView(); } else { const p = oldNav && oldNav.querySelector('[data-go="/espaco"]'); if (p) p.click(); } };
      }));
    }
  }
  renderRight();
  addEventListener('gn-tasks', () => tab === 'atividade' && renderRight());

  // ---------------- janela: Conectar aplicativos ----------------
  const LOGOS = {
    drive: '<svg viewBox="0 0 48 48"><path fill="#1e88e5" d="M38.6 40H9.4l5.4-9.4h29.2z"/><path fill="#fbc02d" d="M29.4 8H18.6l14.6 25.3 5.4-9.4z"/><path fill="#43a047" d="M18.6 5.3 4 30.6l5.4 9.4L24 14.7z"/></svg>',
    cal: '<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="5" fill="#fff" stroke="#1e88e5" stroke-width="3"/><path fill="#1e88e5" d="M6 11a5 5 0 0 1 5-5h26a5 5 0 0 1 5 5v5H6z"/><text x="24" y="37" font-size="16" font-weight="700" text-anchor="middle" fill="#1e88e5" font-family="system-ui">31</text></svg>',
    notion: '<svg viewBox="0 0 48 48"><rect x="7" y="6" width="34" height="36" rx="4" fill="#fff" stroke="#111" stroke-width="3"/><path d="M17 15v18M17 15l14 18M31 15v18" stroke="#111" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>',
    slack: '<svg viewBox="0 0 48 48"><path fill="#e01e5a" d="M14 28a4 4 0 1 1-4-4h4zm2 0a4 4 0 1 1 8 0v10a4 4 0 1 1-8 0z"/><path fill="#36c5f0" d="M20 14a4 4 0 1 1 4-4v4zm0 2a4 4 0 1 1 0 8H10a4 4 0 1 1 0-8z"/><path fill="#2eb67d" d="M34 20a4 4 0 1 1 4 4h-4zm-2 0a4 4 0 1 1-8 0V10a4 4 0 1 1 8 0z"/><path fill="#ecb22e" d="M28 34a4 4 0 1 1-4 4v-4zm0-2a4 4 0 1 1 0-8h10a4 4 0 1 1 0 8z"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path fill="#fff" d="M12 .5a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.7.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.5 11.5 0 0 0 12 .5z"/></svg>',
    gmail: '<svg viewBox="0 0 48 48"><path fill="#4caf50" d="M45 16.2 37 21v20h6a2 2 0 0 0 2-2V16.2z"/><path fill="#1e88e5" d="M3 16.2V39a2 2 0 0 0 2 2h6V21l-8-4.8z"/><path fill="#e53935" d="M35 11.2 24 19.5l-11-8.3V21l11 8.2L35 21z"/><path fill="#c62828" d="M3 12.3v3.9l8 4.8V11.2L8.5 9.3A3.4 3.4 0 0 0 3 12.3z"/><path fill="#fbc02d" d="M45 12.3v3.9l-8 4.8V11.2l2.5-1.9A3.4 3.4 0 0 1 45 12.3z"/></svg>',
    canva: '<svg viewBox="0 0 48 48"><defs><linearGradient id="cvg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00c4cc"/><stop offset="1" stop-color="#7d2ae8"/></linearGradient></defs><circle cx="24" cy="24" r="22" fill="url(#cvg)"/><text x="24" y="29" font-size="12" font-style="italic" font-weight="700" text-anchor="middle" fill="#fff" font-family="Georgia,serif">Canva</text></svg>',
    figma: '<svg viewBox="0 0 48 48"><circle cx="30" cy="24" r="6" fill="#1abcfe"/><path fill="#0acf83" d="M12 36a6 6 0 0 1 6-6h6v6a6 6 0 0 1-12 0z"/><path fill="#ff7262" d="M24 6v12h6a6 6 0 0 0 0-12z"/><path fill="#f24e1e" d="M12 12a6 6 0 0 0 6 6h6V6h-6a6 6 0 0 0-6 6z"/><path fill="#a259ff" d="M12 24a6 6 0 0 0 6 6h6V18h-6a6 6 0 0 0-6 6z"/></svg>',
    wa: '<svg viewBox="0 0 48 48"><path fill="#25d366" d="M24 4a20 20 0 0 0-17.3 30L4 44l10.3-2.7A20 20 0 1 0 24 4z"/><path fill="#fff" d="M34.6 29.8c-.5 1.4-2.6 2.6-3.6 2.7-1 .1-1.9.5-6.4-1.3-5.4-2.1-8.8-7.7-9-8-.3-.4-2.2-2.9-2.2-5.5s1.4-3.9 1.9-4.4c.5-.5 1-.7 1.4-.7h1c.3 0 .8-.1 1.2.9l1.7 4c.1.3.2.7 0 1.1l-.6 1-.9 1c-.3.3-.6.6-.3 1.2.4.6 1.6 2.6 3.4 4.2 2.3 2.1 4.3 2.7 4.9 3 .6.3 1 .3 1.4-.2l1.9-2.3c.4-.6.8-.5 1.4-.3l3.8 1.8c.6.3 1 .4 1.1.7.2.2.2 1.4-.3 2.9z"/></svg>',
    maps: '<svg viewBox="0 0 48 48"><path fill="#4caf50" d="M24 4a14 14 0 0 0-14 14c0 10.5 14 26 14 26s14-15.5 14-26A14 14 0 0 0 24 4z"/><circle cx="24" cy="18" r="5.5" fill="#fff"/></svg>',
  };
  const APPS = [
    ['drive', 'Google Drive', 'Acesse e analise seus arquivos e pastas.', 'prod'],
    ['cal', 'Google Calendar', 'Consulte e gerencie seus eventos e agendas.', 'prod'],
    ['notion', 'Notion', 'Acesse suas páginas, bases de dados e documentos.', 'prod'],
    ['gmail', 'Gmail', 'Leia, resuma e responda seus e-mails.', 'com'],
    ['slack', 'Slack', 'Busque mensagens, canais e arquivos do seu time.', 'com'],
    ['wa', 'WhatsApp', 'Atenda clientes 24h com a IA.', 'com'],
    ['canva', 'Canva', 'Crie designs, apresentações e posts.', 'design'],
    ['figma', 'Figma', 'Veja e comente seus arquivos de design.', 'design'],
    ['github', 'GitHub', 'Consulte repositórios, issues, pull requests e mais.', 'code'],
    ['maps', 'Google Maps', 'Lugares, rotas e endereços no chat.', 'prod'],
  ];
  function modal(html, cls = '') {
    document.querySelectorAll('.v3-modal').forEach(x => x.remove());
    const m = document.createElement('div'); m.className = 'v3-modal ' + cls;
    m.innerHTML = `<div class="v3-card"><button class="v3-x" aria-label="Fechar">${I.x}</button>${html}</div>`;
    const close = () => { m.classList.add('closing'); setTimeout(() => m.remove(), 250); setOn('chat'); };
    m.querySelector('.v3-x').onclick = close; m.onclick = e => { if (e.target === m) close(); };
    addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', k); } });
    document.body.appendChild(m); window.fx && fx.toggle();
    return m;
  }
  function openApps() {
    setOn('apps');
    let cat = 'all', q = '';
    const conn = get('gn-connections', { maps: true });
    const m = modal(`<h2>Conectar aplicativos</h2>
      <label class="v3-search">${I.search}<input placeholder="Buscar em aplicativos e habilidades"></label>
      <div class="v3-cats">${[['all', 'Todos'], ['prod', 'Produtividade'], ['com', 'Comunicação'], ['design', 'Design'], ['code', 'Código']].map(([k, l]) => `<button data-c="${k}" class="${k === 'all' ? 'on' : ''}">${l}</button>`).join('')}</div>
      <h3>Integrações disponíveis</h3><div class="v3-apps"></div>`, 'apps');
    const box = m.querySelector('.v3-apps');
    const draw = () => {
      const list = APPS.filter(a => (cat === 'all' || a[3] === cat) && (a[1] + a[2]).toLowerCase().includes(q));
      box.innerHTML = list.map(([k, n, d]) => `<div class="v3-app"><span class="v3-lg">${LOGOS[k]}</span><span><b>${n}</b><small>${d}</small></span><button data-k="${k}" class="${conn[k] ? 'ok' : ''}">${conn[k] ? 'Conectado' : 'Conectar'}</button></div>`).join('') || '<div class="rp-empty">Nada encontrado.</div>';
      box.querySelectorAll('button[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k;
        if (conn[k]) { delete conn[k]; set('gn-connections', conn); draw(); toast('Desconectado'); return; }
        if (k === 'maps') { conn.maps = true; set('gn-connections', conn); draw(); toast('Google Maps conectado ✅'); return; }
        toast('Essa conexão está chegando! Assim que liberar, te avisamos 💚', { icon: '🔌', ms: 5000 }); window.fx && fx.boop();
      });
    };
    m.querySelector('input').oninput = e => { q = e.target.value.toLowerCase(); draw(); };
    m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { cat = b.dataset.c; m.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
    draw(); setTimeout(() => m.querySelector('input').focus(), 50);
  }

  // ---------------- janela: Modelos de bots ----------------
  const BOTS = [
    ['Atendente de WhatsApp', 'Responde clientes com simpatia e fecha vendas.', { tone: 'amigavel', length: 'curta', custom: 'Aja como atendente de loja no WhatsApp: respostas curtas, simpáticas, sempre conduzindo para fechar a venda.' }],
    ['Gestor de Meta Ads', 'Planeja e analisa campanhas no Facebook e Instagram.', { tone: 'direto', length: 'normal', custom: 'Aja como gestor de tráfego especialista em Meta Ads para pequenos negócios no Brasil. Fale de público, orçamento, criativos e métricas (CTR, CPC, CPA).' }],
    ['Redator de posts', 'Cria legendas, roteiros e textos que vendem.', { tone: 'descontraido', length: 'normal', custom: 'Aja como redator de redes sociais: ganchos fortes, emojis na medida e chamada para ação.' }],
    ['Professor paciente', 'Explica qualquer assunto passo a passo.', { tone: 'professor', length: 'detalhada', custom: 'Explique como um professor paciente, com exemplos do dia a dia.' }],
    ['Assistente direto', 'Respostas rápidas, sem enrolação.', { tone: 'direto', length: 'curta', custom: '' }],
  ];
  function openBots() {
    setOn('bots');
    const curBot = get('gn-bot', '');
    const m = modal(`<h2>Modelos de bots</h2><p class="v3-sub">Escolha um jeito pronto para o Green Nird trabalhar com você.</p>
      <div class="v3-bots">${BOTS.map(([n, d], k) => `<button class="v3-bot ${curBot === n ? 'on' : ''}" data-k="${k}"><span class="rp-av sm">${botImg(BOTC[k])}</span><span><b>${n}</b><small>${d}</small></span>${curBot === n ? '<em>Ativo</em>' : ''}</button>`).join('')}
      <button class="v3-bot ${!curBot ? 'on' : ''}" data-k="-1"><span class="rp-av sm">${BOT}</span><span><b>Green Nird padrão</b><small>Do seu jeito, com a sua personalização.</small></span>${!curBot ? '<em>Ativo</em>' : ''}</button></div>`, 'bots');
    m.querySelectorAll('.v3-bot').forEach(b => b.onclick = () => {
      const k = +b.dataset.k; const persona = get('gn-persona', {});
      if (k < 0) { set('gn-bot', ''); delete persona.botCustom; }
      else { const [n, , p] = BOTS[k]; set('gn-bot', n); Object.assign(persona, { tone: p.tone, length: p.length }); persona.botCustom = p.custom; }
      set('gn-persona', persona); m.querySelector('.v3-x').click();
      toast(k < 0 ? 'Green Nird padrão ativado' : BOTS[k][0] + ' ativado 🤖'); window.fx && fx.done();
    });
  }
  // o modelo de bot entra junto com a personalização enviada ao servidor
  const basePersona = window.getPersona;
  window.getPersona = () => { const p = basePersona ? basePersona() : {}; const extra = get('gn-persona', {}).botCustom; if (extra) p.custom = (extra + ' ' + (p.custom || '')).trim(); return p; };

  // ---------------- tela: Computador do Green Nird ----------------
  function openComputer() {
    const now = new Date();
    const m = modal(`<div class="pc-top"><img src="/assets/bot-lime.svg" alt=""><span class="bar"></span>Computador do <b>Green Nird</b><span class="spacer"></span></div>
      <div class="pc-screen"><div class="pc-wall"><img src="/assets/bot-lime.svg" alt=""></div>
        <div class="pc-dock"><span class="pc-ic chrome"></span><span class="pc-ic files"></span><span class="pc-ic term">&gt;_</span>
          <span class="pc-st"><i></i>Em repouso <span>|</span> ${now.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div></div>
      <div class="pc-ctrl">${SV('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>')}<span>O computador na nuvem está chegando</span><button class="pc-done">Fechar</button></div>`, 'pc');
    m.querySelector('.pc-done').onclick = () => m.querySelector('.v3-x').click();
  }
  window.openComputer = openComputer;

  // ---------------- tela inicial: o bot ----------------
  const brand = document.querySelector('.hero-brand .hero-lm');
  if (brand) {
    const one = document.createElement('button'); one.className = 'v4-hero-bot'; one.setAttribute('aria-label', 'Green Nird');
    one.innerHTML = GNBot('var(--lime)');
    brand.replaceWith(one);
    one.onclick = () => { one.classList.remove('boop'); void one.offsetWidth; one.classList.add('boop'); window.fx && (fx.boop ? fx.boop() : fx.click && fx.click()); };
  }
})();
