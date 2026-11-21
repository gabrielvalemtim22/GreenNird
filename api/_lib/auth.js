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
