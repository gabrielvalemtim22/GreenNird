// Lista até 7 vozes BRASILEIRAS (pt-BR) para a IA.
// 1) vozes da sua conta marcadas como português/brasileiro
// 2) completa com vozes brasileiras da biblioteca da ElevenLabs
// VOICE_IDS (opcional, separadas por vírgula) fixa exatamente quais vozes usar.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { res.status(503).json({ error: 'Voz ainda não configurada (ELEVENLABS_API_KEY).' }); return; }
  const H = { 'xi-api-key': key };
  const isBR = v => /pt[-_]?br|brazil|brasil/i.test([v.locale, v.accent, v.labels?.accent, v.labels?.language, v.language, v.description, v.name].filter(Boolean).join(' '))
    || ((v.language || v.labels?.language || '') === 'pt' && !/portugal|european/i.test(v.accent || v.labels?.accent || ''));
  const out = [];
  const add = (v, shared) => {
    if (out.length >= 7 || out.some(x => x.id === v.voice_id)) return;
    out.push({
      id: v.voice_id,
      owner: shared ? v.public_owner_id : null,
      name: v.name,
      preview: v.preview_url || null,
      tags: ['🇧🇷', v.gender || v.labels?.gender, v.age || v.labels?.age, v.descriptive || v.use_case || v.labels?.description].filter(Boolean).join(' · '),
    });
  };
  try {
    const pick = (process.env.VOICE_IDS || '').split(',').map(x => x.trim()).filter(Boolean);
    const mine = await fetch('https://api.elevenlabs.io/v1/voices', { headers: H }).then(r => r.ok ? r.json() : { voices: [] }).catch(() => ({ voices: [] }));
    if (pick.length) pick.forEach(id => { const v = (mine.voices || []).find(x => x.voice_id === id); if (v) add(v, false); });
    (mine.voices || []).filter(isBR).forEach(v => add(v, false));

    if (out.length < 7) {
      // biblioteca pública: português do Brasil, mais usadas primeiro
      for (const q of ['language=pt&accent=brazilian', 'language=pt&locale=pt-BR', 'language=pt']) {
        if (out.length >= 7) break;
        const r = await fetch(`https://api.elevenlabs.io/v1/shared-voices?page_size=40&sort=usage_character_count_1y&${q}`, { headers: H });
        if (!r.ok) continue;
        const j = await r.json();
        (j.voices || []).filter(isBR).forEach(v => add(v, true));
      }
    }
    if (!out.length) { res.status(502).json({ error: 'Não encontrei vozes brasileiras. Verifique a permissão "Vozes" da chave ElevenLabs.' }); return; }
    res.status(200).json({ voices: out });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar vozes.' });
  }
}
