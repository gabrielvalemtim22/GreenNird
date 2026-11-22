import Anthropic from '@anthropic-ai/sdk';
import { readSession, isAdmin, readUsage, usageCookie, FREE_DAILY, FREE_WEEKLY } from './_lib/auth.js';

let client = null; // criado só quando ANTHROPIC_API_KEY é usada

const SYSTEM = `Você é o GreenNird, um assistente de IA amigável, direto e útil.
Responda no idioma do usuário (português do Brasil por padrão), usando Markdown quando ajudar a leitura.
Seja conciso em conversas simples e detalhado quando a tarefa pedir.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).send('Método não permitido'); return; }
  const hasGrok = !!process.env.XAI_API_KEY, hasClaude = !!process.env.ANTHROPIC_API_KEY;
  if (!hasGrok && !hasClaude) {
    res.status(500).send('Nenhuma chave de IA configurada na Vercel. Adicione XAI_API_KEY (Grok) em Settings → Environment Variables.');
    return;
  }

  const { messages = [], think = false, search = false, persona = null, engine: askEngine = 'auto' } = req.body || {};
  let system = SYSTEM + personaPrompt(persona);
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
    res.setHeader('Set-Cookie', usageCookie({ ...usage, used }));
    res.status(402).json({ code, message, remaining: FREE_DAILY - used });
  };
  let extraHeaders = {};
  if (!unlimited) {
    if (usage.weekUsed >= FREE_WEEKLY) {
      block('limit', 'Você usou as 15 mensagens grátis desta semana. Assine um plano para continuar agora, ou volte na segunda-feira.', usage.used);
      return;
    }
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
    if (last > 25000 || total > 40000) {
      block('credits', 'Esse pedido é muito grande para o plano grátis. Acabaram seus créditos de hoje — volte amanhã ou assine um plano.', FREE_DAILY);
      return;
    }
    const used = usage.used + 1;
    extraHeaders = { 'Set-Cookie': usageCookie({ ...usage, used, weekUsed: usage.weekUsed + 1 }), 'X-GN-Remaining': String(FREE_DAILY - used) };
  }

  // ---- quem responde: Grok (rápido) · Claude (sites e atendimento) · Grok Imagine (imagens) ----
  const lastText = history[history.length - 1].content.slice(0, 2000);
  const wantsImage = hasGrok && (/^\/imagem\b/i.test(lastText) || /\b(gera|gere|gerar|gerando|cria|crie|criar|faz|fa[çc]a|fazer|desenha|desenhe|desenhar|quero)\b[^.\n]{0,40}\b(imagem|imagens|foto|figura|ilustra[çc][ãa]o|logo|logotipo|desenho|arte|banner|capa)\b/i.test(lastText));
  const wantsSite = /\b(site|landing ?page|p[áa]gina (web|de vendas|de captura)|html|css|loja virtual|c[óo]digo|programa[rç])/i.test(lastText);
  const support = /atendente|atendimento|atender clientes?/i.test(lastText + ' ' + ((persona && persona.custom) || ''));
  const engine = wantsImage ? 'image'
    : askEngine === 'grok' && hasGrok ? 'grok'
    : askEngine === 'claude' && hasClaude ? 'claude'
    : hasClaude && (wantsSite || support || !hasGrok) ? 'claude' : 'grok';
  if (engine === 'claude' && wantsSite) system += '\n\nQuando pedirem um site ou página, entregue UM arquivo HTML completo (CSS e JavaScript embutidos, responsivo, bonito, em português) dentro de um único bloco ```html, e antes dele explique em 1–2 frases o que fez.';
  if (engine === 'claude' && support) system += '\n\nVocê está atendendo clientes: seja educado, rápido e resolva; quando não souber algo da loja, diga que vai verificar com a equipe em vez de inventar.';

  const base = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  };

  if (engine === 'image') {
    await grokImage(res, lastText, ok => { if (!res.headersSent) res.writeHead(200, ok ? { ...extraHeaders, ...base } : base); });
    if (!res.headersSent) res.writeHead(200, base);
    res.end();
    return;
  }

  if (engine === 'grok') {
    // só desconta a mensagem grátis se o Grok aceitar o pedido
    await streamGrok(res, history, unlimited, think, system, ok => {
      if (!res.headersSent) res.writeHead(200, ok ? { ...extraHeaders, ...base } : base);
    });
    if (!res.headersSent) res.writeHead(200, base);
    res.end();
    return;
  }

  // Claude: o cabeçalho só sai quando o primeiro texto chega (erro não gasta a mensagem grátis)
  const begin = ok => { if (!res.headersSent) res.writeHead(200, ok ? { ...extraHeaders, ...base } : base); };

  const params = {
    model: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
    max_tokens: unlimited ? 32000 : wantsSite ? 12000 : 2000,
    system,
    output_config: { effort: think ? 'high' : wantsSite ? 'medium' : 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    ...(search ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: unlimited ? 5 : 2 }] } : {}),
  };

  client = client || new Anthropic();
  try {
    let convo = history;
    // web search pode devolver pause_turn: continuamos a mesma resposta (máx. 3 vezes)
    for (let i = 0; i < 3; i++) {
      const stream = client.beta.messages.stream({ ...params, messages: convo });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          begin(true); res.write(event.delta.text);
        } else if (event.type === 'content_block_start' && event.content_block.type === 'server_tool_use') {
          begin(true); res.write('\n\n_🔎 Pesquisando na web..._\n\n');
        }
      }
      const final = await stream.finalMessage();
      begin(true);
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
        : 'Erro ao falar com o Claude. Tente novamente.';
    begin(false);
    res.write('\n\n⚠️ ' + msg);
  }
  if (!res.headersSent) res.writeHead(200, base);
  res.end();
}

