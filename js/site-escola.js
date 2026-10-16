/* site-escola.js — gerador de site público multi-escola (Fase 4.2, PRODUÇÃO).
 *
 * Servido em atletapay.com.br/<escola> (e em domínio próprio da escola). Monta
 * um site de apresentação cinematográfico a partir do que a escola publica, SÓ de
 * dados PÚBLICOS do Firestore (leitura anônima, nunca login, nunca coleção privada):
 *   - escolasPublicas/{id}     (allow read: if true) — identidade da escola.
 *   - nucleosPublicos (escolaId==id, ativo==true)     — nomes dos núcleos.
 *
 * A escola vem do ENDEREÇO (atletapay.com.br/<escola>) e, se não, do domínio
 * próprio — nunca do login (site público; resolverEscolaId é login-first, errado
 * aqui). Camada visual elevada (hero cinematográfico, claro/escuro, ladder animada)
 * sobre a mesma camada de dados. Motifs SVG bespoke por modalidade. Toda string
 * passa por esc() e todo link/foto por url() — o site nunca confia no que está gravado.
 */
import { db, doc, getDoc, getDocs, collection, query, where, limit } from './firebase.js';
import { escolaIdDoEndereco, escolaIdDoDominio } from './escola-atual.js';
import { layoutsComModulo, templateExiste } from './site-templates.js';

/* ========================================================================== */
/*  Utilidades seguras                                                        */
/* ========================================================================== */
function esc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
// url(): só caminho do próprio site (assets/...) ou https://. Nada de javascript:, data:, http://.
function url(u){
  var s = String(u == null ? '' : u).trim();
  if(!s) return '';
  if(/^https:\/\/[^\s"'<>\\]+$/i.test(s)) return s;
  if(/^[a-z0-9][a-z0-9._\/-]*$/i.test(s) && s.indexOf('..') === -1) return s;
  return '';
}

/* ========================================================================== */
/*  Vocabulário por modalidade / template                                     */
/* ========================================================================== */
var VOCAB = {
  capoeira:{ saudacao:"Axé!", local:"roda", luta:"jogo", treino:"treino", artigo:"A", nomeMod:"Capoeira" },
  jiujitsu:{ saudacao:"Oss!",   local:"tatame", luta:"rola", treino:"treino", artigo:"O", nomeMod:"Jiu-jitsu" },
  judo:{ saudacao:"Oss!", local:"tatame", luta:"randori", treino:"treino", artigo:"O", nomeMod:"Judô" },
  karate:{ saudacao:"Oss!", local:"dojo", luta:"kumite", treino:"treino", artigo:"O", nomeMod:"Karatê" },
  taekwondo:{ saudacao:"Taekwon!", local:"dojang", luta:"kyorugi", treino:"treino", artigo:"O", nomeMod:"Taekwondo" },
  muaythai:{ saudacao:"Chók!", local:"ringue", luta:"sparring", treino:"treino", artigo:"O", nomeMod:"Muay Thai" },
  boxe:{ saudacao:"Vamos!", local:"ringue", luta:"sparring", treino:"treino", artigo:"O", nomeMod:"Boxe" },
  mma:{ saudacao:"Vamos!", local:"octógono", luta:"sparring", treino:"treino", artigo:"O", nomeMod:"MMA" },
  kravmaga:{ saudacao:"Kida!", local:"tatame", luta:"simulação", treino:"treino", artigo:"O", nomeMod:"Krav Maga" },
  arena:{ saudacao:"Bem-vindo", local:"academia", luta:"treino", treino:"treino", artigo:"A", nomeMod:"Artes marciais" }
};

var MOD_TEMPLATE = {
  capoeira:"capoeira", jiujitsu:"jiujitsu", judo:"judo", karate:"karate",
  taekwondo:"taekwondo", muaythai:"muaythai", boxe:"boxe", mma:"mma"
};
var LIDER = { capoeira:"Mestre", jiujitsu:"Professor", judo:"Sensei", karate:"Sensei",
  taekwondo:"Sabom", muaythai:"Kru", boxe:"Treinador", mma:"Coach", kravmaga:"Instrutor" };
var PECA = { capoeira:"cordão", jiujitsu:"faixa", judo:"faixa", karate:"faixa",
  taekwondo:"faixa", muaythai:"prajied", boxe:"nível", mma:"nível", kravmaga:"nível" };

// Templates com LAYOUT próprio (módulo separado, carregado sob demanda). Os demais
// são variações do layout "arena" (vocabulário + motivo). F4.3: biblioteca de templates.
// Templates com layout próprio vêm do registro único (site-templates.js) — o mesmo que a aba
// "Meu site" usa para o seletor. Acrescentar um template = uma linha lá.
var LAYOUTS = layoutsComModulo();

function templateDe(tpl, modalidade){
  if(tpl && (VOCAB[tpl] || LAYOUTS[tpl])) return tpl;
  return MOD_TEMPLATE[modalidade] || "arena";
}

/* ========================================================================== */
/*  Helpers                                                                   */
/* ========================================================================== */
function readable(hex){
  var c = String(hex || "").replace('#','');
  if(c.length===3){ c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2]; }
  var r=parseInt(c.slice(0,2),16), g=parseInt(c.slice(2,4),16), b=parseInt(c.slice(4,6),16);
  if(!(r>=0)||!(g>=0)||!(b>=0)) return '#ffffff';
  var L=(0.2126*r+0.7152*g+0.0722*b)/255;
  return L>0.62 ? '#14181f' : '#ffffff';
}
function isLight(hex){ return readable(hex)!=='#ffffff'; }
// Clareia (amt>0) ou escurece (amt<0) um hex. Fora de faixa: devolve o próprio hex.
function shade(hex, amt){
  var c=String(hex||'').replace('#',''); if(c.length===3)c=c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  var r=parseInt(c.slice(0,2),16), g=parseInt(c.slice(2,4),16), b=parseInt(c.slice(4,6),16);
  if(isNaN(r)||isNaN(g)||isNaN(b)) return hex;
  var f=1+amt;
  function cl(x){ return Math.max(0,Math.min(255,Math.round(x*f))); }
  function h2(x){ var s=x.toString(16); return s.length<2?'0'+s:s; }
  return '#'+h2(cl(r))+h2(cl(g))+h2(cl(b));
}
function initials(nomeCurto){
  nomeCurto = String(nomeCurto || '');
  var skip={e:1,de:1,da:1,do:1,dos:1,das:1};
  var words=nomeCurto.split(/\s+/).filter(function(w){return w && !skip[w.toLowerCase()];});
  var s=(words[0]?words[0][0]:'')+(words[1]?words[1][0]:'');
  if(!s) s=nomeCurto.slice(0,2);
  return (s || 'E').toUpperCase();
}
function contrDe(nome){
  var first=(String(nome||'').split(/\s+/)[0]||'').toLowerCase();
  var masc={centro:1,grupo:1,time:1,clube:1,projeto:1,"núcleo":1,nucleo:1,instituto:1};
  return masc[first] ? 'do' : 'da';
}
function plural(n,s,p){ return n+' '+(n===1?s:p); }

/* ========================================================================== */
/*  Ícones (svg inline)                                                       */
/* ========================================================================== */
var IC = {
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13A4 4 0 0 1 16 11"/></svg>',
  badge:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  ig:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  app:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
};
var SUN_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
var MOON_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

/* ========================================================================== */
/*  Tema claro/escuro (preferência do visitante, persistida)                  */
/* ========================================================================== */
function effectiveDark(){
  var t = document.documentElement.getAttribute('data-theme');
  if(t==='dark') return true;
  if(t==='light') return false;
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}
function paintToggles(){
  var bs = document.querySelectorAll('.theme-toggle');
  for(var i=0;i<bs.length;i++){ bs[i].innerHTML = effectiveDark() ? SUN_ICON : MOON_ICON; }
}
function applyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  try{ localStorage.setItem('ap-tema', mode); }catch(e){ /* navegador sem storage */ }
  paintToggles();
}
function initTheme(){
  var m=null; try{ m=localStorage.getItem('ap-tema'); }catch(e){ m=null; }
  if(m==='dark'||m==='light') document.documentElement.setAttribute('data-theme', m);
}

