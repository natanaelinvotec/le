/* celebrar.js — a festa na TELA PRINCIPAL (app do atleta e painel do núcleo).

Quando a professora troca o cordão no painel, ou o atleta ganha um brasão, o
servidor grava uma notificação (tipo 'cordao' ou 'brasao'). No próximo acesso
esta tela "salta" com a festa, uma vez só (marca celebradoEm na notificação).
A festa é o próprio card de stories ganhando vida (o mesmo desenho do mockup
aprovado): brasão com anel de neon girando, feixes de luz nas cores do cordão,
título em neon letra por letra, o cordão trançado se desenhando na diagonal
com as listras correndo, nome em cursiva com brilho, faíscas e confete.

Oferece: card de stories (Instagram, WhatsApp, Facebook…), WhatsApp direto,
postar na Rede Liberdade, baixar a imagem e — na troca de cordão — ver o
certificado. Quando a pessoa compartilha, marca compartilhadoEm na
notificação; se não compartilhar, o servidor manda um lembrete depois
(tipo 'cordao_lembrete'), que abre esta mesma tela no modo "compartilhar".

  verificarCelebracoes(uid, perfil)      → mostra o que ainda não foi festejado
  abrirFesta(festa, { uid, perfil })     → abre a festa / o compartilhamento */
import { db, storage, storageRef, uploadString, getDownloadURL, collection, query, where, limit, getDocs, getDoc, doc, updateDoc, addDoc, talvezComEscola } from './firebase.js';
import { ESCOLA, coresDoCordao, nomeBonito } from './escola.js';
import { porId as brasaoPorId, urlPng, urlThumb } from './brasoes.js';
import { gerarCardStory, compartilharImagem, linkWhatsApp, baixarImagem } from './card-story.js';
import { prepararImagem } from './imagem.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const primeiro = (n) => String(n || '').trim().split(/\s+/)[0] || 'Atleta';
const DIAS_VALIDOS = 30; // aviso mais antigo que isso não vira festa (só fica na central)
// Avisos de antes desta versão não viram festa (no dia da atualização não salta tudo de uma vez).
const FESTAS_DESDE = '2026-09-30T15:00:00.000Z';
const BRASAO_GRUPO = 'assets/marca/brasao-1024.png';
const INSTAGRAM = '@capoeiraliberdadeeexpressao';
const linkSite = () => new URL('index.html', location.href).href;
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Celular, tela pequena, pouca memória ou economia de dados → festa em modo leve (ver CSS .festa.leve).
const modoLeve = () => {
  try {
    const n = navigator;
    return matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700
      || (typeof n.deviceMemory === 'number' && n.deviceMemory <= 3) || !!(n.connection && n.connection.saveData);
  } catch (e) { return true; }
};

