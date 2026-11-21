// Status dos plugins (só para o dono/admin). Nunca devolve os valores secretos, só se estão configurados.
import { readSession, isAdmin } from './_lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  let id = null;
  try { id = readSession(req); } catch {}
  if (!isAdmin(id)) { res.status(404).json({ error: 'Não encontrado' }); return; }
  const has = k => !!process.env[k];
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'greennird.vercel.app';
  res.status(200).json({
    plugins: [
      {
        id: 'whatsapp', name: 'WhatsApp', status: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET', 'XAI_API_KEY'].every(has) ? 'on' : 'setup',
        webhook: `https://${host}/api/whatsapp`,
        vars: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'].map(k => ({ name: k, ok: has(k) })),
      },
      { id: 'grok', name: 'Grok (IA)', status: has('XAI_API_KEY') ? 'on' : 'setup', vars: [{ name: 'XAI_API_KEY', ok: has('XAI_API_KEY') }] },
      { id: 'voice', name: 'Vozes ElevenLabs', status: has('ELEVENLABS_API_KEY') ? 'on' : 'setup', vars: [{ name: 'ELEVENLABS_API_KEY', ok: has('ELEVENLABS_API_KEY') }] },
      { id: 'meta-ads', name: 'Meta Ads', status: 'soon' },
      { id: 'instagram', name: 'Postar no Instagram/Facebook', status: 'soon' },
      { id: 'images', name: 'Gerar imagens', status: 'soon' },
    ],
  });
}
