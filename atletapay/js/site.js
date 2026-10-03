/* site.js — vitrine: planos, simulador, menu e os números do placar. Sem Firebase. */
import { PLANOS, planoPara, brl } from './catalogo.js?v=20261002';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);
const TARIFA_PIX = 1.99; // tarifa de referência do meio de pagamento por cobrança (Asaas), só para o simulador

// Menu no celular
const hamb = el('hamb'); const menu = el('menu');
hamb.addEventListener('click', () => { const aberto = menu.classList.toggle('aberto'); hamb.setAttribute('aria-expanded', String(aberto)); });
menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('aberto'); hamb.setAttribute('aria-expanded', 'false'); } });

// Planos
function desenharPlanos(selecionado) {
  el('listaPlanos').innerHTML = PLANOS.map((p) => `
    <article class="plano${p.destaque ? ' destaque' : ''}${p.id === selecionado ? ' selecionado' : ''}" id="plano-${p.id}">
      ${p.destaque ? '<span class="tag">Mais escolhido</span>' : ''}
      <div><div class="nome">${esc(p.nome)}</div><div class="ate">${p.ate ? `até ${p.ate} alunos ativos` : 'alunos ilimitados'} · ${esc(p.frase)}</div></div>
      <div class="preco">${p.mensal ? brl(p.mensal) : 'Grátis'}<small>${p.mensal ? '/mês' : ' sem mensalidade'}</small></div>
      <div class="split">+ ${brl(p.split)} por aluno pago, descontado na mensalidade dele</div>
      <ul>${p.itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      <a class="bt ${p.destaque ? 'bt-laranja' : 'bt-indigo'}" href="cadastro.html?plano=${p.id}">Começar no ${esc(p.nome)}</a>
    </article>`).join('');
}

// Simulador: quanto a escola paga e quanto recebe por mensalidade.
function simular() {
  const n = Number(el('simAlunos').value); const ticket = Number(el('simTicket').value);
  const p = planoPara(n);
  el('simN').textContent = n; el('simTicketTxt').textContent = brl(ticket);
  const splitMes = n * p.split; const fixo = p.mensal; const total = fixo + splitMes;
  const liquidoAluno = ticket - TARIFA_PIX - p.split;
  const faturamento = n * ticket; const pct = faturamento ? (total / faturamento) * 100 : 0;
  el('simRes').innerHTML = `
    <div class="item"><span>Plano indicado</span><b>${esc(p.nome)}</b></div>
    <div class="item"><span>Mensalidade do plano</span><b>${p.mensal ? brl(p.mensal) : 'Grátis'}</b></div>
    <div class="item"><span>Split (${n} alunos × ${brl(p.split)})</span><b>${brl(splitMes)}</b></div>
    <div class="item total"><span>Custo mensal da plataforma</span><b>${brl(total)}</b></div>
    <div class="item"><span>Isso é</span><b>${pct.toFixed(1).replace('.', ',')}% do que você fatura</b></div>
    <div class="item"><span>A academia recebe por mensalidade de ${brl(ticket)}</span><b>${brl(Math.max(0, liquidoAluno))}</b></div>
    <small style="color:var(--texto-3);font-size:.76rem;line-height:1.5">Inclui tarifa de referência do Pix de ${brl(TARIFA_PIX)} por cobrança, paga ao meio de pagamento, não à AtletaPay.</small>`;
  desenharPlanos(p.id);
}
['simAlunos', 'simTicket'].forEach((id) => el(id).addEventListener('input', simular));
simular();

// Placar do herói: números sobem quando a página abre.
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
document.querySelectorAll('[data-conta]').forEach((n) => {
  const alvo = Number(n.dataset.conta); const pre = n.dataset.prefixo || ''; const suf = n.dataset.sufixo || '';
  const fmt = (v) => `${pre}${Math.round(v).toLocaleString('pt-BR')}${suf}`;
  if (semMovimento) { n.textContent = fmt(alvo); return; }
  const ini = performance.now(); const dur = 1400;
  const tic = (t) => { const k = Math.min(1, (t - ini) / dur); const e = 1 - Math.pow(1 - k, 3); n.textContent = fmt(alvo * e); if (k < 1) requestAnimationFrame(tic); };
  requestAnimationFrame(tic);
});
setTimeout(() => document.querySelectorAll('[data-largura]').forEach((b) => { b.style.width = `${b.dataset.largura}%`; }), 300);