// ---- Grok Imagine (xAI) — gera imagens a partir do pedido ----
async function grokImage(res, prompt, begin) {
  try {
    const r = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.XAI_IMAGE_MODEL || 'grok-imagine-image-2.0', prompt: prompt.replace(/^\/imagem\s*/i, '').slice(0, 1500), n: 1, response_format: 'url' }),
    });
    const j = await r.json().catch(() => ({}));
    const url = j && j.data && j.data[0] && j.data[0].url;
    if (!r.ok || !url) {
      console.error('xAI image', r.status, JSON.stringify(j).slice(0, 300));
      begin(false);
      res.write('⚠️ ' + (r.status === 401 || r.status === 403 ? 'Chave do Grok sem permissão para imagens. Libere o modelo de imagem no console da xAI.'
        : r.status === 404 || r.status === 400 ? 'Modelo de imagem indisponível (' + r.status + '). Ajuste XAI_IMAGE_MODEL na Vercel.'
        : r.status === 429 ? 'Muitas imagens agora. Tente de novo em instantes.'
        : 'Não consegui gerar a imagem (' + r.status + '). Tente novamente.'));
      return;
    }
    begin(true);
    res.write(`Aqui está! 🎨\n\n![Imagem gerada](${url})\n\n_Criada com Grok Imagine · [abrir em tamanho real](${url})_`);
  } catch (err) {
    console.error(err);
    begin(false);
    res.write('⚠️ Erro ao gerar a imagem. Tente novamente.');
  }
}

