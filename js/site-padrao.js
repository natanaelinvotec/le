/* site-padrao.js — conteúdo padrão do site público (index.html).

Tudo o que aparece no site pode ser trocado pelo painel "Gerenciar o site"
(gerenciar.html), que grava no Firestore em siteConteudo/site. Este arquivo é
só o ponto de partida: vale enquanto nada foi salvo pelo painel, e também se a
internet falhar (o site nunca fica em branco).

Formato: textos simples (sem HTML). Fotos: caminho do próprio site
("assets/...") ou link https do Firebase Storage (upload feito pelo painel). */

export const SITE_PADRAO = {
  versao: 1,

  topo: {
    selo: 'CAMPO GRANDE · ROCHEDO · MATO GROSSO DO SUL',
    titulo: 'A roda',
    destaque: 'não para.',
    texto: 'Capoeira é cultura, disciplina e transformação. Do primeiro passo de ginga ao cordão de mestre — e uma vaga esperando por você na próxima roda.',
    botao: 'Agende sua aula grátis',
    botao2: 'Ache o núcleo mais perto',
    slides: [
      { foto: 'assets/profeta-roda.jpg', posicao: '50% 20%', selo: 'FUNDADOR', titulo: 'Mestre Profeta', texto: 'Mais de 30 anos dedicados à capoeira em Campo Grande.' },
      { foto: 'assets/batizado.jpg', posicao: '50% 62%', selo: 'BATIZADO', titulo: 'A troca de cordas', texto: 'Cada batizado é a festa de quem evoluiu na roda.' },
      { foto: 'assets/grupo-buriti.jpg', posicao: '42% 40%', selo: 'NOSSA GENTE', titulo: 'Um só grupo', texto: 'Crianças, jovens e adultos treinando juntos.' },
    ],
  },

  numeros: [
    { valor: '30+', rotulo: 'Anos de história' },
    { valor: '10', rotulo: 'Núcleos' },
    { valor: 'R$ 0', rotulo: 'Aula experimental' },
  ],

  faixa: ['Infantil, juvenil e adulto', 'Berimbau, pandeiro e atabaque', 'Batizado e troca de cordas', 'Presença, graduação e agenda no app', 'Primeira aula grátis', 'Campo Grande e Rochedo / MS'],

  arte: {
    selo: 'A ARTE',
    titulo: 'Três coisas acontecem',
    destaque: 'ao mesmo tempo',
    texto: 'Na roda ninguém é só atleta. Se joga com o corpo, se canta com o grupo e se toca a bateria que comanda o ritmo — e é essa combinação que ensina respeito, disciplina e malícia.',
    pilares: [
      { titulo: 'A ginga', texto: 'Base, esquiva e movimento contínuo. É o primeiro fundamento que todo aluno aprende — e o que nunca se para de treinar.', foto: 'assets/profeta-roda.jpg', posicao: '50% 30%' },
      { titulo: 'A roda', texto: 'O jogo acontece no centro, mas a roda é feita por todos: quem canta, quem bate palma e quem espera a vez de entrar.', foto: 'assets/batizado.jpg', posicao: '50% 65%' },
      { titulo: 'A bateria', texto: 'Berimbau, pandeiro e atabaque ditam o toque. Musicalidade é critério avaliado — o capoeirista também canta e responde.', foto: 'assets/bateria.jpg', posicao: '50% 40%' },
    ],
  },

  graduacao: {
    selo: 'GRADUAÇÃO',
    titulo: 'O caminho',
    destaque: 'do cordão',
    texto: 'A troca de corda acontece no batizado. Para estar apto, o aluno precisa de 70% ou mais nos 15 critérios avaliados pelo seu mestre — e acompanha tudo, nota a nota, pelo app.',
    // Cordões mostrados (as cores vêm de js/escola.js). Ficam de fora os que não aparecem no site.
    ocultar: ['Iniciante', 'Mestre/Presidente'],
    infantil: 'Trilha infantil (até 11 anos): Escravo · Fugitivo · Quilombola, em tons suaves.',
    botao: 'Ver meu termômetro no app',
  },

  nucleos: {
    selo: 'ONDE TREINAR',
    titulo: 'Ache o núcleo',
    destaque: 'mais perto',
    nota: 'O grupo também tem núcleos com Professor Maick (Rochedo/MS), Mestre Abraão, Mestre Carlinhos e Professor Lebrinha — fale com a secretaria para horários e endereços.',
    convite: 'Olá! Quero agendar minha primeira aula grátis de capoeira.',
    lista: [
      { nome: 'Mestre Profeta', bairro: 'Núcleo Hab. Buriti', dias: 'Segunda, quarta e sexta', horario: '19h00 às 20h30', endereco: 'R. Jaime Costa, 589 — Núcleo Hab. Buriti', whatsapp: '67991293269', foto: 'assets/retrato-profeta.jpg', infantil: false, noite: true },
      { nome: 'Professora Taynara', bairro: 'Núcleo Hab. Buriti', dias: 'Segunda, quarta e sexta', horario: '18h00 às 19h00', endereco: 'R. Jaime Costa, 589 — Núcleo Hab. Buriti', whatsapp: '67993137318', foto: 'assets/retrato-taynara.jpg', infantil: true, noite: false },
      { nome: 'Mestre Omar', bairro: 'Guanandi', dias: 'Segunda a sábado', horario: 'Horários pelo WhatsApp', endereco: 'Rua Arapuã, 650 — Guanandi', whatsapp: '67992239955', foto: 'assets/retrato-omar.jpg', infantil: false, noite: false },
      { nome: 'Professor Rafinha', bairro: 'Rancho Alegre', dias: 'Segunda, quarta e sexta', horario: '19h30 às 21h00', endereco: 'R. Cajarana, 389 — Rancho Alegre', whatsapp: '67982118190', foto: 'assets/retrato-rafinha.jpg', infantil: true, noite: true },
      { nome: 'Professor Tigoy', bairro: 'Nova Campo Grande', dias: 'Segunda, quarta e sexta', horario: 'Horários pelo WhatsApp', endereco: 'Av. 02 — E.M. Fauze Scaff Gattass Filho', whatsapp: '67984548273', foto: 'assets/retrato-tigoy.jpg', infantil: false, noite: false },
      { nome: 'Instrutor Leiliano', bairro: 'Bonança', dias: 'Terça e quinta', horario: '19h00 às 20h30', endereco: 'Associação de Moradores — Bonança', whatsapp: '6791923888', foto: 'assets/retrato-leiliano.jpg', infantil: false, noite: true },
    ],
  },

  mestres: {
    selo: 'CORPO DOCENTE',
    titulo: 'Quem ensina',
    destaque: 'na roda',
    texto: 'Mestres titulados, professores e instrutores formados dentro do próprio grupo.',
    lista: [
      { nome: 'Mestre Profeta', cargo: 'Fundador', foto: 'assets/retrato-profeta.jpg', instagram: 'https://www.instagram.com/mestreprofeta/' },
      { nome: 'Mestre Omar', cargo: 'Mestre de Capoeira', foto: 'assets/retrato-omar.jpg', instagram: 'https://www.instagram.com/mestreomarcapoeira/' },
      { nome: 'Profª Taynara', cargo: 'Educadora física', foto: 'assets/retrato-taynara.jpg', instagram: 'https://www.instagram.com/proftaynaracapoeira/' },
      { nome: 'Prof. Rafinha', cargo: 'Base e infantil', foto: 'assets/retrato-rafinha.jpg', instagram: 'https://www.instagram.com/profrafinhacapoeira/' },
      { nome: 'Prof. Tigoy', cargo: 'Acrobacias e floreios', foto: 'assets/retrato-tigoy.jpg', instagram: 'https://www.instagram.com/proftigoycapoeira/' },
      { nome: 'Prof. Maick', cargo: 'Rochedo / MS', foto: 'assets/retrato-maick.jpg', instagram: '' },
      { nome: 'Instr. Leiliano', cargo: 'Instrutor graduado', foto: 'assets/retrato-leiliano.jpg', instagram: 'https://www.instagram.com/liberdadeeexpressaobonanca/' },
    ],
  },

  agenda: {
    selo: 'AGENDA E FOTOS',
    titulo: 'Batizados, rodas',
    destaque: 'e apresentações',
    foto: 'assets/batizado.jpg',
    aviso: 'A agenda pode mudar. Qualquer alteração é avisada pelos canais oficiais do grupo.',
    // data: AAAA-MM-DD (ordena e separa próximos de passados). dataTexto: como aparece.
    lista: [
      { titulo: 'Batizado de Capoeira do Mestre Omar', data: '2026-11-15', dataTexto: 'Novembro de 2026 · data a confirmar', local: 'Bairro Guanandi', horario: '19h00', mapa: 'Rua Arapuã, 650 - Guanandi, Campo Grande - MS', fotos: '' },
      { titulo: 'Batizado do Profº Rafinha', data: '2026-09-19', dataTexto: '', local: 'Bairro Rancho Alegre', horario: '19h00', mapa: 'R. Cajarana, 389 - Rancho Alegre, Campo Grande - MS', fotos: '' },
      { titulo: 'Roda de Capoeira do Profº Rafinha', data: '2026-08-29', dataTexto: '', local: 'Bairro Rancho Alegre', horario: '19h00', mapa: 'R. Cajarana, 389 - Rancho Alegre, Campo Grande - MS', fotos: '' },
      { titulo: 'Batizado do Mestre Profeta', data: '2026-08-22', dataTexto: '', local: 'Núcleo Hab. Buriti', horario: '19h00', mapa: 'R. Jaime Costa, 589 - Núcleo Habitacional Buriti, Campo Grande - MS', fotos: '' },
      { titulo: 'Batizado de Capoeira', data: '2026-07-25', dataTexto: '', local: 'Rochedo — MS', horario: '19h00', mapa: 'Rochedo - MS', fotos: '' },
    ],
  },

  app: {
    selo: 'APP DO GRUPO',
    titulo: 'O grupo inteiro',
    destaque: 'no bolso',
    texto: 'Sem loja de aplicativos: instala direto do site, com dois ícones — o app do aluno e a Rede Liberdade, a rede social fechada do grupo.',
    recursos: [
      { titulo: 'Termômetro do cordão', texto: 'Notas dos 15 critérios, rumo ao próximo batizado' },
      { titulo: 'Presença na roda', texto: 'Check-in no núcleo em um toque' },
      { titulo: 'Mensalidade', texto: 'Situação e histórico de pagamentos' },
      { titulo: 'Agenda e inscrições', texto: 'Batizados, rodas e oficinas' },
      { titulo: 'Rede Liberdade', texto: 'Stories, avisos e mensagens do grupo' },
      { titulo: 'Conta família', texto: 'Pais acompanham os filhos' },
    ],
    printApp: 'assets/print-app.png',
    printRede: 'assets/print-rede.png',
  },

  loja: {
    selo: 'LOJA OFICIAL',
    titulo: 'O uniforme',
    destaque: 'e os instrumentos',
    texto: 'Abadá bordado com o brasão e instrumentos selecionados. Também dá para comprar pelo app.',
    whatsapp: '67991293269',
    produtos: [
      { nome: 'Abadá Oficial', texto: 'Tecido leve e resistente, bordado com o brasão do grupo.', preco: 'R$ 90,00', foto: 'assets/equipe.jpg' },
      { nome: 'Berimbau Profissional', texto: 'Verga de biriba, cabaça afinada e arame importado.', preco: 'R$ 220,00', foto: 'assets/bateria-externa.jpg' },
      { nome: 'Pandeiro Profissional', texto: 'Tarraxas reforçadas e ótima projeção sonora.', preco: 'R$ 180,00', foto: 'assets/bateria.jpg' },
    ],
  },

  chamada: {
    titulo: 'Sua vaga na roda',
    destaque: 'já está aberta',
    texto: 'Traga roupa leve, venha descalço e chegue 10 minutos antes. O resto o grupo ensina.',
    foto: 'assets/grupo-buriti.jpg',
    formTitulo: 'Agende sua aula grátis',
    formAjuda: 'O professor do núcleo responde pelo WhatsApp.',
  },

  rodape: {
    texto: 'Grupo Mestre Profeta · Campo Grande e Rochedo / MS. Capoeira é cultura, disciplina e transformação.',
    telefone: '(67) 99129-3269',
    endereco: 'R. Jaime Costa, 589 — Núcleo Hab. Buriti — Campo Grande/MS',
    instagram: '@capoeiraliberdadeeexpressao',
    instagramUrl: 'https://www.instagram.com/capoeiraliberdadeeexpressao/',
    facebook: 'capoeiraliberdadeeexpressaooficial',
    facebookUrl: 'https://www.facebook.com/capoeiraliberdadeeexpressaooficial',
  },
};
