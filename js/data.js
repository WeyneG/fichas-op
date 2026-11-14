// Regras fixas da ficha, modelos e utilitários de dados.

export const ATTRS = {
  fisico: { label: 'Físico', ab: 'FÍS' },
  mente:  { label: 'Mente',  ab: 'MEN' },
  emocao: { label: 'Emoção', ab: 'EMO' },
};

export const DICE = [4, 6, 8, 10, 12];

// Cores que o jogador pode escolher para a ficha (ou uma personalizada).
export const DEFAULT_THEME = '#aeb4bb';
export const THEMES = [
  ['Névoa', '#aeb4bb'], ['Osso', '#e6e1d3'], ['Verde', '#5f9e32'], ['Sangue', '#b3322f'],
  ['Conhecimento', '#d4a72c'], ['Energia', '#8b5cf6'], ['Gélido', '#5aa9d6'], ['Ferrugem', '#c0662b'],
];
export const themeName = (hex) => (THEMES.find(([, h]) => h.toLowerCase() === String(hex || '').toLowerCase()) || ['Personalizada'])[0];

// Lista de perícias da ficha, com o atributo de cada uma.
export const SKILLS = [
  ['Acrobacia', 'fisico'],
  ['Aptidão (Artes)', 'mente'], ['Aptidão (Atualidades)', 'mente'], ['Aptidão (Burocracia)', 'mente'],
  ['Aptidão (Exatas)', 'mente'], ['Aptidão (Humanas)', 'mente'], ['Aptidão (Tática)', 'mente'],
  ['Atletismo', 'fisico'], ['Crime', 'fisico'],
  ['Disciplina', 'emocao'], ['Enganação', 'emocao'], ['Furtividade', 'fisico'], ['Intimidar', 'emocao'],
  ['Intuição', 'emocao'], ['Luta', 'fisico'], ['Máquinas', 'mente'], ['Medicina', 'mente'],
  ['Ocultismo', 'mente'], ['Percepção', 'mente'], ['Persuasão', 'emocao'], ['Pesquisar', 'mente'],
  ['Pontaria', 'fisico'], ['Sobrevivência', 'mente'], ['Tecnologia', 'mente'], ['Vigor', 'fisico'],
];

export const uid = () => Math.random().toString(36).slice(2, 9);
export const clone = (o) => JSON.parse(JSON.stringify(o));

export function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'personagem';
}

export function blankPublic() {
  return {
    v: 1,
    name: '', classe: '', ocupacao: '', nivel: 1, portrait: null, theme: DEFAULT_THEME,
    pv: { cur: 10, max: 10, dt: 7 }, pd: { cur: 10, max: 10, dt: 7 }, armor: 0,
    attrs: { fisico: 6, mente: 6, emocao: 6 },
    skills: SKILLS.map(([n, a]) => ({ n, d: 4, a })),
    abilities: [],
    inventory: [],
  };
}

export function blankPrivate() {
  return {
    historia: '', aparencia: '', personalidade: '', perguntas: '', notas: '',
    notasAbas: ['', '', '', ''], pontos: [], conexoes: [], sessoes: [],
  };
}

