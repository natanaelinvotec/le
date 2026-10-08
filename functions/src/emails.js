// E-mails da própria plataforma (nova senha e confirmação de e-mail).
//
// Por quê: o Firebase não deixa editar os modelos de e-mail deste projeto (o
// link sai em capoeira-liberdade.firebaseapp.com e o texto é o genérico). Aqui
// o SERVIDOR gera o link oficial (Admin SDK: generatePasswordResetLink), troca o
// endereço para atletapay.com.br/conta (nossa página) e manda um e-mail com a cara
// da escola da pessoa, saindo de noreply@atletapay.com.br por um serviço de envio
// (Resend ou Brevo — a chave fica em segredos/email, que ninguém lê pelo app).
//
// Fluxo: o app grava pedidosEmail/{id} {tipo, email, voltarPara} → este gatilho
// atende e APAGA o pedido. Sem serviço configurado, o app nem grava o pedido:
// usa o e-mail padrão do Firebase (plataforma/publico.emailsProprios = false).
// Proteções: limite por e-mail (3/hora, 6/dia) e geral (300/hora); e-mail que
// não tem conta não recebe nada e o app responde igual (não revela quem tem conta).
import { createHash } from 'node:crypto';
import { ESCOLA_PADRAO } from './escolas.js';

export const URL_CONTA = 'https://atletapay.com.br/conta';
// Para onde o link pode devolver a pessoa (mesma lista de atletapay/js/conta.js).
export const HOSTS_VOLTA = ['atletapay.com.br', 'www.atletapay.com.br', 'atletapay.web.app', 'atletapay.firebaseapp.com',
  'liberdadeeexpressao.com.br', 'www.liberdadeeexpressao.com.br', 'capoeira-liberdade.web.app', 'capoeira-liberdade.firebaseapp.com'];
const EMAIL_OK = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9.-]{1,180}\.[a-z]{2,24}$/i;
const LIMITE = { hora: 3, dia: 6, geralHora: 300 };
const LOGO_LIBERDADE = 'https://liberdadeeexpressao.com.br/assets/logo-liberdade150.png';

export const hashEmail = (e) => createHash('sha256').update(String(e).trim().toLowerCase()).digest('hex').slice(0, 40);
export function voltaSegura(url) {
  try { const u = new URL(url); return u.protocol === 'https:' && HOSTS_VOLTA.includes(u.hostname) ? u.href : null; } catch (e) { return null; }
}
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Troca o link do Firebase (…firebaseapp.com/__/auth/action?mode=…&oobCode=…) pelo nosso.
export function linkDaPlataforma(linkFirebase, modo) {
  const u = new URL(linkFirebase);
  const codigo = u.searchParams.get('oobCode');
  if (!codigo) throw new Error('Link do Firebase sem código.');
  const nosso = new URL(URL_CONTA);
  nosso.searchParams.set('mode', u.searchParams.get('mode') || modo);
  nosso.searchParams.set('oobCode', codigo);
  const volta = voltaSegura(u.searchParams.get('continueUrl') || '');
  if (volta) nosso.searchParams.set('continueUrl', volta);
  nosso.searchParams.set('lang', 'pt-BR');
  return nosso.href;
}

// Limites (contador por e-mail e geral). Devolve true se pode enviar (e já conta o envio).
export async function dentroDoLimite(ctx, email, agora = Date.now()) {
  const ref = ctx.db.doc(`limitesEmail/${hashEmail(email)}`);
  const s = await ref.get();
  const envios = (s.exists && Array.isArray(s.data().envios) ? s.data().envios : []).filter((t) => agora - t < 86400000);
  if (envios.filter((t) => agora - t < 3600000).length >= LIMITE.hora || envios.length >= LIMITE.dia) return false;
  const horaId = new Date(agora).toISOString().slice(0, 13);
  const gref = ctx.db.doc('limitesEmail/_geral');
  const g = await gref.get();
  const n = g.exists && g.data().hora === horaId ? Number(g.data().n) || 0 : 0;
  if (n >= LIMITE.geralHora) return false;
  await gref.set({ hora: horaId, n: n + 1 });
  await ref.set({ envios: [...envios, agora], atualizadoEm: new Date(agora).toISOString() });
  return true;
}

