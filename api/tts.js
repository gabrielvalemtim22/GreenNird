// Transforma texto em fala com a ElevenLabs e devolve MP3
import { readSession, isAdmin } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { res.status(503).json({ error: 'Voz ainda não configurada (ELEVENLABS_API_KEY).' }); return; }

  const { text = '', voice = '' } = req.body || {};
  if (!/^[A-Za-z0-9]{10,40}$/.test(voice)) { res.status(400).json({ error: 'Voz inválida.' }); return; }
  let admin = false;
  try { admin = isAdmin(readSession(req)); } catch {}
  const limit = admin ? 5000 : 700; // plano grátis: trechos curtos para não gastar créditos
  const clean = String(text)
    .replace(/```[\s\S]*?```/g, ' (código) ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>`~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
  if (!clean) { res.status(400).json({ error: 'Nada para ler.' }); return; }

  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: clean, model_id: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5' }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('ElevenLabs', r.status, detail);
      res.status(502).json({ error: r.status === 401 ? 'Chave da ElevenLabs inválida.' : r.status === 429 || /quota|credit/i.test(detail) ? 'Créditos de voz da ElevenLabs acabaram.' : 'Erro na voz (' + r.status + ').' });
      return;
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    const reader = r.body.getReader();
    for (;;) { const { value, done } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
    res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: 'Erro ao gerar voz.' }); else res.end();
  }
}
