/* apresentacao.js — entrada cinematográfica dos responsáveis de núcleo.

Um módulo só, usado no painel (cartão do responsável), no app do aluno (botão
no nome da academia) e na Rede (perfil e página do núcleo).

Onde fica o vídeo: nucleos/{id}.apresentacao = { videoUrl, inicioNome?, duracao?,
atualizadoEm, porNome }. O documento do núcleo é de leitura pública, então o
aluno consegue ver a apresentação do próprio núcleo sem ler o cadastro do
professor. Sem videoUrl, nada aparece (o cartão continua como hoje, com a foto
clássica do cadastro).

Roteiro (proporcional à duração do vídeo; inicioNome ajusta vídeos com
abertura longa, ex.: drone): faixas de cinema + "apresenta" → cargo e nome →
corda do cordão → selos → saída com a luz do Céu Claro → fecha num círculo
sobre a foto do cartão (alvo) ou some em fade quando não há alvo. */

const CSS = `
.apr{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;font-family:'Manrope',system-ui,sans-serif;clip-path:circle(150% at 50% 50%);transition:clip-path .95s cubic-bezier(.7,0,.2,1),opacity .35s linear}
.apr.fechando{clip-path:circle(var(--r,40px) at var(--x,50%) var(--y,30%))}
.apr.sumindo{opacity:0}
.apr video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%;opacity:0;transform:scale(1.06);transition:opacity 1s ease,transform 9s linear}
.apr.b-inicio video{opacity:1;transform:scale(1)}
.apr.b-saida video.apr-principal{transform:scale(1.07);transition:opacity 1s ease,transform 1.6s cubic-bezier(.16,1,.3,1)}
.apr video.apr-fundo{display:none}
.apr.lado video.apr-fundo{display:block;opacity:1;filter:blur(26px) brightness(.6) saturate(1.2);transform:scale(1.25)!important;transition:none}
.apr.lado video.apr-principal{left:auto;right:8%;width:auto;height:100%;aspect-ratio:var(--ar,9/16);box-shadow:0 0 70px rgba(0,0,0,.55)}
.apr-grade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,26,77,.55) 0%,transparent 26%,transparent 52%,rgba(0,26,77,.8) 100%)}
.apr.lado .apr-grade{background:linear-gradient(90deg,rgba(0,26,77,.75) 0%,rgba(0,26,77,.25) 48%,transparent 60%),linear-gradient(180deg,transparent 60%,rgba(0,26,77,.6) 100%)}
.apr-faixa{position:absolute;left:0;right:0;height:0;background:#000;z-index:3;transition:height .9s cubic-bezier(.16,1,.3,1)}
.apr-faixa.c{top:0}.apr-faixa.b{bottom:0}
.apr.b-inicio .apr-faixa{height:7%}.apr.b-saida .apr-faixa{height:0}
.apr-luz{position:absolute;inset:-10%;pointer-events:none;opacity:0;transition:opacity 1.2s ease;mix-blend-mode:screen;filter:blur(20px);background:radial-gradient(40% 30% at 20% 20%,rgba(61,139,255,.55),transparent 70%),radial-gradient(35% 25% at 85% 10%,rgba(0,230,118,.45),transparent 70%)}
.apr.b-saida .apr-luz{opacity:1}
.apr-prog{position:absolute;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#00E676,#3D8BFF);z-index:6}
.apr-apresenta{position:absolute;left:0;right:0;top:calc(7% + 44px);text-align:center;z-index:4;opacity:0;transform:translateY(-8px);transition:all .9s cubic-bezier(.16,1,.3,1)}
.apr.lado .apr-apresenta{top:auto;bottom:48%;left:6%;right:50%;text-align:left}
.apr-apresenta img{width:40px;height:40px;display:block;margin:0 auto 8px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.45))}
.apr.lado .apr-apresenta img{margin:0 0 10px;width:52px;height:52px}
.apr-apresenta span{font-size:.62rem;font-weight:800;letter-spacing:.3em;text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,.5)}
.apr.b-apresenta .apr-apresenta{opacity:1;transform:none}
.apr.b-nome .apr-apresenta{opacity:0}
.apr-legenda{position:absolute;left:20px;right:20px;bottom:calc(7% + 24px);z-index:4;transition:all .7s ease}
.apr.lado .apr-legenda{left:6%;right:50%;bottom:calc(7% + 40px)}
.apr-cargo{font-size:.64rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#F5B942;opacity:0;transform:translateX(-12px);transition:all .8s cubic-bezier(.16,1,.3,1)}
.apr-nome{font-family:'Sora',system-ui,sans-serif;font-weight:800;font-size:clamp(2rem,9vw,3.6rem);line-height:1.02;letter-spacing:-.02em;margin-top:4px;clip-path:inset(0 100% 0 0);transition:clip-path 1.2s cubic-bezier(.7,0,.2,1);text-shadow:0 6px 24px rgba(0,0,0,.45)}
.apr.lado .apr-nome{font-size:clamp(2.4rem,5vw,4.2rem)}
.apr-fio{height:7px;border-radius:7px;margin-top:12px;width:0;box-shadow:0 0 14px rgba(255,255,255,.35);transition:width 1.4s cubic-bezier(.16,1,.3,1);background:repeating-linear-gradient(45deg,var(--c1,#fff) 0,var(--c1,#fff) 8px,var(--c2,#D32F2F) 8px,var(--c2,#D32F2F) 16px,var(--c3,#fff) 16px,var(--c3,#fff) 24px)}
.apr.b-nome .apr-cargo{opacity:1;transform:none}
.apr.b-nome .apr-nome{clip-path:inset(0 0 0 0)}
.apr.b-cordao .apr-fio{width:72%}
.apr-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.apr-chips span{font-size:.68rem;font-weight:800;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transform:translateY(8px);transition:all .6s cubic-bezier(.16,1,.3,1)}
.apr-chips span.ouro{background:linear-gradient(180deg,#F5C24A,#DAA520);color:#241900;border-color:transparent}
.apr.b-chips .apr-chips span{opacity:1;transform:none}
.apr.b-chips .apr-chips span:nth-child(2){transition-delay:.25s}.apr.b-chips .apr-chips span:nth-child(3){transition-delay:.5s}.apr.b-chips .apr-chips span:nth-child(4){transition-delay:.75s}
.apr.b-saida .apr-legenda{opacity:0;transform:translateY(10px)}
.apr-ctrl{position:absolute;top:calc(7% + 12px);right:14px;display:flex;gap:8px;z-index:7;opacity:0;transition:opacity .4s}
.apr.b-inicio .apr-ctrl{opacity:1}
.apr-ctrl button{border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.38);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;font:800 .72rem 'Manrope',system-ui,sans-serif;padding:8px 13px;border-radius:999px;cursor:pointer}
.apr-ctrl button:focus-visible{outline:2px solid #00E676;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.apr video{transform:none!important;transition:opacity .3s}.apr-nome{transition:none}.apr{transition:opacity .3s}}
`;