// Cara do e-mail: a escola da pessoa (cartão público) ou a AtletaPay.
export async function marcaDoEmail(ctx, email) {
  const padrao = { nome: 'AtletaPay', curto: 'AtletaPay', logo: null, cor: '#1E2A78', acento: '#FF7A1A' };
  let uid = null;
  try { uid = (await ctx.auth.getUserByEmail(email)).uid; } catch (e) { return { ...padrao, existe: false }; }
  try {
    const u = await ctx.db.doc(`usuarios/${uid}`).get();
    const escolaId = u.exists ? (u.data().escolaId || ESCOLA_PADRAO) : null;
    if (!escolaId) return { ...padrao, existe: true };
    const p = await ctx.db.doc(`escolasPublicas/${escolaId}`).get();
    const e = p.exists ? p.data() : {};
    const ehLib = escolaId === ESCOLA_PADRAO;
    return {
      existe: true, escolaId, nome: e.nome || (ehLib ? 'Capoeira Liberdade e Expressão' : padrao.nome), curto: e.nomeCurto || e.nome || padrao.curto,
      logo: /^https:\/\//.test(e.logo || '') ? e.logo : (ehLib ? LOGO_LIBERDADE : null),
      cor: (e.cores && e.cores.navy) || (ehLib ? '#002D72' : padrao.cor), acento: (e.cores && e.cores.verde) || (ehLib ? '#00E676' : padrao.acento),
    };
  } catch (e) { return { ...padrao, existe: true }; }
}