/* ========================================================================== */
/*  Entrada (IntersectionObserver)                                            */
/* ========================================================================== */
function observeAnim(root){
  var els = root.querySelectorAll('.anim');
  if(!('IntersectionObserver' in window) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)){
    for(var i=0;i<els.length;i++) els[i].classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function(ents){
    ents.forEach(function(x){ if(x.isIntersecting){ x.target.classList.add('in'); io.unobserve(x.target); } });
  }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });
  for(var j=0;j<els.length;j++) io.observe(els[j]);
}

/* ========================================================================== */
/*  Motivos do hero (svg gerado, bespoke por modalidade)                      */
/* ========================================================================== */
function motif(template, c){
  var ED=c.destaque, EB=c.botao;
  if(template==='capoeira'){
    var rings='';
    for(var r=42;r<=250;r+=34){
      rings+='<circle cx="470" cy="205" r="'+r+'" fill="none" stroke="'+ED+'" stroke-width="2" stroke-opacity="'+(0.12+(250-r)/820).toFixed(3)+'"/>';
    }
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<g>'+rings+'</g>'
      +'<circle cx="470" cy="205" r="7" fill="'+EB+'"/>'
      +'<path d="M120 20 C 60 160, 60 250, 150 390" fill="none" stroke="'+EB+'" stroke-width="5" stroke-linecap="round" stroke-opacity=".9"/>'
      +'<line x1="120" y1="20" x2="150" y2="390" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>'
      +'<ellipse cx="128" cy="300" rx="26" ry="30" fill="none" stroke="'+EB+'" stroke-width="4" stroke-opacity=".8"/>'
      +'<circle cx="300" cy="70" r="4" fill="'+ED+'" opacity=".5"/>'
      +'<circle cx="360" cy="330" r="5" fill="'+EB+'" opacity=".55"/>'
      +'<circle cx="250" cy="300" r="3" fill="'+ED+'" opacity=".5"/>'
      +'</svg>';
  }
  if(template==='jiujitsu'){
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<defs><pattern id="tat" width="52" height="52" patternUnits="userSpaceOnUse">'
      +'<rect width="52" height="52" fill="none"/>'
      +'<path d="M52 0H0V52" fill="none" stroke="'+ED+'" stroke-width="1.4" stroke-opacity=".30"/>'
      +'<circle cx="0" cy="0" r="2" fill="'+ED+'" fill-opacity=".32"/>'
      +'</pattern></defs>'
      +'<rect width="600" height="400" fill="url(#tat)"/>'
      +'<path d="M-20 300 L 340 -40" stroke="'+ED+'" stroke-width="46" stroke-opacity=".10"/>'
      +'<path d="M260 440 L 640 60" stroke="'+ED+'" stroke-width="30" stroke-opacity=".08"/>'
      +'</svg>';
  }
  if(template==='judo'){
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<defs><pattern id="jdmat" width="60" height="60" patternUnits="userSpaceOnUse">'
      +'<path d="M60 0H0V60" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity=".07"/>'
      +'</pattern></defs>'
      +'<rect width="600" height="400" fill="url(#jdmat)"/>'
      +'<path d="M70 360 C 220 300, 300 140, 470 60" fill="none" stroke="'+ED+'" stroke-width="26" stroke-linecap="round" stroke-opacity=".9"/>'
      +'<path d="M150 40 C 330 120, 380 300, 540 360" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-opacity=".28"/>'
      +'<path d="M70 360 C 220 300, 300 140, 470 60" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-opacity=".35"/>'
      +'<circle cx="360" cy="196" r="9" fill="'+EB+'"/>'
      +'<circle cx="360" cy="196" r="20" fill="none" stroke="'+EB+'" stroke-width="2.5" stroke-opacity=".6"/>'
      +'</svg>';
  }
  if(template==='karate'){
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<path d="M540 250 A 140 140 0 1 1 505 98" fill="none" stroke="'+EB+'" stroke-width="18" stroke-linecap="round" stroke-opacity=".8"/>'
      +'<path d="M120 70 C 180 150, 150 250, 250 330" fill="none" stroke="'+ED+'" stroke-width="22" stroke-linecap="round" stroke-opacity=".92"/>'
      +'<path d="M130 90 C 185 160, 160 245, 240 315" fill="none" stroke="#000000" stroke-width="4" stroke-linecap="round" stroke-opacity=".18"/>'
      +'<circle cx="300" cy="350" r="6" fill="'+ED+'" opacity=".8"/>'
      +'<circle cx="275" cy="360" r="3" fill="'+ED+'" opacity=".6"/>'
      +'<circle cx="470" cy="300" r="5" fill="'+EB+'" opacity=".5"/>'
      +'<circle cx="430" cy="60" r="4" fill="'+EB+'" opacity=".45"/>'
      +'</svg>';
  }
  if(template==='taekwondo'){
    var rays='', ox=90, oy=360, k, ang, x2, y2, w;
    for(k=0;k<9;k++){
      ang=-12 - k*8.5;
      x2=(ox+Math.cos(ang*Math.PI/180)*360).toFixed(1);
      y2=(oy+Math.sin(ang*Math.PI/180)*360).toFixed(1);
      w=(k%3===0)?7:3;
      rays+='<line x1="'+ox+'" y1="'+oy+'" x2="'+x2+'" y2="'+y2+'" stroke="'+ED+'" stroke-width="'+w+'" stroke-linecap="round" stroke-opacity="'+(0.6-k*0.045).toFixed(3)+'"/>';
    }
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<g>'+rays+'</g>'
      +'<path d="M110 350 C 300 300, 430 180, 470 50" fill="none" stroke="'+EB+'" stroke-width="6" stroke-linecap="round" stroke-opacity=".9"/>'
      +'<circle cx="470" cy="50" r="7" fill="'+EB+'"/>'
      +'<circle cx="90" cy="360" r="10" fill="'+ED+'" opacity=".9"/>'
      +'</svg>';
  }
  if(template==='muaythai'){
    var ropes='', ys=[120,175,230,285], m;
    for(m=0;m<ys.length;m++){
      ropes+='<line x1="0" y1="'+ys[m]+'" x2="120" y2="'+(ys[m]+8)+'" stroke="'+ED+'" stroke-width="5" stroke-opacity="'+(0.5-m*0.05).toFixed(2)+'"/>';
      ropes+='<line x1="600" y1="'+ys[m]+'" x2="480" y2="'+(ys[m]+8)+'" stroke="'+ED+'" stroke-width="5" stroke-opacity="'+(0.5-m*0.05).toFixed(2)+'"/>';
    }
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<g>'+ropes+'</g>'
      +'<rect x="110" y="100" width="8" height="210" rx="4" fill="'+ED+'" opacity=".55"/>'
      +'<rect x="482" y="100" width="8" height="210" rx="4" fill="'+ED+'" opacity=".55"/>'
      +'<ellipse cx="300" cy="70" rx="95" ry="40" fill="none" stroke="'+EB+'" stroke-width="7" stroke-opacity=".9"/>'
      +'<ellipse cx="300" cy="70" rx="95" ry="40" fill="none" stroke="'+ED+'" stroke-width="2" stroke-opacity=".7"/>'
      +'<path d="M300 110 L 300 150" stroke="'+EB+'" stroke-width="4" stroke-linecap="round" stroke-opacity=".8"/>'
      +'<circle cx="300" cy="156" r="5" fill="'+ED+'"/>'
      +'</svg>';
  }
  if(template==='boxe'){
    var burst='', bx=430, by=210, p, pa;
    for(p=0;p<12;p++){
      pa=p*30;
      burst+='<line x1="'+(bx+Math.cos(pa*Math.PI/180)*34).toFixed(1)+'" y1="'+(by+Math.sin(pa*Math.PI/180)*34).toFixed(1)+'" x2="'+(bx+Math.cos(pa*Math.PI/180)*58).toFixed(1)+'" y2="'+(by+Math.sin(pa*Math.PI/180)*58).toFixed(1)+'" stroke="'+EB+'" stroke-width="4" stroke-linecap="round" stroke-opacity=".85"/>';
    }
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<path d="M0 0 L 240 0 L 120 400 L 0 400 Z" fill="'+ED+'" fill-opacity=".10"/>'
      +'<path d="M600 400 L 420 400 L 500 0 L 600 0 Z" fill="'+EB+'" fill-opacity=".09"/>'
      +'<circle cx="430" cy="210" r="78" fill="none" stroke="'+ED+'" stroke-width="3" stroke-opacity=".6"/>'
      +'<path d="M360 250 A 90 90 0 0 1 380 140" fill="none" stroke="'+ED+'" stroke-width="8" stroke-linecap="round" stroke-opacity=".9"/>'
      +'<g>'+burst+'</g>'
      +'<circle cx="430" cy="210" r="12" fill="'+EB+'"/>'
      +'</svg>';
  }
  if(template==='mma'){
    var oct=function(cx,cy,r){
      var pts=[], q, a;
      for(q=0;q<8;q++){
        a=(q*45-22.5)*Math.PI/180;
        pts.push((cx+Math.cos(a)*r).toFixed(1)+','+(cy+Math.sin(a)*r).toFixed(1));
      }
      return pts.join(' ');
    };
    return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
      +'<g stroke="'+ED+'" stroke-opacity=".14" stroke-width="1">'
      +'<line x1="240" y1="20" x2="600" y2="260"/>'
      +'<line x1="600" y1="120" x2="240" y2="360"/>'
      +'<line x1="320" y1="10" x2="560" y2="380"/>'
      +'<line x1="540" y1="10" x2="300" y2="390"/>'
      +'</g>'
      +'<polygon points="'+oct(420,200,205)+'" fill="none" stroke="'+ED+'" stroke-width="3" stroke-opacity=".55"/>'
      +'<polygon points="'+oct(420,200,160)+'" fill="none" stroke="'+ED+'" stroke-width="1.5" stroke-opacity=".3"/>'
      +'<circle cx="420" cy="200" r="6" fill="'+EB+'"/>'
      +'<circle cx="420" cy="200" r="15" fill="none" stroke="'+EB+'" stroke-width="2" stroke-opacity=".7"/>'
      +'</svg>';
  }
  // arena: neutro geométrico
  var sq='';
  for(var i=1;i<=7;i++){
    var s=i*46;
    sq+='<rect x="'+(470-s/2)+'" y="'+(200-s/2)+'" width="'+s+'" height="'+s+'" rx="8" fill="none" stroke="'+ED+'" stroke-width="2" stroke-opacity="'+(0.08+(7-i)/55).toFixed(3)+'" transform="rotate(45 470 200)"/>';
  }
  var arays='';
  for(var a=0;a<360;a+=30){
    arays+='<line x1="470" y1="200" x2="'+(470+Math.cos(a*Math.PI/180)*320).toFixed(1)+'" y2="'+(200+Math.sin(a*Math.PI/180)*320).toFixed(1)+'" stroke="'+ED+'" stroke-width="1" stroke-opacity=".07"/>';
  }
  return '<svg class="motif" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
    +'<g>'+arays+'</g><g>'+sq+'</g>'
    +'<circle cx="470" cy="200" r="6" fill="'+EB+'" opacity=".9"/>'
    +'</svg>';
}