// Garante que uma ficha vinda do banco/arquivo tem todos os campos.
export function normPublic(d) {
  const b = blankPublic();
  const o = Object.assign(b, d && typeof d === 'object' ? d : {});
  o.pv = Object.assign({ cur: 10, max: 10, dt: 7 }, o.pv || {});
  o.pd = Object.assign({ cur: 10, max: 10, dt: 7 }, o.pd || {});
  if (typeof o.armor !== 'number') o.armor = 0;
  o.attrs = Object.assign({ fisico: 6, mente: 6, emocao: 6 }, o.attrs || {});
  if (!Array.isArray(o.skills) || !o.skills.length) o.skills = blankPublic().skills;
  else {
    // garante a lista oficial completa (fichas antigas não tinham todas as Aptidões), na ordem certa
    const byName = new Map(o.skills.map((s) => [s.n, s]));
    const official = SKILLS.map(([n, a]) => byName.get(n) || { n, d: 4, a });
    const extras = o.skills.filter((s) => !SKILLS.some(([n]) => n === s.n));
    o.skills = official.concat(extras);
  }
  if (!Array.isArray(o.abilities)) o.abilities = [];
  if (!Array.isArray(o.inventory)) o.inventory = [];
  if (!/^#[0-9a-f]{6}$/i.test(o.theme || '')) o.theme = DEFAULT_THEME;
  return o;
}
export function normPrivate(d) {
  const o = Object.assign(blankPrivate(), d && typeof d === 'object' ? d : {});
  if (!Array.isArray(o.conexoes)) o.conexoes = [];
  o.conexoes = o.conexoes.map((c) => Object.assign({ name: '', text: '', foto: null, grau: 1, usado: false }, c));
  if (!Array.isArray(o.sessoes)) o.sessoes = [];
  if (!Array.isArray(o.pontos)) o.pontos = [];
  const old = Array.isArray(o.notasAbas) ? o.notasAbas : [];
  o.notasAbas = [0, 1, 2, 3].map((i) => old[i] || '');
  if (o.notas) { if (!o.notasAbas[0]) o.notasAbas[0] = o.notas; o.notas = ''; } // anotações antigas vão pra Aba 1
  return o;
}

// ---------------------------------------------------------------------
// Modelos prontos para "Novo personagem"
// ---------------------------------------------------------------------
const victorSkills = {
  'Aptidão (Humanas)': 6, 'Atletismo': 6, 'Disciplina': 6, 'Percepção': 6, 'Pesquisar': 8, 'Vigor': 6,
};

export const TEMPLATES = {
  branco: {
    label: 'Em branco',
    desc: 'Você preenche atributos, perícias e habilidades na própria ficha.',
    make: () => ({ pub: blankPublic(), priv: blankPrivate() }),
  },
  victor: {
    label: 'Victor — Vigilante · Professor',
    desc: 'Ficha pronta do Victor (nível 2).',
    make: () => {
      const pub = blankPublic();
      Object.assign(pub, {
        name: 'Victor', classe: 'Vigilante', ocupacao: 'Professor', nivel: 2, theme: '#5f9e32',
        pv: { cur: 14, max: 14, dt: 7 }, pd: { cur: 14, max: 14, dt: 7 },
        attrs: { fisico: 8, mente: 6, emocao: 8 },
      });
      pub.skills.forEach((s) => { if (victorSkills[s.n]) s.d = victorSkills[s.n]; });
      pub.abilities = [
        { id: uid(), name: 'Mentoria', cost: 0,
          text: 'Ao ajudar outro personagem, faça um teste da perícia usada na ajuda contra DT 7. Se passar, o personagem ajudado pode trocar um dos dados que rolou pelo seu resultado mais alto.' },
        { id: uid(), name: 'Prontidão', cost: 3,
          text: 'No início de qualquer conflito, gaste 3 PD para ganhar uma rodada em que você age antes de todos os outros personagens e NPCs.' },
      ];
      const priv = blankPrivate();
      Object.assign(priv, {
        historia: 'Réveillon — a virada de 2021 para 2022. Um novo começo.\n\nVictor é professor de literatura do ensino médio. Recebeu um diagnóstico terminal e, para não passar a virada sozinho em casa remoendo isso, foi a uma festa de amigos.\n\nLá passou horas conversando com Gustavo, um homem que estava com a família comemorando o que ele chamava de "seu último ano-novo". Os dois se reconheceram um no outro: falar com alguém na mesma situação aliviou um pouco o peso, mesmo sabendo que, em alguns meses, nenhum dos dois estaria aqui para lembrar disso.\n\nGustavo recomendou que Victor entrasse em um grupo de apoio online para pessoas em fase terminal — disse que isso o estava ajudando a lidar com tudo.\n\nOs fogos estouraram enquanto conversavam. A contagem chegou a zero.\n\nE então… a escuridão.',
        aparencia: 'Cabelo comprido escuro, preso pela metade; barba rala. Blazer escuro com mangas dobradas, camisa branca, calça escura e tênis.',
        conexoes: [{ id: uid(), name: 'Gustavo', grau: 1, usado: false, foto: null, text: 'Conheceu na festa de réveillon 2021→2022. Também em fase terminal, estava com a família. Indicou um grupo de apoio online.' }],
      });
      return { pub, priv };
    },
  },
};
