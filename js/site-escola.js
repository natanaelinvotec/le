/* site-escola.js — gerador de site público multi-escola (Fase 4.1, PRODUÇÃO).
 *
 * Servido em atletapay.com.br/<escola> (e em domínio próprio da escola). Monta
 * um site de apresentação bonito a partir do que a escola publica, SÓ de dados
 * PÚBLICOS do Firestore (leitura anônima, nunca login, nunca coleção privada):
 *   - escolasPublicas/{id}     (allow read: if true) — identidade da escola.
 *   - nucleosPublicos (escolaId==id, ativo==true)     — nomes dos núcleos.
 *
 * A escola vem do ENDEREÇO (atletapay.com.br/<escola>) e, se não, do domínio
 * próprio — nunca do login (site público; resolverEscolaId é login-first, errado
 * aqui). Motor visual (9 templates + motion) portado de f41-preview.html; aqui
 * ele lê dado real e degrada com elegância quando falta coisa. Toda string passa
 * por esc() e todo link/foto por url() — o site nunca confia no que está gravado.
 */
import { db, doc, getDoc, getDocs, collection, query, where } from './firebase.js';
import { escolaIdDoEndereco, escolaIdDoDominio } from './escola-atual.js';

/* ========================================================================== */
/*  Utilidades seguras                                                        */
/* ========================================================================== */
// esc() endurecido: escapa também aspas, porque o mesmo texto entra tanto no
// corpo quanto em atributos (href, alt, src). Superset do esc() da pré-visualização.
function esc(v){
  return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
// url(): só aceita caminho do próprio site (assets/...) ou https://. Nada de
// javascript:, data:, http:// sem TLS, etc. (mesma política de js/site-render.js).
function url(u){
  var s = String(u == null ? '' : u).trim();
  if(!s) return '';
  if(/^https:\/\/[^\s"'<>\\]+$/i.test(s)) return s;
  if(/^[a-z0-9][a-z0-9._\/-]*$/i.test(s) && s.indexOf('..') === -1) return s;
  return '';
}

/* ========================================================================== */
/*  MOTION LAYER (portado da pré-visualização)                                */
/* ========================================================================== */
var Motion = (function(global){
  "use strict";
  var REDUCE_Q = (global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)")) || null;
  function reduced(){ return !!(REDUCE_Q && REDUCE_Q.matches); }

  var EASE = "cubic-bezier(0.23, 1, 0.32, 1)"; /* --ease-out */
  var hasRendered = false;
  var token = 0;
  var timers = [];

  function clearTimers(){ for(var i=0;i<timers.length;i++){ clearTimeout(timers[i]); } timers = []; }
  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }

  function restRest(el){
    if(!el) return;
    el.style.transition = "";
    el.style.transform = "";
    el.style.opacity = "";
    el.style.willChange = "";
  }

  function snapshot(container){
    container = container || document.getElementById("site");
    if(!container || reduced()) return;
    var host = container.parentNode;
    if(!host) return;
    removeOverlay(container);
    try{
      container.classList.add("motion-root");
      var ov = document.createElement("div");
      ov.className = "container motion-overlay";
      ov.setAttribute("data-motion-overlay", "1");
      ov.setAttribute("aria-hidden", "true");
      var inline = container.getAttribute("style");
      if(inline) ov.setAttribute("style", inline + ";position:absolute;top:0;left:0;right:0;z-index:40;pointer-events:none");
      ov.innerHTML = container.innerHTML;
      host.appendChild(ov);
    }catch(e){ /* non-fatal */ }
  }

  function removeOverlay(container){
    if(!container) return;
    var scope = container.parentNode || container;
    var olds = scope.querySelectorAll("[data-motion-overlay]");
    for(var i=0;i<olds.length;i++){ if(olds[i].parentNode) olds[i].parentNode.removeChild(olds[i]); }
  }

  function fadeOverlayOut(container, dur){
    var scope = container.parentNode || container;
    var ov = scope.querySelector("[data-motion-overlay]");
    if(!ov) return;
    ov.style.transition = "opacity " + dur + "ms " + EASE + ", transform " + dur + "ms " + EASE;
    requestAnimationFrame(function(){
      ov.style.opacity = "0";
      ov.style.transform = "scale(1.012)";
    });
    later(function(){ removeOverlay(container); }, dur + 90);
  }

  function blocks(container){
    var out = [];
    var kids = container.children;
    for(var i=0;i<kids.length;i++){ if(!kids[i].hasAttribute("data-motion-overlay")) out.push(kids[i]); }
    return out;
  }

  function prime(el, y){
    el.style.transition = "none";
    el.style.willChange = "transform, opacity";
    el.style.opacity = "0";
    el.style.transform = "translate3d(0," + y + "px,0)";
  }
  function release(el, dur, delay){
    el.style.transition =
      "opacity " + dur + "ms " + EASE + " " + delay + "ms, " +
      "transform " + dur + "ms " + EASE + " " + delay + "ms";
    el.style.opacity = "";
    el.style.transform = "";
  }

  function growBelts(container, baseDelay){
    var belts = container.querySelectorAll(".belt-track");
    var step = 70, dur = 560;
    for(var i=0;i<belts.length;i++){
      (function(el, i){
        el.style.transition = "none";
        el.style.willChange = "transform, opacity";
        el.style.transformOrigin = "left center";
        el.style.opacity = ".25";
        el.style.transform = "scaleX(.08)";
        void el.offsetWidth;
        var d = baseDelay + 120 + i * step;
        el.style.transition =
          "opacity " + dur + "ms " + EASE + " " + d + "ms, " +
          "transform " + dur + "ms " + EASE + " " + d + "ms";
        el.style.opacity = "";
        el.style.transform = "";
      })(belts[i], i);
    }
    var cord = container.querySelector(".cordao");
    if(cord){
      cord.style.transition = "none";
      cord.style.willChange = "transform, opacity";
      cord.style.transformOrigin = "left center";
      cord.style.opacity = ".2";
      cord.style.transform = "scaleX(.2)";
      void cord.offsetWidth;
      var cd = baseDelay + 120;
      cord.style.transition =
        "opacity " + 620 + "ms " + EASE + " " + cd + "ms, " +
        "transform " + 620 + "ms " + EASE + " " + cd + "ms";
      cord.style.opacity = "";
      cord.style.transform = "";
    }
  }

  function enter(container){
    container = container || document.getElementById("site");
    if(!container) return;
    container.classList.add("motion-root");

    token++;
    var mine = token;
    clearTimers();

    var kids = blocks(container);

    if(reduced()){
      removeOverlay(container);
      for(var r=0;r<kids.length;r++) restRest(kids[r]);
      var bl = container.querySelectorAll(".belt-track, .cordao");
      for(var b=0;b<bl.length;b++) restRest(bl[b]);
      hasRendered = true;
      return;
    }

    var isSwitch = hasRendered;
    hasRendered = true;

    var dur = isSwitch ? 440 : 600;
    var step = isSwitch ? 48 : 70;
    var fromY = isSwitch ? 10 : 16;

    for(var i=0;i<kids.length;i++) prime(kids[i], fromY);
    void container.offsetWidth;

    var gradIndex = -1;
    for(var j=0;j<kids.length;j++){
      release(kids[j], dur, j * step);
      if(gradIndex < 0 && kids[j].querySelector &&
         kids[j].querySelector(".belt-track, .cordao")){
        gradIndex = j;
      }
    }

    if(gradIndex >= 0) growBelts(container, gradIndex * step);

    fadeOverlayOut(container, 320);

    var total = (kids.length * step) + dur + 700 + 60;
    later(function(){
      if(mine !== token) return;
      for(var k=0;k<kids.length;k++) restRest(kids[k]);
      var done = container.querySelectorAll(".belt-track, .cordao");
      for(var d=0;d<done.length;d++){
        done[d].style.transition = "";
        done[d].style.willChange = "";
        done[d].style.transform = "";
        done[d].style.opacity = "";
        done[d].style.transformOrigin = "";
      }
    }, total);
  }

  return { enter: enter, snapshot: snapshot };
})(window);

/* ========================================================================== */
/*  Vocabulário por modalidade / template                                     */
/* ========================================================================== */
var VOCAB = {
  capoeira:{ saudacao:"Salve!", local:"roda", luta:"jogo", treino:"treino", artigo:"A", nomeMod:"Capoeira" },
  jiujitsu:{ saudacao:"Oss!",   local:"tatame", luta:"rola", treino:"treino", artigo:"O", nomeMod:"Jiu-jitsu" },
  judo:{ saudacao:"Oss!", local:"tatame", luta:"randori", treino:"treino", artigo:"O", nomeMod:"Judô" },
  karate:{ saudacao:"Oss!", local:"dojo", luta:"kumite", treino:"treino", artigo:"O", nomeMod:"Karatê" },
  taekwondo:{ saudacao:"Taekwon!", local:"dojang", luta:"kyorugi", treino:"treino", artigo:"O", nomeMod:"Taekwondo" },
  muaythai:{ saudacao:"Sawasdee!", local:"ringue", luta:"sparring", treino:"treino", artigo:"O", nomeMod:"Muay Thai" },
  boxe:{ saudacao:"Bom treino!", local:"ringue", luta:"sparring", treino:"treino", artigo:"O", nomeMod:"Boxe" },
  mma:{ saudacao:"Bom treino!", local:"octógono", luta:"sparring", treino:"treino", artigo:"O", nomeMod:"MMA" },
  arena:{ saudacao:"Bem-vindo", local:"academia", luta:"treino", treino:"treino", artigo:"A", nomeMod:"Artes marciais" }
};

// Modalidade → template padrão (quando a escola não escolheu um). Fora deste mapa: arena.
var MOD_TEMPLATE = {
  capoeira:"capoeira", jiujitsu:"jiujitsu", judo:"judo", karate:"karate",
  taekwondo:"taekwondo", muaythai:"muaythai", boxe:"boxe", mma:"mma"
};
// Líder e peça de graduação por modalidade (fallback quando o cartão não traz).
var LIDER = { capoeira:"Mestre", jiujitsu:"Professor", judo:"Sensei", karate:"Sensei",
  taekwondo:"Sabom", muaythai:"Kru", boxe:"Treinador", mma:"Coach" };
var PECA = { capoeira:"cordão", jiujitsu:"faixa", judo:"faixa", karate:"faixa",
  taekwondo:"faixa", muaythai:"prajied", boxe:"nível", mma:"nível" };

function templateDe(tpl, modalidade){
  if(tpl && VOCAB[tpl]) return tpl;               // escola escolheu um dos 9 templates válidos
  return MOD_TEMPLATE[modalidade] || "arena";     // senão, o da modalidade; senão, arena
}

/* ========================================================================== */
/*  Helpers de renderização (portados)                                        */
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
  pin:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  users:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13A4 4 0 0 1 16 11"/></svg>',
  badge:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/></svg>',
  star:'<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 18.6 6.1 21.3l1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"/></svg>',
  info:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  ig:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>',
  arrow:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  app:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>'
};

/* ========================================================================== */
/*  Motivos do hero (svg gerado) — cores inlined como hex real (SVG não        */
/*  resolve var() em atributos de apresentação).                               */
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
  // arena: neutro geométrico — quadrados concêntricos girados + linhas radiais
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
/*  Builders de seção (portados, agora lendo o objeto school mapeado)         */
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

function gradSection(s, tpl, v){
  var inner;
  var pecaCap = esc(s.peca.charAt(0).toUpperCase()+s.peca.slice(1));
  if(s.escada && s.escada.length){
    var rows = s.escada.map(function(b,j){
      var lite = isLight(b.cor) ? ' lite' : '';
      return '<div class="belt" style="--bc:'+esc(b.cor)+';--j:'+j+'">'
        +'<div class="belt-track'+lite+'"><span class="belt-tip"></span></div>'
        +'<div class="belt-name">'+pecaCap+' '+esc(b.nome)+'<small>Etapa '+(j+1)+'</small></div>'
        +'</div>';
    }).join('');
    inner = '<div class="ladder">'+rows+'</div>'
      +'<div class="grad-note">'+IC.info+'<span>A sequência de '+esc(s.peca)+'s segue a graduação cadastrada pela escola. Cada etapa marca um ponto da jornada no '+v.local+'.</span></div>';
  } else {
    inner = '<div class="cordao-wrap"><div class="cordao"></div></div>'
      +'<div class="grad-note">'+IC.info+'<span>A graduação por '+esc(s.peca)+' da '+esc(s.nomeCurto)+' aparece aqui assim que o '+esc(s.lider)+' cadastrar os '+esc(s.peca)+'s no AtletaPay. Nada é inventado: mostramos a faixa de cores oficial quando ela for definida.</span></div>';
  }
  return '<section class="anim" style="--i:3"><div class="eyebrow"><span class="dot"></span>Graduação</div>'
    +'<h2 class="sec-h">A jornada por '+esc(s.peca)+'</h2>'
    +'<div class="card grad">'+inner+'</div></section>';
}

/* ========================================================================== */
/*  Render principal                                                          */
/* ========================================================================== */
function render(s, tpl){
  var v = VOCAB[tpl] || VOCAB.arena;
  var c = s.cores;
  var contr = contrDe(s.nome);
  var inscricaoURL = '/'+encodeURIComponent(s.slug)+'/inscricao';

  var siteStyle = '--ep:'+c.principal+';--ed:'+c.destaque+';--eb:'+c.botao
    +';--eb-text:'+readable(c.botao)+';--ed-text:'+readable(c.destaque)+';';

  var tagline = v.artigo+' '+v.local+' '+contr+' '+esc(s.nome)+', em '+esc(s.cidade)+' — '+esc(s.uf)+'.';

  var chips = ''
    + '<span class="stat">'+IC.pin+esc(s.cidade)+' — '+esc(s.uf)+'</span>'
    + '<span class="stat">'+IC.star+'<b>'+esc(v.nomeMod)+'</b></span>'
    + (s.nucleos.length ? '<span class="stat">'+IC.users+plural(s.nucleos.length,'núcleo','núcleos')+'</span>' : '')
    + '<span class="stat">'+IC.badge+esc(s.lider)+' à frente</span>';

  var nucCards = s.nucleos.map(function(n){
    var limpo = n.replace(/^Academia\s+/i,'').replace(/^Professora?\s+/i,'').replace(/^Instrutor\s+/i,'').replace(/^Mestre\s+/i,'') || n;
    return '<div class="card nuc"><div class="nm">'+esc(initials(limpo))+'</div><div class="nn">'+esc(n)+'</div></div>';
  }).join('');

  // Monograma do hero: logo real (quando houver e for URL segura) ou as iniciais.
  var logoSeguro = url(s.logo);
  var mono = logoSeguro
    ? '<img src="'+esc(logoSeguro)+'" alt="'+esc('Logo '+s.nomeCurto)+'" loading="eager" decoding="async">'
    : esc(initials(s.nomeCurto));

  var hero = '<div class="hero anim" style="--i:0">'
    + motif(tpl, c)
    + '<div class="hero-inner">'
    +   '<span class="chip-saud"><span class="spark"></span>'+esc(v.saudacao)+'</span>'
    +   '<div class="hero-id"><div class="mono">'+mono+'</div>'
    +     '<h1>'+esc(s.nome)+'</h1></div>'
    +   '<p class="tagline">'+tagline+'</p>'
    +   '<div class="cta-row">'
    +     '<a class="btn btn-primary" href="'+esc(inscricaoURL)+'">Fazer inscrição '+IC.arrow+'</a>'
    +     '<a class="btn btn-ghost" href="#contato">'+IC.app+' Abrir o app</a>'
    +   '</div>'
    +   (s.endereco ? '<span class="loc">'+IC.pin+esc(s.endereco)+'</span>' : '')
    + '</div></div>';

  var sobre = '<section class="anim" style="--i:1"><div class="eyebrow"><span class="dot"></span>Sobre</div>'
    + '<h2 class="sec-h">Quem treina aqui</h2>'
    + '<div class="card sobre"><p>'+sobreCopy(s,tpl,v)+'</p><div class="chips">'+chips+'</div></div></section>';

  var grad = gradSection(s,tpl,v);

  var treinar = '';
  if(s.nucleos.length){
    treinar = '<section class="anim" style="--i:4"><div class="eyebrow"><span class="dot"></span>Onde treinar</div>'
      + '<h2 class="sec-h">Nossos núcleos</h2>'
      + '<p class="lede">'+(s.nucleos.length>1 ? 'A '+esc(s.nomeCurto)+' reúne vários núcleos sob o mesmo grupo.' : 'Treinos conduzidos diretamente pela equipe da '+esc(s.nomeCurto)+'.')+'</p>'
      + '<div class="nucleos">'+nucCards+'</div>'
      + (s.endereco ? '<div class="addr-line">'+IC.pin+'<span>Endereço: <span class="sel">'+esc(s.endereco)+'</span></span></div>' : '')
      + '</section>';
  } else if(s.endereco){
    treinar = '<section class="anim" style="--i:4"><div class="eyebrow"><span class="dot"></span>Onde treinar</div>'
      + '<h2 class="sec-h">Onde ficamos</h2>'
      + '<div class="addr-line">'+IC.pin+'<span>Endereço: <span class="sel">'+esc(s.endereco)+'</span></span></div>'
      + '</section>';
  }

  var contato = '<section class="anim" id="contato" style="--i:5"><div class="eyebrow"><span class="dot"></span>Contato e inscrição</div>'
    + '<h2 class="sec-h">Dê o primeiro passo</h2>'
    + '<div class="card contato">'
    +   '<div class="contato-grid">'
    +     (s.instagram ? '<div class="ci"><div class="ic">'+IC.ig+'</div><div><div class="k">Instagram</div><div class="v">@'+esc(s.instagram)+'</div></div></div>' : '')
    +     (s.endereco ? '<div class="ci"><div class="ic">'+IC.pin+'</div><div><div class="k">Endereço</div><div class="v">'+esc(s.endereco)+'</div></div></div>' : '')
    +     (s.dominio ? '<div class="ci"><div class="ic">'+IC.app+'</div><div><div class="k">Site</div><div class="v">'+esc(s.dominio)+'</div></div></div>' : '')
    +   '</div>'
    +   '<a class="btn btn-primary" href="'+esc(inscricaoURL)+'">Fazer inscrição '+IC.arrow+'</a>'
    + '</div></section>';

  var foot = '<div class="foot anim" style="--i:6">'
    + '<span class="made"><span class="logo">AP</span>Site gerado pelo AtletaPay</span>'
    + '<span>'+esc(s.cidade)+' — '+esc(s.uf)+'</span>'
    + '</div>';

  var site = document.getElementById('site');
  if(!site) return;
  site.setAttribute('style', siteStyle);
  site.innerHTML = hero + sobre + grad + treinar + contato + foot;
  if(Motion) Motion.enter(site);
}

// Página de aviso (escola não encontrada / não ativada / raiz da plataforma) —
// mesmo sistema visual, mensagem curta e um link para o AtletaPay.
function renderAviso(titulo, texto){
  var c = { principal:'#002D72', destaque:'#389E92', botao:'#00E676' };
  var site = document.getElementById('site');
  if(!site) return;
  site.setAttribute('style', '--ep:'+c.principal+';--ed:'+c.destaque+';--eb:'+c.botao
    +';--eb-text:'+readable(c.botao)+';--ed-text:'+readable(c.destaque)+';');
  site.innerHTML =
    '<div class="hero anim" style="--i:0">'
    + motif('arena', c)
    + '<div class="hero-inner">'
    +   '<span class="chip-saud"><span class="spark"></span>AtletaPay</span>'
    +   '<div class="hero-id"><div class="mono">AP</div><h1>'+esc(titulo)+'</h1></div>'
    +   '<p class="tagline">'+esc(texto)+'</p>'
    +   '<div class="cta-row"><a class="btn btn-primary" href="https://atletapay.com.br">Ir para o AtletaPay '+IC.arrow+'</a></div>'
    + '</div></div>';
  if(Motion) Motion.enter(site);
}

/* ========================================================================== */
/*  Mapeamento escolasPublicas → formato do motor                             */
/* ========================================================================== */
// cores: mapa de chaves próprias da escola (minúsculas) → { principal, destaque, botao }.
// Reconhece nomes conhecidos; senão cai por POSIÇÃO; senão, paleta institucional.
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

// escada: aceita o objeto escadaLimpa ({ adulto:[{nome,cor:[c1,c2,c3]}], ... }) OU
// um array simples [{nome,cor}]. Achata para [{nome, cor:"#hex"}] (cor representativa).
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
    nucleos: (nucleos && nucleos.length) ? nucleos : (pub.nucleoSede ? [pub.nucleoSede] : []),
    template: templateDe(pub.template, modalidade)
  };
}

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
  var desc = (VOCAB[s.template] ? VOCAB[s.template].nomeMod : 'Artes marciais')
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
// SÓ pelo endereço (caminho) e, se não disser, pelo domínio próprio — nunca pelo
// login (site público). usarUltima:false: não herda a "última escola" do aparelho.
async function resolverId(){
  var id = null;
  try{ id = escolaIdDoEndereco(location, { usarUltima:false }); }catch(e){ id = null; }
  if(id) return id;
  try{ id = await escolaIdDoDominio(); }catch(e){ id = null; }
  return id;
}

async function iniciar(){
  var id = await resolverId();
  // Raiz da plataforma (sem escola no endereço e sem domínio próprio): aviso neutro.
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

  var nucleos = [];
  try{
    var ns = await getDocs(query(collection(db, 'nucleosPublicos'), where('escolaId', '==', id), where('ativo', '==', true)));
    nucleos = ns.docs.map(function(d){ return (d.data() || {}).nome; })
      .filter(function(n){ return typeof n === 'string' && n.trim(); });
  }catch(e){ nucleos = []; }

  var s = mapEscola(pub, id, nucleos);
  try{ aplicarSeo(s); }catch(e){ /* SEO é cosmético: nunca derruba o render */ }
  render(s, s.template);
}

iniciar().catch(function(e){
  console.warn('site-escola: falha ao montar', e);
  try{ renderAviso('AtletaPay', 'Não foi possível carregar este site agora. Tente novamente em instantes.'); }catch(_){ /* ok */ }
});
