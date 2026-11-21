// Transforma texto em fala com a ElevenLabs e devolve MP3
import { readSession, isAdmin } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) { res.status(503).json({ error: 'Voz ainda não configurada (ELEVENLABS_API_KEY).' }); return; }

  const { text = '', voice = '', owner = '' } = req.body || {};
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

  const speak = () => fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    // language_code "pt" força a pronúncia em português
    body: JSON.stringify({ text: clean, model_id: process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5', language_code: 'pt' }),
  });
  try {
    let r = await speak();
    // voz brasileira da biblioteca ainda não está na conta: adiciona e tenta de novo
    if (!r.ok && /^[A-Za-z0-9]{10,80}$/.test(owner)) {
      const detail = await r.clone().text().catch(() => '');
      if (/voice_not_found|not found|does not exist/i.test(detail)) {
        const add = await fetch(`https://api.elevenlabs.io/v1/voices/add/${owner}/${voice}`, {
          method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_name: 'GreenNird ' + voice.slice(0, 6) }),
        });
        if (add.ok) r = await speak();
        else console.error('add voice', add.status, (await add.text()).slice(0, 200));
      }
    }
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('ElevenLabs', r.status, detail);
      let st = '', msg = '';
      try { const j = JSON.parse(detail); st = j.detail?.status || ''; msg = j.detail?.message || ''; } catch {}
      const quota = /quota|credit|limit/i.test(st + ' ' + msg + ' ' + detail);
      res.status(502).json({
        code: quota ? 'quota' : r.status === 401 ? 'key' : 'error',
        error: quota ? 'Os créditos de voz da ElevenLabs acabaram.'
          : r.status === 401 ? 'A ElevenLabs recusou o pedido (' + (st || 'permissão') + ').'
          : r.status === 429 ? 'Muitos pedidos de voz agora. Tente de novo.'
          : 'Erro na voz (' + r.status + ').',
      });
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
