/* inclusao-conteudo.mjs — conteúdo dos PDFs "Material da equipe · Atenção e inclusão"
   em linguagem NEUTRA de artes marciais. O gerador (gerar-pdfs-inclusao.mjs) preenche o
   vocabulário de cada arte (local, luta, arte, peça, líder, saudação) e o tipo de treino
   (agarre / trocação / misto) para produzir os PDFs de cada modalidade.

   A capoeira NÃO usa este conteúdo: tem a versão própria (roda, berimbau, ginga) em
   materiais/inclusao/*.pdf, escrita à mão. Aqui a substância pedagógica é a mesma validada
   na capoeira, só que generalizada — sem inventar técnicas específicas de cada arte. */

// Frases que dependem do tipo de treino. tipo ∈ 'agarre' | 'trocacao' | 'misto'.
function estiloDe(tipo) {
  if (tipo === 'agarre') return {
    tecnica: 'técnica', golpe: 'a técnica', golpes: 'as técnicas',
    contato: 'o contato próximo, as pegadas e o peso do parceiro',
    sinalParar: 'bater (tap) para sinalizar o fim',
    riscoEvitar: 'quedas, torções e pressão sem controle',
    exemploAdapta: 'posição no solo, amplitude da pegada, intensidade da pressão',
  };
  if (tipo === 'trocacao') return {
    tecnica: 'golpe', golpe: 'o golpe', golpes: 'os golpes',
    contato: 'o impacto e a troca de golpes',
    sinalParar: 'um gesto combinado para parar',
    riscoEvitar: 'golpes com força total ou sem controle de contato',
    exemploAdapta: 'potência, distância, uso de aparadores e proteção',
  };
  return {
    tecnica: 'técnica', golpe: 'a técnica', golpes: 'as técnicas',
    contato: 'o contato, o impacto e as quedas',
    sinalParar: 'um sinal combinado (gesto ou tap) para parar',
    riscoEvitar: 'golpes, quedas e torções sem controle',
    exemploAdapta: 'intensidade, distância, amplitude e proteção',
  };
}

// Bloco igual em todos os PDFs: ética e sigilo + rodapé do app.
function eticaSigilo(T) {
  return {
    titulo: 'Antes de tudo: ética e sigilo',
    itens: [
      `A condição não define o atleta. Primeiro o nome, a ${T.peca} e o que ele faz bem; a condição é só o que ajuda você a ensinar melhor.`,
      'Você não diagnostica. O que está no app foi informado pela família ou pelo próprio atleta. Se perceber algo que preocupa, converse com a família — sem rótulos.',
      `Sigilo (LGPD): a ficha é visível só ao núcleo e à administração. Não comente ${T.noLocal}, no grupo de WhatsApp ou na Rede. Nada disso vai para o perfil público, carteirinha ou certificado.`,
      'Pergunte ao atleta e à família o que funciona. A ficha de adaptação do app existe para registrar isso e ser atualizada sempre que algo mudar.',
    ],
  };
}

const rodapeApp = 'No app: o laço aparece no canto da foto do atleta (painel, card Avaliar/Editar e chamada por Face ID). Na chamada, um aviso mostra a ficha de adaptação e as orientações da família quando o atleta chega. Relatórios → Atenção e inclusão reúne todos os atletas do núcleo com esse aspecto.';

// Os 18 apoios da ficha de adaptação, em linguagem neutra (espelham js/inclusao.js APOIOS).
export function apoiosNeutros(T) {
  return [
    'Avisar antes de mudar a atividade',
    'Manter a mesma sequência de aula',
    'Instruções curtas, uma por vez',
    'Mostrar o movimento antes de pedir',
    'Descrever o movimento em voz alta',
    'Combinar sinais visuais (mãos, gestos)',
    `Ficar perto do professor ${T.noLocal}`,
    'Evitar som alto perto do ouvido (gritos, palmas, música)',
    'Pedir antes de tocar / corrigir pelo corpo',
    'Pausas combinadas durante a aula',
    'Dar função ativa (marcar o tempo, organizar a dupla)',
    `Adaptar o movimento (altura, apoio, ${T.estilo.exemploAdapta})`,
    'Mais tempo e mais repetições',
    'Apoio físico ou referência tátil (parede, tatame, parceiro)',
    'Confirmar que entendeu antes de avançar',
    'Elogiar o progresso, não a perfeição',
    'Acompanhante ou mediador na aula',
    'Treinar com dupla de confiança',
  ];
}