/* ========================================================================== */
/*  Builders de seção                                                         */
/* ========================================================================== */
function sobreCopy(s, tpl, v){
  if(tpl==='capoeira'){
    return esc(s.nome)+' vive no ritmo da '+v.local+': cada '+v.treino+' mistura movimento, música e jogo de corpo. O '+esc(s.lider)+' conduz o grupo respeitando o tempo de cada pessoa, do primeiro gingado ao '+v.luta+' mais solto. Tudo acontece em '+esc(s.cidade)+' — '+esc(s.uf)+', com as portas abertas para todas as idades.';
  }
  if(tpl==='jiujitsu'){
    return esc(s.nome)+' constrói o jiu-jitsu passo a passo, no '+v.local+'. O '+esc(s.lider)+' acompanha cada '+v.treino+' e cada '+v.luta+' com atenção à base, à postura e à segurança de quem está no chão. Em '+esc(s.cidade)+' — '+esc(s.uf)+', o espaço recebe iniciantes e praticantes de todos os níveis.';
  }
  return esc(s.nome)+' conduz cada '+v.treino+' com método e atenção individual. O '+esc(s.lider)+' acompanha a evolução de quem está começando e de quem já treina há tempo, em um ambiente organizado e acolhedor. Fica em '+esc(s.cidade)+' — '+esc(s.uf)+', com espaço para todas as idades.';
}

