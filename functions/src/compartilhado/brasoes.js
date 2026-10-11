/* brasoes.js — catálogo e motor dos brasões (75 do Capoeira Liberdade e Expressão + os exclusivos de cada arte).

Escopo (v37, turmas por arte): cada brasão tem `escopo` = 'geral' (vale em qualquer arte: presenças,
sequência, núcleos, Rede, compromisso, carteirinha, competição, formação) ou a chave da arte em
js/modalidades.js ('capoeira' para cordões, batizado, roda, berimbau, canto…; 'jiujitsu', 'boxe'…
para os exclusivos daquela arte). A Sala de Brasões e a tela de conceder filtram pelo escopo da
turma ativa (brasoesParaArte / visivelNaArte); o cálculo (avaliar) continua devolvendo todos —
quem exibe filtra. Ids NUNCA mudam (perfisPublicos.brasoes guarda por id).

Regra de ouro: um brasão só é "ganho" quando o dado real que o sustenta existe.
Nada aqui inventa número. As fontes são:
- cordaoAtual / historicoGraduacoes / acessoGeral  → usuarios/{uid} (o mestre grava no painel)
- resumoPresencas                                   → presenças do Face ID/painel (coleção presencas)
- resumoRede                                        → posts do próprio atleta na Rede
- resumoFormacao                                    → alunos do núcleo que ele administra com graduação dada por ele
- brasoesManuais                                    → brasões MANUAIS concedidos pelo responsável do núcleo/Fundador/Admin (brasoes.html)
- brasoesAdmin                                      → QUALQUER brasão (até automático) concedido pelo Admin Master
                                                      (as regras do Firestore só deixam o Admin gravar este campo)

Presidente do Grupo ('mestre-fundador'): travado em UMA pessoa — config.presidenteUid
(o Mestre Profeta). Ninguém concede esse brasão, nem o Admin.

Métrica de cada brasão:
  tipo 'cordao'      → cordaoAtual está no nível do brasão ou acima (graduação é cumulativa)
  tipo 'fundador'    → acessoGeral === true E é a pessoa travada em config.presidenteUid
  tipo 'presencas'   → resumoPresencas.total ≥ meta
  tipo 'sequencia'   → resumoPresencas.maiorSequencia (semanas seguidas, recorde) ≥ meta
  tipo 'nucleos'     → resumoPresencas.nucleosVisitados ≥ meta
  tipo 'graduacoes'  → historicoGraduacoes.length ≥ meta (troca de cordão registrada = batizado)
  tipo 'sedeFundador'→ treinou como visitante no núcleo do Fundador (config.nucleoFundadorId)
  tipo 'posts' | 'momentos' | 'curtidas' → resumoRede.{posts|momentos|curtidas} ≥ meta
  tipo 'formados'    → resumoFormacao.formados ≥ meta
  tipo 'responsavel' → academiaGerenciadaId preenchido
  tipo 'linhagem'    → treina no núcleo do Fundador (academiaId == nucleoFundadorId) ou é o Fundador
  tipo 'aniversario' → anos completos desde criadoEm ≥ meta
  tipo 'certificados'→ certificados de graduação emitidos (perfisPublicos.certificados) ≥ meta
  tipo 'trajetoria'  → tem certificado de TODOS os cordões, do Escravo ao atual
  tipo 'compartilhou'→ cards "Troquei de cordão" compartilhados (usuarios.cardsCompartilhados) ≥ meta
  tipo 'batizados'   → trocas de cordão COM data (não "já tinha") ≥ meta
  tipo 'carteirinha' → carteirinha válida com foto aprovada (usuarios.carteirinha)
  tipo 'beneficiarios'→ beneficiários cadastrados na carteirinha ≥ meta
  tipo 'mensalidades'→ meses seguidos de mensalidade paga (resumoCompromisso.mesesSeguidos) ≥ meta; bolsista conta
  tipo 'eventos'     → inscrições "Eu vou" em eventos (usuarios.eventosConfirmados) ≥ meta
  tipo 'aniversarioTreino' → presença registrada no dia do próprio aniversário (resumoPresencas.treinouNoAniversario)
  tipo 'seguidores'  → seguidores na Rede (perfisPublicos.seguidores) ≥ meta
  tipo 'perfilCompleto' → foto, capa e biografia preenchidas na Rede
  tipo 'apresentacao'→ vídeo de apresentação publicado (apresentacoes/{uid})
  tipo 'assinatura'  → assinatura real dos certificados cadastrada (assinaturas/{uid})
  tipo 'nucleoCompleto' → responsável cujo núcleo (≥ 3 atletas ativos) tem 100% com foto de carteirinha aprovada e data de nascimento
  tipo 'rodaInclusiva' → responsável cujo núcleo mantém atleta(s) de atenção e inclusão ATIVOS há pelo menos 6 meses (resumoFormacao.rodaInclusiva)
  tipo 'manual'      → só por concessão (brasoesManuais[id])
Os números das medalhas (1, 10, 50…) estão GRAVADOS na arte — por isso as metas
numéricas não são editáveis no painel; o que se edita é nome/descrição e ativo/inativo. */

export const ORDEM_CORDOES = ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'];
export const PASTA = 'brasoes';
export const NIVEIS = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', platina: 'Platina' };

export const SERIES = {
cordoes: { nome: 'Cordões', sub: 'A escada de graduação, do Iniciante ao Fundador', icone: 'fa-ribbon', forma: 'hex' },
presencas: { nome: 'Presenças', sub: 'Check-ins reais registrados pelo Face ID ou pelo painel', icone: 'fa-location-dot', forma: 'medalha' },
sequencia: { nome: 'Sequência', sub: 'Semanas seguidas treinando (recorde)', icone: 'fa-fire', forma: 'medalha' },
nucleos: { nome: 'Núcleos visitados', sub: 'Treinou como visitante em outros núcleos', icone: 'fa-map', forma: 'medalha' },
eventos: { nome: 'Eventos e rodas', sub: 'Batizado automático; os demais o responsável concede', icone: 'fa-calendar-check', forma: 'hex' },
rede: { nome: 'Rede Liberdade', sub: 'Publicações, melhores momentos e curtidas recebidas', icone: 'fa-camera', forma: 'medalha' },
formacao: { nome: 'Formação', sub: 'Quem forma, quem lidera e a linhagem do Fundador', icone: 'fa-sitemap', forma: 'hex' },
destaques: { nome: 'Destaques', sub: 'Concedidos pelo responsável quando o atleta mostra a evolução — os da arte só aparecem na turma dela', icone: 'fa-star', forma: 'hex' },
competicao: { nome: 'Competição', sub: 'Campeonatos internos e entre escolas: participar, subir ao pódio e vencer', icone: 'fa-trophy', forma: 'hex' },
graduacao: { nome: 'Certificados', sub: 'Certificados de graduação, trajetória e o card "Troquei de cordão"', icone: 'fa-award', forma: 'hex' },
carteirinha: { nome: 'Carteirinha', sub: 'Carteirinha em dia e a família cadastrada como beneficiária', icone: 'fa-id-card', forma: 'hex' },
compromisso: { nome: 'Compromisso', sub: 'Mensalidade em dia, inscrições em eventos e tempo de grupo', icone: 'fa-calendar-check', forma: 'medalha' },
inclusao: { nome: 'Inclusão', sub: 'Núcleos que acolhem e mantêm atletas de atenção e inclusão na roda', icone: 'fa-universal-access', forma: 'hex' },
};

