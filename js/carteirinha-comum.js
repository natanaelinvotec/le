/* carteirinha-comum.js — o que o app, o painel e a página de verificação
mostram igual. A regra de validade de verdade é do servidor
(functions/src/carteirinha.js); aqui só lemos o resultado. */

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// "Hoje" no fuso do grupo (a carteirinha não vence às 21h por causa do UTC).
export function hojeLocal(d = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Campo_Grande', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
  catch (e) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
}

// Mesma conta do servidor: inativa | semfoto | valida | vencida.
export function situacao(c, hoje = hojeLocal()) {
  if (!c || c.ativo === false) return 'inativa';
  if (c.fotoAprovada === false) return 'semfoto'; // só vale depois que o núcleo aprova a foto
  if (c.controle === 'mensalidade') return c.validaAte && c.validaAte >= hoje ? 'valida' : 'vencida';
  return 'valida';
}

export const dataBR = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? iso.split('-').reverse().join('/') : '');

// Texto da validade para o cartão e o selo.
export function textoValidade(c) {
  if (!c) return '—';
  if (c.ativo === false) return 'Inativa';
  if (c.controle === 'isento') return 'Bolsista';
  if (c.controle === 'mensalidade') return c.validaAte ? dataBR(c.validaAte) : 'Em aberto';
  return 'Atleta ativo';
}

export const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

// Faixas do cordão: "a b c" em gradiente de três partes.
export const faixas = (cores, dir = '90deg') => {
  // Só cor hexadecimal entra no estilo (o valor vem do banco).
  const ok = Array.isArray(cores) && cores.length === 3 && cores.every((x) => /^#[0-9a-f]{3,8}$/i.test(String(x)));
  const c = ok ? cores : ['#CCC', '#CCC', '#CCC'];
  return `linear-gradient(${dir}, ${c[0]} 0 33.3%, ${c[1]} 33.3% 66.6%, ${c[2]} 66.6%)`;
};

// Link da verificação pública: sempre no mesmo endereço em que o app está aberto.
export const linkVerificacao = (codigo) => `${new URL('v.html', location.href).href}#${encodeURIComponent(codigo)}`;

// Ícones (traço, sem emoji).
export const IC = {
  certo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  alerta: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 7v6"/><path d="M12 17h.01"/></svg>',
  cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  qr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
  camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  galeria: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  virar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/></svg>',
  voltar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  fechar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  sol: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  enviar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
  lixo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
  escudo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></svg>',
};

// O cartão (frente + verso). d = { nome, cordao, cores, nucleo, matricula,
// validade, validadeOk, foto, qrSvg, link, logo, grupo }
export function cartaoHtml(d, virado = false) {
  const fotoInterna = d.foto
    ? `<img src="${esc(d.foto)}" alt="Foto da carteirinha" loading="eager" decoding="async">`
    : `${esc(iniciais(d.nome))}<small>SEM FOTO</small>`;
  const curto = d.link ? d.link.replace(/^https:\/\//, '').replace(/#.*$/, '#…') : '';
  return `<div class="vira${virado ? ' virado' : ''}">
    <div class="face frente">
      <div class="guilhoche"></div>
      <img class="marca-dagua" src="${esc(d.logo)}" alt="">
      <div class="f-conteudo">
        <div class="f-topo"><span class="f-marca"><img src="${esc(d.logo)}" alt="">${esc(d.grupo)}</span><span class="f-tipo">CARTEIRINHA DE ATLETA</span></div>
        <div class="f-corpo">
          <div class="f-foto" style="background:${faixas(d.cores, '180deg')}"><div>${fotoInterna}</div></div>
          <div class="f-dados">
            <span class="f-nome">${esc(d.nome)}</span>
            <span class="f-cordao">${d.faixaSvg ? `<span class="f-faixa-svg" style="display:inline-block;width:64px;line-height:0;vertical-align:middle;margin-right:6px">${d.faixaSvg}</span>` : `<i style="background:${faixas(d.cores)}"></i>`}${d.rotulo ? esc(d.rotulo) : `Cordão ${esc(d.cordao)}`}</span>
            <div class="f-campos">
              <span><b>NÚCLEO</b><em>${esc(d.nucleo || '—')}</em></span>
              <span><b>MATRÍCULA</b><em class="mono">${esc(d.matricula || 'em emissão')}</em></span>
              <span><b>VÁLIDA ATÉ</b><em class="mono ${d.validadeOk ? 'ok' : 'ruim'}">${esc(d.validade)}</em></span>
            </div>
          </div>
        </div>
      </div>
      <div class="f-faixas" style="background:${faixas(d.cores)}"></div>
    </div>
    <div class="face costas">
      <div class="c-conteudo">
        <div class="c-qr">${d.qrSvg || '<div class="sem">O QR aparece quando a matrícula for emitida.</div>'}</div>
        <div class="c-txt"><b>VERIFICAÇÃO</b><strong>Aponte a câmera para conferir</strong>
          <p>Uso pessoal e intransferível. Vale com a mensalidade em dia.</p>${curto ? `<code>${esc(curto)}</code>` : ''}</div>
      </div>
      <div class="c-rodape"></div>
    </div>
  </div>`;
}

// Recorta no centro em 3:4 (retrato) e reduz para 600×800 — pesa ~80 KB.
export function prepararFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo || !String(arquivo.type).startsWith('image/')) { reject(new Error('Escolha uma foto (imagem).')); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth; const h = img.naturalHeight;
      if (Math.min(w, h) < 240) { reject(new Error('Foto pequena demais. Use a câmera do celular.')); return; }
      let cw = w; let ch = Math.round(w * 4 / 3);
      if (ch > h) { ch = h; cw = Math.round(h * 3 / 4); }
      const sx = Math.round((w - cw) / 2); const sy = Math.round((h - ch) / 2);
      const cv = document.createElement('canvas'); cv.width = 600; cv.height = 800;
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, 600, 800);
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, sx, sy, cw, ch, 0, 0, 600, 800);
      resolve(cv.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não deu para abrir essa foto. Tente outra.')); };
    img.src = url;
  });
}


// Quem treina tem carteirinha de atleta: aluno, instrutor, professor e mestre.
export const PAPEIS_ATLETA = ['aluno', 'instrutor', 'mestre'];
export const ehAtleta = (u) => !!u && Array.isArray(u.papeis) && u.papeis.some((p) => PAPEIS_ATLETA.includes(p));

// Beneficiários: só pai, mãe, irmãos e avós (o servidor confere de novo).
export const PARENTESCOS = { pai: 'Pai', mae: 'Mãe', irmao: 'Irmão', irma: 'Irmã', avo: 'Avô', avoa: 'Avó' };
export const LIMITE_POR_PARENTESCO = { pai: 1, mae: 1, avo: 2, avoa: 2, irmao: 6, irma: 6 };
export const MAX_BENEFICIARIOS = 10;
// "Mãe de Natanael", "Avô de Natanael"…
export const deAtleta = (parentesco, nomeAtleta) => `${PARENTESCOS[parentesco] || parentesco} de ${String(nomeAtleta || 'atleta').split(' ')[0]}`;