let cssInjetado = false;
function injetarCss() {
if (cssInjetado) return; cssInjetado = true;
const st = document.createElement('style'); st.id = 'apresentacao-css'; st.textContent = CSS; document.head.appendChild(st);
}
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"'`=/]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[c]));

export function temApresentacao(nucleo) { return !!(nucleo && nucleo.apresentacao && nucleo.apresentacao.videoUrl); }

// Movimento reduzido ou economia de dados: não abre sozinho (o botão continua).
export function podeAbrirSozinho() {
try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; } catch (e) { /* ok */ }
try { if (navigator.connection && navigator.connection.saveData) return false; } catch (e) { /* ok */ }
return true;
}
// Uma vez por dia por pessoa/vídeo (a chave muda quando o vídeo é trocado).
function chaveDia(chave) { const d = new Date(); return `apr.${chave}.${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
export function jaViuHoje(chave) { try { return localStorage.getItem(chaveDia(chave)) === '1'; } catch (e) { return false; } }
export function marcarVistoHoje(chave) { try { localStorage.setItem(chaveDia(chave), '1'); } catch (e) { /* ok */ } }

let aberta = null;

/* opts: { videoUrl, inicioNome?, cargo, nome, chips:[{texto, ouro?}], corda:[c1,c2,c3],
   alvo?: HTMLElement (foto onde a imagem se fecha), comSom?: bool, logoUrl? }
   Devolve uma Promise que resolve quando a apresentação fecha. */
export function abrirApresentacao(opts) {
if (aberta) return aberta;
injetarCss();
const o = opts || {};
const corda = o.corda || ['#FFFFFF', '#D32F2F', '#FFFFFF'];
const el = document.createElement('div');
el.className = 'apr';
el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Apresentação de ${o.nome || ''}`);
el.style.setProperty('--c1', corda[0]); el.style.setProperty('--c2', corda[1]); el.style.setProperty('--c3', corda[2]);
const partesNome = String(o.nome || '').trim().split(/\s+/);
const nomeHtml = partesNome.length > 1 ? `${esc(partesNome[0])}<br>${esc(partesNome.slice(1).join(' '))}` : esc(o.nome || '');
el.innerHTML = `
<video class="apr-fundo" muted playsinline preload="auto" aria-hidden="true"></video>
<video class="apr-principal" playsinline preload="auto"></video>
<div class="apr-grade"></div><div class="apr-luz"></div>
<div class="apr-faixa c"></div><div class="apr-faixa b"></div>
<div class="apr-prog"></div>
<div class="apr-apresenta"><img src="${esc(o.logoUrl || 'logo-liberdade150.png')}" alt=""><span>Capoeira Liberdade e Expressão apresenta</span></div>
<div class="apr-legenda"><div class="apr-cargo">${esc(o.cargo || '')}</div><div class="apr-nome">${nomeHtml}</div><div class="apr-fio"></div>
<div class="apr-chips">${(o.chips || []).filter((c) => c && c.texto).slice(0, 4).map((c) => `<span class="${c.ouro ? 'ouro' : ''}">${esc(c.texto)}</span>`).join('')}</div></div>
<div class="apr-ctrl"><button type="button" data-apr="som"></button><button type="button" data-apr="pular">Pular ›</button></div>`;
document.body.appendChild(el);
const video = el.querySelector('.apr-principal');
const fundo = el.querySelector('.apr-fundo');
const prog = el.querySelector('.apr-prog');
const btnSom = el.querySelector('[data-apr="som"]');
const overflowAntes = document.body.style.overflow; document.body.style.overflow = 'hidden';
let raf = null; let fechou = false; let beats = null;

