/* site.js — vitrine: planos, simulador, menu e os números do placar. Sem Firebase. */
import { PLANO, alunosExtras, valorDoMes, brl } from './catalogo.js?v=20261010';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);
const TARIFA_PIX = 1.99; // tarifa de referência do meio de pagamento por cobrança (Asaas), só para o simulador

// Menu no celular
const hamb = el('hamb'); const menu = el('menu');
hamb.addEventListener('click', () => { const aberto = menu.classList.toggle('aberto'); hamb.setAttribute('aria-expanded', String(aberto)); });
menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('aberto'); hamb.setAttribute('aria-expanded', 'false'); } });

// Plano único
function desenharPlano(ativos) {
  const extras = alunosExtras(ativos);
  el('listaPlanos').innerHTML = `
    <article class="plano-unico">
      <div class="pu-preco">
        <span class="tag">Tudo incluso</span>
        <div class="nome">${esc(PLANO.nome)}</div>
        <div class="preco">${brl(PLANO.mensal)}<small>/mês</small></div>
        <div class="ate">até ${PLANO.inclusos} alunos ativos</div>
        <div class="split">Passou de ${PLANO.inclusos}? <b>+ ${brl(PLANO.porAlunoExtra)}</b> por aluno ativo a mais, contado sozinho todo mês.</div>
        <p class="pu-porque">Acima de ${PLANO.inclusos} alunos o banco de dados e o suporte crescem junto. Por isso o valor acompanha a turma, sem trocar de plano.</p>
        <a class="bt bt-laranja" href="cadastro.html">Começar 14 dias grátis <i class="fas fa-arrow-right"></i></a>
      </div>
      <div class="pu-itens">
        <b>Sistema inteiro liberado</b>
        <ul>${PLANO.itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="pu-exemplo" aria-live="polite">${extras ? `Com <b>${ativos}</b> alunos ativos: ${brl(PLANO.mensal)} + ${extras} × ${brl(PLANO.porAlunoExtra)} = <b>${brl(valorDoMes(ativos))}/mês</b>` : `Com <b>${ativos}</b> alunos ativos você paga só <b>${brl(PLANO.mensal)}/mês</b>`}</div>
      </div>
    </article>`;
}

// Simulador: quanto a escola paga e quanto recebe por mensalidade.
function simular() {
  const n = Number(el('simAlunos').value); const ticket = Number(el('simTicket').value);
  const extras = alunosExtras(n); const total = valorDoMes(n);
  el('simN').textContent = n; el('simTicketTxt').textContent = brl(ticket);
  const faturamento = n * ticket; const pct = faturamento ? (total / faturamento) * 100 : 0;
  el('simRes').innerHTML = `
    <div class="item"><span>Mensalidade (até ${PLANO.inclusos} alunos)</span><b>${brl(PLANO.mensal)}</b></div>
    <div class="item"><span>Alunos acima de ${PLANO.inclusos} (${extras} × ${brl(PLANO.porAlunoExtra)})</span><b>${brl(extras * PLANO.porAlunoExtra)}</b></div>
    <div class="item total"><span>Custo mensal da plataforma</span><b>${brl(total)}</b></div>
    <div class="item"><span>Por aluno</span><b>${brl(n ? total / n : 0)}</b></div>
    <div class="item"><span>Isso é</span><b>${pct.toFixed(1).replace('.', ',')}% do que você fatura</b></div>
    <div class="item"><span>A academia recebe por mensalidade de ${brl(ticket)}</span><b>${brl(Math.max(0, ticket - TARIFA_PIX))}</b></div>
    <small style="color:var(--texto-3);font-size:.76rem;line-height:1.5">Inclui tarifa de referência do Pix de ${brl(TARIFA_PIX)} por cobrança, paga ao meio de pagamento, não à AtletaPay.</small>`;
  desenharPlano(n);
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
