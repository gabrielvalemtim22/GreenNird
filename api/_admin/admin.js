// GreenNird admin dashboard (dados de demonstração)
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('pt-BR');
const ICONS = {
  users: '<path d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c.5-3.5 3.2-5.5 6.5-5.5s6 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
  money: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'
};
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">${ICONS[k]}</svg>`;

// gerador pseudo-aleatório estável
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
function series(n, start, end, seed) {
  const r = rng(seed); const out = [];
  for (let i = 0; i < n; i++) out.push(start + (end - start) * (i / (n - 1)) + (r() - .5) * (end - start) * .22);
  return out.map(v => Math.max(0, Math.round(v)));
}

const USERS = [
  ['Ana Martins', 'ana.martins@greennird.com', 'Pro', 'Hoje, 14:27', 2418, 348],
  ['Rafael Souza', 'rafael.souza@greennird.com', 'Pro', 'Hoje, 13:51', 1982, 276],
  ['Camila Ferreira', 'camila.ferreira@greennird.com', 'Lite', 'Hoje, 12:03', 748, 92],
  ['Lucas Pereira', 'lucas.pereira@greennird.com', 'Turbo', 'Hoje, 11:38', 3104, 512],
  ['Gabriel Costa', 'gabriel.costa@greennird.com', 'Pro', 'Hoje, 10:57', 2057, 301],
  ['Juliana Alves', 'juliana.alves@greennird.com', 'Lite', 'Ontem, 22:14', 512, 61],
  ['Pedro Lima', 'pedro.lima@greennird.com', 'Turbo', 'Ontem, 19:40', 2876, 455],
  ['Mariana Rocha', 'mariana.rocha@greennird.com', 'Pro', 'Ontem, 17:02', 1630, 219],
  ['Thiago Nunes', 'thiago.nunes@greennird.com', 'Lite', 'Ontem, 09:31', 304, 38],
  ['Beatriz Gomes', 'beatriz.gomes@greennird.com', 'Pro', '2 dias atrás', 1201, 167],
  ['Felipe Ribeiro', 'felipe.ribeiro@greennird.com', 'Turbo', '3 dias atrás', 3390, 590],
  ['Larissa Dias', 'larissa.dias@greennird.com', 'Lite', '4 dias atrás', 220, 27]
];
const MODELS = [
  ['GreenNird Pro', 52.3, '#9fd800'], ['GreenNird Lite', 28.1, '#c8f03c'],
  ['GreenNird Turbo', 14.2, '#e2fb8a'], ['Outros', 5.4, '#f1fdc5']
];
const RANGES = {
  7:  { users: 3120, uP: 6.2, conv: 69840, cP: 8.4, rev: 18240, rP: 9.1, tok: 4.4, tP: 7.7, days: 7, total: 4410 },
  30: { users: 12840, uP: 18.4, conv: 287419, cP: 26.7, rev: 74920, rP: 32.1, tok: 18.6, tP: 29.3, days: 30, total: 17930 },
  90: { users: 31270, uP: 41.0, conv: 812330, cP: 58.2, rev: 201500, rP: 63.4, tok: 52.9, tP: 55.0, days: 90, total: 50210 }
};

function sparkSvg(seed) {
  const s = series(14, 10, 40, seed), max = Math.max(...s);
  const pts = s.map((v, i) => [i * (120 / 13), 48 - v / max * 40]);
  const d = 'M' + pts.map(p => p.join(',')).join(' L');
  return `<svg class="spark-sm" viewBox="0 0 120 50" preserveAspectRatio="none"><defs><linearGradient id="sg${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4ff00" stop-opacity=".55"/><stop offset="1" stop-color="#d4ff00" stop-opacity="0"/></linearGradient></defs><path d="${d} L120,50 L0,50Z" fill="url(#sg${seed})"/><path d="${d}" fill="none" stroke="#a6e000" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>`;
}
function kpi(ic, label, val, pct, seed) {
  return `<div class="card kpi"><div class="ic">${icon(ic)}</div><div><div class="lbl">${label}</div><div class="val">${val}</div><span class="up">↗ +${pct.toLocaleString('pt-BR')}%</span><div class="vs">vs. período anterior</div></div>${sparkSvg(seed)}</div>`;
}

function lineChart(el, data, labels) {
  const W = el.clientWidth || 600, H = el.clientHeight || 230, L = 46, B = 26, T = 10, R = 14;
  const max = Math.ceil(Math.max(...data) / 4000) * 4000 || 4000;
  const x = i => L + i * (W - L - R) / (data.length - 1);
  const y = v => T + (H - T - B) * (1 - v / max);
  let g = '';
  for (let k = 0; k <= 5; k++) {
    const v = max / 5 * k, yy = y(v);
    g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="#eef0e8"/><text x="${L - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#666">${fmt(Math.round(v))}</text>`;
  }
  const step = Math.max(1, Math.ceil(data.length / 8));
  labels.forEach((lb, i) => { if (i % step === 0) g += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#666">${lb}</text>`; });
  const pts = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const d = 'M' + pts.join(' L');
  const last = data.length - 1;
  el.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.innerHTML = `<defs><linearGradient id="lg${el.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4ff00" stop-opacity=".6"/><stop offset="1" stop-color="#d4ff00" stop-opacity="0"/></linearGradient></defs>${g}
    <path d="${d} L${x(last)},${y(0)} L${x(0)},${y(0)}Z" fill="url(#lg${el.id})"/>
    <path d="${d}" fill="none" stroke="#9fd800" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="${x(last)}" cy="${y(data[last])}" r="6" fill="#fff" stroke="#9fd800" stroke-width="3"/>`;
}