// escopo padrão 'geral'; `arquivo` pode ser sobrescrito (as artes do jiu-jitsu já existem como jj-brasao-NN-*).
const b = (n, slug, nome, serie, regra, extra = {}) => ({ id: slug, n, arquivo: `brasao-${String(n).padStart(2, '0')}-${slug}`, nome, serie, forma: SERIES[serie].forma, regra, nivel: null, glb: null, escopo: 'geral', ...extra });
export const ESCOPO_GERAL = 'geral';

export const BRASOES = [
// ---- A · Cordões (hexagonal) ----
b(1, 'iniciante', 'Iniciante', 'cordoes', { tipo: 'cordao', meta: 'Iniciante' }, { escopo: 'capoeira', glb: 'cordao-01-iniciante', como: 'Entrar no grupo e começar a treinar.', descricao: 'Broto verde nascendo: o começo da jornada.' }),
b(2, 'escravo', 'Escravo', 'cordoes', { tipo: 'cordao', meta: 'Escravo' }, { escopo: 'capoeira', glb: 'cordao-02-escravo', como: 'Receber o cordão Escravo no batizado.', descricao: 'Corrente fechada: o cinza vem da corrente.' }),
b(3, 'fugitivo', 'Fugitivo', 'cordoes', { tipo: 'cordao', meta: 'Fugitivo' }, { escopo: 'capoeira', glb: 'cordao-03-fugitivo', como: 'Receber o cordão Fugitivo.', descricao: 'Corrente rompida: rompeu as correntes e fugiu.' }),
b(4, 'quilombola', 'Quilombola', 'cordoes', { tipo: 'cordao', meta: 'Quilombola' }, { escopo: 'capoeira', glb: 'cordao-04-quilombola', como: 'Receber o cordão Quilombola.', descricao: 'A mata: encontrou um novo lar e começou a aprender capoeira.' }),
b(5, 'vagante', 'Vagante', 'cordoes', { tipo: 'cordao', meta: 'Vagante' }, { escopo: 'capoeira', glb: 'cordao-05-vagante', como: 'Receber o cordão Vagante.', descricao: 'Rosa-dos-ventos: saiu da mata em busca da liberdade.' }),
b(6, 'liberto', 'Liberto', 'cordoes', { tipo: 'cordao', meta: 'Liberto' }, { escopo: 'capoeira', glb: 'cordao-06-liberto', como: 'Receber o cordão Liberto.', descricao: 'Gota vermelha e corrente caindo: derramou sangue pela liberdade.' }),
b(7, 'instrutor', 'Instrutor', 'cordoes', { tipo: 'cordao', meta: 'Instrutor' }, { escopo: 'capoeira', glb: 'cordao-07-instrutor', como: 'Receber o cordão Instrutor.', descricao: 'Berimbau do aluno ao lado do berimbau do instrutor: começou a passar o conhecimento.' }),
b(8, 'professor', 'Professor', 'cordoes', { tipo: 'cordao', meta: 'Professor' }, { escopo: 'capoeira', glb: 'cordao-08-professor', como: 'Receber o cordão Professor.', descricao: 'Pomba branca sobre branco e vermelho: sangue e paz.' }),
b(9, 'mestre', 'Mestre', 'cordoes', { tipo: 'cordao', meta: 'Mestre' }, { escopo: 'capoeira', glb: 'cordao-09-mestre', como: 'Receber o cordão Mestre.', descricao: 'Dois berimbaus cruzados e louros: formou outro professor para continuar a jornada.' }),
b(10, 'mestre-fundador', 'Mestre / Presidente', 'cordoes', { tipo: 'fundador' }, { escopo: 'capoeira', glb: 'cordao-10-mestre-fundador', como: 'Exclusivo do Fundador do grupo (Acesso Geral).', descricao: 'Cores da bandeira do grupo, louros e coroa.' }),
// ---- B · Presenças (medalha) ----
b(11, 'primeira-presenca', '1ª presença', 'presencas', { tipo: 'presencas', meta: 1 }, { nivel: 'bronze', como: 'Ter a primeira presença registrada pelo Face ID ou pelo painel.' }),
b(12, 'dez-presencas', '10 presenças', 'presencas', { tipo: 'presencas', meta: 10 }, { nivel: 'prata', como: 'Acumular 10 presenças registradas.' }),
b(13, 'cinquenta-presencas', '50 presenças', 'presencas', { tipo: 'presencas', meta: 50 }, { nivel: 'ouro', como: 'Acumular 50 presenças registradas.' }),
b(14, 'cem-presencas', '100 presenças', 'presencas', { tipo: 'presencas', meta: 100 }, { nivel: 'platina', como: 'Acumular 100 presenças registradas.' }),
b(15, 'duzentas-presencas', '200 presenças', 'presencas', { tipo: 'presencas', meta: 200 }, { nivel: 'platina', como: 'Acumular 200 presenças registradas.' }),
// ---- C · Sequência (medalha) ----
b(16, 'duas-semanas', '2 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 2 }, { nivel: 'bronze', como: 'Treinar em 2 semanas consecutivas.' }),
b(17, 'quatro-semanas', '4 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 4 }, { nivel: 'prata', como: 'Treinar em 4 semanas consecutivas.' }),
b(18, 'oito-semanas', '8 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 8 }, { nivel: 'ouro', como: 'Treinar em 8 semanas consecutivas.' }),
b(19, 'doze-semanas', '12 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 12 }, { nivel: 'platina', como: 'Treinar em 12 semanas consecutivas.' }),
b(20, 'vinte-semanas', '20 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 20 }, { nivel: 'platina', como: 'Treinar em 20 semanas consecutivas.' }),
// ---- D · Núcleos visitados (medalha) ----
b(21, 'um-nucleo', '1 núcleo visitado', 'nucleos', { tipo: 'nucleos', meta: 1 }, { nivel: 'bronze', como: 'Treinar como visitante em 1 núcleo diferente do seu.' }),
b(22, 'dois-nucleos', '2 núcleos visitados', 'nucleos', { tipo: 'nucleos', meta: 2 }, { nivel: 'prata', como: 'Treinar como visitante em 2 núcleos diferentes.' }),
b(23, 'tres-nucleos', '3 núcleos visitados', 'nucleos', { tipo: 'nucleos', meta: 3 }, { nivel: 'ouro', como: 'Treinar como visitante em 3 núcleos diferentes.' }),
b(24, 'cinco-nucleos', '5 núcleos visitados', 'nucleos', { tipo: 'nucleos', meta: 5 }, { nivel: 'platina', como: 'Treinar como visitante em 5 núcleos diferentes.' }),
// ---- E · Eventos e rodas (hex) ----
b(25, 'batizado', 'Batizado', 'eventos', { tipo: 'graduacoes', meta: 1 }, { escopo: 'capoeira', como: 'Ter uma troca de cordão registrada pelo mestre (batizado).' }),
b(26, 'roda-aberta', 'Presente em Roda Aberta', 'eventos', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido pelo responsável do núcleo a quem participou de uma roda aberta.' }),
b(27, 'evento-do-grupo', 'Presente em evento do grupo', 'eventos', { tipo: 'manual' }, { como: 'Concedido pelo responsável do núcleo a quem esteve num evento oficial do grupo.' }),
b(28, 'sede-do-fundador', 'Visitou a sede do Fundador', 'eventos', { tipo: 'sedeFundador' }, { como: 'Treinar como visitante no núcleo do Fundador (presença registrada lá).' }),
// ---- F · Rede Liberdade (medalha) ----
b(29, 'primeira-publicacao', 'Primeira publicação', 'rede', { tipo: 'posts', meta: 1 }, { nivel: 'bronze', como: 'Publicar o primeiro post na Rede Liberdade.' }),
b(30, 'primeiro-melhor-momento', 'Primeiro melhor momento', 'rede', { tipo: 'momentos', meta: 1 }, { nivel: 'ouro', como: 'Marcar um post seu como melhor momento.' }),
b(31, 'dez-melhores-momentos', '10 melhores momentos', 'rede', { tipo: 'momentos', meta: 10 }, { nivel: 'platina', como: 'Ter 10 posts marcados como melhor momento.' }),
b(32, 'cem-curtidas', '100 curtidas recebidas', 'rede', { tipo: 'curtidas', meta: 100 }, { nivel: 'ouro', como: 'Somar 100 curtidas nos seus posts.' }),
b(33, 'contador-de-historias', 'Contador de histórias', 'rede', { tipo: 'posts', meta: 50 }, { nivel: 'platina', como: 'Publicar 50 posts na Rede Liberdade.' }),
// ---- G · Formação (hex) ----
b(34, 'formou-o-primeiro-aluno', 'Formou o primeiro aluno', 'formacao', { tipo: 'formados', meta: 1 }, { como: 'Registrar a primeira troca de cordão de um aluno do núcleo que você administra.' }),
b(35, 'responsavel-de-nucleo', 'Responsável de núcleo', 'formacao', { tipo: 'responsavel' }, { como: 'Ser o responsável cadastrado por um núcleo.' }),
b(36, 'linhagem-do-fundador', 'Direto Liberdade e Expressão', 'formacao', { tipo: 'linhagem' }, { como: 'Treinar diretamente no núcleo do Fundador (linhagem direta).' }),
// ---- H · Destaques (hex, manuais) ----
b(37, 'nota-boa-na-escola', 'Nota boa na escola', 'destaques', { tipo: 'manual' }, { como: 'O responsável concede quando a família mostra o boletim com boas notas.' }),
b(38, 'canta-muito', 'Canta muito', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido a quem puxa e responde os cantos na roda com firmeza.' }),
b(39, 'ginga-muito', 'Ginga muito', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido a quem mostra ginga fluida e malícia no jogo.' }),
b(40, 'primeiro-au-estrela-cadente', 'Primeiro aú · Estrela cadente', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido no dia do primeiro aú completo.' }),
b(41, 'primeira-ponte', 'Primeira ponte', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido no dia da primeira ponte.' }),
b(42, 'primeira-acrobacia', 'Primeira acrobacia', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido na primeira acrobacia executada na roda.' }),
b(43, 'tocou-berimbau-na-roda', 'Tocou berimbau na roda', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido a quem tocou berimbau numa roda de verdade.' }),
b(44, 'tocou-atabaque', 'Tocou atabaque', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido a quem tocou atabaque numa roda de verdade.' }),
b(45, 'aniversario-de-capoeira', 'Aniversário de capoeira', 'destaques', { tipo: 'aniversario', meta: 1 }, { escopo: 'capoeira', como: 'Completar 1 ano desde a entrada no grupo.' }),
// ---- I · Certificados e graduação (hex / medalha) ----
b(46, 'primeiro-certificado', 'Primeiro certificado', 'graduacao', { tipo: 'certificados', meta: 1 }, { como: 'Receber o primeiro certificado de graduação (sai sozinho na troca de cordão).' }),
b(47, 'trajetoria-completa', 'Trajetória completa', 'graduacao', { tipo: 'trajetoria' }, { escopo: 'capoeira', como: 'Ter o certificado de todos os cordões, do Escravo até o seu cordão atual.' }),
b(48, 'mostrou-o-cordao', 'Mostrou o cordão', 'graduacao', { tipo: 'compartilhou', meta: 1 }, { escopo: 'capoeira', como: 'Compartilhar o card "Troquei de cordão!" com a família e os amigos.' }),
b(49, 'dois-batizados', '2 batizados', 'graduacao', { tipo: 'batizados', meta: 2 }, { escopo: 'capoeira', nivel: 'prata', forma: 'medalha', como: 'Ter 2 trocas de cordão registradas com data no app.' }),
b(50, 'cinco-batizados', '5 batizados', 'graduacao', { tipo: 'batizados', meta: 5 }, { escopo: 'capoeira', nivel: 'ouro', forma: 'medalha', como: 'Ter 5 trocas de cordão registradas com data no app.' }),
// ---- J · Carteirinha (hex) ----
b(51, 'carteirinha-em-dia', 'Carteirinha em dia', 'carteirinha', { tipo: 'carteirinha' }, { como: 'Carteirinha de atleta válida, com a foto de documento aprovada pelo núcleo.' }),
b(52, 'familia-no-grupo', 'Família no grupo', 'carteirinha', { tipo: 'beneficiarios', meta: 1 }, { como: 'Cadastrar o primeiro beneficiário da carteirinha (pai, mãe, irmão ou avô).' }),
b(53, 'casa-cheia', 'Casa cheia', 'carteirinha', { tipo: 'beneficiarios', meta: 3 }, { como: 'Cadastrar 3 ou mais beneficiários na carteirinha.' }),
// ---- K · Compromisso (medalha / hex) ----
b(54, 'mensalidade-em-dia', 'Mensalidade em dia', 'compromisso', { tipo: 'mensalidades', meta: 3 }, { nivel: 'prata', como: '3 meses seguidos com a mensalidade paga (bolsista também ganha).' }),
b(55, 'um-ano-em-dia', 'Um ano em dia', 'compromisso', { tipo: 'mensalidades', meta: 12 }, { nivel: 'ouro', como: '12 meses seguidos com a mensalidade paga (bolsista também ganha).' }),
b(56, 'eu-vou', 'Eu vou!', 'compromisso', { tipo: 'eventos', meta: 1 }, { forma: 'hex', como: 'Confirmar presença ("Eu vou") num evento pela agenda do app.' }),
b(57, 'treinou-no-aniversario', 'Treinou no aniversário', 'compromisso', { tipo: 'aniversarioTreino' }, { forma: 'hex', como: 'Ter uma presença registrada no dia do seu aniversário.' }),
b(58, 'veterano-3-anos', 'Veterano 3 anos', 'compromisso', { tipo: 'aniversario', meta: 3 }, { nivel: 'prata', como: 'Completar 3 anos desde a entrada no grupo.' }),
b(59, 'veterano-5-anos', 'Veterano 5 anos', 'compromisso', { tipo: 'aniversario', meta: 5 }, { nivel: 'ouro', como: 'Completar 5 anos desde a entrada no grupo.' }),
b(60, 'veterano-10-anos', 'Veterano 10 anos', 'compromisso', { tipo: 'aniversario', meta: 10 }, { nivel: 'platina', como: 'Completar 10 anos desde a entrada no grupo.' }),
// ---- L · Rede Liberdade, segunda leva ----
b(61, 'dez-seguidores', '10 seguidores', 'rede', { tipo: 'seguidores', meta: 10 }, { nivel: 'bronze', como: 'Ter 10 pessoas seguindo você na Rede Liberdade.' }),
b(62, 'cinquenta-seguidores', '50 seguidores', 'rede', { tipo: 'seguidores', meta: 50 }, { nivel: 'ouro', como: 'Ter 50 pessoas seguindo você na Rede Liberdade.' }),
b(63, 'perfil-completo', 'Perfil completo', 'rede', { tipo: 'perfilCompleto' }, { forma: 'hex', como: 'Preencher foto, capa e biografia no seu perfil da Rede.' }),
b(64, 'apresentacao-no-ar', 'Apresentação no ar', 'rede', { tipo: 'apresentacao' }, { forma: 'hex', como: 'Publicar o seu vídeo de apresentação (Instrutor, Professor ou Mestre).' }),
// ---- M · Formação, segunda leva ----
b(65, 'formou-cinco-alunos', 'Formou 5 alunos', 'formacao', { tipo: 'formados', meta: 5 }, { nivel: 'ouro', forma: 'medalha', como: 'Registrar a troca de cordão de 5 alunos do núcleo que você administra.' }),
b(66, 'formou-dez-alunos', 'Formou 10 alunos', 'formacao', { tipo: 'formados', meta: 10 }, { nivel: 'platina', forma: 'medalha', como: 'Registrar a troca de cordão de 10 alunos do núcleo que você administra.' }),
b(67, 'assinatura-registrada', 'Assinatura registrada', 'formacao', { tipo: 'assinatura' }, { como: 'Cadastrar a sua assinatura real para os certificados (responsável de núcleo ou Fundador).' }),
b(68, 'nucleo-completo', 'Núcleo completo', 'formacao', { tipo: 'nucleoCompleto' }, { como: 'Responsável cujo núcleo tem todos os atletas com foto de carteirinha aprovada e data de nascimento cadastrada.' }),
// ---- N · Destaques, segunda leva (manuais) ----
b(69, 'puxou-a-ladainha', 'Puxou a ladainha', 'destaques', { tipo: 'manual' }, { escopo: 'capoeira', como: 'Concedido a quem puxou a ladainha sozinho pela primeira vez na roda.' }),
b(70, 'ajudou-na-aula', 'Ajudou na aula', 'destaques', { tipo: 'manual' }, { como: 'Concedido a quem ajudou o professor na aula, cuidando dos menores.' }),
b(71, 'levou-um-amigo', 'Levou um amigo', 'destaques', { tipo: 'manual' }, { como: 'Concedido a quem indicou um amigo que se inscreveu no grupo.' }),
// Série Competição (72–74): vem do módulo de campeonatos, quando o organizador encerra.
b(72, 'competidor', 'Competidor', 'competicao', { tipo: 'participacoes', meta: 1 }, { como: 'Competiu em um campeonato do grupo ou entre escolas.' }),
b(73, 'subiu-ao-podio', 'Subiu ao pódio', 'competicao', { tipo: 'podios', meta: 1 }, { como: 'Ficou entre os três primeiros de uma categoria.' }),
b(74, 'campeao', 'Campeão', 'competicao', { tipo: 'titulos', meta: 1 }, { como: 'Venceu uma categoria em um campeonato.', nivel: 'ouro' }),
// Série Inclusão (75): o núcleo que acolhe. Calculado no servidor a partir de usuarios.inclusao (dado sensível — só o total chega ao cartão público).
b(75, 'roda-inclusiva', 'Roda Inclusiva', 'inclusao', { tipo: 'rodaInclusiva' }, { como: 'Responsável cujo núcleo mantém atletas de atenção e inclusão (TEA, TDAH, PC, SD, DI, DV/DA, TDC) ativos há pelo menos 6 meses.', nivel: 'ouro' }),
// ---- O · Exclusivos de cada arte (manuais; só aparecem na turma da arte — escopo = chave em modalidades.js) ----
// Jiu-jitsu: as artes jj-brasao-NN-* já existem em brasoes/{png,webp,thumb}.
b(76, 'jj-primeira-finalizacao', 'Primeira finalização', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-31-primeira-chave-de-braco', como: 'Concedido no dia da primeira finalização limpa num rola.' }),
b(77, 'jj-primeiro-grau', 'Primeiro grau', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-13-primeiro-grau', como: 'Concedido quando o professor costura o primeiro grau na faixa.' }),
b(78, 'jj-faixa-nova', 'Faixa nova', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-06-faixa-azul', como: 'Concedido na cerimônia da primeira troca de faixa.' }),
b(79, 'jj-competidor', 'Competidor de tatame', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-25-primeiro-campeonato', como: 'Concedido a quem lutou o primeiro campeonato de jiu-jitsu (federação ou aberto).' }),
b(80, 'jj-primeiro-rola', 'Primeiro rola', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-22-primeiro-rola', como: 'Concedido no dia do primeiro rola com um parceiro.' }),
b(81, 'jj-cem-rolas', '100 rolas', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-24-cem-rolas', como: 'Concedido pelo professor a quem completou 100 rolas no tatame.' }),
b(82, 'jj-primeira-raspagem', 'Primeira raspagem', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-32-primeira-raspagem', como: 'Concedido na primeira raspagem completa num rola.' }),
b(83, 'jj-passou-a-guarda', 'Passou a guarda', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-33-passou-a-guarda', como: 'Concedido na primeira passagem de guarda limpa.' }),
b(84, 'jj-kimono-limpo', 'Kimono limpo', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-35-kimono-limpo', como: 'Concedido a quem chega sempre com o kimono limpo e as unhas cortadas.' }),
b(85, 'jj-open-mat', 'Open mat', 'destaques', { tipo: 'manual' }, { escopo: 'jiujitsu', arquivo: 'jj-brasao-37-open-mat', como: 'Concedido a quem participou de um open mat (treino aberto).' }),
// Boxe
b(86, 'boxe-primeira-luta', 'Primeira luta', 'destaques', { tipo: 'manual' }, { escopo: 'boxe', arquivo: 'brasao-72-competidor', como: 'Concedido depois da primeira luta oficial ou de exibição no ringue.' }),
b(87, 'boxe-primeiro-sparring', 'Primeiro sparring', 'destaques', { tipo: 'manual' }, { escopo: 'boxe', arquivo: 'jj-brasao-22-primeiro-rola', como: 'Concedido no dia do primeiro sparring com equipamento completo.' }),
b(88, 'boxe-cem-rounds', '100 rounds', 'destaques', { tipo: 'manual' }, { escopo: 'boxe', arquivo: 'jj-brasao-24-cem-rolas', como: 'Concedido pelo treinador a quem completou 100 rounds de sparring.' }),
b(89, 'boxe-guarda-solida', 'Guarda sólida', 'destaques', { tipo: 'manual' }, { escopo: 'boxe', arquivo: 'jj-brasao-37-open-mat', como: 'Concedido a quem mantém a guarda fechada e o queixo protegido o round inteiro.' }),
b(90, 'boxe-toque-de-luvas', 'Toque de luvas', 'destaques', { tipo: 'manual' }, { escopo: 'boxe', arquivo: 'jj-brasao-36-toque-de-maos', como: 'Concedido a quem treina forte e respeita o parceiro: toca as luvas antes e depois.' }),
// Muay Thai
b(91, 'mt-primeira-luta', 'Primeira luta', 'destaques', { tipo: 'manual' }, { escopo: 'muaythai', arquivo: 'brasao-72-competidor', como: 'Concedido depois da primeira luta de muay thai no ringue.' }),
b(92, 'mt-primeiro-sparring', 'Primeiro sparring', 'destaques', { tipo: 'manual' }, { escopo: 'muaythai', arquivo: 'jj-brasao-22-primeiro-rola', como: 'Concedido no dia do primeiro sparring.' }),
b(93, 'mt-cem-rounds', '100 rounds', 'destaques', { tipo: 'manual' }, { escopo: 'muaythai', arquivo: 'jj-brasao-24-cem-rolas', como: 'Concedido pelo Kru a quem completou 100 rounds de sparring ou de manopla.' }),
b(94, 'mt-clinch-forte', 'Clinch forte', 'destaques', { tipo: 'manual' }, { escopo: 'muaythai', arquivo: 'jj-brasao-34-pegada-de-ferro', como: 'Concedido a quem domina o clinch e as joelhadas no treino.' }),
// MMA
b(95, 'mma-primeira-luta', 'Primeira luta', 'destaques', { tipo: 'manual' }, { escopo: 'mma', arquivo: 'brasao-72-competidor', como: 'Concedido depois da primeira luta amadora de MMA.' }),
b(96, 'mma-primeiro-sparring', 'Primeiro sparring', 'destaques', { tipo: 'manual' }, { escopo: 'mma', arquivo: 'jj-brasao-22-primeiro-rola', como: 'Concedido no dia do primeiro sparring completo (em pé e no solo).' }),
b(97, 'mma-primeira-finalizacao', 'Primeira finalização', 'destaques', { tipo: 'manual' }, { escopo: 'mma', arquivo: 'jj-brasao-31-primeira-chave-de-braco', como: 'Concedido na primeira finalização limpa num sparring.' }),
b(98, 'mma-cinturao', 'Cinturão', 'destaques', { tipo: 'manual' }, { escopo: 'mma', arquivo: 'jj-brasao-38-lenda-do-tatame', como: 'Concedido a quem conquistou um cinturão (amador ou profissional).' }),
// Taekwondo
b(99, 'tkd-primeiro-poomsae', 'Primeiro poomsae', 'destaques', { tipo: 'manual' }, { escopo: 'taekwondo', arquivo: 'jj-brasao-17-primeiro-treino', como: 'Concedido quando o aluno apresenta o primeiro poomsae completo.' }),
b(100, 'tkd-chute-alto', 'Chute alto', 'destaques', { tipo: 'manual' }, { escopo: 'taekwondo', arquivo: 'jj-brasao-32-primeira-raspagem', como: 'Concedido no primeiro chute na altura da cabeça com técnica limpa.' }),
b(101, 'tkd-primeiro-kyorugi', 'Primeiro kyorugi', 'destaques', { tipo: 'manual' }, { escopo: 'taekwondo', arquivo: 'brasao-72-competidor', como: 'Concedido depois do primeiro combate (kyorugi) em competição.' }),
// Judô
b(102, 'judo-primeiro-ippon', 'Primeiro ippon', 'destaques', { tipo: 'manual' }, { escopo: 'judo', arquivo: 'jj-brasao-33-passou-a-guarda', como: 'Concedido no primeiro ippon num randori ou numa competição.' }),
b(103, 'judo-ukemi', 'Ukemi seguro', 'destaques', { tipo: 'manual' }, { escopo: 'judo', arquivo: 'jj-brasao-32-primeira-raspagem', como: 'Concedido a quem domina as quedas (ukemi) para frente, para trás e de lado.' }),
b(104, 'judo-primeiro-shiai', 'Primeiro shiai', 'destaques', { tipo: 'manual' }, { escopo: 'judo', arquivo: 'brasao-72-competidor', como: 'Concedido depois da primeira luta (shiai) em competição.' }),
// Karatê
b(105, 'karate-primeiro-kata', 'Primeiro kata', 'destaques', { tipo: 'manual' }, { escopo: 'karate', arquivo: 'jj-brasao-17-primeiro-treino', como: 'Concedido quando o aluno apresenta o primeiro kata completo.' }),
b(106, 'karate-primeiro-kumite', 'Primeiro kumite', 'destaques', { tipo: 'manual' }, { escopo: 'karate', arquivo: 'brasao-72-competidor', como: 'Concedido depois do primeiro kumite em competição.' }),
b(107, 'karate-oss', 'Oss!', 'destaques', { tipo: 'manual' }, { escopo: 'karate', arquivo: 'jj-brasao-30-oss', como: 'Concedido a quem mostra etiqueta e respeito no dojo: saúda, escuta e ajuda.' }),
// Kickboxing
b(108, 'kb-primeira-luta', 'Primeira luta', 'destaques', { tipo: 'manual' }, { escopo: 'kickboxing', arquivo: 'brasao-72-competidor', como: 'Concedido depois da primeira luta de kickboxing.' }),
b(109, 'kb-primeiro-sparring', 'Primeiro sparring', 'destaques', { tipo: 'manual' }, { escopo: 'kickboxing', arquivo: 'jj-brasao-22-primeiro-rola', como: 'Concedido no dia do primeiro sparring.' }),
b(110, 'kb-cem-rounds', '100 rounds', 'destaques', { tipo: 'manual' }, { escopo: 'kickboxing', arquivo: 'jj-brasao-24-cem-rolas', como: 'Concedido pelo treinador a quem completou 100 rounds de sparring.' }),
// Wrestling
b(111, 'wr-primeira-queda', 'Primeira queda', 'destaques', { tipo: 'manual' }, { escopo: 'wrestling', arquivo: 'jj-brasao-33-passou-a-guarda', como: 'Concedido na primeira queda (takedown) limpa num combate de treino.' }),
b(112, 'wr-primeiro-combate', 'Primeiro combate', 'destaques', { tipo: 'manual' }, { escopo: 'wrestling', arquivo: 'brasao-72-competidor', como: 'Concedido depois do primeiro combate em competição.' }),
b(113, 'wr-pegada-de-ferro', 'Pegada de ferro', 'destaques', { tipo: 'manual' }, { escopo: 'wrestling', arquivo: 'jj-brasao-34-pegada-de-ferro', como: 'Concedido a quem controla a pegada e não solta o parceiro no treino.' }),
// Krav Maga
b(114, 'km-primeira-defesa', 'Primeira defesa', 'destaques', { tipo: 'manual' }, { escopo: 'kravmaga', arquivo: 'jj-brasao-37-open-mat', como: 'Concedido na primeira defesa completa contra agarrão ou ataque simulado.' }),
b(115, 'km-primeira-simulacao', 'Primeira simulação', 'destaques', { tipo: 'manual' }, { escopo: 'kravmaga', arquivo: 'jj-brasao-22-primeiro-rola', como: 'Concedido depois da primeira simulação de estresse (vários atacantes) concluída.' }),
// Kung Fu
b(116, 'kf-primeira-forma', 'Primeira forma', 'destaques', { tipo: 'manual' }, { escopo: 'kungfu', arquivo: 'jj-brasao-17-primeiro-treino', como: 'Concedido quando o aluno apresenta a primeira forma (taolu) completa.' }),
b(117, 'kf-primeiro-sanda', 'Primeiro sanda', 'destaques', { tipo: 'manual' }, { escopo: 'kungfu', arquivo: 'brasao-72-competidor', como: 'Concedido depois do primeiro combate (sanda) em competição.' }),
];

export const porId = (id) => BRASOES.find((x) => x.id === id) || null;
// Miniatura leve (WebP 384 px, ~20 KB) para listas e telas pequenas; o PNG 1024 fica para
// tela cheia, card de comemoração e download (regra única de imagens, 08/10).
export const urlThumb = (brasao) => `${PASTA}/webp/${brasao.arquivo}.webp`;
export const urlPng = (brasao) => `${PASTA}/png/${brasao.arquivo}.png`;
export const urlGlb = (brasao) => (brasao.glb ? `${PASTA}/glb/${brasao.glb}.glb` : null);
export const ehManual = (brasao) => brasao.regra.tipo === 'manual';
// Presidente do Grupo: único brasão que não se concede — é travado numa pessoa.
export const ID_PRESIDENTE = 'mestre-fundador';
export const ehPresidente = (brasao) => !!brasao && (brasao.id === ID_PRESIDENTE || brasao.regra.tipo === 'fundador');
// Quem pode conceder o quê (a tela usa isto; as regras do Firestore conferem de novo).
//   admin  → qualquer brasão, menos o de Presidente
//   outros (Fundador / responsável com núcleo) → só os manuais
export const podeConceder = (brasao, { admin } = {}) => !!brasao && !ehPresidente(brasao) && (admin || ehManual(brasao));

// ---- Escopo por arte (v37) ----
// Chave de arte normalizada: vazio/desconhecido vira 'capoeira' só quando a turma é de capoeira;
// quem chama passa a `arte` da turma ativa (turmas.js) ou ESCOLA.modalidade.
export const escopoDe = (brasao) => (brasao && brasao.escopo) || ESCOPO_GERAL;
// O brasão aparece (e pode ser concedido) nesta arte? Gerais sempre; os da arte só na arte dela.
export const visivelNaArte = (brasao, arte) => !!brasao && (escopoDe(brasao) === ESCOPO_GERAL || escopoDe(brasao) === String(arte || ''));
// Catálogo visível numa arte: gerais + exclusivos da arte (na ordem do catálogo).
export const brasoesParaArte = (arte) => BRASOES.filter((br) => visivelNaArte(br, arte));
// Mesma coisa para uma lista já avaliada (resultado de avaliar) ou qualquer lista de brasões.
export const filtrarPorArte = (lista, arte) => (lista || []).filter((br) => visivelNaArte(br, arte));
// Artes que têm brasão exclusivo no catálogo (para a documentação e os seletores).
export const artesComBrasao = () => Array.from(new Set(BRASOES.map(escopoDe).filter((e) => e !== ESCOPO_GERAL)));

// Texto humano da métrica (usado no painel e no detalhe do brasão).
export function textoMetrica(brasao) {
const r = brasao.regra;
switch (r.tipo) {
case 'cordao': return `Cordão ${r.meta} ou acima`;
case 'fundador': return 'Acesso Geral (Fundador)';
case 'presencas': return `${r.meta} presença${r.meta > 1 ? 's' : ''} registrada${r.meta > 1 ? 's' : ''}`;
case 'sequencia': return `${r.meta} semanas seguidas (recorde)`;
case 'nucleos': return `${r.meta} núcleo${r.meta > 1 ? 's' : ''} visitado${r.meta > 1 ? 's' : ''}`;
case 'graduacoes': return 'Troca de cordão registrada';
case 'sedeFundador': return 'Presença como visitante no núcleo do Fundador';
case 'posts': return `${r.meta} publicaç${r.meta > 1 ? 'ões' : 'ão'} na Rede`;
case 'momentos': return `${r.meta} melhor${r.meta > 1 ? 'es' : ''} momento${r.meta > 1 ? 's' : ''}`;
case 'curtidas': return `${r.meta} curtidas recebidas`;
case 'formados': return 'Graduou um aluno do próprio núcleo';
case 'responsavel': return 'Responsável cadastrado por um núcleo';
case 'linhagem': return 'Treina no núcleo do Fundador';
case 'aniversario': return `${r.meta} ano${r.meta > 1 ? 's' : ''} no grupo`;
case 'certificados': return `${r.meta} certificado${r.meta > 1 ? 's' : ''} de graduação`;
case 'trajetoria': return 'Certificado de todos os cordões até o atual';
case 'compartilhou': return 'Card "Troquei de cordão" compartilhado';
case 'batizados': return `${r.meta} trocas de cordão com data`;
case 'carteirinha': return 'Carteirinha válida com foto aprovada';
case 'beneficiarios': return `${r.meta} beneficiário${r.meta > 1 ? 's' : ''} na carteirinha`;
case 'mensalidades': return `${r.meta} meses seguidos com mensalidade paga`;
case 'eventos': return `${r.meta} inscriç${r.meta > 1 ? 'ões' : 'ão'} em evento ("Eu vou")`;
case 'aniversarioTreino': return 'Presença no dia do aniversário';
case 'seguidores': return `${r.meta} seguidores na Rede`;
case 'perfilCompleto': return 'Foto, capa e biografia no perfil';
case 'apresentacao': return 'Vídeo de apresentação publicado';
case 'assinatura': return 'Assinatura dos certificados cadastrada';
case 'nucleoCompleto': return 'Núcleo 100% com foto aprovada e data de nascimento';
case 'rodaInclusiva': return 'Núcleo com atletas de inclusão ativos há 6 meses';
case 'participacoes': return `${r.meta} campeonato${r.meta > 1 ? 's' : ''} disputado${r.meta > 1 ? 's' : ''}`;
case 'podios': return `${r.meta} pódio${r.meta > 1 ? 's' : ''} em campeonato`;
case 'titulos': return `${r.meta} título${r.meta > 1 ? 's' : ''} de campeão`;
default: return 'Concessão do responsável do núcleo';
}
}

// Avalia todos os brasões para uma pessoa. `dados` só traz o que existe de verdade;
// campo ausente = brasão fica bloqueado (nunca "chuta").
// Carteirinha "em dia": emitida, ativa, foto aprovada e — quando a validade segue a
// mensalidade — ainda dentro do prazo. Mesma regra no servidor e no navegador.
export function carteirinhaEmDia(c, hoje = new Date()) {
if (!c || !c.codigo || c.ativo === false || c.fotoAprovada !== true) return false;
if (c.controle !== 'mensalidade') return true;
const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
return !!(c.validaAte && String(c.validaAte).slice(0, 10) >= iso);
}
export function beneficiariosDe(c) { return c && Array.isArray(c.beneficiarios) ? c.beneficiarios.length : 0; }

export function avaliar(dados, config) {
dados = dados || {}; config = config || {};
const ativos = config.ativos || {};
const textos = config.textos || {};
const rp = dados.resumoPresencas || null;
const rr = dados.resumoRede || null;
const rf = dados.resumoFormacao || null;
const rc = dados.resumoCompromisso || null;
const certs = Array.isArray(dados.certificados) ? dados.certificados : [];
const manuais = dados.brasoesManuais || {};
const doAdmin = dados.brasoesAdmin || {};
const bloqueados = dados.brasoesBloqueados || {}; // removidos pelo Admin Master (teste): não vale nem por concessão
const presidenteUid = config.presidenteUid || null;
const idxCordao = ORDEM_CORDOES.indexOf(dados.cordaoAtual || 'Iniciante');
const anos = dados.criadoEm ? Math.floor((Date.now() - new Date(dados.criadoEm).getTime()) / (365.25 * 86400000)) : 0;
const nucleoFundador = config.nucleoFundadorId || null;
return BRASOES.map((br) => {
const r = br.regra; let ganho = false; let progresso = null;
const num = (atual, meta) => { progresso = { atual: Math.min(atual, meta), meta }; return atual >= meta; };
switch (r.tipo) {
case 'cordao': { const alvo = ORDEM_CORDOES.indexOf(r.meta); ganho = idxCordao >= alvo; break; }
case 'fundador': ganho = dados.fundador === true && (!presidenteUid || dados.uid === presidenteUid); break;
case 'presencas': ganho = rp ? num(rp.total || 0, r.meta) : false; if (!rp) progresso = { atual: 0, meta: r.meta }; break;
case 'sequencia': ganho = rp ? num(Math.max(rp.maiorSequencia || 0, rp.semanasSeguidas || 0), r.meta) : false; if (!rp) progresso = { atual: 0, meta: r.meta }; break;
case 'nucleos': ganho = rp ? num(rp.nucleosVisitados || 0, r.meta) : false; if (!rp) progresso = { atual: 0, meta: r.meta }; break;
case 'graduacoes': ganho = num((dados.historicoGraduacoes || []).length, r.meta); break;
case 'sedeFundador': ganho = !!(nucleoFundador && rp && Array.isArray(rp.nucleosVisitadosIds) && rp.nucleosVisitadosIds.includes(nucleoFundador)); break;
case 'posts': ganho = rr ? num(rr.posts || 0, r.meta) : false; if (!rr) progresso = { atual: 0, meta: r.meta }; break;
case 'momentos': ganho = rr ? num(rr.momentos || 0, r.meta) : false; if (!rr) progresso = { atual: 0, meta: r.meta }; break;
case 'curtidas': ganho = rr ? num(rr.curtidas || 0, r.meta) : false; if (!rr) progresso = { atual: 0, meta: r.meta }; break;
case 'formados': ganho = rf ? num(rf.formados || 0, r.meta) : false; break;
case 'responsavel': ganho = !!dados.academiaGerenciadaId; break;
case 'linhagem': ganho = dados.fundador === true || (!!nucleoFundador && dados.academiaId === nucleoFundador); break;
case 'aniversario': ganho = dados.criadoEm ? num(anos, r.meta) : false; break;
case 'certificados': ganho = num(certs.length, r.meta); break;
case 'trajetoria': {
// Do Escravo até o cordão atual, cada cordão precisa ter certificado (os "antes do app" contam).
const tem = new Set(certs.map((c) => c.cordao));
const ate = ORDEM_CORDOES.slice(1, Math.max(1, idxCordao) + 1).filter((c) => c !== 'Mestre/Presidente');
ganho = idxCordao >= 1 && ate.length > 0 && ate.every((c) => tem.has(c));
progresso = { atual: ate.filter((c) => tem.has(c)).length, meta: Math.max(1, ate.length) };
break;
}
// Contadores do cadastro (usuarios) chegam diretos no servidor; no navegador vêm pelo
// resumoCompromisso do cartão público — por isso cada um aceita as duas origens.
case 'compartilhou': ganho = num(Number(dados.cardsCompartilhados ?? (rc && rc.cardsCompartilhados)) || 0, r.meta); break;
case 'batizados': ganho = num((dados.historicoGraduacoes || []).filter((h) => h && !h.legado && h.em).length, r.meta); break;
case 'carteirinha': ganho = dados.carteirinha !== undefined ? carteirinhaEmDia(dados.carteirinha) : !!(rc && rc.carteirinhaEmDia); break;
case 'beneficiarios': ganho = num(dados.carteirinha !== undefined ? beneficiariosDe(dados.carteirinha) : Number(rc && rc.beneficiarios) || 0, r.meta); break;
case 'mensalidades': ganho = rc ? num(rc.mesesSeguidos || 0, r.meta) : false; if (!rc) progresso = { atual: 0, meta: r.meta }; break;
case 'eventos': ganho = num(Number(dados.eventosConfirmados ?? (rc && rc.eventosConfirmados)) || 0, r.meta); break;
case 'aniversarioTreino': ganho = !!(rp && rp.treinouNoAniversario); break;
case 'seguidores': ganho = num(Number(dados.seguidoresTotal) || 0, r.meta); break;
case 'perfilCompleto': ganho = !!(dados.fotoUrl && dados.capaUrl && String(dados.bio || '').trim().length >= 20); break;
case 'apresentacao': ganho = dados.temApresentacao === true; break;
case 'assinatura': ganho = dados.temAssinatura === true; break;
case 'nucleoCompleto': ganho = !!(rf && rf.nucleoCompleto); break;
case 'rodaInclusiva': ganho = !!(rf && rf.rodaInclusiva); break;
// Competição: no servidor vem de usuarios.competicoes; no navegador, do resumo público.
case 'participacoes': case 'podios': case 'titulos': { const cp = dados.competicoes || dados.resumoCompeticoes || null; ganho = num(cp ? Number(cp[r.tipo]) || 0 : 0, r.meta); break; }
default: ganho = false;
}
// Concessões: manuais só valem para brasão manual; as do Admin valem para
// qualquer um. O de Presidente ignora concessão (travado em uma pessoa).
let manual = null;
if (!ehPresidente(br)) {
if (r.tipo === 'manual' && manuais[br.id]) manual = manuais[br.id];
else if (doAdmin[br.id]) manual = { ...doAdmin[br.id], admin: true };
}
if (manual) ganho = true;
if (bloqueados[br.id]) { ganho = false; manual = null; }
// data real da conquista quando ela existe no cadastro (troca de cordão registrada pelo mestre)
let emReal = null;
if (r.tipo === 'cordao') { const h = (dados.historicoGraduacoes || []).find((x) => x.cordao === r.meta); if (h && h.em) emReal = h.em; }
if (r.tipo === 'graduacoes') { const h = (dados.historicoGraduacoes || [])[0]; if (h && h.em) emReal = h.em; }
const ativo = ativos[br.id] !== false;
const t = textos[br.id] || {};
const anterior = (dados.brasoes || {})[br.id] || null;
return {
...br, nome: t.nome || br.nome, como: t.como || br.como, descricao: t.descricao || br.descricao,
ativo, ganho: ativo && ganho, progresso, manual: !!manual, concedidoAdmin: !!(manual && manual.admin),
em: manual ? manual.em : (anterior ? anterior.em : emReal), por: manual ? (manual.porNome || null) : null,
};
});
}

// Junta a avaliação com o que já estava gravado: mantém a data do primeiro
// desbloqueio e devolve os ids que acabaram de ser conquistados agora.
export function consolidar(avaliacao, anteriores) {
anteriores = anteriores || {}; const mapa = {}; const novos = [];
avaliacao.forEach((a) => {
if (!a.ganho) return;
const antes = anteriores[a.id];
mapa[a.id] = { em: (antes && antes.em) || a.em || new Date().toISOString(), ...(a.manual ? { manual: true, por: a.por || null } : {}), ...(a.concedidoAdmin ? { admin: true } : {}) };
if (!antes) novos.push(a.id);
});
return { mapa, novos, total: Object.keys(mapa).length };
}

// Resumo de presenças honesto (mesma lógica em todo o app): total, no mês,
// sequência atual, recorde de sequência, núcleos visitados (ids) e última.
export function resumirPresencas(lista, dataNasc = null) {
const dataDe = (v) => (v && v.toDate ? v.toDate() : new Date(v));
const datas = (lista || []).map((p) => dataDe(p.entradaEm)).filter((d) => !isNaN(d)).sort((a, b) => b - a);
const visitados = new Set((lista || []).filter((p) => p.nucleoVisitadoId && p.nucleoVisitadoId !== p.nucleoId).map((p) => p.nucleoVisitadoId));
const semanaDe = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };
const semanas = Array.from(new Set(datas.map(semanaDe))).sort((a, b) => b - a);
const SEM = 7 * 86400000;
let atual = 0; const semanaHoje = semanaDe(new Date());
if (semanas.length && (semanas[0] === semanaHoje || semanas[0] === semanaHoje - SEM)) { atual = 1; for (let i = 1; i < semanas.length; i++) { if (semanas[i - 1] - semanas[i] === SEM) atual++; else break; } }
let recorde = semanas.length ? 1 : 0, corrida = 1;
for (let i = 1; i < semanas.length; i++) { if (semanas[i - 1] - semanas[i] === SEM) { corrida++; recorde = Math.max(recorde, corrida); } else corrida = 1; }
const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
// Treinou no dia do próprio aniversário (dataNasc "AAAA-MM-DD").
const mN = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dataNasc || ''));
const treinouNoAniversario = !!mN && datas.some((d) => d.getMonth() + 1 === Number(mN[2]) && d.getDate() === Number(mN[3]));
return {
total: datas.length, noMes: datas.filter((d) => d >= inicioMes).length, semanasSeguidas: atual, maiorSequencia: recorde, treinouNoAniversario,
nucleosVisitados: visitados.size, nucleosVisitadosIds: Array.from(visitados), ultima: datas[0] ? datas[0].toISOString() : null, calculadoEm: new Date().toISOString(),
};
}
