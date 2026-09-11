/* login.js — v2
   Melhorias de segurança:
   - Nenhuma credencial de admin fica hardcoded no bundle JS (antes: visível em "view-source").
   - Comparação de senha feita via hash SHA-256 (ver shared.js) contra o hash salvo no Firestore.
   - Mensagens de erro nunca revelam qual campo está incorreto (evita enumeração de usuários).
   - Bloqueio progressivo simples contra força bruta (client-side, mitigação básica).
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { hashPassword, gerarSlug } from "./shared.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkwCDziiV-Uh7MLzsy9OYJmA_LMnn7jbg",
  authDomain: "capoeira-liberdade.firebaseapp.com",
  projectId: "capoeira-liberdade",
  storageBucket: "capoeira-liberdade.firebasestorage.app",
  messagingSenderId: "492022804215",
  appId: "1:492022804215:web:c61aed556d9f1aa9576df2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById('loginForm');
const btn = document.getElementById('btnAcessar');
const errorMsg = document.getElementById('errorMsg');
const errorMsgText = document.getElementById('errorMsgText');
const inputId = document.getElementById('loginIdentificador');
const inputSenha = document.getElementById('senha');

let tentativas = 0;
let bloqueadoAte = 0;

function mostrarErro(texto) {
    errorMsgText.textContent = texto; // textContent nunca interpreta HTML — seguro contra XSS
    errorMsg.style.display = 'block';
    form.classList.remove('shake');
    // força reflow para permitir reiniciar a animação
    void form.offsetWidth;
    form.classList.add('shake');
}

function setLoading(estaCarregando) {
    btn.disabled = estaCarregando;
    btn.innerHTML = estaCarregando
        ? '<i class="fas fa-circle-notch fa-spin"></i> Autenticando...'
        : 'Acessar Painel <i class="fas fa-arrow-right"></i>';
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';

    const agora = Date.now();
    if (agora < bloqueadoAte) {
        const seg = Math.ceil((bloqueadoAte - agora) / 1000);
        mostrarErro(`Muitas tentativas. Aguarde ${seg}s para tentar novamente.`);
        return;
    }

    const identificador = inputId.value.trim().toLowerCase();
    const senha = inputSenha.value;

    if (!identificador || !senha) { mostrarErro('Preencha usuário e senha.'); return; }

    setLoading(true);

    try {
        const senhaHash = await hashPassword(senha);

        // 1. Administradores (coleção dedicada "admins", nunca no código-fonte)
        const snapAdmins = await getDocs(collection(db, "admins"));
        let adminEncontrado = null;
        snapAdmins.forEach(docSnap => {
            const d = docSnap.data();
            const emailDb = (d.email || '').trim().toLowerCase();
            if (emailDb === identificador && d.senhaHash === senhaHash) adminEncontrado = d;
        });

        if (adminEncontrado) {
            sessionStorage.setItem('sessaoCapoeira', JSON.stringify({
                role: 'admin', nome: adminEncontrado.nome || 'Admin Master', ts: Date.now()
            }));
            window.location.href = 'admin.html';
            return;
        }

        // 2. Professores (coleção "academias")
        const snapAcademias = await getDocs(collection(db, "academias"));
        let professorEncontrado = null;
        snapAcademias.forEach(docSnap => {
            const d = docSnap.data();
            const emailDb = (d.email || '').trim().toLowerCase();
            const telDb = (d.celular || '').trim().toLowerCase();
            if ((emailDb === identificador || telDb === identificador) && d.senhaHash === senhaHash) {
                professorEncontrado = d;
            }
        });

        if (professorEncontrado) {
            const nomeAcademiaLimpo = (professorEncontrado.nome || '').replace(/^Academia\s+/i, '').trim();
            sessionStorage.setItem('sessaoCapoeira', JSON.stringify({
                role: 'professor',
                nome: professorEncontrado.professor,
                academia: nomeAcademiaLimpo,
                academiaId: professorEncontrado.academiaId || gerarSlug(nomeAcademiaLimpo),
                ts: Date.now()
            }));
            window.location.href = 'admin.html';
            return;
        }

        // 3. Alunos / Responsáveis (coleção "alunos")
        // Usa query indexada por identificador quando possível para não varrer a coleção inteira no cliente.
        const camposBusca = ['email', 'celular', 'emailResponsavel', 'celularResponsavel'];
        let alunoEncontrado = null;
        for (const campo of camposBusca) {
            const q = query(collection(db, "alunos"), where(campo, "==", identificador), limit(5));
            const snap = await getDocs(q);
            snap.forEach(docSnap => {
                const d = docSnap.data();
                if (d.senhaHash === senhaHash) alunoEncontrado = { id: docSnap.id, ...d };
            });
            if (alunoEncontrado) break;
        }

        if (alunoEncontrado) {
            sessionStorage.setItem('sessaoAluno', JSON.stringify({ ...alunoEncontrado, ts: Date.now() }));
            window.location.href = 'aluno.html';
            return;
        }

        throw new Error("Usuário ou senha inválidos.");

    } catch (error) {
        tentativas++;
        if (tentativas >= 5) {
            bloqueadoAte = Date.now() + 30000;
            tentativas = 0;
            mostrarErro('Muitas tentativas incorretas. Aguarde 30s.');
        } else {
            mostrarErro('E-mail/celular ou senha incorretos.');
        }
    } finally {
        setLoading(false);
    }
});