/* O card tem 1080×1920 "pontos" (o mesmo do PNG de stories). Dentro dele tudo é
medido em --k = 1/1080 da largura (unidade de container), então a festa é o card
em qualquer tela, só que vivo. */
const CSS = `
.festa{position:fixed;inset:0;z-index:9000;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
  background:radial-gradient(120% 70% at 50% 0%,#0E3172 0%,#061A3A 55%,#020A1A 100%);font-family:'Manrope',system-ui,sans-serif;color:#fff;
  animation:fstFundo .5s cubic-bezier(.16,1,.3,1)}
@keyframes fstFundo{from{opacity:0}}
.fst-luzes{position:fixed;inset:0;pointer-events:none;overflow:hidden}
.fst-feixes,.fst-bola,.fst-raios,.fst-onda,.fst-img-brasao,.fst-anel,.fst-borda::before{will-change:transform}
.fst-feixes{position:absolute;left:50%;top:32%;width:220vmax;height:220vmax;margin:-110vmax 0 0 -110vmax;border-radius:50%;opacity:.34;mix-blend-mode:screen;filter:blur(14px);
  background:conic-gradient(from 0deg,transparent 0 6deg,var(--n1) 9deg,transparent 13deg 42deg,var(--n2) 46deg,transparent 51deg 84deg,var(--n3) 88deg,transparent 93deg 128deg,var(--n1) 131deg,transparent 135deg 172deg,var(--n2) 176deg,transparent 181deg 218deg,var(--n3) 222deg,transparent 227deg 262deg,var(--n1) 266deg,transparent 270deg 306deg,var(--n2) 310deg,transparent 315deg 360deg);
  -webkit-mask:radial-gradient(circle,#000 0,#000 18%,transparent 58%);mask:radial-gradient(circle,#000 0,#000 18%,transparent 58%);animation:fstGira 26s linear infinite}
.fst-feixes.f2{opacity:.2;animation-duration:38s;animation-direction:reverse;filter:blur(22px)}
.fst-bola{position:absolute;width:60vmax;height:60vmax;border-radius:50%;filter:blur(60px);opacity:.28;mix-blend-mode:screen;animation:fstFlutua 9s ease-in-out infinite alternate}
.fst-bola.b1{left:-20vmax;top:-10vmax;background:var(--n1)}.fst-bola.b2{right:-24vmax;top:30vh;background:var(--n2);animation-delay:-3s}.fst-bola.b3{left:10vw;bottom:-30vmax;background:var(--n3);animation-delay:-6s}
@keyframes fstGira{to{transform:rotate(360deg)}}
@keyframes fstFlutua{to{transform:translate(6vmax,-5vmax) scale(1.15)}}
.fst-x{position:fixed;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:3;width:44px;height:44px;border:0;border-radius:14px;background:rgba(255,255,255,.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fff;font-size:22px;line-height:1;cursor:pointer}
.fst-coluna{position:relative;z-index:1;min-height:100%;display:flex;flex-direction:column;align-items:center;gap:14px;padding:max(18px,env(safe-area-inset-top)) 16px max(22px,env(safe-area-inset-bottom))}
/* ----- o card vivo ----- */
.fst-borda{--w:max(236px,min(calc(100vw - 32px),calc((100vh - 250px) * 9 / 16),400px));width:var(--w);flex:none;position:relative;padding:2px;border-radius:30px;overflow:hidden;isolation:isolate;
  box-shadow:0 0 36px -4px var(--n1),0 0 90px -18px var(--n2),0 40px 90px -30px #000;animation:fstEntra .9s cubic-bezier(.16,1,.3,1) both,fstRespira 3.2s ease-in-out 1s infinite}
@supports (height:100svh){.fst-borda{--w:max(236px,min(calc(100vw - 32px),calc((100svh - 250px) * 9 / 16),400px))}}
.fst-borda::before{content:"";position:absolute;left:50%;top:50%;width:200%;height:200%;margin:-100% 0 0 -100%;z-index:-1;background:conic-gradient(var(--n1),var(--n2),var(--n3),#fff,var(--n1));animation:fstGira 4s linear infinite}
@keyframes fstEntra{0%{transform:scale(.55) translateY(60px) rotate(-4deg);opacity:0}60%{transform:scale(1.03) rotate(.6deg)}100%{transform:none;opacity:1}}
@keyframes fstRespira{50%{box-shadow:0 0 56px 0 var(--n2),0 0 120px -10px var(--n3),0 40px 90px -30px #000}}
.fst-story{--k:calc(100cqw / 1080);container-type:inline-size;position:relative;aspect-ratio:9/16;border-radius:28px;overflow:hidden;
  background:radial-gradient(circle at 50% 22%,#0E3172 0,#061A3A 62%,#04122B 100%)}
.fst-story>*{position:absolute;left:0;right:0;margin:0}
.fst-circ{left:50%;border-radius:50%;border:calc(var(--k)*2) solid rgba(127,211,199,.16);transform:translate(-50%,-50%)}
.fst-onda{left:50%;width:calc(var(--k)*330);height:calc(var(--k)*330);border-radius:50%;transform:translate(-50%,-50%);border:calc(var(--k)*5) solid var(--n1);box-shadow:0 0 calc(var(--k)*30) var(--n1),inset 0 0 calc(var(--k)*30) var(--n1);opacity:0;animation:fstOnda 3.3s cubic-bezier(.16,1,.3,1) 1s infinite}
.fst-onda.o2{border-color:var(--n2);box-shadow:0 0 calc(var(--k)*30) var(--n2);animation-delay:2.1s}.fst-onda.o3{border-color:var(--n3);box-shadow:0 0 calc(var(--k)*30) var(--n3);animation-delay:3.2s}
@keyframes fstOnda{0%{opacity:.9;transform:translate(-50%,-50%) scale(.9)}100%{opacity:0;transform:translate(-50%,-50%) scale(3.4)}}
.fst-raios{left:50%;width:calc(var(--k)*1500);height:calc(var(--k)*1500);transform:translate(-50%,-50%);border-radius:50%;opacity:.5;mix-blend-mode:screen;
  background:repeating-conic-gradient(from 0deg,rgba(255,255,255,0) 0 7deg,var(--n2) 8deg,rgba(255,255,255,0) 10deg 22deg);-webkit-mask:radial-gradient(circle,#000 0,transparent 62%);mask:radial-gradient(circle,#000 0,transparent 62%);animation:fstGiraC 30s linear infinite}
@keyframes fstGiraC{to{transform:translate(-50%,-50%) rotate(360deg)}}
.fst-peca{left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center}
.fst-anel{position:absolute;inset:calc(var(--k)*-22);border-radius:50%;background:conic-gradient(var(--n1),var(--n2),var(--n3),var(--n1));
  -webkit-mask:radial-gradient(circle closest-side,transparent calc(100% - var(--k)*14),#000 calc(100% - var(--k)*13));mask:radial-gradient(circle closest-side,transparent calc(100% - var(--k)*14),#000 calc(100% - var(--k)*13));animation:fstGira 3.2s linear infinite}
.fst-anel.brilho{filter:blur(calc(var(--k)*26));opacity:.95;animation-duration:3.2s}
.fst-disco{position:relative;width:100%;height:100%;border-radius:50%;background:#fff;overflow:hidden;box-shadow:0 calc(var(--k)*30) calc(var(--k)*60) rgba(0,0,0,.6);animation:fstMoeda 1.2s cubic-bezier(.16,1,.3,1) .15s both}
.fst-disco img{position:absolute;inset:calc(var(--k)*10);width:calc(100% - var(--k)*20);height:calc(100% - var(--k)*20);object-fit:contain}
.fst-disco::after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.85) 50%,transparent 65%);transform:translateX(-120%);animation:fstReflexo 3.6s ease-in-out 1.4s infinite}
@keyframes fstReflexo{0%,55%{transform:translateX(-120%)}100%{transform:translateX(120%)}}
@keyframes fstMoeda{from{transform:rotateY(540deg) scale(.2);opacity:0}}
.fst-img-brasao{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 calc(var(--k)*24) calc(var(--k)*40) rgba(0,0,0,.6)) drop-shadow(0 0 calc(var(--k)*40) var(--n1));animation:fstMoeda 1.3s cubic-bezier(.16,1,.3,1) .15s both,fstLevita 4s ease-in-out 1.5s infinite}
@keyframes fstLevita{50%{transform:translateY(calc(var(--k)*-18)) rotate(-2deg)}}
.fst-eyebrow{text-align:center;font:800 calc(var(--k)*30) 'Manrope',sans-serif;letter-spacing:calc(var(--k)*9);color:#7FD3C7;text-shadow:0 0 calc(var(--k)*18) rgba(127,211,199,.8);animation:fstSobe .8s cubic-bezier(.16,1,.3,1) .45s both;white-space:nowrap;overflow:hidden}
.fst-titulo{margin:0;text-align:center;font:800 calc(var(--k)*124)/1 'Sora',sans-serif;letter-spacing:-.02em;color:#fff;animation:fstNeon 2.8s ease-in-out 1.6s infinite alternate;
  text-shadow:0 0 calc(var(--k)*6) #fff,0 0 calc(var(--k)*22) var(--n1),0 0 calc(var(--k)*56) var(--n1)}
.fst-titulo .l{display:block;white-space:nowrap}.fst-titulo .l+.l{margin-top:calc(var(--k)*-2)}
.fst-titulo .c{display:inline-block;animation:fstLetra .75s cubic-bezier(.16,1,.3,1) calc(.55s + var(--i) * 45ms) both}
@keyframes fstLetra{0%{opacity:0;transform:translateY(.55em) scale(.2) rotate(-18deg)}70%{transform:translateY(-.06em) scale(1.12)}100%{opacity:1;transform:none}}
@keyframes fstNeon{0%{text-shadow:0 0 calc(var(--k)*6) #fff,0 0 calc(var(--k)*22) var(--n1),0 0 calc(var(--k)*56) var(--n1)}
  50%{text-shadow:0 0 calc(var(--k)*8) #fff,0 0 calc(var(--k)*30) var(--n2),0 0 calc(var(--k)*80) var(--n2)}
  100%{text-shadow:0 0 calc(var(--k)*6) #fff,0 0 calc(var(--k)*26) var(--n3),0 0 calc(var(--k)*70) var(--n3)}}
.fst-corda-caixa{left:calc(var(--k)*-160);right:calc(var(--k)*-160);transform:translateY(-50%) rotate(var(--rot,-11deg));border-radius:999px;box-shadow:0 0 calc(var(--k)*14) var(--n1),0 0 calc(var(--k)*42) var(--n2),0 calc(var(--k)*24) calc(var(--k)*30) rgba(0,0,0,.55)}
.fst-corda{position:relative;height:calc(var(--k)*var(--esp,64));border-radius:999px;overflow:hidden;
  background:repeating-linear-gradient(45deg,var(--c1) 0 calc(var(--k)*var(--p,22)),var(--c2) calc(var(--k)*var(--p,22)) calc(var(--k)*var(--p,22)*2),var(--c3) calc(var(--k)*var(--p,22)*2) calc(var(--k)*var(--p,22)*3));
  clip-path:inset(0 0 0 0 round 999px);animation:fstDesenha 1.25s cubic-bezier(.16,1,.3,1) 1.05s both,fstCorre 1.6s linear 2.2s infinite}
.fst-corda::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0) 30%,rgba(255,255,255,.34) 50%,rgba(0,0,0,0) 70%,rgba(0,0,0,.35))}
.fst-corda::after{content:"";position:absolute;top:0;bottom:0;width:22%;left:-25%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent);mix-blend-mode:overlay;animation:fstVarre 2.6s ease-in-out 2.3s infinite}
@keyframes fstDesenha{from{clip-path:inset(0 100% 0 0 round 999px)}}
@keyframes fstCorre{to{background-position:calc(var(--k)*var(--p,22)*4.2426) 0}}
@keyframes fstVarre{0%{left:-25%}70%,100%{left:110%}}
.fst-nome{text-align:center;padding:0 calc(var(--k)*60);font:italic 400 calc(var(--k)*var(--tn,104))/1.05 'Instrument Serif',Georgia,serif;white-space:nowrap;
  background:linear-gradient(100deg,#fff 0 40%,var(--n1) 47%,#fff 52%,var(--n2) 57%,#fff 64% 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 0 calc(var(--k)*16) rgba(255,255,255,.35));animation:fstSobe .9s cubic-bezier(.16,1,.3,1) 1.7s both,fstBrilhaNome 4.5s linear 2.6s infinite}
@keyframes fstBrilhaNome{from{background-position:100% 0}to{background-position:-160% 0}}
@keyframes fstSobe{from{opacity:0;transform:translateY(calc(var(--k)*60))}}
.fst-pill{left:50%;right:auto;transform:translateX(-50%);display:flex;align-items:center;gap:calc(var(--k)*24);height:calc(var(--k)*96);padding:0 calc(var(--k)*40) 0 calc(var(--k)*24);border-radius:999px;white-space:nowrap;
  background:rgba(255,255,255,.1);border:calc(var(--k)*2) solid rgba(255,255,255,.18);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font:800 calc(var(--k)*44) 'Sora',sans-serif;
  box-shadow:0 0 calc(var(--k)*30) -4px var(--n1);animation:fstPop .8s cubic-bezier(.16,1,.3,1) 2s both,fstPillLuz 2.4s ease-in-out 2.8s infinite}
.fst-pill.so-texto{padding:0 calc(var(--k)*40)}
.fst-pill .mini{display:block;width:calc(var(--k)*110);height:calc(var(--k)*34);border-radius:999px;position:relative;overflow:hidden;flex:none;
  background:repeating-linear-gradient(45deg,var(--c1) 0 calc(var(--k)*12),var(--c2) calc(var(--k)*12) calc(var(--k)*24),var(--c3) calc(var(--k)*24) calc(var(--k)*36));animation:fstCorreMini 1.2s linear infinite}
.fst-pill .mini::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.3),rgba(0,0,0,0) 30%,rgba(255,255,255,.3) 50%,rgba(0,0,0,0) 70%,rgba(0,0,0,.3))}
@keyframes fstCorreMini{to{background-position:calc(var(--k)*50.91) 0}}
@keyframes fstPop{0%{opacity:0;transform:translateX(-50%) scale(.3)}70%{transform:translateX(-50%) scale(1.08)}100%{opacity:1;transform:translateX(-50%)}}
@keyframes fstPillLuz{50%{box-shadow:0 0 calc(var(--k)*50) 0 var(--n2);border-color:rgba(255,255,255,.4)}}
.fst-rodape{display:flex;flex-direction:column;align-items:center;gap:calc(var(--k)*14);text-align:center;animation:fstSobe .9s cubic-bezier(.16,1,.3,1) 2.2s both}
.fst-rodape b{font:800 calc(var(--k)*40) 'Sora',sans-serif}
.fst-rodape span{font:700 calc(var(--k)*32) 'Manrope',sans-serif;color:#7FD3C7}
.fst-rodape i{font:700 calc(var(--k)*30) 'Manrope',sans-serif;font-style:normal;color:#00E676;text-shadow:0 0 calc(var(--k)*20) rgba(0,230,118,.7)}
.fst-faisca{position:absolute;left:var(--x);top:var(--y);right:auto;width:calc(var(--k)*var(--s));height:calc(var(--k)*var(--s));background:var(--cor);
  clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);filter:drop-shadow(0 0 calc(var(--k)*10) var(--cor));opacity:0;animation:fstPisca var(--d) ease-in-out var(--a) infinite}
@keyframes fstPisca{0%,100%{opacity:0;transform:scale(.2) rotate(0)}45%{opacity:1;transform:scale(1) rotate(90deg)}}
.fst-mini-lista{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;max-width:420px}
.fst-mini-lista span{display:flex;flex-direction:column;align-items:center;gap:4px;width:78px;font-size:11px;font-weight:700;color:rgba(255,255,255,.85);text-align:center}
.fst-mini-lista img{width:54px;height:54px;object-fit:contain;filter:drop-shadow(0 0 12px var(--n1))}
.fst-txt{margin:0;max-width:400px;text-align:center;font-size:14px;line-height:1.55;color:rgba(255,255,255,.86)}
.fst-txt b{color:#fff}
.fst-bts{width:100%;max-width:400px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;animation:fstSobe .8s cubic-bezier(.16,1,.3,1) .5s both}
.fst-bts button,.fst-bts a{min-height:48px;padding:0 10px;border:0;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font:800 13.5px 'Manrope',sans-serif;cursor:pointer;text-decoration:none;text-align:center;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s cubic-bezier(.16,1,.3,1)}
.fst-bts button:active,.fst-bts a:active{transform:scale(.97)}
.fst-bts .principal{grid-column:1/-1;min-height:56px;background:#00E676;color:#002D72;font-size:15.5px;box-shadow:0 0 0 0 rgba(0,230,118,.6);animation:fstChama 2.2s ease-in-out 3s infinite}
@keyframes fstChama{0%{box-shadow:0 0 0 0 rgba(0,230,118,.55)}70%{box-shadow:0 0 0 14px rgba(0,230,118,0)}100%{box-shadow:0 0 0 0 rgba(0,230,118,0)}}
.fst-bts .zap{background:#25D366;color:#063B1C}
.fst-bts .rede{background:#fff;color:#002D72}
.fst-bts .sutil{background:rgba(255,255,255,.12);color:#fff}
.fst-bts .so{grid-column:1/-1}
.fst-bts [disabled]{opacity:.5;cursor:wait}
.fst-status{min-height:18px;margin:0;font-size:12.5px;font-weight:700;color:#7FD3C7;text-align:center}
.fst-ok{width:100%;max-width:400px;height:48px;border:0;border-radius:14px;background:transparent;color:#fff;font:800 14px 'Manrope',sans-serif;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3);cursor:pointer}
.fst-bts :focus-visible,.fst-ok:focus-visible,.fst-x:focus-visible{outline:3px solid #00E676;outline-offset:3px}
.confete{position:fixed;top:-20px;width:10px;height:16px;border-radius:2px;z-index:9001;pointer-events:none;animation:cai linear forwards}
.confete.fita{width:6px;height:26px;border-radius:3px}
@keyframes cai{to{transform:translate(var(--dx,0),110vh) rotate(var(--r,720deg))}}
.fst-estouro{position:fixed;z-index:9001;width:9px;height:9px;border-radius:50%;pointer-events:none;animation:fstEstoura 1.1s cubic-bezier(.16,1,.3,1) forwards}
@keyframes fstEstoura{to{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
/* ----- modo leve (celular e aparelhos fracos): mesma festa, sem o que derruba a GPU -----
   Em celulares, blur em camadas gigantes + mix-blend-mode + sombras animadas estouram a
   memória de vídeo e o navegador descarta pedaços da tela (letras e botões somem/piscam).
   Aqui as luzes viram gradientes (sem filtro), o neon fica fixo e as sombras param de pulsar. */
.festa.leve .fst-feixes{filter:none;mix-blend-mode:normal;opacity:.22}
.festa.leve .fst-feixes.f2{display:none}
.festa.leve .fst-bola{filter:none;mix-blend-mode:normal;opacity:.5;background:radial-gradient(circle,var(--b) 0,transparent 62%)}
.festa.leve .fst-bola.b1{--b:var(--n1)}.festa.leve .fst-bola.b2{--b:var(--n2)}.festa.leve .fst-bola.b3{--b:var(--n3)}
.festa.leve .fst-raios{mix-blend-mode:normal;opacity:.3}
.festa.leve .fst-borda{animation:fstEntra .9s cubic-bezier(.16,1,.3,1) both}
.festa.leve .fst-anel.brilho{display:none}
.festa.leve .fst-disco{box-shadow:0 calc(var(--k)*30) calc(var(--k)*60) rgba(0,0,0,.6),0 0 calc(var(--k)*50) var(--n1)}
.festa.leve .fst-img-brasao{filter:drop-shadow(0 0 calc(var(--k)*30) var(--n1))}
.festa.leve .fst-titulo{animation:none}
.festa.leve .fst-corda::after{display:none}
.festa.leve .fst-nome{filter:none;animation:fstSobe .9s cubic-bezier(.16,1,.3,1) 1.7s both}
.festa.leve .fst-pill{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(255,255,255,.14);animation:fstPop .8s cubic-bezier(.16,1,.3,1) 2s both}
.festa.leve .fst-faisca{filter:none}
.festa.leve .fst-x{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(255,255,255,.2)}
.festa.leve .fst-bts .principal{animation:none}
.festa.leve .fst-mini-lista img{filter:none}
@media (prefers-reduced-motion:reduce){
  .festa,.festa *,.festa *::before,.festa *::after{animation:none!important}
  .fst-onda,.fst-faisca{display:none}
  .confete,.fst-estouro{display:none}
}`;
function garantirCss() {
  if (document.getElementById('le-festa-css2')) return;
  const s = document.createElement('style'); s.id = 'le-festa-css2'; s.textContent = CSS; document.head.appendChild(s);
  if (!document.querySelector('link[data-fontes-card]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.fontesCard = '1';
    l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Manrope:wght@700;800&family=Instrument+Serif:ital@1&display=swap';
    document.head.appendChild(l);
  }
}
const coresSeguras = (c) => (Array.isArray(c) && c.length === 3 && c.every((x) => /^#[0-9a-f]{3,8}$/i.test(String(x))) ? c : ['#4F4F4F', '#DAA520', '#D32F2F']);
const CORES_NIVEL = { bronze: ['#CD7F32', '#F0B27A', '#8C5A2B'], prata: ['#C0C7D1', '#FFFFFF', '#8E9AAB'], ouro: ['#DAA520', '#F2C94C', '#B8860B'], platina: ['#9FE7F5', '#E5F9FF', '#5FB7D4'] };

// Versão "neon" de uma cor do cordão: cores escuras (marinho, cinza, marrom)
// ficam claras e saturadas o bastante para brilhar no fundo escuro.
function neon(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255; const g = parseInt(h.slice(2, 4), 16) / 255; const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const l = (max + min) / 2;
  let s = 0; let hue = 0;
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; hue *= 60;
  }
  const S = s < 0.12 ? s : Math.max(s, 0.85);
  const L = Math.min(Math.max(l, 0.6), 0.8);
  return { cor: `hsl(${Math.round(hue)} ${Math.round(S * 100)}% ${Math.round(L * 100)}%)`, cinza: s < 0.12 };
}
function neons(cores) {
  const n = cores.map(neon);
  // Cordão só de branco/cinza: acende com o verde e o verde-azulado do grupo.
  if (n.every((x) => x.cinza)) return ['#FFFFFF', '#00E676', '#7FD3C7'];
  // Cinza no meio de cores: troca pela cor mais viva para a luz não "apagar".
  const viva = n.find((x) => !x.cinza).cor;
  return n.map((x) => (x.cinza ? viva : x.cor));
}

function confetes(cores) {
  if (semMovimento()) return;
  const paleta = cores.concat(['#00E676', '#7FD3C7', '#FFFFFF']);
  const total = modoLeve() ? 45 : 90;
  for (let i = 0; i < total; i++) {
    const p = document.createElement('span'); p.className = `confete${i % 4 === 0 ? ' fita' : ''}`;
    p.style.left = `${Math.random() * 100}vw`; p.style.background = paleta[i % paleta.length];
    p.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 30)}vw`);
    p.style.setProperty('--r', `${Math.round(360 + Math.random() * 900)}deg`);
    p.style.animationDuration = `${2.6 + Math.random() * 2.6}s`; p.style.animationDelay = `${0.9 + Math.random() * 1.2}s`;
    p.style.opacity = String(0.75 + Math.random() * 0.25);
    document.body.appendChild(p); setTimeout(() => p.remove(), 7200);
  }
}
// Estouro de luz saindo do brasão quando o card aparece.
function estouro(el, cores) {
  if (semMovimento() || !el) return;
  const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
  for (let i = 0; i < 34; i++) {
    const p = document.createElement('span'); p.className = 'fst-estouro';
    const ang = (i / 34) * Math.PI * 2; const dist = 90 + Math.random() * 150;
    p.style.left = `${cx}px`; p.style.top = `${cy}px`; p.style.background = cores[i % cores.length];
    p.style.boxShadow = `0 0 12px ${cores[i % cores.length]}`;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`); p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    document.body.appendChild(p); setTimeout(() => p.remove(), 1300);
  }
}
function faiscas(n, cores) {
  let h = '';
  for (let i = 0; i < n; i++) {
    const s = 14 + Math.round(Math.random() * 26);
    h += `<i class="fst-faisca" aria-hidden="true" style="--x:${(Math.random() * 94 + 2).toFixed(1)}%;--y:${(Math.random() * 94 + 2).toFixed(1)}%;--s:${s};--cor:${i % 4 === 3 ? '#fff' : cores[i % 3]};--d:${(1.8 + Math.random() * 2.4).toFixed(2)}s;--a:${(Math.random() * 3).toFixed(2)}s"></i>`;
  }
  return h;
}
// Título letra por letra (cada letra "salta" em sequência). O leitor de tela lê o aria-label do h2.
function letras(linhas) {
  let i = 0;
  return linhas.map((l) => `<span class="l" aria-hidden="true">${[...l].map((ch) => (ch === ' ' ? ' ' : `<span class="c" style="--i:${i++}">${esc(ch)}</span>`)).join('')}</span>`).join('');
}
// Divide o título do card em duas linhas equilibradas (igual ao PNG: "Troquei de / cordão!").
function duasLinhas(t) {
  const p = String(t).split(' ');
  if (p.length < 2) return [t];
  let melhor = 1; let dif = Infinity;
  for (let i = 1; i < p.length; i++) { const d = Math.abs(p.slice(0, i).join(' ').length - p.slice(i).join(' ').length); if (d <= dif) { dif = d; melhor = i; } }
  return [p.slice(0, melhor).join(' '), p.slice(melhor).join(' ')];
}
const Y = (v) => `top:calc(var(--k)*${v})`; // posição vertical em "pontos" do card (0–1920)