export function montarEmail(tipo, { link, marca }) {
  const senha = tipo === 'senha';
  const titulo = senha ? 'Crie uma senha nova' : 'Confirme seu e-mail';
  const texto = senha
    ? 'Recebemos um pedido para criar uma senha nova para a sua conta. Toque no botão abaixo para escolher a senha.'
    : 'Toque no botão abaixo para confirmar que este e-mail é seu.';
  const botao = senha ? 'Criar senha nova' : 'Confirmar e-mail';
  const aviso = senha
    ? 'O link vale por 1 hora e só funciona uma vez. Se não foi você que pediu, ignore este e-mail: a sua senha continua a mesma.'
    : 'Se você não criou uma conta, ignore este e-mail.';
  const assunto = `${titulo} · ${marca.curto}`;
  const cab = marca.logo
    ? `<img src="${esc(marca.logo)}" width="56" height="56" alt="${esc(marca.curto)}" style="display:block;border-radius:14px;object-fit:contain;background:#fff">`
    : `<div style="width:56px;height:56px;border-radius:14px;background:${esc(marca.cor)};color:#fff;font:700 22px/56px Arial,sans-serif;text-align:center">${esc(String(marca.curto).slice(0, 2).toUpperCase())}</div>`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F2F0EA;font-family:Arial,Helvetica,sans-serif;color:#0B0E1F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F0EA;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #E5E2D8">
<tr><td style="height:6px;background:${esc(marca.acento)}"></td></tr>
<tr><td style="padding:28px 28px 8px">${cab}<p style="margin:18px 0 4px;font-size:13px;color:#7B8098;font-weight:bold;letter-spacing:.06em;text-transform:uppercase">${esc(marca.nome)}</p>
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2">${titulo}</h1>
<p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#4A4F66">${texto}</p>
<a href="${esc(link)}" style="display:inline-block;background:${esc(marca.cor)};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 26px;border-radius:12px">${botao}</a>
<p style="margin:22px 0 0;font-size:13px;line-height:1.5;color:#7B8098">${aviso}</p></td></tr>
<tr><td style="padding:18px 28px 26px;font-size:12px;color:#7B8098;border-top:1px solid #EFEDE6">Se o botão não abrir, copie este endereço no navegador:<br><span style="word-break:break-all;color:#4A4F66">${esc(link)}</span></td></tr>
</table><p style="font-size:11px;color:#9A9EB0;margin:14px 0 0">${esc(marca.nome)} · enviado pela AtletaPay</p></td></tr></table></body></html>`;
  const txt = `${marca.nome}\n\n${titulo}\n\n${texto}\n\n${link}\n\n${aviso}\n\nEnviado pela AtletaPay`;
  return { assunto, html, txt };
}

// Envio pelo serviço configurado. ctx.fetch existe nos testes; em produção, o fetch do Node.
export async function enviar(ctx, cfg, { para, assunto, html, txt }) {
  const f = ctx.fetch || fetch;
  const remetente = cfg.remetente || 'noreply@atletapay.com.br';
  const nome = cfg.nomeRemetente || 'AtletaPay';
  let r;
  if (cfg.provedor === 'brevo') {
    r = await f('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': cfg.chave, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: nome, email: remetente }, to: [{ email: para }], subject: assunto, htmlContent: html, textContent: txt }) });
  } else {
    r = await f('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${cfg.chave}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: `${nome} <${remetente}>`, to: [para], subject: assunto, html, text: txt }) });
  }
  if (!r.ok) {
    let corpo = ''; try { corpo = (await r.text()).slice(0, 300); } catch (e) { /* ok */ }
    throw new Error(`Serviço de e-mail respondeu ${r.status}: ${corpo}`);
  }
  return true;
}

export async function configEmail(ctx) {
  const s = await ctx.db.doc('segredos/email').get();
  const c = s.exists ? s.data() : null;
  // "desligado-pelo-admin" = o Admin desligou pelo Mega painel (a chave real foi sobrescrita).
  return c && c.chave && !/^desligado/.test(c.chave) && ['resend', 'brevo'].includes(c.provedor) ? c : null;
}

// Gatilho de pedidosEmail/{id}. Devolve o que aconteceu (para os testes).
export async function atenderPedidoEmail(ctx, id, p) {
  const ref = ctx.db.doc(`pedidosEmail/${id}`);
  const fim = async (r) => { await ref.delete().catch(() => {}); return r; };
  if (!p) return null;
  const email = String(p.email || '').trim().toLowerCase();
  const tipo = p.tipo === 'confirmar' ? 'confirmar' : 'senha';
  if (!EMAIL_OK.test(email)) return fim('email-invalido');
  const cfg = await configEmail(ctx);
  if (!cfg) return fim('sem-servico');
  if (!(await dentroDoLimite(ctx, email))) return fim('limite');
  const marca = await marcaDoEmail(ctx, email);
  if (!marca.existe) return fim('sem-conta'); // não revela: o app mostra a mesma mensagem
  const volta = voltaSegura(p.voltarPara || '');
  const ajustes = volta ? { url: volta } : undefined;
  let linkFb;
  try {
    linkFb = tipo === 'senha' ? await ctx.auth.generatePasswordResetLink(email, ajustes) : await ctx.auth.generateEmailVerificationLink(email, ajustes);
  } catch (e) {
    if (ajustes && /continue|unauthorized|domain/i.test(String(e && (e.code || e.message)))) linkFb = tipo === 'senha' ? await ctx.auth.generatePasswordResetLink(email) : await ctx.auth.generateEmailVerificationLink(email);
    else throw e;
  }
  const link = linkDaPlataforma(linkFb, tipo === 'senha' ? 'resetPassword' : 'verifyEmail');
  const m = montarEmail(tipo, { link, marca });
  await enviar(ctx, cfg, { para: email, ...m });
  return fim('enviado');
}

// Pedido "Testar e-mail" do Mega painel: manda um e-mail de teste ao próprio Admin e
// liga (ou desliga) os e-mails próprios para o app inteiro.
export async function testarEmail(ctx, emailAdmin) {
  const cfg = await configEmail(ctx);
  const pub = ctx.db.doc('plataforma/publico');
  if (!cfg) { await pub.set({ emailsProprios: false, atualizadoEm: new Date().toISOString() }, { merge: true }); throw new Error('Configure o serviço e a chave antes de testar.'); }
  const marca = { nome: 'AtletaPay', curto: 'AtletaPay', logo: null, cor: '#1E2A78', acento: '#FF7A1A' };
  const m = montarEmail('senha', { link: `${URL_CONTA}?teste=1`, marca });
  try {
    await enviar(ctx, cfg, { para: emailAdmin, assunto: 'Teste de e-mail · AtletaPay', html: m.html.replace('Crie uma senha nova', 'E-mail funcionando'), txt: m.txt });
  } catch (e) {
    await pub.set({ emailsProprios: false, erroEmail: String(e.message || e).slice(0, 300), atualizadoEm: new Date().toISOString() }, { merge: true });
    throw e;
  }
  await pub.set({ emailsProprios: true, provedorEmail: cfg.provedor, remetenteEmail: cfg.remetente || 'noreply@atletapay.com.br', nomeRemetente: cfg.nomeRemetente || 'AtletaPay', erroEmail: null, testadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }, { merge: true });
  return { enviadoPara: emailAdmin, provedor: cfg.provedor };
}
