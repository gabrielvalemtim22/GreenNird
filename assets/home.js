// GreenNird — tela inicial no novo tema: barra com +, Mensagem, Modelo (IA/Pro), Enviar mensagem,
// atalhos e cartões "Comece a conversar"
(function () {
  const $ = id => document.getElementById(id);
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    plus: SV('<path d="M12 5v14M5 12h14"/>'),
    msg: SV('<path d="M4 5h16v11H9l-5 4V5Z"/>'),
    img: SV('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'),
    vid: SV('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3Z"/>'),
    spark: SV('<path d="M12 3c.4 4.2 3.8 7.6 8 8-4.2.4-7.6 3.8-8 8-.4-4.2-3.8-7.6-8-8 4.2-.4 7.6-3.8 8-8Z"/>'),
    pen: SV('<path d="m15 4 5 5L9 20H4v-5L15 4Z"/>'),
    doc: SV('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 16.5h4"/>'),
    clip: SV('<path d="M8 12V6a4 4 0 0 1 8 0v10a6 6 0 0 1-12 0V8"/><path d="M12 7v9"/>'),
    search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    mic: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  };
  const CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>';
  const CHECK = '<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>';
  const LM = '<span class="lm sm"></span>';

  // ----- monta a barra nova dentro do composer do chat -----
  const row = composer.querySelector('.row');
  composer.classList.add('v2');
  const think = composer.querySelector('#think');
  const plus = document.createElement('button'); plus.type = 'button'; plus.className = 'c-plus'; plus.title = 'Mais opções'; plus.innerHTML = I.plus;
  const ddType = document.createElement('div'); ddType.className = 'dd'; ddType.dataset.dd = 'tipo';
  const ddModel = document.createElement('div'); ddModel.className = 'dd'; ddModel.dataset.dd = 'modelo';
  const sep = document.createElement('span'); sep.className = 'c-sep';
  row.prepend(plus, ddType, ddModel);
  composer.querySelector('#attach').before(sep);
  const pill = document.createElement('button'); pill.className = 'send-pill'; pill.innerHTML = I.spark + '<span>Enviar mensagem</span>';
  row.appendChild(pill);
  composer.querySelector('#q').placeholder = 'Digite sua mensagem...';

  // modelo: GreenNird IA (rápido) ou GreenNird Pro (pensa mais)
  let model = get('gn-model', 'pro');
  const DD = {
    tipo: { label: 'Tipo', icon: I.msg, value: 'msg', opts: [['msg', 'Mensagem', I.msg], ['img', 'Imagem', I.img], ['vid', 'Vídeo', I.vid, 'Em breve']] },
    modelo: { label: 'Modelo de IA', icon: LM, value: model, opts: [['ia', 'GreenNird IA', LM], ['pro', 'GreenNird Pro', LM]] },
  };
  function applyModel() {
    think.classList.toggle('on', model === 'pro');
    $('heroModel').textContent = model === 'pro' ? 'GreenNird Pro' : 'GreenNird IA';
  }
  function paint(el) {
    const d = DD[el.dataset.dd], cur = d.opts.find(o => o[0] === d.value);
    el.innerHTML = `<button type="button" class="dd-btn">${cur[2]}<span>${cur[1]}</span>${CHEV}</button>`;
    el.querySelector('.dd-btn').onclick = e => { e.stopPropagation(); open(el); };
  }
  function closeAll() { composer.querySelectorAll('.dd.open').forEach(x => { x.classList.remove('open'); x.querySelector('.dd-menu')?.remove(); }); }
  function open(el) {
    const was = el.classList.contains('open'); closeAll(); if (was) return;
    const d = DD[el.dataset.dd]; el.classList.add('open'); window.fx && fx.toggle();
    const m = document.createElement('div'); m.className = 'dd-menu';
    m.innerHTML = `<div class="dd-head">${d.icon}${d.label}</div>` + d.opts.map(([v, l, ic, badge]) =>
      `<button type="button" class="dd-opt ${v === d.value ? 'on' : ''} ${badge ? 'off' : ''}" data-v="${v}">${ic}<span>${l}</span>${badge ? `<em>${badge}</em>` : (v === d.value ? CHECK : '')}</button>`).join('');
    m.querySelectorAll('.dd-opt').forEach(b => b.onclick = e => {
      e.stopPropagation(); closeAll();
      const v = b.dataset.v;
      if (el.dataset.dd === 'tipo') {
        if (v === 'vid') { window.toast && toast('Criar vídeos com IA está chegando! 🎬', { icon: '🎬' }); return; }
        if (v === 'img') { window.showFeature && showFeature('imagens'); return; }
      } else { model = v; set('gn-model', model); applyModel(); window.dispatchEvent(new Event('gn-model')); window.toast && toast(v === 'pro' ? 'GreenNird Pro: respostas mais inteligentes 🧠' : 'GreenNird IA: respostas rápidas ⚡'); }
      d.value = v; paint(el); window.fx && fx.boop();
    });
    el.appendChild(m);
  }
  [ddType, ddModel].forEach(paint);
  window.getModel = () => model;
  window.setModel = v => { model = v; DD.modelo.value = v; set('gn-model', v); applyModel(); paint(ddModel); window.dispatchEvent(new Event('gn-model')); };
  document.addEventListener('click', closeAll);
  applyModel();

  // botão + : anexar, pesquisa na web, voz, criar imagem/vídeo
  plus.onclick = () => {
    const search = composer.querySelector('#search');
    window.gnPopMenu({ currentTarget: plus }, [
      { icon: I.clip, label: 'Anexar arquivo ou PDF', run: () => composer.querySelector('#file').click() },
      { icon: I.search, label: (search.classList.contains('on') ? '✓ ' : '') + 'Pesquisar na web', run: () => { search.click(); window.toast && toast(search.classList.contains('on') ? 'Pesquisa na web ligada 🔎' : 'Pesquisa na web desligada'); } },
      { icon: I.mic, label: 'Escolher voz' + (voice.name ? ' · ' + voice.name.split(/\s|-/)[0] : ''), run: () => openVoices() },
      { icon: I.img, label: 'Criar imagem', run: () => window.showFeature && showFeature('imagens') },
      { icon: I.vid, label: 'Criar vídeo (em breve)', run: () => window.toast && toast('Criar vídeos com IA está chegando! 🎬', { icon: '🎬' }) },
    ]);
  };

  // ----- atalhos embaixo da barra -----
  const QUICK = [[I.msg, 'Tirar uma dúvida', 'Tenho uma dúvida: '], [I.pen, 'Escrever um texto', 'Escreva um texto sobre '], [I.doc, 'Resumir um conteúdo', 'Resuma este conteúdo em tópicos:\n\n']];
  $('quick').innerHTML = QUICK.map(([ic, l], k) => `<button type="button" class="qk" data-k="${k}">${ic}<span>${l}</span></button>`).join('');
  $('quick').querySelectorAll('.qk').forEach(b => b.onclick = () => {
    const q = composer.querySelector('#q'); q.value = QUICK[b.dataset.k][2]; q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    q.dispatchEvent(new Event('input')); window.fx && fx.toggle();
  });

  // ----- cartões "Comece a conversar" -----
  const CARDS = [
    ['conv', 'Conversar', 'Tire dúvidas e obtenha respostas rápidas.', 'Oi! Quero conversar e tirar umas dúvidas. Pode me ajudar?'],
    ['esc', 'Escrever', 'Crie mensagens, e-mails e textos de qualidade.', 'Me ajude a escrever uma mensagem profissional para '],
    ['rev', 'Revisar', 'Corrija, melhore e deixe seu texto mais claro.', 'Revise e melhore este texto, corrigindo erros:\n\n'],
    ['ide', 'Ideias de mensagens', 'Sugestões prontas para diferentes situações.', 'Me dê 5 ideias de mensagens para '],
  ];
  $('start').innerHTML = `<h2>Comece a conversar</h2><div class="st-grid">${CARDS.map(([k, t, d]) => `<button type="button" class="st-card ${k}" data-k="${k}" aria-label="${t}: ${d}"></button>`).join('')}</div>`;
  $('start').querySelectorAll('.st-card').forEach(b => b.onclick = () => {
    const c = CARDS.find(x => x[0] === b.dataset.k); const q = composer.querySelector('#q');
    q.value = c[3]; q.focus(); q.dispatchEvent(new Event('input')); window.fx && fx.boop();
  });
})();
