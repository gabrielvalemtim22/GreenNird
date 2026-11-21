// Plugin WhatsApp do GreenNird — roda 24h na nuvem (Vercel).
// A Meta (WhatsApp Cloud API) chama este endereço a cada mensagem nova;
// o Grok responde e a resposta volta para o cliente no WhatsApp.
//
// Variáveis na Vercel:
//   WHATSAPP_TOKEN         token de acesso da API do WhatsApp (Meta)
//   WHATSAPP_PHONE_ID      ID do número de telefone (Phone number ID)
//   WHATSAPP_VERIFY_TOKEN  senha que você inventa e cola também na Meta
//   WHATSAPP_APP_SECRET    "App secret" do app na Meta (confere que a mensagem veio mesmo da Meta)
//   WHATSAPP_PROMPT        (opcional) como o robô deve atender
import crypto from 'node:crypto';

const API = () => `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v23.0'}`;

const DEFAULT_PROMPT = `Você é o atendente virtual da empresa no WhatsApp, criado pelo GreenNird.
Responda em português do Brasil, de forma curta, simpática e clara (no máximo 3 parágrafos curtos).
Não invente preços, prazos ou informações que você não sabe: nesse caso diga que vai chamar um atendente humano.
Não use Markdown pesado; o WhatsApp mostra *negrito* com um asterisco de cada lado.`;

// Meta confere o webhook com um GET
export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }
  return new Response('Proibido', { status: 403 });
}

// Mensagens novas chegam por POST
export async function POST(request) {
  const raw = await request.text();

  // confere a assinatura da Meta para ninguém fingir ser o WhatsApp
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new Response('WHATSAPP_APP_SECRET não configurado', { status: 500 });
  const sig = request.headers.get('x-hub-signature-256') || '';
  const good = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) {
    return new Response('Assinatura inválida', { status: 401 });
  }

  let body;
  try { body = JSON.parse(raw); } catch { return new Response('ok'); }

  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const msg = value?.messages?.[0];
  if (!msg) return new Response('ok'); // status de entrega/leitura etc.

  const from = msg.from;
  const name = value?.contacts?.[0]?.profile?.name || '';
  let text = '';
  if (msg.type === 'text') text = msg.text?.body || '';
  else if (msg.type === 'button') text = msg.button?.text || '';
  else if (msg.type === 'interactive') text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';

  try {
    await markRead(msg.id);
    const reply = text
      ? await askGrok(text, name)
      : 'Recebi sua mensagem! 😊 Por enquanto eu entendo só texto. Pode escrever o que você precisa?';
    await sendText(from, reply);
  } catch (e) {
    console.error('whatsapp', e);
  }
  return new Response('ok');
}

async function askGrok(text, name) {
  const r = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.XAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.XAI_FAST_MODEL || 'grok-4.20-0309-non-reasoning',
      max_tokens: 800,
      messages: [
        { role: 'system', content: process.env.WHATSAPP_PROMPT || DEFAULT_PROMPT },
        { role: 'user', content: (name ? `(Cliente: ${name})\n` : '') + text.slice(0, 4000) },
      ],
    }),
  });
  if (!r.ok) throw new Error('Grok ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  return (j.choices?.[0]?.message?.content || 'Desculpe, não consegui responder agora.').slice(0, 4000);
}

async function sendText(to, body) {
  const r = await fetch(`${API()}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body, preview_url: false } }),
  });
  if (!r.ok) throw new Error('WhatsApp ' + r.status + ' ' + (await r.text()).slice(0, 300));
}

async function markRead(id) {
  await fetch(`${API()}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: id }),
  }).catch(() => {});
}