function donut() {
  // anel 3D: várias camadas escuras empilhadas + a camada de cima colorida
  const r = 62, c = 2 * Math.PI * r;
  const ring = (dark) => {
    let off = 0, out = '';
    MODELS.forEach(([, p, col]) => {
      const len = c * p / 100;
      out += `<circle cx="85" cy="85" r="${r}" fill="none" stroke="${dark ? shade(col) : col}" stroke-width="30" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 85 85)"/>`;
      off += len;
    });
    return out;
  };
  let html = '';
  for (let k = 14; k >= 1; k--) html += `<svg width="170" height="170" viewBox="0 0 170 170" style="transform:translateZ(${-k * 1.6}px)">${ring(true)}</svg>`;
  html += `<svg width="170" height="170" viewBox="0 0 170 170" style="transform:translateZ(1px)">${ring(false)}</svg>`;
  $('donut').innerHTML = html;
  $('donutVal').textContent = String(cur.tok).replace('.', ',') + ' M';
  $('legend').innerHTML = MODELS.map(([n, p, col]) => `<div><i style="background:${col};box-shadow:0 3px 0 ${shade(col)}"></i><span>${n}</span><span>${p.toLocaleString('pt-BR')}%</span></div>`).join('');
}
function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.round(v * .68).toString(16).padStart(2, '0');
  return '#' + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
}

// inclinação 3D dos cards seguindo o mouse
document.addEventListener('mousemove', e => {
  const card = e.target.closest && e.target.closest('.card');
  document.querySelectorAll('.card.tilt').forEach(c => { if (c !== card) { c.classList.remove('tilt'); c.style.transform = ''; } });
  if (!card) return;
  const b = card.getBoundingClientRect();
  const x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5;
  card.classList.add('tilt');
  card.style.transform = `rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateZ(6px)`;
});

function userRows(list) {
  return '<tr><th>Usuário</th><th>E-mail</th><th>Plano</th><th>Último acesso</th><th>Conversas</th><th>Uso da IA</th><th></th></tr>' +
    list.map(([n, e, p, a, c, t]) => `<tr><td><span class="ini">${n.split(' ').map(w => w[0]).join('')}</span><b>${n}</b></td><td>${e}</td><td><span class="plan ${p}">${p}</span></td><td>${a}</td><td>${fmt(c)}</td><td>${t} mil tokens</td><td class="more" title="Ações">···</td></tr>`).join('');
}

let cur = RANGES[30];
function renderAll() {
  $('kpis').innerHTML =
    kpi('users', 'Usuários', fmt(cur.users), cur.uP, 3) +
    kpi('chat', 'Conversas', fmt(cur.conv), cur.cP, 7) +
    kpi('money', 'Receita', 'R$ ' + cur.rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cur.rP, 11) +
    kpi('chip', 'Uso da IA', `${String(cur.tok).replace('.', ',')} M <small>tokens</small>`, cur.tP, 17);
  const data = series(cur.days, cur.total * .3, cur.total, cur.days + 5);
  const now = new Date();
  const labels = data.map((_, i) => { const d = new Date(now); d.setDate(d.getDate() - (data.length - 1 - i)); return d.getDate() + ' ' + d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''); });
  $('convBadge').textContent = fmt(cur.total) + ' conversas';
  $('convPct').textContent = `+${cur.cP.toLocaleString('pt-BR')}% no período`;
  document.querySelectorAll('.rangeTxt').forEach(e => e.textContent = `últimos ${cur.days} dias`);
  lineChart($('lineChart'), data, labels);
  if ($('v-convs').classList.contains('on')) lineChart($('lineChart2'), data, labels);
  donut();
  $('recent').innerHTML = userRows(USERS.slice(0, 5));
  $('convKpis').innerHTML = kpi('chat', 'Conversas', fmt(cur.conv), cur.cP, 7) + kpi('chat', 'Média por usuário', fmt(Math.round(cur.conv / cur.users)), 6.1, 23) + kpi('chip', 'Tokens por conversa', fmt(Math.round(cur.tok * 1e6 / cur.conv)), 2.4, 29) + kpi('users', 'Usuários ativos', fmt(Math.round(cur.users * .62)), cur.uP, 31);
  $('subKpis').innerHTML = kpi('money', 'Receita', 'R$ ' + cur.rev.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), cur.rP, 11) + kpi('users', 'Assinantes Pro', fmt(Math.round(cur.users * .21)), 14.2, 37) + kpi('users', 'Assinantes Turbo', fmt(Math.round(cur.users * .07)), 22.5, 41) + kpi('users', 'Plano Lite', fmt(Math.round(cur.users * .72)), 9.8, 43);
}

