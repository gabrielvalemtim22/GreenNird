import { newId, cleanId, validId, sessionCookie, clearCookie, readSession, isAdmin, readUsage, FREE_DAILY, FREE_WEEKLY } from './_lib/auth.js';

const fmtId = id => id.replace(/(\d{4})(?=\d)/g, '$1 ');
const sleep = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') {
      const id = readSession(req);
      const u = readUsage(req);
      const usage = { today: u.used, dailyLimit: FREE_DAILY, week: u.weekUsed, weeklyLimit: FREE_WEEKLY };
      res.status(200).json(id
        ? { loggedIn: true, id: fmtId(id), plan: isAdmin(id) ? 'Dono' : 'Grátis', isAdmin: isAdmin(id), usage }
        : { loggedIn: false, usage });
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Método não permitido' }); return; }

    const { action, id: rawId } = req.body || {};
    if (action === 'create') {
      const id = newId();
      res.setHeader('Set-Cookie', sessionCookie(id));
      res.status(200).json({ loggedIn: true, id: fmtId(id), plan: 'Grátis', isAdmin: false });
      return;
    }
    if (action === 'login') {
      const id = cleanId(rawId);
      if (!validId(id)) {
        await sleep(800); // atrasa tentativas de adivinhar códigos
        res.status(401).json({ error: 'Código inválido. Confira os 12 números.' });
        return;
      }
      res.setHeader('Set-Cookie', sessionCookie(id));
      res.status(200).json({ loggedIn: true, id: fmtId(id), plan: 'Grátis', isAdmin: isAdmin(id) });
      return;
    }
    if (action === 'logout') {
      res.setHeader('Set-Cookie', clearCookie);
      res.status(200).json({ loggedIn: false });
      return;
    }
    res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Contas ainda não configuradas no servidor (ACCOUNT_SECRET).' });
  }
}
