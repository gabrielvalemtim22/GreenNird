// GreenNird FX: sons sintetizados (sem arquivos), vibração e partículas
(function () {
  let ctx = null;
  let on = true;
  try { on = localStorage.getItem('gn-sound') !== 'off'; } catch {}

  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, { type = 'sine', vol = 0.12, to = null, delay = 0 } = {}) {
    if (!on) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const buzz = ms => { try { if (on && navigator.vibrate) navigator.vibrate(ms); } catch {} };

  const sounds = {
    click() { tone(1400, 0.05, { type: 'triangle', vol: 0.06 }); buzz(8); },
    toggle() { tone(700, 0.07, { type: 'triangle', vol: 0.08, to: 1100 }); buzz(10); },
    send() { tone(420, 0.16, { vol: 0.12, to: 1300 }); tone(1600, 0.08, { type: 'triangle', vol: 0.05, delay: 0.1 }); buzz(15); },
    first() { tone(880, 0.08, { type: 'triangle', vol: 0.07 }); },
    tick() { tone(2200 + Math.random() * 400, 0.025, { type: 'square', vol: 0.012 }); },
    done() { [784, 988, 1319].forEach((f, i) => tone(f, 0.18, { vol: 0.08, delay: i * 0.07 })); buzz([10, 40, 10]); },
    error() { tone(300, 0.2, { type: 'sawtooth', vol: 0.05, to: 180 }); buzz(60); },
    boop() {
      // "bloop" fofo: sobe o tom rápido + um pinguinho agudo, com leve variação a cada toque
      const v = 0.9 + Math.random() * 0.25;
      tone(420 * v, 0.12, { vol: 0.14, to: 980 * v });
      tone(1250 * v, 0.07, { type: 'triangle', vol: 0.05, delay: 0.09, to: 1700 * v });
      tone(1900 * v, 0.05, { vol: 0.03, delay: 0.15 });
      buzz([8, 30, 8]);
    },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { vol: 0.08, delay: i * 0.08 })); buzz([20, 50, 20, 50, 40]); },
  };

  // partículas verdes a partir de um elemento
  function burst(el, n = 16) {
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      const ang = Math.random() * Math.PI * 2, dist = 40 + Math.random() * 70;
      p.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;width:${4 + Math.random() * 6}px;height:${4 + Math.random() * 6}px;border-radius:${Math.random() > .5 ? '50%' : '2px'};background:${['#d4ff00', '#b8f000', '#111', '#eaff8a'][i % 4]};pointer-events:none;z-index:9999;transition:transform .7s cubic-bezier(.2,.8,.3,1),opacity .7s;`;
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transform = `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) rotate(${Math.random() * 360}deg)`;
        p.style.opacity = '0';
      });
      setTimeout(() => p.remove(), 750);
    }
  }

  // som em todos os botões e links
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('button, a, .chip, .item');
    if (!b) return;
    b.classList.contains('chip') ? sounds.toggle() : sounds.click();
  }, true);

  // voz reserva do navegador (quando a ElevenLabs falha ou acaba o crédito)
  function browserSpeak(text) {
    return new Promise(res => {
      try {
        const synth = window.speechSynthesis; if (!synth) return res(false);
        synth.cancel();
        const clean = String(text).replace(/```[\s\S]*?```/g, ' ').replace(/[*_#>`~|]/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').slice(0, 1500);
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = 'pt-BR'; u.rate = 1.05;
        const v = synth.getVoices().find(v => /pt[-_]BR/i.test(v.lang)) || synth.getVoices().find(v => /^pt/i.test(v.lang));
        if (v) u.voice = v;
        u.onend = () => res(true); u.onerror = () => res(false);
        synth.speak(u);
      } catch { res(false); }
    });
  }
  let lastTick = 0;
  window.fx = {
    ...sounds,
    burst,
    browserSpeak,
    stopBrowserSpeak() { try { speechSynthesis.cancel(); } catch {} },
    typing() { const n = performance.now(); if (n - lastTick > 70) { lastTick = n; sounds.tick(); } },
    get enabled() { return on; },
    toggleSound() {
      on = !on;
      try { localStorage.setItem('gn-sound', on ? 'on' : 'off'); } catch {}
      if (on) sounds.toggle();
      return on;
    },
  };
})();