// ---------- postar na Rede Liberdade ----------
// O card sai do canvas em PNG (pesado): a regra única de imagens o deixa em WebP/JPEG até 260 KB.
async function paraJpeg(blob) {
  const r = await prepararImagem(blob, 'card');
  return { dataUrl: r.dataUrl, w: r.largura, h: r.altura, ext: r.ext };
}
export async function postarNaRede({ uid, perfil, blob, texto }) {
  const sp = await getDoc(doc(db, 'perfisPublicos', uid));
  if (!sp.exists()) throw new Error('Abra a Rede Liberdade uma vez para criar o seu perfil e tente de novo.');
  const pub = sp.data();
  const { dataUrl, w, h, ext } = await paraJpeg(blob);
  const r = storageRef(storage, `rede/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`);
  await uploadString(r, dataUrl, 'data_url', { cacheControl: 'public,max-age=31536000' });
  const url = await getDownloadURL(r);
  // Menor publicando imagem: passa pela revisão do núcleo (mesma regra da Rede).
  const revisao = pub.menor ? 'pendente' : 'ok';
  const t = String(texto || '').slice(0, 800);
  await addDoc(collection(db, 'posts'), await talvezComEscola({
    autorUid: uid, autorNome: (perfil && perfil.nome) || pub.nome || '', autorFoto: /^https:/.test((perfil && perfil.fotoUrl) || '') ? perfil.fotoUrl : '',
    autorAcademiaId: (perfil && perfil.academiaId) || null, autorAcademiaNome: (perfil && perfil.academiaNome) || '', autorCordao: pub.cordaoAtual || '',
    autorMenor: !!pub.menor, texto: t, fotoUrl: url, midias: [{ url, tipo: 'imagem', w, h }],
    tipo: 'post', melhorMomento: false, nucleoId: (perfil && perfil.academiaId) || null, nucleoNome: (perfil && perfil.academiaNome) || '',
    marcados: [], visibilidade: 'rede', hashtags: Array.from(new Set((t.match(/#[\p{L}\p{N}_]+/gu) || []).map((x) => x.slice(1).toLowerCase()))).slice(0, 10),
    revisao, oculto: false, publico: revisao === 'ok', criadoEm: new Date().toISOString(), curtidas: [], comentariosCount: 0,
  }));
  return revisao;
}

// ---------- a festa ----------
/* festa = { tipo:'cordao'|'brasao', nome, proprio, cordao, cores, certificado, brasoes:[ids], evento,
             compartilhar (só compartilhar, sem confete), lembrete (veio do lembrete pós-batizado),
             notifIds (avisos que ganham compartilhadoEm quando a pessoa compartilhar) } */
export function abrirFesta(festa, { uid, perfil } = {}) {
  garantirCss();
  return new Promise((fechou) => {
    const ehBrasao = festa.tipo === 'brasao';
    const lista = ehBrasao ? (festa.brasoes || []).map(brasaoPorId).filter(Boolean) : [];
    if (ehBrasao && !lista.length) { fechou(); return; }
    const principal = lista[0];
    const cores = ehBrasao ? (CORES_NIVEL[principal.nivel] || CORES_NIVEL.ouro) : coresSeguras(festa.cores);
    const luz = neons(cores);
    const nome = nomeBonito(festa.nome) || 'Atleta';
    const proprio = festa.proprio !== false;
    const quem = proprio ? '' : primeiro(nome);
    const soCompartilhar = !!(festa.compartilhar || festa.lembrete);
    const eyebrow = ehBrasao
      ? (festa.compartilhar ? 'MEU BRASÃO' : (lista.length > 1 ? `${lista.length} BRASÕES NOVOS` : 'BRASÃO NOVO'))
      : (festa.evento ? String(festa.evento).toUpperCase().slice(0, 34) : 'TROCA DE CORDÃO');
    // O título do card é sempre o do mockup; para a família, a frase fala do atleta.
    const tituloCard = ehBrasao ? (proprio ? 'Conquistei um brasão!' : `${quem} conquistou um brasão!`) : (proprio ? 'Troquei de cordão!' : `${quem} trocou de cordão!`);
    const linkCert = festa.certificado ? new URL(`certificado.html#${encodeURIComponent(festa.certificado)}`, location.href).href : '';
    const textoZap = ehBrasao
      ? `${proprio ? 'Conquistei' : `${quem} conquistou`} o brasão "${principal.nome}" no Grupo de Capoeira ${ESCOLA.nomeCurto}! ${ESCOLA.fraseCelebracao}`
      : `${proprio ? 'Troquei de cordão' : `${quem} trocou de cordão`}: agora é Cordão ${festa.cordao}! Grupo de Capoeira ${ESCOLA.nomeCurto}. ${ESCOLA.fraseCelebracao}`;
    const linkZap = linkCert || linkSite();
    const textoRede = ehBrasao ? `Conquistei o brasão ${principal.nome}! #brasao #capoeira` : `Troquei de cordão: agora sou Cordão ${festa.cordao}! #batizado #capoeira`;
    const rotuloPill = ehBrasao ? `${principal.nome}${principal.nivel ? ` · ${principal.nivel[0].toUpperCase()}${principal.nivel.slice(1)}` : ''}` : `Cordão ${festa.cordao || ''}`;
    // Nome em cursiva: diminui até caber (como no PNG).
    const tamNome = Math.round(Math.max(56, Math.min(104, 960 / Math.max(1, nome.length * 0.42))));
    const tamTitulo = Math.round(Math.max(70, Math.min(124, 1000 / Math.max(...duasLinhas(tituloCard).map((l) => l.length * 0.62)))));
    const linhasTitulo = duasLinhas(tituloCard);

    const y = ehBrasao
      ? { centro: 470, tam: 560, eyebrow: 910, titulo: 960, corda: 1312, esp: 36, p: 18, rot: -7, nome: 1400, pill: 1528, rodape: 1640 }
      : { centro: 300, tam: 300, eyebrow: 540, titulo: 588, corda: 1040, esp: 64, p: 22, rot: -11, nome: 1240, pill: 1370, rodape: 1640 };
    const cordaCores = ehBrasao ? ['#DAA520', '#F2C94C', '#B8860B'] : cores;

    const peca = ehBrasao
      ? `<div class="fst-peca" style="${Y(y.centro)};width:calc(var(--k)*${y.tam});height:calc(var(--k)*${y.tam})"><img class="fst-img-brasao" src="${esc(urlPng(principal))}" alt="${esc(principal.nome)}"></div>`
      : `<div class="fst-peca" style="${Y(y.centro)};width:calc(var(--k)*300);height:calc(var(--k)*300)"><i class="fst-anel brilho" aria-hidden="true"></i><i class="fst-anel" aria-hidden="true"></i><span class="fst-disco"><img src="${BRASAO_GRUPO}" alt="Brasão do Grupo ${esc(ESCOLA.nomeCurto)}"></span></div>`;

    const leve = modoLeve();
    const raiz = document.createElement('div');
    raiz.className = leve ? 'festa leve' : 'festa';
    raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', tituloCard);
    raiz.style.cssText = `--n1:${luz[0]};--n2:${luz[1]};--n3:${luz[2]};--c1:${cordaCores[0]};--c2:${cordaCores[1]};--c3:${cordaCores[2]}`;
    const txt = festa.lembrete
      ? `Seu card <b>"Troquei de cordão!"</b> ainda não foi compartilhado. Mostre o Cordão ${esc(festa.cordao || '')} para a família e os amigos!`
      : ehBrasao ? esc(principal.como || '')
        : festa.certificado ? 'O certificado de graduação já está pronto para ver, imprimir e salvar em PDF.' : 'Parabéns pela nova graduação!';
    raiz.innerHTML = `
      <div class="fst-luzes" aria-hidden="true"><i class="fst-bola b1"></i><i class="fst-bola b2"></i><i class="fst-bola b3"></i><i class="fst-feixes"></i><i class="fst-feixes f2"></i></div>
      <button type="button" class="fst-x" data-f="fechar" aria-label="Fechar">×</button>
      <div class="fst-coluna">
        <div class="fst-borda"><article class="fst-story" aria-label="${esc(`${tituloCard} ${nome} — ${rotuloPill}`)}">
          <i class="fst-circ" style="${Y(y.centro)};width:calc(var(--k)*800);height:calc(var(--k)*800)" aria-hidden="true"></i>
          <i class="fst-circ" style="${Y(y.centro)};width:calc(var(--k)*1000);height:calc(var(--k)*1000)" aria-hidden="true"></i>
          <i class="fst-raios" style="${Y(y.centro)}" aria-hidden="true"></i>
          <i class="fst-onda" style="${Y(y.centro)}" aria-hidden="true"></i><i class="fst-onda o2" style="${Y(y.centro)}" aria-hidden="true"></i><i class="fst-onda o3" style="${Y(y.centro)}" aria-hidden="true"></i>
          ${faiscas(leve ? 8 : 22, luz)}
          ${peca}
          <span class="fst-eyebrow" style="${Y(y.eyebrow)}">${esc(eyebrow)}</span>
          <h2 class="fst-titulo" style="${Y(y.titulo)};font-size:calc(var(--k)*${tamTitulo})" aria-label="${esc(tituloCard)}">${letras(linhasTitulo)}</h2>
          <div class="fst-corda-caixa" style="${Y(y.corda)};--rot:${y.rot}deg" aria-hidden="true"><div class="fst-corda" style="--esp:${y.esp};--p:${y.p};--c1:${cordaCores[0]};--c2:${cordaCores[1]};--c3:${cordaCores[2]}"></div></div>
          <p class="fst-nome" style="${Y(y.nome)};--tn:${tamNome}">${esc(nome)}</p>
          <span class="fst-pill${ehBrasao ? ' so-texto' : ''}" style="${Y(y.pill)}">${ehBrasao ? '' : '<i class="mini" aria-hidden="true"></i>'}${esc(rotuloPill)}</span>
          <div class="fst-rodape" style="${Y(y.rodape)}"><b>Grupo de Capoeira ${esc(ESCOLA.nomeCurto)}</b><span>${esc(ESCOLA.mestre)} · ${esc(ESCOLA.cidade)} / ${esc(ESCOLA.uf)}</span><i>${esc(INSTAGRAM)}</i></div>
        </article></div>
        ${lista.length > 1 ? `<div class="fst-mini-lista">${lista.slice(1, 5).map((b) => `<span><img src="${esc(urlThumb(b))}" alt="">${esc(b.nome)}</span>`).join('')}</div>` : ''}
        ${txt ? `<p class="fst-txt">${txt}</p>` : ''}
        <div class="fst-bts">
          <button type="button" class="principal" data-f="stories">Compartilhar (Instagram, WhatsApp…)</button>
          <a class="zap" data-f="zap" href="${esc(linkWhatsApp(textoZap, linkZap))}" target="_blank" rel="noopener">WhatsApp</a>
          ${uid && proprio ? '<button type="button" class="rede" data-f="rede">Postar na Rede</button>' : '<button type="button" class="rede" data-f="baixar">Baixar imagem</button>'}
          ${linkCert ? `<a class="sutil${uid && proprio ? '' : ' so'}" href="${esc(linkCert)}">Ver certificado</a>` : ''}
          ${uid && proprio ? `<button type="button" class="sutil${linkCert ? '' : ' so'}" data-f="baixar">Baixar imagem</button>` : ''}
        </div>
        <p class="fst-status" aria-live="polite"></p>
        <button type="button" class="fst-ok" data-f="fechar">${esc(ESCOLA.fraseCelebracao)}</button>
      </div>`;
    document.body.appendChild(raiz);
    const antesDoFoco = document.activeElement;
    document.documentElement.style.overflow = 'hidden';
    if (!soCompartilhar) {
      confetes(luz.concat(cordaCores));
      setTimeout(() => estouro(raiz.querySelector('.fst-peca'), luz.concat(['#fff'])), 700);
    }
    const status = (t) => { raiz.querySelector('.fst-status').textContent = t; };

    // Compartilhou: o servidor não manda o lembrete (e a família não recebe de novo).
    let marcado = false;
    const marcarCompartilhado = () => {
      if (marcado || !uid || !Array.isArray(festa.notifIds) || !festa.notifIds.length) return;
      marcado = true;
      const agora = new Date().toISOString();
      festa.notifIds.forEach((id) => { updateDoc(doc(db, 'notificacoes', uid, 'itens', id), { compartilhadoEm: agora }).catch(() => {}); });
    };

    let card = null; let pedido = null;
    const obterCard = async () => {
      if (card) return card;
      if (pedido) return pedido;
      pedido = gerarCardStory(ehBrasao
        ? { tipo: 'brasao', nome, brasaoNome: principal.nome, brasaoImg: urlPng(principal), nivel: principal.nivel ? principal.nivel[0].toUpperCase() + principal.nivel.slice(1) : '', eyebrow: 'BRASÃO NOVO' }
        : { tipo: 'cordao', nome, cordao: festa.cordao, cores, eyebrow: festa.evento ? 'BATIZADO' : 'TROCA DE CORDÃO' });
      card = await pedido;
      return card;
    };
    obterCard().catch(() => null); // já prepara a imagem enquanto a festa aparece
    const fechar = () => {
      raiz.remove(); document.removeEventListener('keydown', tecla); document.documentElement.style.overflow = '';
      if (antesDoFoco && antesDoFoco.focus) { try { antesDoFoco.focus(); } catch (e) { /* ok */ } }
      fechou();
    };
    // Tab fica dentro da festa (é um diálogo); Esc fecha.
    const tecla = (e) => {
      if (e.key === 'Escape') { fechar(); return; }
      if (e.key !== 'Tab') return;
      const foc = [...raiz.querySelectorAll('button:not([disabled]),a[href]')];
      if (!foc.length) return;
      const i = foc.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); foc[foc.length - 1].focus(); } else if (!e.shiftKey && i === foc.length - 1) { e.preventDefault(); foc[0].focus(); }
    };
    document.addEventListener('keydown', tecla);
    raiz.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      const f = b.dataset.f;
      if (f === 'fechar') { fechar(); return; }
      if (f === 'zap') { marcarCompartilhado(); return; } // o link abre o WhatsApp sozinho
      b.disabled = true;
      try {
        if (!card) status('Preparando a imagem…');
        const blob = await obterCard();
        status('');
        const arquivo = ehBrasao ? `brasao-${principal.id}.png` : `troquei-de-cordao-${String(festa.cordao || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}.png`;
        if (f === 'stories') {
          const r = await compartilharImagem(blob, { texto: textoZap, link: linkZap, arquivo });
          if (r === 'sem-suporte') { baixarImagem(blob, arquivo); status('Imagem baixada: publique nos stories pela galeria.'); marcarCompartilhado(); } else if (r === 'compartilhado') { status('Compartilhado!'); marcarCompartilhado(); }
        } else if (f === 'baixar') { baixarImagem(blob, arquivo); status('Imagem salva no aparelho.'); marcarCompartilhado(); } else if (f === 'rede') {
          status('Publicando na Rede…');
          const rev = await postarNaRede({ uid, perfil, blob, texto: textoRede });
          status(rev === 'pendente' ? 'Enviado! O responsável do núcleo revisa antes de aparecer.' : 'Publicado na Rede Liberdade!');
          b.textContent = 'Publicado ✓';
          marcarCompartilhado();
          return; // não deixa publicar duas vezes
        }
      } catch (er) { console.error(er); status(er && er.message && !/firebase|permission/i.test(er.message) ? er.message : 'Não deu certo agora. Tente de novo.'); }
      b.disabled = false;
    });
    setTimeout(() => { const x = raiz.querySelector('[data-f="stories"]'); if (x) x.focus({ preventScroll: true }); }, 60);
  });
}

