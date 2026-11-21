import Anthropic from '@anthropic-ai/sdk';

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

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });

  const params = {
    model: 'claude-opus-5-5',
    max_tokens: 32000,
    system: SYSTEM,
    output_config: { effort: think ? 'high' : 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...(search ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }] } : {}),
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
        res.write('\n\n_(resposta interrompida por tamanho)_');
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
