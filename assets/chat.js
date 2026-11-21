// GreenNird chat client
const $ = id => document.getElementById(id);
const store = {
  get() { try { return JSON.parse(localStorage.getItem('gn-chats') || '[]'); } catch { return []; } },
  set(v) { try { localStorage.setItem('gn-chats', JSON.stringify(v)); } catch {} }
};
let chats = store.get();
let current = null;
let busy = false;
let filter = '';

// composer: one instance, moved between hero and dock
const composer = $('composerTpl').content.firstElementChild.cloneNode(true);
const q = composer.querySelector('#q');
const think = composer.querySelector('#think');
const search = composer.querySelector('#search');
think.onclick = () => think.classList.toggle('on');
search.onclick = () => search.classList.toggle('on');
try { if (localStorage.getItem('gn-search-default') === 'false') search.classList.remove('on'); } catch {}
q.addEventListener('input', () => { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 220) + 'px'; });
q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); composer.requestSubmit(); } });
composer.querySelector('#attach').onclick = () => composer.querySelector('#file').click();
let attachments = [];
const MAX_CHARS = 60000;
async function readPdf(file) {
  const pdfjs = window.pdfjsLib;
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let out = '';
  for (let p = 1; p <= doc.numPages && out.length < MAX_CHARS; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    out += `\n[Página ${p}]\n` + tc.items.map(t => t.str).join(' ');
  }
  return out;
}
function renderChips() {
  const box = composer.querySelector('#chips');
  box.innerHTML = '';
  attachments.forEach((a, k) => {
    const c = document.createElement('span'); c.className = 'fchip';
    c.innerHTML = '<b>📄</b><span></span><button type="button" title="Remover">×</button>';
    c.querySelector('span').textContent = a.name + (a.loading ? ' · lendo…' : '');
    c.querySelector('button').onclick = () => { attachments.splice(k, 1); renderChips(); };
    box.appendChild(c);
  });
}
composer.querySelector('#file').onchange = async e => {
  for (const f of [...e.target.files]) {
    if (f.size > 15 * 1024 * 1024) { window.fx && fx.error(); alert(`"${f.name}" é muito grande (máx. 15 MB).`); continue; }
    const a = { name: f.name, text: '', loading: true };
    attachments.push(a); renderChips();
    try {
      a.text = /\.pdf$/i.test(f.name) || f.type === 'application/pdf' ? await readPdf(f) : await f.text();
      a.text = a.text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').slice(0, MAX_CHARS);
      if (!a.text.trim()) a.text = '(não foi possível extrair texto deste arquivo — pode ser imagem escaneada)';
    } catch { a.text = '(erro ao ler o arquivo)'; }
    a.loading = false; renderChips(); window.fx && fx.toggle();
  }
  e.target.value = '';
};
composer.onsubmit = e => { e.preventDefault(); send(); };

function render() {
  const empty = !current || current.messages.length === 0;
  $('main').classList.toggle('empty', empty);
  (empty ? $('heroSlot') : $('dockSlot')).appendChild(composer);
  const th = $('thread'); th.innerHTML = '';
  if (current) current.messages.forEach(m => th.appendChild(bubble(m)));
  renderList();
}
function md(text) { return DOMPurify.sanitize(marked.parse(text || '')); }
function bubble(m) {
  const d = document.createElement('div');
  if (m.role === 'user') {
    d.className = 'msg user'; d.textContent = m.display ?? m.content;
    (m.files || []).forEach(n => { const c = document.createElement('div'); c.className = 'ufile'; c.textContent = '📄 ' + n; d.appendChild(c); });
  }
  else {
    d.className = 'msg ai';
    d.innerHTML = '<img src="/assets/logo.svg" alt=""><div class="body"></div>';
    d.querySelector('.body').innerHTML = m.content ? md(m.content) : '<div class="dots"><span></span><span></span><span></span></div>';
    if (m.content && !m.blocked) addActs(d, m);
  }
  return d;
}
function groupOf(ts) {
  const days = (Date.now() - ts) / 864e5;
  return days < 1 ? 'Hoje' : days < 7 ? '7 dias' : days < 30 ? '30 dias' : 'Mais antigas';
}
function renderList() {
  const list = $('list'); list.innerHTML = '';
  let last = '';
  chats.filter(c => c.title.toLowerCase().includes(filter)).sort((a, b) => b.updated - a.updated).forEach(c => {
    const g = groupOf(c.updated);
    if (g !== last) { const h = document.createElement('div'); h.className = 'group'; h.textContent = g; list.appendChild(h); last = g; }
    const it = document.createElement('div');
    it.className = 'item' + (current && c.id === current.id ? ' on' : '');
    it.innerHTML = '<span></span><button class="del" title="Excluir">×</button>';
    it.querySelector('span').textContent = c.title;
    it.onclick = () => { if (busy) return; current = c; render(); scrollEnd(); closeOnMobile(); };
    it.querySelector('.del').onclick = ev => {
      ev.stopPropagation();
      if (!confirm('Excluir esta conversa?')) return;
      chats = chats.filter(x => x.id !== c.id); store.set(chats);
      if (current && current.id === c.id) current = null;
      render();
    };
    list.appendChild(it);
  });
  if (!list.children.length) list.innerHTML = '<div class="group">Nenhuma conversa ainda</div>';
}
function scrollEnd() { const s = $('scroll'); s.scrollTop = s.scrollHeight; }
function closeOnMobile() { if (innerWidth < 860) $('side').classList.add('closed'); }

