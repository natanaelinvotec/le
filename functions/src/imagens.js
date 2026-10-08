// Regra única de imagens — parte do servidor (08/10/2026).
//
// O app já reduz cada foto antes do envio (js/imagem.js) e o Storage recusa
// arquivo acima do teto de cada pasta (firebase/storage.rules). Esta rotina
// cuida do que já estava lá: fotos antigas e as que subiram por uma versão velha
// do app. Passa pasta por pasta, reduz o que está acima do alvo e grava no MESMO
// lugar, com o mesmo token de download — os links salvos no banco continuam valendo.
//
// Segurança: só mexe nas pastas listadas; mantém o formato (jpeg→jpeg, png→png,
// webp→webp); só regrava se ficar pelo menos 10% menor; usa ifGenerationMatch para
// não pisar num arquivo trocado no meio do caminho; marca metadata.otimizada = '1'.

export const PASTAS = [
  { prefixo: 'fotos/', lado: 720, alvoKB: 120 },
  { prefixo: 'fotos_alunos/', lado: 720, alvoKB: 120 },
  { prefixo: 'carteirinha/', lado: 800, alvoKB: 120 },
  { prefixo: 'rede/', lado: 1280, alvoKB: 300 },
  { prefixo: 'onboarding/', lado: 1600, alvoKB: 350 },
  { prefixo: 'escolas/', lado: 1600, alvoKB: 350 },
  { prefixo: 'site/', lado: 1920, alvoKB: 400 },
];
const FORMATOS = ['image/jpeg', 'image/png', 'image/webp'];
const POR_PAGINA = 200;

export const regraDoArquivo = (nome) => PASTAS.find((p) => String(nome || '').startsWith(p.prefixo)) || null;

// meta = metadados do objeto no Storage (contentType, size, metadata{}).
export function precisaOtimizar(meta, regra) {
  if (!meta || !regra) return false;
  if (!FORMATOS.includes(String(meta.contentType || '').toLowerCase())) return false; // vídeo, gif, svg: não mexe
  if (meta.metadata && meta.metadata.otimizada === '1') return false;
  return Number(meta.size || 0) > regra.alvoKB * 1024;
}

// Transforma o arquivo com o sharp (carregado só quando há trabalho).
async function processar(ctx, buf, tipo, regra) {
  const sharp = ctx.sharp || (await import('sharp')).default;
  let s = sharp(buf, { failOn: 'none' }).rotate().resize({ width: regra.lado, height: regra.lado, fit: 'inside', withoutEnlargement: true });
  if (tipo === 'image/png') s = s.png({ palette: true, quality: 85, compressionLevel: 9, effort: 7 });
  else if (tipo === 'image/webp') s = s.webp({ quality: 78, effort: 5 });
  else s = s.jpeg({ quality: 78, mozjpeg: true });
  return s.toBuffer();
}

// Reduz UM arquivo. Devolve 'reduzida' | 'mantida' | 'pulada'.
export async function otimizarArquivo(ctx, file, regra) {
  const meta = file.metadata || {};
  if (!precisaOtimizar(meta, regra)) return 'pulada';
  const tipo = String(meta.contentType).toLowerCase();
  const tamanho = Number(meta.size || 0);
  const [buf] = await file.download();
  const novo = await processar(ctx, buf, tipo, regra);
  const extras = { ...(meta.metadata || {}), otimizada: '1' }; // mantém firebaseStorageDownloadTokens
  if (!novo || novo.length > tamanho * 0.9) {
    await file.setMetadata({ metadata: extras }, { ifGenerationMatch: meta.generation });
    return 'mantida';
  }
  await file.save(novo, {
    resumable: false,
    preconditionOpts: { ifGenerationMatch: meta.generation },
    metadata: { contentType: tipo, cacheControl: meta.cacheControl || 'public,max-age=31536000', metadata: { ...extras, tamanhoOriginal: String(tamanho) } },
  });
  return 'reduzida';
}

// Rotina agendada: continua de onde parou (sistema/otimizacaoImagens) até o tempo acabar.
export async function otimizarImagens(ctx, { limiteMs = 7 * 60 * 1000, agora = () => Date.now() } = {}) {
  const inicio = agora();
  const ref = ctx.db.doc('sistema/otimizacaoImagens');
  const snap = await ref.get();
  const est = snap.exists ? snap.data() : {};
  let pasta = Number.isInteger(est.pasta) && est.pasta < PASTAS.length ? est.pasta : 0;
  let pagina = est.pagina || null;
  const conta = { reduzidas: 0, mantidas: 0, erros: 0, bytesAntes: 0, bytesDepois: 0 };
  let voltaCompleta = false;
  const tempoAcabou = () => agora() - inicio > limiteMs;

  while (!tempoAcabou()) {
    const regra = PASTAS[pasta];
    let arquivos; let proxima;
    try {
      const r = await ctx.bucket.getFiles({ prefix: regra.prefixo, maxResults: POR_PAGINA, autoPaginate: false, ...(pagina ? { pageToken: pagina } : {}) });
      arquivos = r[0] || []; proxima = r[1] && r[1].pageToken ? r[1].pageToken : null;
    } catch (e) { (ctx.log || console).warn('otimizarImagens: listagem', regra.prefixo, e.message); pagina = null; proxima = null; arquivos = []; }
    let parouNoMeio = false;
    for (const f of arquivos) {
      if (tempoAcabou()) { parouNoMeio = true; break; }
      if (!precisaOtimizar(f.metadata, regra)) continue;
      const antes = Number(f.metadata.size || 0);
      try {
        const r = await otimizarArquivo(ctx, f, regra);
        if (r === 'reduzida') { conta.reduzidas++; conta.bytesAntes += antes; conta.bytesDepois += Number((f.metadata && f.metadata.size) || 0); }
        else if (r === 'mantida') conta.mantidas++;
      } catch (e) { conta.erros++; (ctx.log || console).warn('otimizarImagens:', f.name, e.message); }
    }
    if (parouNoMeio) break; // a mesma página é lida de novo na próxima vez (o que já foi feito é pulado)
    if (proxima) { pagina = proxima; continue; }
    pagina = null; pasta += 1;
    if (pasta >= PASTAS.length) { pasta = 0; voltaCompleta = true; break; }
  }
  const agoraIso = new Date(agora()).toISOString();
  await ref.set({
    pasta, pagina, atualizadoEm: agoraIso,
    ...(voltaCompleta ? { voltaCompletaEm: agoraIso } : {}),
    totalReduzidas: (Number(est.totalReduzidas) || 0) + conta.reduzidas,
    economiaKB: (Number(est.economiaKB) || 0) + Math.max(0, Math.round((conta.bytesAntes - conta.bytesDepois) / 1024)),
  }, { merge: true });
  return { ...conta, voltaCompleta };
}