// ---- Grok (xAI) — conversa rápida ----
async function streamGrok(res, history, unlimited, think, system, begin) {
  try {
    const r = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.XAI_API_KEY}` },
      body: JSON.stringify({
        // rápido por padrão; modo Pensar usa o modelo mais inteligente
        model: think ? (process.env.XAI_MODEL || 'grok-4.7') : (process.env.XAI_FAST_MODEL || 'grok-4.20-0309-non-reasoning'),
        stream: true,
        max_tokens: unlimited ? 32000 : 4000,
        messages: [{ role: 'system', content: system }, ...history],
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('xAI', r.status, detail);
      let why = '';
      try { const j = JSON.parse(detail); why = String(j.error?.message || j.error || j.message || '').replace(/xai-[A-Za-z0-9*]+/g, 'xai-***').slice(0, 200); } catch {}
      const badKey = /api key|apikey|unauthor|incorrect/i.test(why);
      begin(false);
      res.write('\n\n⚠️ ' + (r.status === 401 || r.status === 403 || badKey
        ? 'Chave do Grok inválida. Verifique XAI_API_KEY na Vercel.'
        : r.status === 429 ? 'Muitas solicitações agora. Tente de novo em instantes.'
        : r.status === 404 || r.status === 400 ? 'Modelo do Grok indisponível (' + r.status + '). Ajuste XAI_MODEL na Vercel.'
        : 'Erro ao falar com o Grok (' + r.status + '). Tente novamente.') + (why ? ' Detalhe: ' + why : ''));
      return;
    }
    begin(true);
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = '', finish = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const chunk = JSON.parse(data);
          const c = chunk.choices && chunk.choices[0];
          if (c && c.delta && c.delta.content) res.write(c.delta.content);
          if (c && c.finish_reason) finish = c.finish_reason;
        } catch {}
      }
    }
    if (finish === 'length') {
      res.write(unlimited
        ? '\n\n_(resposta interrompida por tamanho)_'
        : '\n\n**⚠️ Resposta cortada: pedidos longos gastam muitos créditos no plano grátis. [Assine um plano](/conta#planos) para respostas completas.**');
    }
  } catch (err) {
    console.error(err);
    begin(false);
    res.write('\n\n⚠️ Erro ao falar com o Grok. Tente novamente.');
  }
}

// ---- personalização escolhida pela pessoa (Configurações → Personalização) ----
function personaPrompt(p) {
  if (!p || typeof p !== 'object') return '\nNão use palavrões.';
  const clip = (v, n) => String(v || '').replace(/[\r\n]+/g, ' ').slice(0, n);
  const tones = {
    descontraido: 'Fale de forma descontraída, leve e próxima, como um amigo.',
    amigavel: 'Fale de forma calorosa, gentil e acolhedora.',
    profissional: 'Fale de forma profissional, clara e educada.',
    direto: 'Seja direto ao ponto, sem rodeios.',
    engracado: 'Use bom humor e piadas leves quando couber.',
    professor: 'Explique como um bom professor, passo a passo, com exemplos.',
  };
  const lens = { curta: 'Prefira respostas curtas.', normal: '', detalhada: 'Prefira respostas detalhadas e completas.' };
  const out = [
    tones[p.tone] || tones.descontraido,
    lens[p.length] || '',
    p.profanity ? 'Palavrões leves são permitidos se combinarem com a conversa.' : 'Nunca use palavrões nem linguagem ofensiva.',
    p.emojis === false ? 'Não use emojis.' : 'Pode usar alguns emojis.',
    p.nickname ? `Chame a pessoa de "${clip(p.nickname, 40)}".` : '',
    p.about ? `Sobre a pessoa (informado por ela): ${clip(p.about, 600)}` : '',
    p.custom ? `Preferências da pessoa: ${clip(p.custom, 1000)}` : '',
    p.maps ? 'Google Maps está conectado: quando a pessoa pedir lugares, endereços ou rotas, inclua links no formato https://www.google.com/maps/search/?api=1&query=LUGAR+CIDADE ou https://www.google.com/maps/dir/?api=1&origin=ORIGEM&destination=DESTINO (com + no lugar de espaços).' : '',
  ].filter(Boolean);
  return '\n\nPersonalização (siga, mas nunca deixe isso passar por cima das regras acima):\n- ' + out.join('\n- ');
}