async function send(textArg) {
  let text = (textArg ?? q.value).trim();
  if ((!text && !attachments.length) || busy || attachments.some(a => a.loading)) return;
  const display = text || 'Analise o arquivo.';
  const files = attachments.map(a => a.name);
  if (attachments.length) {
    text = display + '\n\n' + attachments.map(a => `=== Arquivo: ${a.name} ===\n${a.text}`).join('\n\n');
    attachments = []; renderChips();
  }
  window.fx && (fx.send(), fx.burst(composer.querySelector('#sendBtn')));
  busy = true; composer.querySelector('#sendBtn').disabled = true;
  if (!current) {
    current = { id: crypto.randomUUID(), title: display.slice(0, 48), messages: [], updated: Date.now() };
    chats.push(current);
  }
  current.messages.push({ role: 'user', content: text, display, files });
  const ai = { role: 'assistant', content: '' };
  current.messages.push(ai);
  current.updated = Date.now();
  q.value = ''; q.style.height = 'auto';
  render(); scrollEnd();
  const body = $('thread').lastElementChild.querySelector('.body');
  const slow = setTimeout(() => { if (!ai.content) body.insertAdjacentHTML('beforeend', '<div class="sub" style="color:var(--muted);font-size:13px;margin-top:6px">GreenNird está pensando… 💭</div>'); }, 5000);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: current.messages.slice(0, -1).filter((m, i, arr) => !m.blocked && !(arr[i + 1] && arr[i + 1].blocked)).map(m => ({ role: m.role, content: m.content })),
        think: think.classList.contains('on'),
        search: search.classList.contains('on'),
        persona: window.getPersona ? getPersona() : null
      })
    });
    if (res.status === 402) {
      const info = await res.json().catch(() => ({}));
      ai.content = '';
      ai.blocked = info.message || 'Limite do plano grátis atingido.';
      setRemaining(info.remaining ?? 0);
      throw Object.assign(new Error(ai.blocked), { blocked: true });
    }
    if (res.headers.get('X-GN-Remaining') !== null) setRemaining(Number(res.headers.get('X-GN-Remaining')));
    if (!res.ok || !res.body) {
      const plain = (res.headers.get('content-type') || '').includes('text/plain');
      throw new Error((plain && await res.text()) || 'O servidor de IA não respondeu (erro ' + res.status + '). Ele só funciona depois do deploy na Vercel.');
    }
    const reader = res.body.getReader(); const dec = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      if (!ai.content && window.fx) fx.first();
      ai.content += dec.decode(value, { stream: true });
      body.innerHTML = md(ai.content) + '<span class="caret"></span>'; scrollEnd();
      window.fx && fx.typing();
    }
    if (!ai.content) ai.content = '_(sem resposta)_';
    window.fx && fx.done();
    const aiEl = body.closest('.msg');
    addActs(aiEl, ai);
    if (voice.autoRead && voice.id && !window.inVoiceMode) speak(ai.content, aiEl.querySelector('.listen'));
    maybeAskSignup();
  } catch (err) {
    window.fx && fx.error();
    maybeAskSignup();
    clearTimeout(slow);
    if (err.blocked) {
      ai.content = '🔒 **' + err.message + '**\n\n[Ver planos e assinar](/conta#planos)';
      // tira a pergunta bloqueada do histórico enviado à IA nas próximas vezes
      current.messages[current.messages.length - 1].blocked = true; current.messages[current.messages.length - 1].content = ai.content;
      body.innerHTML = md(ai.content); store.set(chats); renderList();
      busy = false; composer.querySelector('#sendBtn').disabled = false;
      return;
    }
    ai.content = '⚠️ ' + (err.message || 'Falha ao conectar com a IA.');
    body.innerHTML = '<p class="err"></p>'; body.firstChild.textContent = ai.content;
  }
  clearTimeout(slow);
  body.innerHTML = md(ai.content);
  store.set(chats); renderList();
  busy = false; composer.querySelector('#sendBtn').disabled = false; q.focus();
}