$('modelsTbl').innerHTML = '<tr><th>Modelo</th><th>Status</th><th>Participação</th><th>Tokens no período</th></tr>' +
  MODELS.map(([n, p, col]) => `<tr><td><span class="ini" style="background:${col}">AI</span><b>${n}</b></td><td><span class="plan">Ativo</span></td><td>${p.toLocaleString('pt-BR')}%</td><td>${(18.6 * p / 100).toFixed(1).replace('.', ',')} M</td></tr>`).join('');
$('plansTbl').innerHTML = '<tr><th>Plano</th><th>Preço</th><th>Limite</th><th>Recursos</th></tr>' +
  [['Lite', 'Grátis', '50 msgs/dia', 'Chat, pesquisa'], ['Pro', 'R$ 69,99/mês', 'Ilimitado', 'Pensar, anexos, WhatsApp'], ['Turbo', 'R$ 149,99/mês', 'Ilimitado + prioridade', 'Meta Ads, posts FB/Instagram'], ['Empresa', 'R$ 299,99/mês', 'Vários números', 'Suporte dedicado, relatórios']]
    .map(([n, p, l, r]) => `<tr><td><span class="plan ${n}">${n}</span></td><td>${p}</td><td>${l}</td><td>${r}</td></tr>`).join('');
const allUsers = q => { $('allUsers').innerHTML = userRows(USERS.filter(u => (u[0] + u[1]).toLowerCase().includes(q))); };
$('userSearch').oninput = e => allUsers(e.target.value.toLowerCase());
allUsers('');

// navegação
const TITLES = { overview: 'Painel administrativo', users: 'Usuários', convs: 'Conversas', models: 'Modelos de IA', subs: 'Assinaturas', plugins: 'Plugins', settings: 'Configurações' };
function go(v) {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  $('vtitle').textContent = TITLES[v];
  $('side').classList.remove('open');
  renderAll();
  try { history.replaceState(null, '', '#' + v); } catch {}
}
document.querySelectorAll('#nav a').forEach(a => a.onclick = () => go(a.dataset.v));
document.querySelectorAll('[data-go]').forEach(a => a.onclick = e => { e.preventDefault(); go(a.dataset.go); });
$('menu').onclick = () => $('side').classList.toggle('open');
$('range').onchange = e => { cur = RANGES[e.target.value]; renderAll(); };
$('settingsForm').onsubmit = e => {
  e.preventDefault();
  try { localStorage.setItem('gn-settings', JSON.stringify(Object.fromEntries(new FormData(e.target)))); } catch {}
  $('saved').textContent = 'Configurações salvas ✓';
};
addEventListener('resize', () => renderAll());
go(TITLES[location.hash.slice(1)] ? location.hash.slice(1) : 'overview');

// ---- Plugins ----
const PICONS = { whatsapp: '💬', grok: '🧠', voice: '🎙️', 'meta-ads': '📣', instagram: '📸', images: '🎨' };
const PSTATUS = { on: 'Conectado', setup: 'Configurar', soon: 'Em breve' };
async function loadPlugins() {
  const box = document.getElementById('pluginList');
  try {
    const r = await fetch('/api/plugins', { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Erro');
    box.innerHTML = '';
    j.plugins.forEach(p => {
      const el = document.createElement('div'); el.className = 'plugin';
      el.innerHTML = `<div class="ph"><span class="pi">${PICONS[p.id] || '🔌'}</span><span class="pn"></span><span class="pst ${p.status}">${PSTATUS[p.status]}</span></div>`;
      el.querySelector('.pn').textContent = p.name;
      if (p.vars) {
        const v = document.createElement('div'); v.className = 'pvars';
        v.innerHTML = p.vars.map(x => `<div>${x.ok ? '✅' : '⬜'} <code>${x.name}</code></div>`).join('');
        el.appendChild(v);
      }
      if (p.webhook) {
        const h = document.createElement('div'); h.className = 'hook';
        h.innerHTML = '<span></span><button type="button">Copiar</button>';
        h.querySelector('span').textContent = p.webhook;
        h.querySelector('button').onclick = e => { navigator.clipboard.writeText(p.webhook); e.target.textContent = 'Copiado ✓'; };
        el.appendChild(h);
      }
      if (p.status === 'soon') { const s = document.createElement('div'); s.className = 'sub'; s.textContent = 'Chega em uma próxima versão.'; el.appendChild(s); }
      box.appendChild(el);
    });
  } catch (e) { box.innerHTML = '<div class="sub" style="margin-top:14px"></div>'; box.firstChild.textContent = 'Não foi possível carregar: ' + e.message; }
}
document.querySelector('#nav a[data-v="plugins"]').addEventListener('click', loadPlugins);
if (location.hash === '#plugins') loadPlugins();
