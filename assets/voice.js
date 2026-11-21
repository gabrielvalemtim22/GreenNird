// GreenNird — modo voz: bola verde animada + microfone + resposta falada (ElevenLabs)
(function () {
  const $ = id => document.getElementById(id);
  const ov = $('vmode'), cv = $('blob'), st = $('vstatus'), tr = $('vtranscript');
  const ctx2d = cv.getContext('2d');
  let state = 'idle';          // idle | listening | thinking | speaking
  let level = 0, target = 0;   // intensidade da animação (0..1)
  let actx = null, analyser = null, data = null, micStream = null, rec = null, player = null;
  let running = false, open = false, t0 = performance.now();

  // ---------- desenho da bola ----------
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const s = Math.min(innerWidth * 0.82, innerHeight * 0.5, 460);
    cv.style.width = cv.style.height = s + 'px';
    cv.width = cv.height = Math.round(s * dpr);
  }
  addEventListener('resize', () => open && size());

  function blobPath(cx, cy, r, t, amp) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1
        + Math.sin(a * 2 + t * 0.9) * (0.06 + amp * 0.08)
        + Math.sin(a * 3 - t * 1.3 + 1.7) * (0.045 + amp * 0.07)
        + Math.cos(a * 5 + t * 0.7) * (0.02 + amp * 0.05);
      pts.push([cx + Math.cos(a + t * 0.15) * r * k, cy + Math.sin(a + t * 0.15) * r * k]);
    }
    const p = new Path2D();
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]);
    p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const c = pts[i], nx = mid(c, pts[(i + 1) % n]);
      p.quadraticCurveTo(c[0], c[1], nx[0], nx[1]);
    }
    p.closePath();
    return p;
  }

  function draw(now) {
    if (!open) return;
    requestAnimationFrame(draw);
    const t = (now - t0) / 1000;
    // nível vindo do áudio (mic ou voz da IA)
    if (analyser && (state === 'listening' || state === 'speaking')) {
      analyser.getByteFrequencyData(data);
      let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i];
      target = Math.min(1, (sum / data.length) / 70);
    } else if (state === 'thinking') {
      target = 0.35 + Math.sin(t * 6) * 0.15;
    } else target = 0.08;
    level += (target - level) * 0.12;

    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
    const r = W * 0.37 * (1 + level * 0.1);
    const speed = state === 'thinking' ? 2.4 : 1 + level * 2.5;
    const tt = t * speed;
    ctx2d.clearRect(0, 0, W, H);

    const path = blobPath(cx, cy, r, tt, level);
    // brilho externo
    ctx2d.save();
    ctx2d.shadowColor = `rgba(150, 255, 0, ${0.55 + level * 0.35})`;
    ctx2d.shadowBlur = W * (0.12 + level * 0.08);
    const g = ctx2d.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, '#2fae00');
    g.addColorStop(0.45, '#7ae000');
    g.addColorStop(0.8, '#d6ff6a');
    g.addColorStop(1, '#f4ffd8');
    ctx2d.fillStyle = g;
    ctx2d.fill(path);
    ctx2d.restore();

    // reflexos internos (faixas brancas girando)
    ctx2d.save();
    ctx2d.clip(path);
    ctx2d.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) {
      const a = tt * (0.35 + k * 0.12) + k * 2.1;
      ctx2d.save();
      ctx2d.translate(cx, cy); ctx2d.rotate(a);
      ctx2d.filter = `blur(${W * 0.012}px)`;
      ctx2d.strokeStyle = `rgba(255,255,255,${0.32 - k * 0.07})`;
      ctx2d.lineWidth = W * (0.05 - k * 0.012);
      ctx2d.beginPath();
      ctx2d.moveTo(-r * 0.95, r * (0.15 + k * 0.12));
      ctx2d.bezierCurveTo(-r * 0.3, -r * (0.35 - k * 0.1), r * 0.2, r * (0.55 - k * 0.15), r * 0.95, -r * (0.05 + k * 0.1));
      ctx2d.stroke();
      ctx2d.restore();
    }
    // sombra verde escura no topo e brilho branco embaixo
    ctx2d.filter = 'none';
    ctx2d.globalCompositeOperation = 'source-over';
    const sh = ctx2d.createRadialGradient(cx - r * 0.1, cy - r * 0.55, 0, cx - r * 0.1, cy - r * 0.55, r * 0.9);
    sh.addColorStop(0, 'rgba(20,120,0,.55)'); sh.addColorStop(1, 'rgba(20,120,0,0)');
    ctx2d.fillStyle = sh; ctx2d.fillRect(0, 0, W, H);
    const hl = ctx2d.createRadialGradient(cx - r * 0.2, cy + r * 0.45, 0, cx - r * 0.2, cy + r * 0.45, r * 0.55);
    hl.addColorStop(0, 'rgba(255,255,255,.85)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx2d.fillStyle = hl; ctx2d.fillRect(0, 0, W, H);
    ctx2d.restore();

    // borda de vidro
    ctx2d.save();
    ctx2d.strokeStyle = 'rgba(255,255,255,.7)';
    ctx2d.lineWidth = W * 0.004;
    ctx2d.stroke(path);
    ctx2d.restore();
  }

  // ---------- áudio ----------
  function audioCtx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function useAnalyser(node) {
    const a = audioCtx();
    analyser = a.createAnalyser(); analyser.fftSize = 256;
    data = new Uint8Array(analyser.frequencyBinCount);
    node.connect(analyser);
    return analyser;
  }

  function setState(s, text) {
    state = s;
    ov.dataset.state = s;
    st.textContent = text;
    $('vmic').classList.toggle('on', s === 'listening');
  }

  async function ensureVoice() {
    if (voice.id) return true;
    try {
      const r = await fetch('/api/voices'); const j = await r.json();
      if (r.ok && j.voices && j.voices.length) { voice.id = j.voices[0].id; voice.name = j.voices[0].name; saveVoice(); showVoiceName(); return true; }
    } catch {}
    return false;
  }

  async function speakText(text) {
    if (!(await ensureVoice())) return;
    setState('speaking', 'Falando… toque na bola para interromper');
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice: voice.id }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Erro na voz'); }
    const url = URL.createObjectURL(await r.blob());
    player = new Audio(url);
    try { useAnalyser(audioCtx().createMediaElementSource(player)).connect(audioCtx().destination); } catch {}
    await new Promise(res => { player.onended = res; player.onerror = res; player.play().catch(res); });
    URL.revokeObjectURL(url); player = null;
  }

  async function ask(text) {
    if (!text.trim()) return;
    stopListening();
    tr.textContent = '“' + text + '”';
    setState('thinking', 'Pensando…');
    await send(text);                              // usa o chat normal (mesmo histórico e limites)
    const last = current && current.messages[current.messages.length - 1];
    if (!open) return;
    if (!last || last.role !== 'assistant' || last.blocked || /^⚠️/.test(last.content)) {
      setState('idle', last && last.blocked ? 'Suas mensagens grátis de hoje acabaram.' : 'Não consegui responder. Tente de novo.');
      window.fx && fx.error();
      return;
    }
    tr.textContent = last.content.replace(/[*_#`>]/g, '').slice(0, 220) + (last.content.length > 220 ? '…' : '');
    try { await speakText(last.content); } catch (e) { setState('idle', e.message); return; }
    if (open && running) startListening(); else if (open) setState('idle', 'Toque no microfone para falar');
  }

  // ---------- reconhecimento de fala ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  async function startListening() {
    if (!SR) { setState('idle', 'Seu navegador não reconhece voz. Use o Chrome ou digite abaixo.'); return; }
    running = true;
    try {
      if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      useAnalyser(audioCtx().createMediaStreamSource(micStream));
    } catch { setState('idle', 'Permita o uso do microfone para falar.'); running = false; return; }
    rec = new SR();
    rec.lang = 'pt-BR'; rec.interimResults = true; rec.continuous = false;
    let finalText = '';
    rec.onresult = e => {
      let interim = '';
      for (const r of e.results) (r.isFinal ? (finalText += r[0].transcript) : (interim += r[0].transcript));
      tr.textContent = finalText + interim;
    };
    rec.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') setState('idle', 'Erro no microfone: ' + e.error); };
    rec.onend = () => {
      rec = null;
      if (state !== 'listening') return;
      if (finalText.trim()) ask(finalText);
      else if (open && running) startListening();   // continua ouvindo
    };
    setState('listening', 'Ouvindo… pode falar');
    window.fx && fx.toggle();
    rec.start();
  }
  function stopListening() {
    if (rec) { const r = rec; rec = null; try { r.abort(); } catch {} }
  }
  function stopAll() {
    running = false; stopListening();
    if (player) { player.pause(); player = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    analyser = null;
  }

  // ---------- abrir / fechar ----------
  window.openVoiceMode = () => {
    open = true; ov.hidden = false; size(); t0 = performance.now();
    tr.textContent = '';
    setState('idle', SR ? 'Toque no microfone para falar' : 'Digite abaixo — seu navegador não reconhece voz');
    requestAnimationFrame(draw);
    if (SR) startListening();
  };
  function closeVoiceMode() { open = false; window.inVoiceMode = false; stopAll(); ov.hidden = true; }

  $('vmic').onclick = () => (state === 'listening' ? (running = false, stopListening(), setState('idle', 'Microfone pausado')) : startListening());
  $('vx').onclick = closeVoiceMode;
  $('vmenu').onclick = closeVoiceMode;
  $('vsettings').onclick = () => openVoices();
  $('vplus').onclick = () => { $('new').click(); tr.textContent = ''; setState(state, 'Nova conversa — pode falar'); };
  cv.onclick = () => { if (state === 'speaking' && player) { player.pause(); player.onended && player.onended(); } };
  $('vform').onsubmit = e => {
    e.preventDefault();
    const inp = $('vinput'); const text = inp.value; inp.value = '';
    running = false; ask(text);
  };
})();
