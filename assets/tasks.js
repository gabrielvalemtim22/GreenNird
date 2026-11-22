// GreenNird — tarefas agendadas. Roda enquanto o site estiver aberto (em qualquer página que carregue este arquivo).
(function () {
  const KEY = 'gn-tasks';
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const set = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  // próxima execução a partir de agora
  function nextRun(t, from = Date.now()) {
    const [h, m] = (t.time || '09:00').split(':').map(Number);
    if (t.freq === 'once') { const d = new Date(t.date + 'T' + t.time); return d.getTime(); }
    for (let add = 0; add < 8; add++) {
      const d = new Date(from); d.setDate(d.getDate() + add); d.setHours(h, m, 0, 0);
      const dow = d.getDay();
      const ok = t.freq === 'daily' || (t.freq === 'weekdays' && dow >= 1 && dow <= 5) || (t.freq === 'weekly' && (t.days || []).includes(dow));
      if (ok && d.getTime() > from) return d.getTime();
    }
    return from + 864e5;
  }
  function describe(t) {
    if (t.freq === 'once') return new Date(t.date + 'T' + t.time).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    if (t.freq === 'daily') return 'Todos os dias, ' + t.time;
    if (t.freq === 'weekdays') return 'Seg–Sex, ' + t.time;
    return (t.days || []).map(d => DAYS[d]).join(', ') + ', ' + t.time;
  }

  async function run(t, manual) {
    let result = '';
    if (t.kind === 'reminder') result = '🔔 ' + t.title;
    else {
      try {
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: `Tarefa agendada "${t.title}". ${t.prompt}\nResponda de forma curta e prática, em português.` }], search: true }) });
        if (r.status === 402) { const j = await r.json(); result = '⚠️ ' + j.message; }
        else result = (await r.text()).trim();
      } catch { result = '⚠️ Não consegui executar agora (sem internet?).'; }
    }
    const all = get(); const x = all.find(y => y.id === t.id); if (!x) return;
    x.results = [{ at: Date.now(), text: result }, ...(x.results || [])].slice(0, 10);
    x.lastRun = Date.now();
    try { const lg = JSON.parse(localStorage.getItem('gn-usage-log') || '{}'); const k = new Date().toISOString().slice(0, 10); lg[k] = lg[k] || { you: 0, tasks: 0 }; lg[k].tasks++; localStorage.setItem('gn-usage-log', JSON.stringify(lg)); } catch {}
    if (x.freq === 'once' && !manual) x.status = 'done';
    else x.next = nextRun(x);
    set(all);
    notify(x.title, result.replace(/[*#_`>]/g, '').slice(0, 180));
    window.dispatchEvent(new Event('gn-tasks'));
  }
  function notify(title, body) {
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('GreenNird · ' + title, { body, icon: '/assets/logo.svg' }); } catch {}
    window.toast && toast(title + ' — tarefa executada', { icon: '🗓', ms: 6000 });
    window.fx && fx.done();
  }

  // verifica a cada 30 s
  let running = false;
  async function tick() {
    if (running) return; running = true;
    const now = Date.now();
    for (const t of get()) {
      if (t.status !== 'active') continue;
      if (!t.next) { const all = get(); const x = all.find(y => y.id === t.id); x.next = nextRun(x); set(all); continue; }
      if (t.next <= now && now - t.next < 6 * 3600e3) await run(t);
      else if (t.next <= now) { const all = get(); const x = all.find(y => y.id === t.id); x.next = nextRun(x); set(all); } // passou muito tempo fechado: pula
    }
    running = false;
  }
  setInterval(tick, 30000); setTimeout(tick, 2000);

  window.GNTasks = { get, set, nextRun, describe, run, DAYS };
})();
