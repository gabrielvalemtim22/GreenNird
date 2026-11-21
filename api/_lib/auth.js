// Contas GreenNird: o código da conta (12 dígitos) é a própria chave de acesso.
// 9 dígitos aleatórios + 3 dígitos de verificação assinados com ACCOUNT_SECRET,
// então números inventados são recusados.
import crypto from 'node:crypto';

const COOKIE = 'gn_session';

function secret() {
  const s = process.env.ACCOUNT_SECRET;
  if (!s || s.length < 16) throw new Error('ACCOUNT_SECRET ausente ou curto (mín. 16 caracteres).');
  return s;
}
const hmac = data => crypto.createHmac('sha256', secret()).update(data).digest();

function check(base) {
  return String(hmac('id:' + base).readUInt32BE(0) % 1000).padStart(3, '0');
}

export function newId() {
  let base = String(crypto.randomInt(1, 10));
  while (base.length < 9) base += String(crypto.randomInt(0, 10));
  return base + check(base);
}

export function cleanId(raw) { return String(raw || '').replace(/\D/g, ''); }

export function validId(id) {
  if (!/^\d{12}$/.test(id)) return false;
  return crypto.timingSafeEqual(Buffer.from(check(id.slice(0, 9))), Buffer.from(id.slice(9)));
}

export function sessionCookie(id) {
  const exp = Date.now() + 365 * 864e5;
  const payload = `${id}.${exp}`;
  const sig = hmac('session:' + payload).toString('base64url');
  return `${COOKIE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${365 * 86400}`;
}
export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function readSession(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [id, exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!id || !exp || !sig) return null;
  const good = hmac(`session:${id}.${exp}`).toString('base64url');
  if (good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) return null;
  if (Number(exp) < Date.now() || !validId(id)) return null;
  return id;
}

export function isAdmin(id) {
  if (!id) return false;
  return (process.env.ADMIN_ID || '').split(',').map(cleanId).filter(Boolean).includes(id);
}

// ---- Limites do plano grátis (cookie assinado): 3 por dia e 15 por semana ----
const USAGE = 'gn_usage';
export const FREE_DAILY = 3;
export const FREE_WEEKLY = 15;

export function today() {
  // dia no horário de Brasília
  return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
}
export function weekKey() {
  // segunda-feira da semana atual (horário de Brasília)
  const d = new Date(Date.now() - 3 * 3600e3);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function readUsage(req) {
  const raw = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(USAGE + '='));
  const day = today(), week = weekKey();
  const fresh = { day, used: 0, week, weekUsed: 0 };
  if (!raw) return fresh;
  const parts = raw.slice(USAGE.length + 1).split('.');
  const sig = parts.pop();
  const payload = parts.join('.');
  const good = hmac('usage:' + payload).toString('base64url');
  if (!sig || good.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(sig))) {
    return { day, used: FREE_DAILY, week, weekUsed: FREE_WEEKLY }; // cookie adulterado
  }
  const [d, used, w, weekUsed] = parts;
  return {
    day, week,
    used: d === day ? Math.min(Number(used) || 0, FREE_DAILY) : 0,
    weekUsed: w === week ? Math.min(Number(weekUsed) || 0, FREE_WEEKLY) : 0,
  };
}

export function usageCookie(u) {
  const payload = `${u.day}.${u.used}.${u.week}.${u.weekUsed}`;
  const sig = hmac('usage:' + payload).toString('base64url');
  return `${USAGE}=${payload}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${8 * 86400}`;
}
