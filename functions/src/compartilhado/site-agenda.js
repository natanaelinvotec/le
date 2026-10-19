/* site-agenda.js — agenda e avisos do app para os templates do site da escola.
 *
 * site-escola.js lê agendaPublica/{escolaId} (espelho que o SERVIDOR grava quando um evento ou
 * aviso é publicado no app com "Mostrar no site") e entrega em s.agenda uma lista já saneada:
 *   { tipo:'evento'|'aviso', titulo, texto, data:'AAAA-MM-DD'|'', hora:'HH:MM'|'', local, nucleo, criadoEm }
 * Este módulo só organiza essa lista para os templates (Luva, Mongkon, Horizons…) desenharem:
 * nada aqui inventa evento — sem dados do app, as funções devolvem listas vazias e o template
 * não mostra a seção. O HTML é montado em cada template (cada um com o próprio visual); os
 * textos passam por esc() lá.
 */

export var MES_CURTO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

var DATA = /^\d{4}-\d{2}-\d{2}$/;
function hojeISO(){ return new Date().toISOString().slice(0, 10); }
function txt(v, n){ return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : ''; }

// Próximos eventos (hoje em diante), do mais perto para o mais distante. Eventos sem data vão
// para o fim. Devolve até `max` itens prontos para o template: dia, mês curto, hora, local.
export function eventosDoApp(s, max){
  var lista = Array.isArray(s && s.agenda) ? s.agenda : [], hoje = hojeISO();
  return lista.filter(function(a){ return a && a.tipo === 'evento' && txt(a.titulo, 80) && (!DATA.test(a.data || '') || a.data >= hoje); })
    .sort(function(x, y){ var a = DATA.test(x.data || '') ? x.data : '9999', b = DATA.test(y.data || '') ? y.data : '9999'; return a.localeCompare(b); })
    .slice(0, max || 4)
    .map(function(a){
      var d = DATA.test(a.data || '') ? a.data : '';
      return { titulo: txt(a.titulo, 80), data: d, dia: d ? d.slice(8, 10) : '', mes: d ? MES_CURTO[+d.slice(5, 7) - 1] || '' : '',
        hora: /^\d{2}:\d{2}$/.test(a.hora || '') ? a.hora : '', local: txt(a.local, 140) || txt(a.nucleo, 60), texto: txt(a.texto, 240) };
    });
}

// Avisos mais recentes primeiro (site-escola.js já ordena por criadoEm e limita a 45 dias).
export function avisosDoApp(s, max){
  var lista = Array.isArray(s && s.agenda) ? s.agenda : [];
  return lista.filter(function(a){ return a && a.tipo === 'aviso' && txt(a.titulo, 80); }).slice(0, max || 3)
    .map(function(a){
      var d = DATA.test(a.data || '') ? a.data : (/^\d{4}-\d{2}-\d{2}/.test(a.criadoEm || '') ? a.criadoEm.slice(0, 10) : '');
      return { titulo: txt(a.titulo, 80), texto: txt(a.texto, 240), quando: d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '', hora: /^\d{2}:\d{2}$/.test(a.hora || '') ? a.hora : '', local: txt(a.local, 140) };
    });
}

// Seção "Agenda e avisos" de um template, para a aba "Meu site": só o título é editável, porque
// o conteúdo vem do app. `pre` acrescenta campos antes (ex.: etiqueta), se o template quiser.
export function SECAO_AGENDA(pre){
  return { id: 'agenda', r: 'Agenda e avisos', ajuda: 'Eventos e avisos publicados no app com "Mostrar no site" aparecem aqui sozinhos. Sem nada publicado, a seção não aparece.',
    campos: (pre || []).concat([{ c: 'titulo', r: 'Título da seção', max: 50, ph: 'Agenda e avisos' }]) };
}