function ladderInner(s, v){
  var pecaCap = esc(s.peca.charAt(0).toUpperCase()+s.peca.slice(1));
  if(s.escada && s.escada.length){
    var n = s.escada.length;
    var rows = s.escada.map(function(b,j){
      var cor = b.cor;
      var fill = 'linear-gradient(90deg,'+esc(cor)+','+esc(shade(cor,-0.28))+')';
      var lite = isLight(cor) ? ' lite' : '';
      var w = Math.round(34 + (n>1 ? (j/(n-1)) : 0)*62);
      return '<div class="rung" style="--j:'+j+'">'
        +'<span class="st">'+(j+1<10?'0':'')+(j+1)+'</span>'
        +'<span class="bar"><span class="fill'+lite+'" style="background:'+fill+';width:'+w+'%"></span></span>'
        +'<span class="lbl">'+pecaCap+' '+esc(b.nome)+'<small>Etapa '+(j+1)+'</small></span>'
        +'</div>';
    }).join('');
    return '<div class="ladder">'+rows+'</div>'
      +'<div class="grad-note">'+IC.info+'<span>A sequência de '+esc(s.peca)+'s segue a graduação cadastrada pela escola. Cada etapa marca um ponto da jornada no '+v.local+'.</span></div>';
  }
  return '<div class="cordao"></div>'
    +'<div class="grad-note">'+IC.info+'<span>A graduação por '+esc(s.peca)+' da '+esc(s.nomeCurto)+' aparece aqui assim que o '+esc(s.lider)+' cadastrar os '+esc(s.peca)+'s no AtletaPay. Nada é inventado: mostramos a faixa de cores oficial quando ela for definida.</span></div>';
}

/* ========================================================================== */
/*  Render principal                                                          */
/* ========================================================================== */
function aplicarTokens(site, c){
  site.style.setProperty('--p',  c.principal);
  site.style.setProperty('--p2', shade(c.principal, -0.35));
  site.style.setProperty('--a',  c.destaque);
  site.style.setProperty('--a2', c.botao);
  site.style.setProperty('--a-ink', readable(c.botao));
}

function wireChrome(site){
  var tt = site.querySelector('.theme-toggle');
  if(tt){ tt.innerHTML = effectiveDark() ? SUN_ICON : MOON_ICON; tt.onclick = function(){ applyTheme(effectiveDark() ? 'light' : 'dark'); }; }
  observeAnim(site);
}

