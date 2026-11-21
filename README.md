# GreenNird

Assistente de IA (chat com Claude), contas por código numérico e painel administrativo 3D.

- `/` — página inicial
- `/chat` — chat com IA (streaming, modos Pensar e Pesquisar)
- `/conta` — criar conta / entrar com código de 12 números, e planos
- `/admin` — painel administrativo (só o dono, via `ADMIN_ID`)

## Variáveis de ambiente na Vercel (Settings → Environment Variables)
| Nome | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | sua chave do console.anthropic.com |
| `ACCOUNT_SECRET` | um texto aleatório longo (40+ caracteres). Não mude depois: os códigos das contas dependem dele |
| `ADMIN_ID` | o seu código de conta (12 números). Vários: separe por vírgula |

Depois de mudar variáveis, faça um novo deploy (Deployments → Redeploy).
