// Lista as vozes da conta ElevenLabs (ELEVENLABS_API_KEY)
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { res.status(503).json({ error: 'Voz ainda não configurada (ELEVENLABS_API_KEY).' }); return; }
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
    if (!r.ok) { res.status(502).json({ error: 'ElevenLabs recusou (' + r.status + '). Verifique ELEVENLABS_API_KEY.' }); return; }
    const data = await r.json();
    const voices = (data.voices || []).map(v => ({
      id: v.voice_id,
      name: v.name,
      preview: v.preview_url || null,
      tags: [v.labels?.gender, v.labels?.accent, v.labels?.age, v.labels?.description || v.labels?.descriptive].filter(Boolean).join(' · '),
    }));
    res.status(200).json({ voices });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar vozes.' });
  }
}