function render(s, tpl){
  var v = VOCAB[tpl] || VOCAB.arena;
  var c = s.cores;
  var contr = contrDe(s.nome);
  var ins = '/'+encodeURIComponent(s.slug)+'/inscricao';
  var login = '/'+encodeURIComponent(s.slug)+'/login';
  var site = document.getElementById('site');
  if(!site) return;
  aplicarTokens(site, c);

  var logoSeguro = url(s.logo);
  var mono = logoSeguro
    ? '<img src="'+esc(logoSeguro)+'" alt="'+esc('Logo '+s.nomeCurto)+'" loading="eager" decoding="async">'
    : esc(initials(s.nomeCurto));
  var hasTreinar = !!(s.nucleos.length || s.endereco);

  // --- NAV ---
  var nav = '<header class="nav"><div class="wrap">'
    + '<a class="logo" href="#top"><span class="crest">'+mono+'</span>'
    +   '<span class="nm"><b>'+esc(s.nomeCurto)+'</b><span>'+esc(v.nomeMod)+' · '+esc(s.cidade)+'</span></span></a>'
    + '<nav class="nlinks"><a href="#sobre">Sobre</a><a href="#grad">Graduação</a>'
    +   (hasTreinar ? '<a href="#treinar">Onde treinar</a>' : '')+'</nav>'
    + '<button class="theme-toggle" type="button" aria-label="Alternar tema claro ou escuro"></button>'
    + '<a class="btn btn-ghost hide-sm" href="'+esc(login)+'">'+IC.user+' Área do aluno</a>'
    + '<a class="btn btn-go" href="'+esc(ins)+'">Fazer inscrição '+IC.arrow+'</a>'
    + '</div></header>';

  // --- HERO ---
  var tagline = v.artigo+' '+v.local+' '+contr+' '+esc(s.nome)+', em '+esc(s.cidade)+' — '+esc(s.uf)+'.';
  var chips = ''
    + '<span class="chip">'+IC.pin+esc(s.cidade)+' — '+esc(s.uf)+'</span>'
    + '<span class="chip">'+IC.star+'<b>'+esc(v.nomeMod)+'</b></span>'
    + (s.nucleos.length ? '<span class="chip">'+IC.users+plural(s.nucleos.length,'núcleo','núcleos')+'</span>' : '')
    + '<span class="chip">'+IC.badge+esc(s.lider)+' à frente</span>';
  var crestBig = logoSeguro
    ? '<img src="'+esc(logoSeguro)+'" alt="'+esc('Logo '+s.nomeCurto)+'" loading="eager" decoding="async">'
    : esc(initials(s.nomeCurto));
  var hero = '<section class="hero" id="top">'
    + motif(tpl, c)
    + '<span class="veil" aria-hidden="true"></span>'
    + '<div class="wrap"><div class="hero-grid">'
    +   '<div>'
    +     '<span class="badge"><span class="pulse"></span>'+esc(v.saudacao)+'</span>'
    +     '<h1>'+esc(s.nome)+'</h1>'
    +     '<p class="sub">'+tagline+'</p>'
    +     '<div class="hero-cta"><a class="btn btn-go btn-lg" href="'+esc(ins)+'">Fazer inscrição '+IC.arrow+'</a>'
    +       (hasTreinar ? '<a class="btn btn-line btn-lg" href="#treinar">'+IC.pin+' Onde treinar</a>' : '')+'</div>'
    +     (s.endereco ? '<div class="hero-loc">'+IC.pin+esc(s.endereco)+'</div>' : '')
    +   '</div>'
    +   '<div class="crest-stage"><span class="ring" aria-hidden="true"></span><span class="ring r2" aria-hidden="true"></span>'
    +     '<span class="big-crest">'+crestBig+'</span><span class="sat" aria-hidden="true">'+IC.star+'</span></div>'
    + '</div><div class="hero-chips">'+chips+'</div></div>'
    + '</section>';

  // --- SOBRE ---
  var sobre = '<section class="anim" id="sobre"><div class="eyebrow"><span class="dot"></span>Sobre</div>'
    + '<h2 class="sec-h">Quem treina <em class="ed">aqui</em></h2>'
    + '<div class="sobre-card"><p>'+sobreCopy(s,tpl,v)+'</p></div></section>';

  // --- GRADUAÇÃO ---
  var grad = '<section class="anim" id="grad"><div class="eyebrow"><span class="dot"></span>Graduação</div>'
    + '<h2 class="sec-h">A jornada por <em class="ed">'+esc(s.peca)+'</em></h2>'
    + '<div class="grad">'+ladderInner(s,v)+'</div></section>';

  // --- ONDE TREINAR ---
  var treinar = '';
  if(s.nucleos.length){
    var nucCards = s.nucleos.map(function(n){
      var limpo = n.replace(/^Academia\s+/i,'').replace(/^Professora?\s+/i,'').replace(/^Instrutor\s+/i,'').replace(/^Mestre\s+/i,'') || n;
      return '<article class="nucleus"><span class="ini">'+esc(initials(limpo))+'</span><span class="nn">'+esc(n)+'</span></article>';
    }).join('');
    treinar = '<section class="anim" id="treinar"><div class="eyebrow"><span class="dot"></span>Onde treinar</div>'
      + '<h2 class="sec-h">Nossos <em class="ed">núcleos</em></h2>'
      + '<p class="lede">'+(s.nucleos.length>1 ? 'A '+esc(s.nomeCurto)+' reúne vários núcleos sob o mesmo grupo.' : 'Treinos conduzidos diretamente pela equipe da '+esc(s.nomeCurto)+'.')+'</p>'
      + '<div class="nuclei">'+nucCards+'</div>'
      + (s.endereco ? '<div class="addr-line">'+IC.pin+'<span>Endereço: <span class="sel">'+esc(s.endereco)+'</span></span></div>' : '')
      + '</section>';
  } else if(s.endereco){
    treinar = '<section class="anim" id="treinar"><div class="eyebrow"><span class="dot"></span>Onde treinar</div>'
      + '<h2 class="sec-h">Onde <em class="ed">ficamos</em></h2>'
      + '<div class="addr-line">'+IC.pin+'<span>Endereço: <span class="sel">'+esc(s.endereco)+'</span></span></div>'
      + '</section>';
  }

  // --- CONTATO / CLOSING ---
  var contato = '<section class="anim" id="contato"><div class="closing"><div class="eyebrow"><span class="dot"></span>Contato e inscrição</div>'
    + '<h2>Dê o <em class="ed">primeiro passo</em></h2>'
    + '<div class="contact">'
    +   (s.instagram ? '<div class="ci"><span class="ic">'+IC.ig+'</span><div><small>Instagram</small><b>@'+esc(s.instagram)+'</b></div></div>' : '')
    +   (s.endereco ? '<div class="ci"><span class="ic">'+IC.pin+'</span><div><small>Endereço</small><b>'+esc(s.endereco)+'</b></div></div>' : '')
    +   (s.dominio ? '<div class="ci"><span class="ic">'+IC.app+'</span><div><small>Site</small><b>'+esc(s.dominio)+'</b></div></div>' : '')
    + '</div>'
    + '<a class="btn btn-go btn-lg big-cta" href="'+esc(ins)+'">Fazer inscrição '+IC.arrow+'</a>'
    + '</div></section>';

  // --- FOOTER ---
  var foot = '<footer class="foot"><div class="wrap">'
    + '<div class="ap"><span class="mk">A</span>Site gerado pelo <b>&nbsp;AtletaPay</b></div>'
    + '<div class="meta">'+esc(s.cidade)+' — '+esc(s.uf)+' · atletapay.com.br/'+esc(s.slug)+'</div>'
    + '</div></footer>';

  site.innerHTML = nav + hero + '<div class="wrap">' + sobre + grad + treinar + contato + '</div>' + foot;
  wireChrome(site);
}

