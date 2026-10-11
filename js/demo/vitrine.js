/* vitrine.js — a "moldura" da demonstração pública (atletapay.com.br/demo e /demo/fundador).

Só é carregado pelas páginas geradas por tools/montar-dist.mjs (demo.html e demo-fundador.html).
- Faixa fixa no topo: deixa claro que é uma escola fictícia, que nada é salvo, e leva aos planos.
- Links: Painel de Gestão ↔ Painel do Fundador continuam DENTRO da demonstração; qualquer outra
  tela do app (Rede, carteirinha, login…) mostra um aviso em vez de abrir o app de verdade.
- No Painel de Gestão, abre já no núcleo sede para mostrar o seletor de turmas (várias artes). */
const TELAS_DA_DEMO = { 'admin.html': '/demo', 'master.html': '/demo/fundador' };
const PAGINA = /fundador/.test(location.pathname) ? 'fundador' : 'painel';

try { sessionStorage.setItem('apr.visto.demo-rafael', '1'); } catch (e) { /* ok */ }

function estilo() {
  const css = `
  .demo-faixa{position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;
    padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(0,45,114,.92);color:#fff;font:600 13px/1.3 'Nunito','Montserrat',system-ui,sans-serif;
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 -8px 30px rgba(0,45,114,.25);transform:translateY(100%);animation:demoSobe .7s cubic-bezier(0.16,1,0.3,1) .4s forwards}
  .demo-faixa b{color:#00E676;letter-spacing:.08em;text-transform:uppercase;font-size:11px}
  .demo-faixa .demo-txt{opacity:.92;text-align:center}
  .demo-faixa a{display:inline-block;padding:8px 14px;white-space:nowrap;border-radius:999px;text-decoration:none;font-weight:800;font-size:12.5px;transition:transform .3s cubic-bezier(0.16,1,0.3,1),background .3s}
  .demo-faixa a:hover{transform:translateY(-2px)}
  .demo-faixa a i{margin-right:6px}
  .demo-faixa .demo-ir{background:rgba(255,255,255,.14);color:#fff}
  .demo-faixa .demo-cta{background:#00E676;color:#002D72}
  .demo-aviso{position:fixed;left:50%;bottom:84px;z-index:100000;transform:translate(-50%,20px);opacity:0;max-width:min(420px,calc(100vw - 32px));padding:12px 16px;border-radius:14px;
    background:#fff;color:#002D72;font:700 13.5px/1.4 'Nunito',system-ui,sans-serif;box-shadow:0 18px 40px rgba(0,45,114,.25);transition:all .45s cubic-bezier(0.16,1,0.3,1);text-align:center}
  .demo-aviso.on{opacity:1;transform:translate(-50%,0)}
  body{padding-bottom:64px}
  @media (max-width:640px){.demo-faixa{gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom))}.demo-faixa .demo-txt,.demo-faixa .demo-longo{display:none}.demo-faixa a{padding:7px 11px;font-size:12px}.demo-aviso{bottom:70px}}
  @keyframes demoSobe{to{transform:none}}
  @media (prefers-reduced-motion:reduce){.demo-faixa{animation:none;transform:none}.demo-aviso{transition:none}}`;
  const s = document.createElement('style'); s.id = 'demo-estilo'; s.textContent = css; document.head.appendChild(s);
}

function faixa() {
  const f = document.createElement('div');
  f.className = 'demo-faixa';
  f.setAttribute('role', 'region');
  f.setAttribute('aria-label', 'Demonstração');
  const outro = PAGINA === 'painel'
    ? '<a class="demo-ir" href="/demo/fundador"><i class="fas fa-crown"></i> <span class="demo-longo">Ver o </span>Painel do Fundador</a>'
    : '<a class="demo-ir" href="/demo"><i class="fas fa-table-columns"></i> <span class="demo-longo">Ver o </span>Painel de Gestão</a>';
  f.innerHTML = `<b>Demonstração</b><span class="demo-txt">Academia Horizonte é uma escola fictícia: mexa à vontade, nada é salvo.</span>${outro}<a class="demo-cta" href="/#planos">Quero<span class="demo-longo"> o AtletaPay</span> na minha escola</a>`;
  document.body.appendChild(f);
}

let tempoAviso = null;
function aviso(texto) {
  let a = document.querySelector('.demo-aviso');
  if (!a) { a = document.createElement('div'); a.className = 'demo-aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
  a.textContent = texto;
  requestAnimationFrame(() => a.classList.add('on'));
  clearTimeout(tempoAviso);
  tempoAviso = setTimeout(() => a.classList.remove('on'), 3200);
}

// Links internos: ficam na demonstração ou viram aviso. Capturado antes dos outros cliques.
document.addEventListener('click', (e) => {
  const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
  if (!a || a.closest('.demo-faixa')) return;
  const bruto = a.getAttribute('href') || '';
  if (!bruto || bruto.startsWith('#') || /^(javascript:|mailto:|tel:)/i.test(bruto)) return;
  let u; try { u = new URL(a.href, location.href); } catch (err) { return; }
  if (u.origin !== location.origin) return;
  const tela = u.pathname.split('/').pop();
  e.preventDefault(); e.stopImmediatePropagation();
  if (TELAS_DA_DEMO[tela]) { location.assign(TELAS_DA_DEMO[tela]); return; }
  aviso('Na demonstração esta tela fica fechada. Na sua escola, ela abre com os seus alunos.');
}, true);

// Painel de Gestão: começa no núcleo sede (o seletor de turmas aparece quando há um núcleo em foco).
function focarSede(tentativas = 40) {
  const sel = document.getElementById('filtroAcademia');
  if (sel && [...sel.options].some((o) => o.value === 'demo-sede')) {
    if (sel.value !== 'demo-sede') { sel.value = 'demo-sede'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    const pres = document.getElementById('filtroAcademiaPresenca');
    if (pres && [...pres.options].some((o) => o.value === 'demo-sede') && pres.value !== 'demo-sede') { pres.value = 'demo-sede'; pres.dispatchEvent(new Event('change', { bubbles: true })); }
    return;
  }
  if (tentativas > 0) setTimeout(() => focarSede(tentativas - 1), 250);
}

function iniciar() {
  estilo();
  faixa();
  if (PAGINA === 'painel') focarSede();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true }); else iniciar();