// ---------- o que ainda não foi festejado ----------
export async function verificarCelebracoes(uid, perfil) {
  if (!uid) return;
  let docs = [];
  try {
    const s = await getDocs(query(collection(db, 'notificacoes', uid, 'itens'), where('tipo', 'in', ['cordao', 'brasao', 'cordao_lembrete']), limit(60)));
    docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { return; }
  const limite = Date.now() - DIAS_VALIDOS * 86400000;
  const pendentes = docs.filter((n) => !n.celebradoEm && String(n.criadoEm || '') > FESTAS_DESDE && new Date(n.criadoEm || 0).getTime() > limite)
    .sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
  if (!pendentes.length) return;
  // Sem esperar o servidor: offline a gravação fica na fila e a festa aparece na hora.
  const marcar = (lista) => { lista.forEach((n) => { updateDoc(doc(db, 'notificacoes', uid, 'itens', n.id), { celebradoEm: new Date().toISOString() }).catch(() => {}); }); };
  const porId = new Map(docs.map((n) => [n.id, n]));

  // Brasões que a pessoa já viu festejados na Rede (neste aparelho) não saltam de novo.
  let vistos = null; try { vistos = JSON.parse(localStorage.getItem(`rede.brasoesVistos.${uid}`) || 'null'); } catch (e) { vistos = null; }

  const dadosCordao = (n) => {
    const atletaUid = n.atletaUid || uid;
    const proprio = atletaUid === uid;
    const cordao = n.cordao || String(n.titulo || '').replace(/^Cordão\s+/i, '').replace(/!$/, '');
    return {
      tipo: 'cordao', nome: n.atletaNome || (proprio ? (perfil && perfil.nome) : '') || 'Atleta', proprio, cordao,
      cores: Array.isArray(n.cores) ? n.cores : coresDoCordao(cordao, proprio ? perfil : null), certificado: n.certificado || '', evento: n.evento || '',
    };
  };
  const cordoes = pendentes.filter((x) => x.tipo === 'cordao');
  for (const n of cordoes) {
    marcar([n]);
    await abrirFesta({ ...dadosCordao(n), notifIds: [n.id] }, { uid, perfil });
  }
  // Lembrete pós-batizado: só se ainda não compartilhou (nem agora, na festa acima).
  for (const n of pendentes.filter((x) => x.tipo === 'cordao_lembrete')) {
    marcar([n]);
    const origemId = n.id.replace(/^lembrete_/, '');
    const origem = porId.get(origemId);
    if ((origem && origem.compartilhadoEm) || n.compartilhadoEm) continue;
    if (cordoes.some((c) => c.id === origemId)) continue; // acabou de ver a festa desta troca
    await abrirFesta({ ...dadosCordao(n), lembrete: true, notifIds: [n.id, origemId] }, { uid, perfil });
  }
  const notBrasoes = pendentes.filter((x) => x.tipo === 'brasao');
  if (notBrasoes.length) {
    let ids = Array.from(new Set(notBrasoes.flatMap((n) => (Array.isArray(n.brasoes) ? n.brasoes : []))));
    if (Array.isArray(vistos)) ids = ids.filter((id) => !vistos.includes(id));
    marcar(notBrasoes);
    if (ids.length) {
      if (Array.isArray(vistos)) { try { localStorage.setItem(`rede.brasoesVistos.${uid}`, JSON.stringify(Array.from(new Set(vistos.concat(ids))))); } catch (e) { /* ok */ } }
      await abrirFesta({ tipo: 'brasao', nome: (perfil && perfil.nome) || 'Atleta', brasoes: ids, notifIds: notBrasoes.map((n) => n.id) }, { uid, perfil });
    }
  }
}