// Monta os termos derivados usados nos textos.
export function termos(base, tipo) {
  const local = base.local || 'tatame';
  return {
    ...base,
    local,
    noLocal: local === 'roda' ? 'na roda' : `no ${local}`,
    aoLocal: local === 'roda' ? 'à roda' : `ao ${local}`,
    doLocal: local === 'roda' ? 'da roda' : `do ${local}`,
    luta: base.luta || 'treino',
    estilo: estiloDe(tipo),
    tipo,
  };
}

// As 7 condições. Cada uma: { sigla, nome, subtitulo, intro, comoAparece[], ajuda[], evitar[], sinais[] }.
export function condicoes(T) {
  const e = T.estilo;
  return {
    TEA: {
      sigla: 'TEA', nome: 'Transtorno do Espectro Autista',
      intro: 'Um jeito diferente de perceber o mundo, se comunicar e lidar com mudanças e estímulos (sons, luzes, toque). Cada pessoa autista é única: o que vale para uma pode não valer para outra.',
      comoAparece: [
        'Pode se incomodar com sons fortes do treino (gritos, palmas, impacto, música alta) e com o contato físico próximo.',
        'Mudança de atividade sem aviso pode gerar angústia ou recusa.',
        'Pode evitar contato visual ou físico — não é desrespeito nem falta de atenção.',
        'Pode repetir movimentos ou falas (é uma forma de se regular) e se interessar muito por um detalhe.',
        'Pode ter dificuldade em entender ironia, duplo sentido ou ordens vagas ("faz direito").',
      ],
      ajuda: [
        `Mesma sequência de aula sempre que possível; se vai mudar, avise antes ("daqui a pouco vamos ${T.noLocal.replace('no ', 'para o ').replace('na ', 'para a ')}").`,
        'Instruções concretas, curtas e na ordem em que acontecem.',
        'Ofereça um lugar mais afastado do barulho e aceite protetor auricular ou abafador.',
        `Peça antes de tocar para corrigir ${e.golpe}; prefira demonstrar.`,
        `Combine um sinal de "pausa" — sair um pouco ${T.doLocal} é legítimo.`,
        'Use o interesse dele a favor: dê uma função clara que ele goste de fazer.',
      ],
      evitar: [
        'Forçar contato visual, abraço ou "olha pra mim".',
        'Punir ou expor quando ele se desorganiza — leve para um canto calmo, sem plateia.',
        'Mudar a regra da atividade no meio sem explicar.',
      ],
      sinais: [
        'Tapar os ouvidos, balançar o corpo, se afastar: é sobrecarga — reduza estímulos, não insista.',
        'Crise (choro intenso, gritos, se jogar no chão) não é birra: espaço, silêncio, uma pessoa só por perto, avisar a família.',
      ],
    },
    TDAH: {
      sigla: 'TDAH', nome: 'Transtorno do Déficit de Atenção com Hiperatividade',
      intro: 'Dificuldade em manter a atenção, controlar impulsos e ficar parado — não por falta de vontade, mas por como o cérebro regula o foco. Costuma render muito quando a atividade é ativa e tem começo, meio e fim claros.',
      comoAparece: [
        'Perde o fio de explicações longas; começa antes de você terminar de falar.',
        `Dificuldade de esperar a vez; entra ${T.noLocal} fora de hora.`,
        'Esquece a sequência ensinada há pouco, mas aprende rápido pelo movimento.',
        'Pode parecer "desligado" numa hora e muito agitado na outra.',
      ],
      ajuda: [
        'Uma instrução por vez; peça para ele repetir com as palavras dele.',
        'Posicione perto do professor, longe da porta e do movimento de fora.',
        'Dê função ativa enquanto espera: ajudar a marcar o tempo, organizar a dupla, segurar o aparador.',
        'Troque de atividade em blocos curtos; avise quanto falta ("mais duas e trocamos").',
        'Pausas combinadas são melhores do que broncas pela agitação.',
        'Elogie na hora, de forma específica ("gostei da base firme agora").',
      ],
      evitar: [
        'Castigo de "fica sentado olhando": tira justamente o que ajuda (o movimento).',
        'Rotular ("o bagunceiro"), comparar com outros alunos.',
        'Explicações longas com todos parados.',
      ],
      sinais: [
        'Frustração crescente, choro ou agressividade depois de muitas correções: reduza a exigência e volte ao que ele acerta.',
        'Se usa medicação, a família pode orientar horários melhores de treino — pergunte sem julgar.',
      ],
    },
    PC: {
      sigla: 'PC', nome: 'Paralisia Cerebral',
      intro: `Condição que afeta movimento, postura e tônus muscular (há muitos graus: de uma leve alteração na marcha ao uso de cadeira de rodas). Não afeta necessariamente a inteligência. O ${T.arte} adaptado é uma das atividades mais ricas para essa pessoa.`,
      comoAparece: [
        'Movimentos mais lentos ou com menos amplitude; pode precisar de apoio para o equilíbrio.',
        'Fadiga mais rápida; espasmos ou rigidez podem aparecer com esforço ou frio.',
        `Em cadeira de rodas, o ${T.luta} acontece com o tronco e os braços — e continua sendo ${T.arte}.`,
      ],
      ajuda: [
        `Adapte o movimento, não o aluno: mantenha o nome e a intenção ${de(e.golpe)}, mudando altura, apoio e amplitude.`,
        'Mais tempo e mais repetições; combine a altura e a velocidade com ele.',
        'Referências de apoio: parede, tatame, parceiro de confiança.',
        'Aqueça bem (músculos encurtados); evite piso escorregadio.',
        'Dupla fixa que já conhece o ritmo dele.',
        'Pergunte a ele o que consegue e o que prefere — ele é quem mais conhece o próprio corpo.',
      ],
      evitar: [
        'Puxar ou empurrar para "ajudar" sem avisar; forçar alongamento.',
        'Movimentos de impacto, queda ou torção sem controle e sem proteção.',
        'Deixar de fora "para não machucar" — adapte e inclua.',
      ],
      sinais: [
        'Dor, tremor forte, pele arroxeada ou cansaço fora do comum: pare e descanse.',
        'Converse com a família e o fisioterapeuta sobre movimentos liberados e os que devem ser evitados.',
      ],
    },
    SD: {
      sigla: 'SD', nome: 'Síndrome de Down (Trissomia 21)',
      intro: 'Condição genética que traz, entre outras coisas, hipotonia (músculos mais "soltos"), articulações mais flexíveis e um ritmo próprio de aprendizagem. Pessoas com síndrome de Down costumam ser muito afetivas, persistentes e dedicadas quando se sentem acolhidas.',
      comoAparece: [
        'Aprende melhor vendo e imitando do que ouvindo explicações longas.',
        'Articulações muito flexíveis: cuidado com movimentos que forcem pescoço e joelhos.',
        'Pode cansar mais rápido e precisar de pausas.',
        'Pode se distrair com o ambiente ou querer brincar na hora do treino.',
      ],
      ajuda: [
        'Demonstre antes de pedir; divida o movimento em partes e junte depois.',
        'Reforço positivo frequente — comemore o progresso, não a perfeição.',
        'Adapte a amplitude; evite movimentos de pescoço e carga cervical sem liberação médica.',
        'Mais tempo e repetições; a mesma sequência de aquecimento ajuda a memorizar.',
        'Combine com a família sinais de cansaço e a melhor forma de redirecionar.',
      ],
      evitar: [
        `Infantilizar ("o bebê da turma"): trate pela idade e pela ${T.peca}.`,
        'Movimentos com carga sobre o pescoço (há risco de instabilidade cervical em parte das pessoas).',
        'Pressa: cobrar que acompanhe o ritmo da turma inteira.',
      ],
      sinais: [
        'Falta de ar, lábios roxos ou cansaço extremo: pare e avise a família (algumas pessoas têm condições cardíacas associadas).',
        'Dor no pescoço, formigamento ou fraqueza súbita: interrompa e encaminhe.',
      ],
    },
    DI: {
      sigla: 'DI', nome: 'Deficiência Intelectual',
      intro: `Ritmo mais lento para aprender, entender regras abstratas e resolver situações novas. Com passos simples, repetição e paciência, a pessoa aprende — e o ${T.arte}, por ser corpo, ritmo e grupo, é um ambiente excelente.`,
      comoAparece: [
        'Dificuldade para entender ordens com várias etapas ou linguagem figurada.',
        `Pode não perceber o momento de entrar/sair ${T.noLocal} sem um sinal claro.`,
        'Pode copiar o colega em vez de seguir a instrução — use isso a favor com uma dupla de referência.',
      ],
      ajuda: [
        'Instruções curtas e concretas; uma etapa por vez.',
        'Demonstre, faça junto, depois deixe fazer; confirme que entendeu antes de avançar.',
        'Rotina estável e a mesma linguagem para cada movimento.',
        'Mais tempo e repetições; elogie cada etapa conquistada.',
        'Dupla de confiança para espelhar o movimento.',
        'Regras em linguagem simples, com um sinal para "agora é sua vez".',
      ],
      evitar: [
        'Falar com a família como se ele não estivesse ali; decidir por ele sem perguntar.',
        'Ironia, gírias confusas e ordens vagas.',
        'Expor o erro na frente da turma.',
      ],
      sinais: [
        'Se fecha, chora ou se recusa: pode ser cansaço mental — simplifique a tarefa.',
        'Combine com a família o que ele já domina em casa e na escola para repetir aqui.',
      ],
    },
    DVDA: {
      sigla: 'DV / DA', nome: 'Deficiência Visual / Deficiência Auditiva',
      intro: `Baixa visão ou cegueira (DV) e perda auditiva ou surdez (DA). Mudam o canal da informação, não a capacidade de aprender ${T.arte}: o DV aprende pela voz e pelo toque; o DA, pelo olhar e pelo corpo.`,
      comoAparece: [
        `DV: precisa de descrição falada do movimento e de referência do espaço (onde fica ${T.noLocal}, o parceiro).`,
        `DV: pode não perceber a aproximação do colega — o ${T.luta} precisa ser anunciado.`,
        'DA: perde o que é dito de costas, de longe ou com música alta; lê o rosto e as mãos.',
        'DA: o ritmo e o sinal de parar precisam ser visíveis ou sentidos pelo corpo.',
      ],
      ajuda: [
        'Posicione perto do professor e de frente para ele.',
        'DV: descreva em voz alta ("perna direita para trás, braço na frente do rosto"); permita tocar o seu movimento para sentir; use referência tátil (parede, tatame).',
        `DV: avise quem vai entrar no ${T.luta} e mantenha o chão livre de obstáculos.`,
        'DA: combine sinais visuais para começar, parar e trocar; demonstre de frente; fale com o rosto visível, sem gritar.',
        'DA: use a luz (apagar e acender) para chamar a atenção da turma.',
        'Se usa aparelho auditivo ou implante, cuide do suor e dos movimentos de cabeça; combine com a família o que pode e não pode.',
      ],
      evitar: [
        'Pegar pelo braço e conduzir sem avisar (DV); falar de costas ou com a mão na frente da boca (DA).',
        `Deixar de fora "porque é perigoso" — adapte o ${T.luta}.`,
        'Supor que o surdo não sente o ritmo: ele sente pelo corpo e pela vibração.',
      ],
      sinais: [
        'Tropeços frequentes, tontura ou dor de cabeça com a música: ajuste volume e espaço.',
        'Combine com a família e, quando houver, com o intérprete de Libras ou o professor de AEE da escola.',
      ],
    },
    TDC: {
      sigla: 'TDC', nome: 'Transtorno do Desenvolvimento da Coordenação',
      intro: 'Dificuldade persistente para planejar e executar movimentos coordenados (às vezes chamada de dispraxia). O aluno entende o que deve fazer, mas o corpo demora a "achar o caminho". Com decomposição do movimento e muita repetição, ele avança.',
      comoAparece: [
        'Parece desajeitado: tropeça, perde o equilíbrio, erra o tempo da defesa.',
        'Demora mais para aprender uma sequência; esquece quando aumenta a velocidade.',
        `Pode evitar ${T.noLocal} por medo de errar na frente dos outros.`,
      ],
      ajuda: [
        'Decomponha o movimento em partes pequenas e junte devagar.',
        'Demonstre de frente e de lado; deixe copiar em câmera lenta.',
        'Mais repetições em ritmo lento antes de acelerar.',
        'Elogie o progresso, não a perfeição; mostre o vídeo dele de semanas atrás para ele ver a evolução.',
        'Treino com dupla de confiança que acompanha a velocidade dele.',
        'Adapte a altura e o apoio enquanto constrói confiança.',
      ],
      evitar: [
        'Rir ou deixar rirem do tropeço; apelidos.',
        `Colocar no ${T.luta} mais rápido da turma logo de início.`,
        'Corrigir dez coisas de uma vez.',
      ],
      sinais: [
        `Choro, recusa ou "dor" sempre na hora do ${T.luta}: pode ser medo de errar — reduza a plateia e aumente o treino em dupla.`,
        'Quedas frequentes com machucado: revise o espaço e o calçado/proteção; converse com a família.',
      ],
    },
  };
}

// "a técnica" → "da técnica" / "o golpe" → "do golpe" (para encaixar "a intenção ___").
function de(artigoMais) {
  return artigoMais.replace(/^a /, 'da ').replace(/^o /, 'do ');
}

export { eticaSigilo, rodapeApp };