// Página de aviso (escola não encontrada / não ativada / raiz) — mesmo sistema visual.
function renderAviso(titulo, texto){
  var c = { principal:'#002D72', destaque:'#389E92', botao:'#00E676' };
  var site = document.getElementById('site');
  if(!site) return;
  aplicarTokens(site, c);
  site.innerHTML =
    '<section class="hero" id="top">'
    + motif('arena', c)
    + '<span class="veil" aria-hidden="true"></span>'
    + '<div class="wrap"><div class="hero-grid"><div>'
    +   '<span class="badge"><span class="pulse"></span>AtletaPay</span>'
    +   '<h1>'+esc(titulo)+'</h1>'
    +   '<p class="sub">'+esc(texto)+'</p>'
    +   '<div class="hero-cta"><a class="btn btn-go btn-lg" href="https://atletapay.com.br">Ir para o AtletaPay '+IC.arrow+'</a></div>'
    + '</div><div class="crest-stage"><span class="ring" aria-hidden="true"></span><span class="ring r2" aria-hidden="true"></span>'
    +   '<span class="big-crest">AP</span><span class="sat" aria-hidden="true">'+IC.star+'</span></div>'
    + '</div></div></section>';
  wireChrome(site);
}

/* ========================================================================== */
/*  Mapeamento escolasPublicas → formato do motor                             */
/* ========================================================================== */
function mapCores(cores){
  var FB = { principal:'#002D72', destaque:'#389E92', botao:'#00E676' };
  var c = (cores && typeof cores === 'object') ? cores : {};
  var hex = function(v){ return /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : null; };
  var pick = function(){ for(var i=0;i<arguments.length;i++){ var val = hex(c[arguments[i]]); if(val) return val; } return null; };
  var valores = Object.keys(c).map(function(k){ return hex(c[k]); }).filter(Boolean);
  return {
    principal: pick('principal','navy','primaria','primary','azul','marinho') || valores[0] || FB.principal,
    destaque:  pick('destaque','teal','secundaria','secondary','verdeazulado','ciano') || valores[1] || FB.destaque,
    botao:     pick('botao','verde','cta','acao','accent','laranja','primaria2') || valores[2] || FB.botao
  };
}

function mapEscada(e){
  if(!e) return null;
  var arr = Array.isArray(e) ? e : (e && Array.isArray(e.adulto) ? e.adulto : null);
  if(!arr || !arr.length) return null;
  var out = arr.map(function(b){
    if(!b) return null;
    var cor = Array.isArray(b.cor) ? (b.cor[0] || b.cor[1] || b.cor[2]) : b.cor;
    cor = /^#[0-9a-f]{3,6}$/i.test(String(cor)) ? String(cor) : '#9aa7b4';
    var nome = String(b.nome || '').trim();
    return nome ? { nome: nome, cor: cor } : null;
  }).filter(Boolean);
  return out.length ? out : null;
}