$('new').onclick = () => { if (busy) return; current = null; render(); q.focus(); closeOnMobile(); };
$('toggle').onclick = () => $('side').classList.add('closed');
$('open').onclick = () => $('side').classList.remove('closed');

if (innerWidth < 860) $('side').classList.add('closed');

render(); q.focus();

// prompt vindo da landing page (?q=...)
const params = new URLSearchParams(location.search);
if (params.get('q')) {
  think.classList.toggle('on', params.get('think') === '1');
  search.classList.toggle('on', params.get('search') === '1');
  history.replaceState(null, '', '/chat');
  send(params.get('q'));
}

// conta do usuário no rodapé da barra lateral
let account = null;
fetch('/api/account').then(r => r.ok ? r.json() : null).then(a => {
  account = a;
  if (!a || !a.loggedIn) return;
  $('acctName').textContent = 'Conta ' + a.id.slice(-4);
  $('acctPlan').textContent = a.plan;
}).catch(() => {});

// contador de mensagens grátis do dia
function setRemaining(n) {
  const hint = document.querySelector('.hint');
  if (!hint || isNaN(n)) return;
  hint.innerHTML = n > 0
    ? `Plano grátis: <b>${n}</b> ${n === 1 ? 'mensagem restante' : 'mensagens restantes'} hoje · <a href="/conta#planos" style="text-decoration:underline">Assinar</a>`
    : 'Suas mensagens grátis de hoje acabaram · renovam amanhã · <a href="/conta#planos" style="text-decoration:underline">Assinar agora</a>';
}

// ---- criar conta em 1 clique dentro do chat ----
function maybeAskSignup() {
  if (!account || account.loggedIn) return;
  try { if (sessionStorage.getItem('gn-signup-dismiss')) return; } catch {}
  setTimeout(() => openSignup(), 900);
}
function openSignup() {
  const m = $('signup'); m.hidden = false; m.querySelector('.step1').hidden = false; m.querySelector('.step2').hidden = true;
}
$('signupClose').onclick = $('signupLater').onclick = () => {
  $('signup').hidden = true; try { sessionStorage.setItem('gn-signup-dismiss', '1'); } catch {}
};
$('signupCreate').onclick = async () => {
  const btn = $('signupCreate'); btn.disabled = true; btn.textContent = 'Criando…';
  try {
    const r = await fetch('/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create' }) });
    const a = await r.json();
    if (!r.ok) throw new Error(a.error || 'Erro');
    account = a;
    $('signupCode').textContent = a.id;
    $('signup').querySelector('.step1').hidden = true; $('signup').querySelector('.step2').hidden = false;
    $('acctName').textContent = 'Conta ' + a.id.slice(-4); $('acctPlan').textContent = a.plan;
      window.fx && (fx.win(), fx.burst($('signupCode'), 40));
  } catch (x) { alert(x.message); window.fx && fx.error(); }
  btn.disabled = false; btn.textContent = 'Criar minha conta grátis';
};
$('signupCopy').onclick = () => {
  navigator.clipboard.writeText($('signupCode').textContent.replace(/\s/g, ''));
  $('signupCopy').textContent = 'Copiado ✓'; window.fx && fx.done();
};
$('signupDone').onclick = () => { $('signup').hidden = true; };
$('soundBtn').onclick = () => { const on = window.fx && fx.toggleSound(); $('soundBtn').style.opacity = on ? 1 : .4; };
if (window.fx && !fx.enabled) $('soundBtn').style.opacity = .4;

// ---- voz com ElevenLabs ----
const voice = { id: null, name: null, autoRead: false, list: null };
try { Object.assign(voice, JSON.parse(localStorage.getItem('gn-voice') || '{}')); } catch {}
if (voice.id && !voice.br) { voice.id = null; voice.name = null; } // vozes antigas (americanas) saem
const saveVoice = () => { try { localStorage.setItem('gn-voice', JSON.stringify({ id: voice.id, name: voice.name, owner: voice.owner || null, br: true, autoRead: voice.autoRead })); } catch {} };
const voiceChip = composer.querySelector('#voiceChip');
function showVoiceName() {
  const short = voice.name ? voice.name.split(/\s|-/)[0] : null;
  composer.querySelector('#voiceName').textContent = short || 'Voz';
  const vp = document.getElementById('vpickName'); if (vp) vp.textContent = short || 'escolher';
  voiceChip.classList.toggle('on', !!voice.id);
}
showVoiceName();
$('autoRead').checked = !!voice.autoRead;
$('autoRead').onchange = e => { voice.autoRead = e.target.checked; saveVoice(); };

