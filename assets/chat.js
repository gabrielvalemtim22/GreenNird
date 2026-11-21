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
q.addEventListener('input', () => { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 220) + 'px'; });
q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); composer.requestSubmit(); } });
composer.querySelector('#attach').onclick = () => composer.querySelector('#file').click();
composer.querySelector('#file').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 200000) { alert('Arquivo muito grande (máx. 200 KB).'); return; }
  const text = await f.text();
  q.value = (q.value ? q.value + '\n\n' : '') + `Arquivo "${f.name}":\n\`\`\`\n${text}\n\`\`\``;
  q.dispatchEvent(new Event('input')); e.target.value = '';
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
  if (m.role === 'user') { d.className = 'msg user'; d.textContent = m.content; }
  else {
    d.className = 'msg ai';
    d.innerHTML = '<img src="/assets/logo.svg" alt=""><div class="body"></div>';
    d.querySelector('.body').innerHTML = m.content ? md(m.content) : '<div class="dots"><span></span><span></span><span></span></div>';
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
  const text = (textArg ?? q.value).trim();
  if (!text || busy) return;
  busy = true; composer.querySelector('#sendBtn').disabled = true;
  if (!current) {
    current = { id: crypto.randomUUID(), title: text.slice(0, 48), messages: [], updated: Date.now() };
    chats.push(current);
  }
  current.messages.push({ role: 'user', content: text });
  const ai = { role: 'assistant', content: '' };
  current.messages.push(ai);
  current.updated = Date.now();
  q.value = ''; q.style.height = 'auto';
  render(); scrollEnd();
  const body = $('thread').lastElementChild.querySelector('.body');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: current.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        think: think.classList.contains('on'),
        search: search.classList.contains('on')
      })
    });
    if (!res.ok || !res.body) {
      const plain = (res.headers.get('content-type') || '').includes('text/plain');
      throw new Error((plain && await res.text()) || 'O servidor de IA não respondeu (erro ' + res.status + '). Ele só funciona depois do deploy na Vercel.');
    }
    const reader = res.body.getReader(); const dec = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      ai.content += dec.decode(value, { stream: true });
      body.innerHTML = md(ai.content); scrollEnd();
    }
    if (!ai.content) ai.content = '_(sem resposta)_';
  } catch (err) {
    ai.content = '⚠️ ' + (err.message || 'Falha ao conectar com a IA.');
    body.innerHTML = '<p class="err"></p>'; body.firstChild.textContent = ai.content;
  }
  body.innerHTML = md(ai.content);
  store.set(chats); renderList();
  busy = false; composer.querySelector('#sendBtn').disabled = false; q.focus();
}

$('new').onclick = () => { if (busy) return; current = null; render(); q.focus(); closeOnMobile(); };
$('toggle').onclick = () => $('side').classList.add('closed');
$('open').onclick = () => $('side').classList.remove('closed');
$('findBtn').onclick = () => { const t = prompt('Buscar conversas:', filter); if (t !== null) { filter = t.toLowerCase(); renderList(); } };
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