// Mesma escada, mas com as até 3 cores de cada graduação (cordão tricolor da capoeira). Só hex válido.
function mapEscada3(e){
  var arr = Array.isArray(e) ? e : (e && Array.isArray(e.adulto) ? e.adulto : null);
  if(!arr || !arr.length) return null;
  var ok = function(c){ return /^#[0-9a-f]{3,6}$/i.test(String(c)) ? String(c) : null; };
  var out = arr.map(function(b){
    if(!b) return null;
    var nome = String(b.nome || '').trim(); if(!nome) return null;
    var cs = (Array.isArray(b.cor) ? b.cor : [b.cor]).map(ok).filter(Boolean).slice(0, 3);
    if(!cs.length) cs = ['#9aa7b4'];
    return { nome: nome, cor: [cs[0], cs[1] || cs[0], cs[2] || cs[0]] };
  }).filter(Boolean);
  return out.length ? out : null;
}

// Agenda pública da escola: eventos e avisos publicados NO APP com "Mostrar no site".
// O servidor espelha só campos seguros em agendaPublica/{tipo}_{id} (functions/src/site-publico.js);
// aqui só lemos e revalidamos. Avisos: os dos últimos 45 dias. Eventos: futuros e dos últimos 60 dias.
async function lerAgendaPublica(id){
  try{
    var snap = await getDocs(query(collection(db, 'agendaPublica'), where('escolaId', '==', id), limit(60)));
    var txt = function(v, m){ return typeof v === 'string' ? v.trim().slice(0, m) : ''; };
    var hoje = new Date(); var ini = function(dias){ return new Date(hoje.getTime() - dias * 86400000).toISOString().slice(0, 10); };
    return snap.docs.map(function(d){
      var a = d.data() || {};
      var data = /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') ? a.data : '';
      return { tipo: a.tipo === 'aviso' ? 'aviso' : 'evento', titulo: txt(a.titulo, 80), texto: txt(a.texto, 240), data: data,
        hora: /^\d{2}:\d{2}$/.test(a.hora || '') ? a.hora : '', local: txt(a.local, 140), nucleo: txt(a.nucleo, 60), criadoEm: txt(a.criadoEm, 30) };
    }).filter(function(a){
      if(!a.titulo) return false;
      if(a.tipo === 'aviso') return (a.data || a.criadoEm.slice(0, 10)) >= ini(45);
      return !a.data || a.data >= ini(60);
    }).sort(function(x, y){ return (y.criadoEm || '').localeCompare(x.criadoEm || ''); });
  }catch(e){ return []; }
}

function mapEscola(pub, id, nucleos){
  var modalidade = String(pub.modalidade || 'capoeira').toLowerCase();
  return {
    id: id,
    nome: pub.nome || pub.nomeCurto || 'Escola',
    nomeCurto: pub.nomeCurto || pub.nome || 'Escola',
    slug: pub.slug || id,
    modalidade: modalidade,
    cidade: pub.cidade || '',
    uf: pub.uf || '',
    endereco: pub.endereco || '',
    instagram: String(pub.instagram || '').replace(/^@+/, ''),
    dominio: pub.dominio || '',
    cores: mapCores(pub.cores),
    lider: pub.lider || (pub.responsavel && pub.responsavel.nome) || LIDER[modalidade] || 'Professor',
    peca: String(pub.pecaGraduacao || PECA[modalidade] || 'graduação'),
    logo: pub.logo || '',
    escada: mapEscada(pub.escada),
    escada3: mapEscada3(pub.escada),
    nucleos: (nucleos && nucleos.length) ? nucleos : (pub.nucleoSede ? [pub.nucleoSede] : []),
    template: templateDe(pub.template, modalidade),
    // Campos extras usados pelos templates com layout próprio (ex.: horizons).
    // Tudo é validado lá (url()/esc()); aqui só normalizamos o formato.
    fotoLider: pub.fotoLider || '',
    fotos: {
      fachada: listaStr(pub.fotos && pub.fotos.fachada),
      treino:  listaStr(pub.fotos && pub.fotos.treino),
      equipe:  listaStr(pub.fotos && pub.fotos.equipe)
    },
    graduacoes: listaStr(pub.graduacoes),
    responsavel: (pub.responsavel && typeof pub.responsavel === 'object')
      ? { nome: String(pub.responsavel.nome || ''), graduacao: String(pub.responsavel.graduacao || '') } : null,
    equipe: Array.isArray(pub.equipe) ? pub.equipe.filter(function(m){ return m && typeof m === 'object'; }).slice(0, 6) : [],
    geo: (pub.geo && isFinite(pub.geo.lat) && isFinite(pub.geo.lng)) ? { lat: Number(pub.geo.lat), lng: Number(pub.geo.lng) } : null
  };
}
function listaStr(a){ return Array.isArray(a) ? a.filter(function(x){ return typeof x === 'string' && x.trim(); }).slice(0, 20) : []; }

/* ========================================================================== */
/*  SEO por escola (SPA renderizada no cliente)                               */
/* ========================================================================== */
function setMeta(name, content){
  var m = document.head.querySelector('meta[name="'+name+'"]');
  if(!m){ m = document.createElement('meta'); m.setAttribute('name', name); document.head.appendChild(m); }
  m.setAttribute('content', content);
}
function setMetaProp(prop, content){
  var m = document.head.querySelector('meta[property="'+prop+'"]');
  if(!m){ m = document.createElement('meta'); m.setAttribute('property', prop); document.head.appendChild(m); }
  m.setAttribute('content', content);
}
function aplicarSeo(s){
  var loc = (s.cidade && s.uf) ? (s.cidade + ' — ' + s.uf) : (s.cidade || s.uf || '');
  var vb = VOCAB[s.template] || VOCAB[MOD_TEMPLATE[s.modalidade]] || null;
  var desc = (vb ? vb.nomeMod : 'Artes marciais')
    + (loc ? ' em ' + loc : '') + '. ' + s.nome
    + ' — treinos, graduação e inscrição pelo AtletaPay.';
  document.title = s.nome;
  setMeta('description', desc);
  setMetaProp('og:title', s.nome);
  setMetaProp('og:description', desc);
  setMetaProp('og:type', 'website');
  var tema = s.cores && s.cores.principal;
  if(/^#[0-9a-f]{6}$/i.test(String(tema || ''))){
    document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){ m.setAttribute('content', tema); });
  }
  try{
    var canon = document.head.querySelector('link[rel="canonical"]');
    if(!canon){ canon = document.createElement('link'); canon.setAttribute('rel', 'canonical'); document.head.appendChild(canon); }
    canon.setAttribute('href', location.origin + location.pathname);
  }catch(e){ /* ok */ }
}