let audio = null, audioBtn = null;
function stopAudio() {
  window.fx && fx.stopBrowserSpeak();
  if (audio) { audio.pause(); audio = null; }
  if (audioBtn) { audioBtn.classList.remove('playing'); audioBtn.innerHTML = '🔊 Ouvir'; audioBtn = null; }
}
async function speak(text, btn) {
  if (!voice.id) { openVoices(); return; }
  if (btn && btn === audioBtn) { stopAudio(); return; }
  stopAudio();
  audioBtn = btn || null;
  if (btn) { btn.classList.add('playing'); btn.innerHTML = '⏳ Gerando voz…'; }
  try {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: voice.id, owner: voice.owner || '' }) });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      if (btn) btn.innerHTML = '⏸ Parar (voz do navegador)';
      const ok = window.fx && await fx.browserSpeak(text);
      if (!ok) throw new Error(j.error || 'Erro na voz');
      stopAudio(); return;
    }
    const url = URL.createObjectURL(await r.blob());
    if (audioBtn !== (btn || null)) return; // usuário trocou no meio
    audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); stopAudio(); };
    if (btn) btn.innerHTML = '⏸ Parar';
    await audio.play();
  } catch (e) {
    stopAudio(); window.fx && fx.error();
    alert(e.message);
  }
}
function addActs(el, m) {
  if (!el || el.querySelector('.acts')) return;
  const acts = document.createElement('div'); acts.className = 'acts';
  acts.innerHTML = '<button type="button" class="listen">🔊 Ouvir</button><button type="button" class="copy">📋 Copiar</button>';
  acts.querySelector('.listen').onclick = e => speak(m.content, e.currentTarget);
  acts.querySelector('.copy').onclick = e => { navigator.clipboard.writeText(m.content); e.currentTarget.textContent = '✓ Copiado'; };
  el.querySelector('.body').after(acts);
}

async function openVoices() {
  $('vpanel').hidden = false;
  if (voice.list) return renderVoices();
  try {
    const r = await fetch('/api/voices'); const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Erro');
    voice.list = j.voices; renderVoices();
  } catch (e) { $('vlist').innerHTML = '<div class="vmsg"></div>'; $('vlist').firstChild.textContent = e.message; }
}
let preview = null;
function renderVoices() {
  const list = $('vlist'); list.innerHTML = '';
  if (!voice.list.length) { list.innerHTML = '<div class="vmsg">Nenhuma voz na conta ElevenLabs.</div>'; return; }
  voice.list.forEach(v => {
    const it = document.createElement('div');
    it.className = 'vitem' + (v.id === voice.id ? ' on' : '');
    it.innerHTML = '<div><div class="vn"></div><div class="vt"></div></div><button type="button" class="vplay" title="Ouvir amostra">▶</button>';
    it.querySelector('.vn').textContent = v.name; it.querySelector('.vt').textContent = v.tags || '';
    it.onclick = () => {
      voice.id = v.id; voice.name = v.name; voice.owner = v.owner; saveVoice(); showVoiceName(); renderVoices();
      window.fx && fx.done();
      if (v.preview) { if (preview) preview.pause(); preview = new Audio(v.preview); preview.play().catch(() => {}); }
    };
    const pb = it.querySelector('.vplay');
    if (!v.preview) pb.hidden = true;
    pb.onclick = ev => {
      ev.stopPropagation();
      if (preview) preview.pause();
      preview = new Audio(v.preview); preview.play();
    };
    list.appendChild(it);
  });
}
voiceChip.onclick = () => { $('vpanel').hidden ? openVoices() : ($('vpanel').hidden = true); };
$('vclose').onclick = () => { $('vpanel').hidden = true; if (preview) preview.pause(); };

composer.querySelector('#voiceMode').onclick = () => { window.inVoiceMode = true; window.openVoiceMode && openVoiceMode(); };

// abrir direto no modo voz (link da página inicial: /chat?voz=1)
if (new URLSearchParams(location.search).get('voz') === '1') {
  history.replaceState(null, '', '/chat');
  window.inVoiceMode = true;
  window.pendingVoice = true; // voice.js abre quando carregar
}
