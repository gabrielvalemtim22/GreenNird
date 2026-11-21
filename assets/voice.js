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
    const s = Math.min(innerWidth * 0.6, innerHeight * 0.34, 300); // menor
    cv.style.width = cv.style.height = s + 'px';
    cv.width = cv.height = Math.round(s * dpr);
  }
  addEventListener('resize', () => open && size());

  function blobPath(cx, cy, r, t, amp) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1
        + Math.sin(a * 2 + t * 0.9) * (0.08 + amp * 0.08)
        + Math.sin(a * 3 - t * 1.3 + 1.7) * (0.06 + amp * 0.07)
        + Math.cos(a * 5 + t * 0.7) * (0.025 + amp * 0.05);
      pts.push([cx + Math.cos(a + t * 0.3) * r * k, cy + Math.sin(a + t * 0.3) * r * k]);
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
    } else target = 0; // parada
    level += (target - level) * 0.15;

    // bola preta: a imagem enviada, com animações de toque, fala, abrir e fechar
    const W = cv.width, H = cv.height;
    ctx2d.clearRect(0, 0, W, H);
    if (!blobImg.complete || !blobImg.naturalWidth) return;

    // mola do "toque": geleia que amassa e volta
    const dt = Math.min(0.05, (now - (draw.last || now)) / 1000); draw.last = now;
    jelly.v += (-jelly.k * jelly.x - jelly.d * jelly.v) * dt;
    jelly.x += jelly.v * dt;

    // entrada/saída (abrir e fechar)
    let appear = 1;
    if (anim.mode) {
      const p = Math.min(1, (now - anim.start) / anim.dur);
      if (anim.mode === 'open') appear = easeOutBack(p);
      else appear = 1 - easeInBack(p);
      if (p >= 1) { const m = anim.mode; anim.mode = null; if (m === 'close') finishClose(); }
    }

    const breathe = 1 + Math.sin(t * 1.4) * 0.012;
    let sx = breathe * (1 + level * 0.14), sy = sx, rot = Math.sin(t * 0.5) * 0.012;
    if (state === 'speaking') {
      // falando: pulsa com a voz e "respira" alternando largura e altura
      const w = Math.sin(t * 11) * level * 0.06;
      sx *= 1 + w; sy *= 1 - w;
      rot += Math.sin(t * 4) * level * 0.05;
    } else if (state === 'thinking') {
      rot = Math.sin(t * 2.2) * 0.08;
    } else if (state === 'listening') {
      rot += level * Math.sin(t * 9) * 0.03;
    }
    // aplica a geleia do toque
    sx *= 1 + jelly.x; sy *= 1 - jelly.x * 0.9;
    // fechar: gira e encolhe
    const spin = anim.mode === 'close' ? (1 - appear) * 1.4 : 0;

    ctx2d.save();
    ctx2d.globalAlpha = Math.max(0, Math.min(1, appear * 1.2));
    ctx2d.translate(W / 2, H / 2);
    ctx2d.rotate(rot + spin);
    ctx2d.scale(sx * appear, sy * appear);
    ctx2d.imageSmoothingQuality = 'high';
    ctx2d.drawImage(blobImg, CROP.x, CROP.y, CROP.s, CROP.s, -W / 2, -H / 2, W, H);
    ctx2d.restore();
  }
  const CROP = { x: 56, y: 0, s: 1199 };
  const blobImg = new Image();
  blobImg.src = '/assets/blob-black.png';
  const jelly = { x: 0, v: 0, k: 260, d: 9 };
  const anim = { mode: null, start: 0, dur: 500 };
  const easeOutBack = p => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
  const easeInBack = p => { const c = 1.7; return (c + 1) * p * p * p - c * p * p; };
  function poke(force = 0.9) { jelly.v -= force * 3.2; }

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
    open = true; ov.hidden = false; ov.classList.remove('closing'); size(); t0 = performance.now();
    anim.mode = 'open'; anim.start = performance.now(); anim.dur = 650;
    tr.textContent = '';
    setState('idle', SR ? 'Toque no microfone para falar' : 'Digite abaixo — seu navegador não reconhece voz');
    requestAnimationFrame(draw);
    if (SR) startListening();
  };
  function closeVoiceMode() {
    if (anim.mode === 'close') return;
    stopAll(); window.inVoiceMode = false;
    window.fx && fx.toggle();
    ov.classList.add('closing');
    anim.mode = 'close'; anim.start = performance.now(); anim.dur = 480;
  }
  function finishClose() { open = false; ov.hidden = true; ov.classList.remove('closing'); }

  $('vmic').onclick = () => (state === 'listening' ? (running = false, stopListening(), setState('idle', 'Microfone pausado')) : startListening());
  $('vx').onclick = closeVoiceMode;
  $('vmenu').onclick = closeVoiceMode;
  $('vsettings').onclick = () => openVoices();
  $('vplus').onclick = () => { $('new').click(); tr.textContent = ''; setState(state, 'Nova conversa — pode falar'); };
  cv.onclick = () => {
    poke(); window.fx && fx.click();
    if (state === 'speaking' && player) { player.pause(); player.onended && player.onended(); }
  };
  $('vform').onsubmit = e => {
    e.preventDefault();
    const inp = $('vinput'); const text = inp.value; inp.value = '';
    running = false; ask(text);
  };
  if (window.pendingVoice) { window.pendingVoice = false; window.openVoiceMode(); }
})();
