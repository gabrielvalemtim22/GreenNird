import Anthropic from '@anthropic-ai/sdk';
import { readSession, isAdmin, readUsage, usageCookie, FREE_DAILY } from './_lib/auth.js';

const client = new Anthropic(); // usa ANTHROPIC_API_KEY das variáveis de ambiente da Vercel

const SYSTEM = `Você é o GreenNird, um assistente de IA amigável, direto e útil.
Responda no idioma do usuário (português do Brasil por padrão), usando Markdown quando ajudar a leitura.
Seja conciso em conversas simples e detalhado quando a tarefa pedir.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).send('Método não permitido'); return; }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).send('A chave ANTHROPIC_API_KEY não está configurada na Vercel (Settings → Environment Variables).');
    return;
  }

  const { messages = [], think = false, search = false } = req.body || {};
  const history = messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-30)
    .map(m => ({ role: m.role, content: m.content.slice(0, 100000) }));
  if (!history.length || history[history.length - 1].role !== 'user') {
    res.status(400).send('Mensagem inválida.');
    return;
  }

  // ---- plano grátis: 3 mensagens por dia, sem pedidos pesados ----
  let session = null, usage = null, unlimited = false;
  try { session = readSession(req); usage = readUsage(req); unlimited = isAdmin(session); }
  catch { res.status(500).send('Contas ainda não configuradas no servidor (ACCOUNT_SECRET).'); return; }

  const block = (code, message, used) => {
    res.setHeader('Set-Cookie', usageCookie(usage.day, used));
    res.status(402).json({ code, message, remaining: FREE_DAILY - used });
  };
  let extraHeaders = {};
  if (!unlimited) {
    if (usage.used >= FREE_DAILY) {
      block('limit', 'Você usou suas 3 mensagens grátis de hoje. Assine um plano para continuar agora, ou volte amanhã.', usage.used);
      return;
    }
    if (think) {
      block('pro', 'O modo Pensar é exclusivo dos planos pagos. Desative o Pensar ou assine um plano.', usage.used);
      return;
    }
    const last = history[history.length - 1].content.length;
    const total = history.reduce((n, m) => n + m.content.length, 0);
    if (last > 3000 || total > 12000) {
      block('credits', 'Esse pedido é muito grande para o plano grátis. Acabaram seus créditos de hoje — volte amanhã ou assine um plano.', FREE_DAILY);
      return;
    }
    const used = usage.used + 1;
    extraHeaders = { 'Set-Cookie': usageCookie(usage.day, used), 'X-GN-Remaining': String(FREE_DAILY - used) };
  }

  res.writeHead(200, {
    ...extraHeaders,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });

  const params = {
    model: 'claude-opus-5-5',
    max_tokens: unlimited ? 32000 : 1500,
    system: SYSTEM,
    output_config: { effort: think ? 'high' : 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...(search ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: unlimited ? 5 : 2 }] } : {}),
  };

  try {
    let convo = history;
    // web search pode devolver pause_turn: continuamos a mesma resposta (máx. 3 vezes)
    for (let i = 0; i < 3; i++) {
      const stream = client.beta.messages.stream({ ...params, messages: convo });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          res.write(event.delta.text);
        } else if (event.type === 'content_block_start' && event.content_block.type === 'server_tool_use') {
          res.write('\n\n_🔎 Pesquisando na web..._\n\n');
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') {
        res.write('\n\nDesculpe, não posso ajudar com esse pedido.');
      } else if (final.stop_reason === 'max_tokens') {
        res.write(unlimited
          ? '\n\n_(resposta interrompida por tamanho)_'
          : '\n\n**⚠️ Resposta cortada: pedidos longos gastam muitos créditos no plano grátis. [Assine um plano](/conta#planos) para respostas completas.**');
      }
      if (final.stop_reason !== 'pause_turn') break;
      convo = [...history, { role: 'assistant', content: final.content }];
    }
  } catch (err) {
    console.error(err);
    const msg = err instanceof Anthropic.RateLimitError
      ? 'Muitas solicitações agora. Tente de novo em instantes.'
      : err instanceof Anthropic.AuthenticationError
        ? 'Chave da API inválida. Verifique ANTHROPIC_API_KEY na Vercel.'
        : 'Erro ao falar com a IA. Tente novamente.';
    res.write('\n\n⚠️ ' + msg);
  }
  res.end();
}
