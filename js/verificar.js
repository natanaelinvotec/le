/* verificar.js — página pública v.html#CODIGO (quem lê o QR da carteirinha).
Lê UM documento carteirinhas/{codigo} (as regras não deixam listar) com o
Firestore Lite: sem login, sem cache local, sempre o dado atual. */
import { FIREBASE_CONFIG } from './escola.js';
import { esc, situacao, dataBR, iniciais, faixas, IC } from './carteirinha-comum.js';

const raiz = document.getElementById('v');
let codigo = '';
try { codigo = decodeURIComponent(location.hash.slice(1)).trim().toUpperCase(); } catch (e) { codigo = ''; }

const CIRCULO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const CIRCULO_NAO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M12 7v6"/><path d="M12 17h.01"/></svg>';
const LGPD = `<div class="lgpd">${IC.escudo}<span>Por privacidade (LGPD), esta página mostra só o necessário para identificar o atleta. Idade, endereço, telefone e responsáveis nunca aparecem aqui.</span></div>`;

function selo(tipo, titulo, texto) {
  return `<section class="selo-v ${tipo}" aria-live="polite"><span class="circ">${tipo === 'valida' ? CIRCULO_OK : CIRCULO_NAO}</span><strong>${esc(titulo)}</strong><p>${esc(texto)}</p></section>`;
}

function desenhar(c) {
  const sit = situacao(c);
  const s = {
    valida: ['Carteirinha válida', c.controle === 'mensalidade' ? 'Atleta ativo, com a mensalidade em dia.' : 'Atleta ativo no grupo.'],
    vencida: ['Carteirinha vencida', 'A mensalidade está em aberto. Peça ao atleta para falar com o núcleo.'],
    inativa: ['Carteirinha inativa', 'Este cadastro não está ativo no grupo.'],
    semfoto: ['Ainda não vale', 'A foto desta carteirinha ainda não foi conferida pelo núcleo do atleta.'],
  }[sit];
  const validade = c.ativo === false ? 'Inativa' : c.controle === 'isento' ? 'Bolsista' : c.controle === 'mensalidade' ? (c.validaAte ? dataBR(c.validaAte) : 'Em aberto') : 'Enquanto ativo';
  const agora = new Date();
  const conferido = `${agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} · ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const foto = /^https:\/\/firebasestorage\.googleapis\.com\//.test(String(c.foto || '')) ? c.foto : '';
  document.title = `${s[0]} — ${c.nome || 'Atleta'}`;
  raiz.innerHTML = `${selo(sit === 'semfoto' ? 'nada' : sit, s[0], s[1])}
    <section class="ficha" aria-label="Dados do atleta">
      <div class="ficha-topo">
        <div class="ficha-av" style="background:${faixas(c.cores, '180deg')}"><div>${foto ? `<img src="${esc(foto)}" alt="Foto do atleta" referrerpolicy="no-referrer">` : esc(iniciais(c.nome))}</div></div>
        <span class="t"><strong>${esc(c.nome || 'Atleta')}</strong><span class="ficha-cordao"><i style="background:${faixas(c.cores)}"></i>Cordão ${esc(c.cordao || '')}</span></span>
      </div>
      <div class="ficha-campos">
        <span><b>NÚCLEO</b><em>${esc(c.nucleo || '—')}</em></span>
        <span><b>MATRÍCULA</b><em class="mono">${esc(c.matricula || '—')}</em></span>
        <span><b>VÁLIDA ATÉ</b><em class="mono" style="color:${sit === 'valida' ? 'var(--verde-ok)' : 'var(--perigo)'}">${esc(validade)}</em></span>
        <span><b>CONFERIDO</b><em class="mono">${esc(conferido)}</em></span>
      </div>
    </section>
    ${c.menor ? '<p class="nota">Atleta menor de idade: por proteção, a foto e o sobrenome completo não aparecem aqui.</p>' : ''}
    ${LGPD}`;
}

async function conferir() {
  if (!/^[A-Z0-9]{6,20}$/.test(codigo)) {
    raiz.innerHTML = `${selo('nada', 'Código inválido', 'Aponte a câmera para o QR da carteirinha no app do atleta.')}${LGPD}`;
    return;
  }
  try {
    const [{ initializeApp }, { getFirestore, doc, getDoc }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-lite.js'),
    ]);
    const app = initializeApp(FIREBASE_CONFIG, 'verificacao');
    const snap = await getDoc(doc(getFirestore(app), 'carteirinhas', codigo));
    if (!snap.exists()) {
      raiz.innerHTML = `${selo('nada', 'Carteirinha não encontrada', 'Este código não existe ou foi cancelado. Confira com o núcleo do atleta.')}${LGPD}`;
      return;
    }
    desenhar(snap.data());
  } catch (e) {
    console.error(e);
    raiz.innerHTML = `${selo('nada', 'Sem conexão', 'Não foi possível conferir agora. Verifique a internet e tente de novo.')}<button type="button" class="bt bt-marinho bt-grande" onclick="location.reload()">Tentar de novo</button>`;
  }
}
conferir();
window.addEventListener('hashchange', () => location.reload());