aberta = new Promise((resolve) => {
function finalizar() { cancelAnimationFrame(raf); try { video.pause(); fundo.pause(); } catch (e) { /* ok */ } el.remove(); document.body.style.overflow = overflowAntes; document.removeEventListener('keydown', teclado); aberta = null; resolve(); }
function fechar() {
if (fechou) return; fechou = true; cancelAnimationFrame(raf);
el.classList.add('b-saida');
const alvo = o.alvo && o.alvo.isConnected ? o.alvo.getBoundingClientRect() : null;
if (alvo && alvo.width && alvo.bottom > 0 && alvo.top < window.innerHeight) {
el.style.setProperty('--x', `${alvo.left + alvo.width / 2}px`); el.style.setProperty('--y', `${alvo.top + alvo.height / 2}px`); el.style.setProperty('--r', `${alvo.width / 2}px`);
el.classList.add('fechando');
setTimeout(() => { el.classList.add('sumindo'); }, 880);
setTimeout(finalizar, 1250);
} else { el.classList.add('sumindo'); setTimeout(finalizar, 400); }
}
function montarBeats(d) {
const nome = Math.max(0.9, Math.min(Number(o.inicioNome) > 0 ? Number(o.inicioNome) : d * 0.4, d - 3.2));
beats = [['b-inicio', 0.05], ['b-apresenta', 0.5], ['b-nome', nome], ['b-cordao', nome + 0.6], ['b-chips', nome + 1.4], ['b-saida', Math.max(nome + 2.6, d - 1.2)]];
}
function tick() {
const d = video.duration || 8; const t = video.currentTime;
if (!beats) montarBeats(d);
prog.style.width = `${Math.min(100, (t / d) * 100)}%`;
beats.forEach((b) => { if (t >= b[1]) el.classList.add(b[0]); });
if (t >= d - 0.45) { fechar(); return; }
raf = requestAnimationFrame(tick);
}
function som() { btnSom.textContent = video.muted ? '🔇 Ativar som' : '🔊 Som'; }
function teclado(ev) { if (ev.key === 'Escape') fechar(); }
document.addEventListener('keydown', teclado);
btnSom.addEventListener('click', () => { video.muted = !video.muted; som(); });
el.querySelector('[data-apr="pular"]').addEventListener('click', fechar);
video.addEventListener('ended', fechar);
video.addEventListener('error', fechar);
video.addEventListener('loadedmetadata', () => {
// vídeo em pé numa tela deitada (computador): vídeo à direita + cópia desfocada no fundo
const arV = video.videoWidth / Math.max(1, video.videoHeight); const arT = window.innerWidth / Math.max(1, window.innerHeight);
if (arV < 0.9 && arT > 1.15) { el.classList.add('lado'); el.style.setProperty('--ar', `${video.videoWidth}/${video.videoHeight}`); }
montarBeats(video.duration || 8);
});
video.muted = !o.comSom; som();
video.src = o.videoUrl; fundo.src = o.videoUrl;
const p = video.play();
if (p && p.catch) p.catch(() => { video.muted = true; som(); video.play().catch(fechar); });
const pf = fundo.play(); if (pf && pf.catch) pf.catch(() => {});
setTimeout(() => { const b = el.querySelector('[data-apr="pular"]'); if (b) b.focus({ preventScroll: true }); }, 400);
raf = requestAnimationFrame(tick);
// trava de segurança: se nada tocar em 25 s, fecha
setTimeout(() => { if (!fechou && video.currentTime < 0.1) fechar(); }, 25000);
});
return aberta;
}

// Textos da apresentação a partir de dados do cadastro (usado por todas as telas).
export function textoCargo(pessoa, titulo) {
if (titulo) return `${titulo} · Responsável do núcleo`; // ex.: "Professora", definido no painel
if (!pessoa) return 'Responsável do núcleo';
if (pessoa.fundador || pessoa.acessoGeral) return 'Mestre · Fundador do grupo';
const c = String(pessoa.cordaoAtual || '');
const t = /mestre/i.test(c) ? 'Mestre' : (/professor/i.test(c) ? 'Professor' : (/instrutor/i.test(c) ? 'Instrutor' : ''));
return t ? `${t} · Responsável do núcleo` : 'Responsável do núcleo';
}
