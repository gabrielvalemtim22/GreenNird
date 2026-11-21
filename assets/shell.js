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
      view.hidden = true; feat.hidden = true;
      const pv = document.querySelector('.panel-view'); pv.hidden = false;
      const f = pv.querySelector('iframe'); f.src = path + '?embed=1' + (hash ? '#' + hash : ''); f.dataset.u = url;
      main.classList.add('in-agenda'); setNav('agenda');
    });
  }
  function setNav(k) { document.querySelectorAll('.snav[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === k)); }
  function showAgenda() {
    flip3d(() => { renderAgenda(); feat.hidden = true; panel.hidden = true; view.hidden = false; main.classList.add('in-agenda'); setNav('agenda'); });
  }
  function showChat() {
    if (!main.classList.contains('in-agenda')) return;
    flip3d(() => { view.hidden = true; feat.hidden = true; document.querySelectorAll('.panel-view').forEach(p => p.hidden = true); main.classList.remove('in-agenda'); setNav(''); });
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
      view.hidden = true; feat.hidden = true; panel.hidden = false;
      const f = panel.querySelector('iframe'); if (f.dataset.u !== url) { f.src = url + (url.includes('?') ? '&' : '?') + 'embed=1'; f.dataset.u = url; }
      main.classList.add('in-agenda'); setNav(key);
    });
  }
  document.querySelectorAll('.snav[data-go]').forEach(b => b.onclick = () => {
    const to = b.dataset.go;
    if (main.classList.contains('in-agenda') && b.classList.contains('on')) return showChat();
    if (to === 'agenda') return showAgenda();
    if (!to.startsWith('/')) return showFeature(to);
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

  // ---------- telas: Imagens, Ligar para clientes, Fechar pedidos, Campanha Meta Ads ----------
  const feat = document.createElement('section'); feat.className = 'agenda-view feat-view'; feat.hidden = true;
  main.appendChild(feat);
  const LOGO = '<span class="lm big"></span>';
  const SPARK = '<div class="spark ag-spark"><svg viewBox="0 0 24 24"><path d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z"/></svg></div>';
  const soon = what => () => { window.toast && toast(what + ' está chegando! Assim que conectar, te avisamos 💚', { icon: '🔌', ms: 5000 }); window.fx && fx.boop(); };
  // manda um pedido para a IA no chat normal
  function askAI(text) { showChat(); setTimeout(() => { $('new').click(); send(text); }, 650); }

  const FEATS = {
    imagens() {
      feat.innerHTML = `<div class="ft-hero">${LOGO}<h1>Que imagem você quer criar?</h1></div>
        <form class="img-box"><textarea rows="2" placeholder="Descreva a imagem que você quer criar"></textarea>
          <div class="img-row">
            <button type="button" class="ib-plus" title="Enviar imagem de referência">+</button>
            <label class="ib-sel">${SV('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>')}<select><option>Imagem</option><option>Vídeo (em breve)</option></select></label>
            <span class="ib-sep"></span>
            <label class="ib-sel"><span class="lm sm"></span><select><option>GreenNird AI</option></select></label>
            <span class="ib-sep"></span>
            <label class="ib-sel">${SV('<rect x="5" y="5" width="14" height="14" rx="2"/>')}<select><option>1:1</option><option>16:9</option><option>9:16</option><option>4:5</option></select></label>
            <span class="spacer"></span>
            <button class="ib-go" aria-label="Criar">${SV('<path d="M12 3c.4 4.2 3.8 7.6 8 8-4.2.4-7.6 3.8-8 8-.4-4.2-3.8-7.6-8-8 4.2-.4 7.6-3.8 8-8Z" fill="currentColor"/>')}</button>
          </div></form>
        <div class="ft-row"><h2>Comece a criar</h2><span class="spacer"></span><button class="car-btn" data-d="-1">‹</button><button class="car-btn" data-d="1">›</button></div>
        <div class="car">${[
          ['Produtos', 'Destaque seu produto com imagens profissionais', 'prod', 'Foto de produto profissional de um fone de ouvido preto em fundo escuro com luz verde'],
          ['Anúncios', 'Crie imagens de alto impacto para campanhas', 'ad', 'Anúncio impactante de um tênis esportivo em cima de uma pedra, luz verde neon'],
          ['Logotipos', 'Desenvolva logos modernos e únicos', 'logo', 'Logotipo moderno e minimalista de uma folha verde, fundo preto'],
          ['Retratos', 'Gere retratos realistas e de alta qualidade', 'pt', 'Retrato realista de estúdio de uma pessoa sorrindo, luz suave'],
        ].map(([t, d, k, pr]) => `<button class="car-card img ${k}" data-p="${pr}" aria-label="${t}: ${d}"></button>`).join('')}</div>`;
      const ta = feat.querySelector('textarea');
      feat.querySelectorAll('.car-card').forEach(c => c.onclick = () => { ta.value = c.dataset.p; ta.focus(); window.fx && fx.toggle(); });
      feat.querySelectorAll('.car-btn').forEach(b => b.onclick = () => feat.querySelector('.car').scrollBy({ left: b.dataset.d * 340, behavior: 'smooth' }));
      feat.querySelector('.ib-plus').onclick = soon('Enviar imagem de referência');
      feat.querySelector('form').onsubmit = e => { e.preventDefault(); soon('A criação de imagens')(); };
    },
    ligar() {
      feat.innerHTML = `${SPARK}<div class="ft-hero sm">${LOGO.replace('big', 'mid')}<span class="ft-brand">GreenNird</span></div>
        <h1 class="ft-title">Ligar para clientes com IA</h1><p class="ft-sub">Escolha como sua IA fará as ligações</p>
        <div class="opt-grid">
          <div class="opt"><span class="opt-ic">${SV('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>')}</span><h3>Conectar meu celular</h3><p>Use seu celular para realizar as ligações.</p><button class="opt-btn" data-k="Conectar celular">Conectar celular</button></div>
          <div class="opt"><span class="opt-ic">${SV('<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/><path d="M15 3a6 6 0 0 1 6 6M15 6.5a2.5 2.5 0 0 1 2.5 2.5"/>')}</span><h3>Usar ligações pagas</h3><p>Faça ligações usando créditos.</p><button class="opt-btn" data-k="Ligações pagas">Ver opções</button></div>
        </div>
        <form class="ft-ask"><input placeholder="Conte para a IA quem você quer atender"><button aria-label="Enviar">${SV('<path d="M21 3 3 10.5l7.5 3L21 3Zm0 0-7.5 18-3-7.5"/>')}</button></form>`;
      feat.querySelectorAll('.opt-btn').forEach(b => b.onclick = soon(b.dataset.k));
      feat.querySelector('.ft-ask').onsubmit = e => { e.preventDefault(); const v = e.target.querySelector('input').value.trim(); if (v) askAI(`Monte um roteiro de ligação de vendas/atendimento para a IA falar com: ${v}. Inclua abertura, perguntas, respostas para objeções e fechamento.`); };
    },
    pedidos() {
      feat.innerHTML = `${SPARK}<div class="ft-hero sm">${LOGO.replace('big', 'mid')}<span class="ft-brand">GreenNird</span></div>
        <h1 class="ft-title">Fechar pedidos com IA</h1><p class="ft-sub">A IA atende, tira dúvidas e fecha a venda para você</p>
        <div class="opt-grid">
          <div class="opt"><span class="opt-ic">${SV('<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19Z"/>')}</span><h3>Pedidos pelo WhatsApp</h3><p>A IA responde e anota os pedidos dos clientes.</p><button class="opt-btn" data-k="Pedidos pelo WhatsApp">Conectar WhatsApp</button></div>
          <div class="opt"><span class="opt-ic">${SV('<path d="M4 9h16l-1-4H5Z"/><path d="M5 9v10h14V9M9 19v-5h6v5"/>')}</span><h3>Conectar minha loja</h3><p>Use seus produtos e preços para fechar vendas.</p><button class="opt-btn" data-k="Conectar loja">Ver opções</button></div>
        </div>
        <form class="ft-ask"><input placeholder="Conte o que você vende e como quer atender"><button aria-label="Enviar">${SV('<path d="M21 3 3 10.5l7.5 3L21 3Zm0 0-7.5 18-3-7.5"/>')}</button></form>`;
      feat.querySelectorAll('.opt-btn').forEach(b => b.onclick = soon(b.dataset.k));
      feat.querySelector('.ft-ask').onsubmit = e => { e.preventDefault(); const v = e.target.querySelector('input').value.trim(); if (v) askAI(`Crie um roteiro de atendimento para fechar pedidos pelo WhatsApp. O negócio: ${v}. Inclua saudação, perguntas para entender o pedido, como apresentar preço, formas de pagamento e confirmação do pedido.`); };
    },
    meta() {
      feat.innerHTML = `<div class="meta-head"><span class="meta-bar"></span><div><h1>Campanha Meta Ads</h1><p>Gerencie suas campanhas em um navegador na nuvem.</p></div></div>
        <div class="meta-grid">
          <div class="cloud">
            <div class="cl-top">${SV('<path d="M7 18a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.5 1.5A3.8 3.8 0 0 1 17.5 18Z"/>')}<b>Navegador na nuvem</b><span class="cl-dot"></span><span class="cl-st">Prévia</span><span class="spacer"></span><button class="cl-b" title="Tela cheia">${SV('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button></div>
            <div class="cl-url"><span>←</span><span>→</span><span>⟳</span><div class="cl-addr">🔒 https://adsmanager.facebook.com/adsmanager/manage/campaigns <span class="star">☆</span></div></div>
            <div class="cl-body prev"><div class="meta-prev" role="img" aria-label="Prévia do Gerenciador de Anúncios"></div>
              <div class="prev-tag"><span>Prévia de exemplo</span><button class="opt-btn" id="metaConn">Conectar Meta Ads</button></div></div>
          </div>
          <aside class="meta-ai"><h3>${SV('<path d="M12 3c.4 4.2 3.8 7.6 8 8-4.2.4-7.6 3.8-8 8-.4-4.2-3.8-7.6-8-8 4.2-.4 7.6-3.8 8-8Z" fill="var(--lime)" stroke="none"/>')}Assistente da GreenNird</h3><p class="ma-sub">Tire dúvidas, planeje ajustes ou peça sugestões para sua campanha Meta Ads.</p>
            <div class="ma-log" id="maLog"><span class="lm huge"></span></div>
            <form class="ma-ask"><textarea rows="2" placeholder="Peça à IA para ajudar com sua campanha..."></textarea><button aria-label="Enviar">${SV('<path d="M21 3 3 10.5l7.5 3L21 3Zm0 0-7.5 18-3-7.5"/>')}</button></form>
          </aside>
        </div>`;
      feat.querySelector('#metaConn').onclick = soon('A conexão com o Meta Ads');
      const log = feat.querySelector('#maLog'); const hist = [];
      feat.querySelector('.ma-ask').onsubmit = async e => {
        e.preventDefault(); const ta = e.target.querySelector('textarea'); const q = ta.value.trim(); if (!q) return;
        ta.value = ''; log.querySelector('.lm')?.remove();
        const u = document.createElement('div'); u.className = 'ma-msg me'; u.textContent = q; log.appendChild(u);
        const a = document.createElement('div'); a.className = 'ma-msg ai'; a.innerHTML = '<div class="dots"><span></span><span></span><span></span></div>'; log.appendChild(a);
        log.scrollTop = log.scrollHeight; window.fx && fx.send();
        hist.push({ role: 'user', content: (hist.length ? '' : 'Você é especialista em campanhas de Meta Ads (Facebook e Instagram) para pequenos negócios no Brasil. Responda de forma prática.\n\n') + q });
        try {
          const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist, persona: window.getPersona ? getPersona() : null }) });
          let t = '';
          if (r.status === 402) t = '🔒 ' + (await r.json()).message;
          else { const rd = r.body.getReader(), dc = new TextDecoder(); for (;;) { const { value, done } = await rd.read(); if (done) break; t += dc.decode(value, { stream: true }); a.innerHTML = DOMPurify.sanitize(marked.parse(t)); log.scrollTop = log.scrollHeight; } }
          a.innerHTML = DOMPurify.sanitize(marked.parse(t || '_(sem resposta)_')); hist.push({ role: 'assistant', content: t });
          window.fx && fx.done();
        } catch { a.textContent = '⚠️ Não consegui responder agora.'; }
      };
    },
  };
  function showFeature(key) {
    if (!FEATS[key]) return;
    flip3d(() => {
      view.hidden = true; panel.hidden = true; feat.hidden = false;
      feat.dataset.k = key; FEATS[key](); main.classList.add('in-agenda'); setNav(key);
    });
  }
  window.showFeature = showFeature;

  if (location.hash === '#agendamentos') showAgenda();
})();
