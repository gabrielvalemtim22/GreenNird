import fs from 'node:fs';
import path from 'node:path';
import { readSession, isAdmin } from './_lib/auth.js';

// Serve o painel admin somente para o dono (ADMIN_ID). Para os outros, 404.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  let id = null;
  try { id = readSession(req); } catch {}
  if (!isAdmin(id)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><meta charset="utf-8"><title>404</title><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1>404</h1><p>Página não encontrada.</p><a href="/">Voltar ao GreenNird</a></div>');
    return;
  }
  const dir = path.join(process.cwd(), 'api', '_admin');
  const html = fs.readFileSync(path.join(dir, 'admin.html'), 'utf8');
  const js = fs.readFileSync(path.join(dir, 'admin.js'), 'utf8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.statusCode = 200;
  res.end(html.replace('<script src="/api/_admin/admin.js"></script>', () => `<script>${js}</script>`));
}