/* ========================================================================== */
/*  Resolução + fluxo                                                         */
/* ========================================================================== */
async function resolverId(){
  var id = null;
  try{ id = escolaIdDoEndereco(location, { usarUltima:false }); }catch(e){ id = null; }
  if(id) return id;
  try{ id = await escolaIdDoDominio(); }catch(e){ id = null; }
  return id;
}

async function iniciar(){
  var id = await resolverId();
  if(!id){
    renderAviso('AtletaPay', 'Sites de escolas de artes marciais. Acesse pelo endereço da sua escola (atletapay.com.br/nome-da-escola).');
    return;
  }

  var pub = null;
  try{
    var snap = await getDoc(doc(db, 'escolasPublicas', id));
    pub = snap && snap.exists() ? snap.data() : null;
  }catch(e){ pub = null; }

  if(!pub || pub.status !== 'ativa'){
    renderAviso('Escola não encontrada', 'Esta escola não foi encontrada ou ainda não foi ativada no AtletaPay. Confira o endereço com a sua academia.');
    return;
  }

  // nucleos: só nomes (formato que o layout "arena" usa). nucleosInfo: os mesmos
  // núcleos com os campos públicos que nucleoPublico() já exporta (sede, cidade, uf),
  // para templates com cartões de núcleo (horizons). Ambos saem da mesma consulta.
  var nucleos = [], nucleosInfo = [];
  try{
    var ns = await getDocs(query(collection(db, 'nucleosPublicos'), where('escolaId', '==', id), where('ativo', '==', true)));
    ns.docs.forEach(function(d){
      var n = d.data() || {};
      if(typeof n.nome !== 'string' || !n.nome.trim()) return;
      nucleos.push(n.nome);
      nucleosInfo.push({ nome: n.nome, sede: n.sede === true, cidade: typeof n.cidade === 'string' ? n.cidade : '', uf: typeof n.uf === 'string' ? n.uf : '' });
    });
  }catch(e){ nucleos = []; nucleosInfo = []; }

  var s = mapEscola(pub, id, nucleos);
  s.nucleosInfo = nucleosInfo;

  // Conteúdo editado no painel "Meu site" (siteConteudo/{escolaId}, leitura pública):
  // textos/fotos por cima dos padrões do template e, se a escola trocou de template lá,
  // o template escolhido. Sem o doc, o site é 100% o cadastro + padrões.
  var conteudo = null;
  try{
    var cs = await getDoc(doc(db, 'siteConteudo', id));
    conteudo = cs && cs.exists() ? cs.data() : null;
  }catch(e){ conteudo = null; }
  aplicarConteudo(s, conteudo);
  var agenda = await lerAgendaPublica(id);
  s.agenda = agenda;

  // Prévia ao vivo da aba "Meu site" (iframe, mesma origem): recebe o rascunho por
  // postMessage e re-renderiza SEM gravar nada. Só com ?previa=1 e só da própria origem.
  if(new URLSearchParams(location.search).get('previa') === '1'){
    addEventListener('message', function(e){
      if(e.origin !== location.origin || !e.data || e.data.tipo !== 'ap-previa') return;
      var dados = e.data.conteudo && typeof e.data.conteudo === 'object' ? e.data.conteudo : null;
      var s2 = mapEscola(pub, id, nucleos); s2.nucleosInfo = nucleosInfo; s2.agenda = agenda;
      aplicarConteudo(s2, dados);
      montar(s2, { seo:false });
    });
    try{ if(parent !== window) parent.postMessage({ tipo:'ap-previa-pronta', escola:id }, location.origin); }catch(e){ /* ok */ }
  }

  await montar(s, { seo:true });
}

function aplicarConteudo(s, conteudo){
  if(!conteudo || typeof conteudo !== 'object'){ s.conteudo = null; return; }
  s.conteudo = { secoes: (conteudo.secoes && typeof conteudo.secoes === 'object') ? conteudo.secoes : {} };
  if(templateExiste(conteudo.template)) s.template = templateDe(conteudo.template, s.modalidade);
}

// Monta o site com o template de s. Layout próprio: módulo sob demanda; se falhar (rede, erro no
// módulo), cai para o layout "arena" da modalidade — o site nunca fica em branco.
async function montar(s, opts){
  if(!opts || opts.seo !== false){ try{ aplicarSeo(s); }catch(e){ /* SEO é cosmético: nunca derruba o render */ } }
  if(LAYOUTS[s.template]){
    try{
      var mod = await import(LAYOUTS[s.template]);
      // modalidadeBase: a variante do arena (tabelas antigas); modalidade: a real do cadastro (kravmaga etc.),
      // para os templates escolherem textos próprios mesmo quando a base é 'arena'.
      (mod.render || mod.renderHorizons)(s, { esc: esc, url: url, VOCAB: VOCAB, LIDER: LIDER, modalidadeBase: MOD_TEMPLATE[s.modalidade] || 'arena', modalidade: s.modalidade });
      return;
    }catch(e){
      console.warn('site-escola: template "'+s.template+'" falhou, usando arena', e);
    }
  }
  var site = document.getElementById('site'); if(site){ site.className = ''; site.removeAttribute('style'); }
  // Layout "arena": respeita o template escolhido (ou o da modalidade, se o layout próprio falhou).
  render(s, LAYOUTS[s.template] ? templateDe(null, s.modalidade) : s.template);
}

initTheme();
iniciar().catch(function(e){
  console.warn('site-escola: falha ao montar', e);
  try{ renderAviso('AtletaPay', 'Não foi possível carregar este site agora. Tente novamente em instantes.'); }catch(_){ /* ok */ }
});
