# GreenNird

Assistente de IA (chat com Claude) + painel administrativo.

- `/` — página inicial
- `/chat` — chat com IA (streaming, modos Pensar e Pesquisar, histórico local)
- `/admin` — painel administrativo (dados de demonstração)
- `api/chat.js` — função serverless da Vercel que chama a API do Claude

## Deploy na Vercel
1. Importe este repositório em https://vercel.com/new com o nome de projeto `greennird`.
2. Em **Settings → Environment Variables**, adicione `ANTHROPIC_API_KEY`.
3. Faça o deploy. O site fica em https://greennird.vercel.app
