/*
  БУНКЕР — простая фанатская веб-версия.
  Правила сверены с https://bunker-online.com/ru/rules (базовый пак).
  Здесь нет спецкарт, возвратов игроков и прочих сложных механик.
  Связь игроков: PeerJS Cloud + WebRTC. Хост держит состояние комнаты в своем браузере.
*/

const APP = document.getElementById('app');
const BADGE = document.getElementById('connectionBadge');
const TOAST = document.getElementById('toast');

const CARD_TYPES = [
  ['biology', 'Пол / возраст'],
  ['physique', 'Телосложение'],
  ['trait', 'Человеческая черта'],
  ['profession', 'Профессия'],
  ['health', 'Здоровье'],
  ['hobby', 'Хобби / увлечение'],
  ['fear', 'Фобия / страх'],
  ['largeGear', 'Крупный инвентарь'],
  ['backpack', 'Рюкзак'],
  ['fact', 'Факт'],
  ['extra', 'Доп. сведение']
];
const CARD_NAMES = Object.fromEntries(CARD_TYPES);

const DECK = {
  biology: [
    ['Мужчина, 23 года', { demo: 1, power: 1 }], ['Женщина, 24 года', { demo: 1, power: 1 }],
    ['Мужчина, 31 год', { demo: 1, power: 1 }], ['Женщина, 29 лет', { demo: 1, power: 1 }],
    ['Мужчина, 38 лет', { demo: 1, power: .8 }], ['Женщина, 36 лет', { demo: 1, power: .8 }],
    ['Мужчина, 46 лет', { demo: .7, power: .8 }], ['Женщина, 42 года', { demo: .8, power: .8 }],
    ['Мужчина, 54 года', { demo: .4, power: .7 }], ['Женщина, 51 год', { demo: .5, power: .7 }],
    ['Мужчина, 19 лет', { demo: 1, power: .9 }], ['Женщина, 20 лет', { demo: 1, power: .9 }]
  ],
  physique: [
    ['Выносливое телосложение', { body: 2 }], ['Крепкое телосложение', { body: 2 }],
    ['Лёгкое и подвижное телосложение', { body: 1 }], ['Среднее телосложение', { body: 1 }],
    ['Сильные руки, хорошая координация', { body: 2 }], ['Высокая выносливость', { body: 2 }],
    ['Низкая физическая выносливость', { body: -1 }], ['Есть ограничения по нагрузкам', { body: -1 }]
  ],
  trait: [
    ['Спокойный и собранный', { team: 2 }], ['Наблюдательный', { team: 1, skill: 1 }],
    ['Умеет принимать решения под давлением', { team: 2 }], ['Очень настойчивый', { team: 1 }],
    ['Хорошо ладит с людьми', { team: 2 }], ['Практичный и экономный', { food: 1, team: 1 }],
    ['Склонен спорить и упрямиться', { team: -1 }], ['Сильно нервничает в конфликте', { team: -1 }]
  ],
  profession: [
    ['Врач-терапевт', { med: 4, food: 0, tech: 0 }], ['Инженер', { tech: 4 }],
    ['Агроном', { food: 4 }], ['Электрик', { tech: 3 }], ['Механик', { tech: 3, body: 1 }],
    ['Строитель', { tech: 2, body: 2 }], ['Биолог', { med: 2, food: 2 }],
    ['Повар', { food: 3, team: 1 }], ['Спасатель', { body: 3, med: 1 }],
    ['Ветеринар', { med: 2, food: 2 }], ['Швея', { craft: 3 }], ['Водитель', { tech: 2, body: 1 }],
    ['Программист', { tech: 2 }], ['Геолог', { env: 3, body: 1 }], ['Учитель', { team: 2, skill: 1 }],
    ['Радиолюбитель', { tech: 3, comms: 1 }], ['Лесник', { food: 2, env: 3, body: 1 }],
    ['Слесарь', { tech: 3, body: 1 }], ['Фармацевт', { med: 3 }], ['Плотник', { tech: 2, craft: 2, body: 1 }]
  ],
  health: [
    ['Здоров, серьёзных ограничений нет', { health: 2 }], ['Лёгкая сезонная аллергия', { health: 1 }],
    ['Здоровье стабильное, требуется режим сна', { health: 1 }], ['Недавняя травма, но восстановление идёт', { health: 0 }],
    ['Чувствительность к холоду', { health: -1 }], ['Нужны регулярные лекарства', { health: -1 }],
    ['Сильная простуда перед катастрофой', { health: -1 }], ['Очень хорошая физическая форма', { health: 2, body: 1 }]
  ],
  hobby: [
    ['Садоводство', { food: 2 }], ['Ремонт техники', { tech: 2 }], ['Радиосвязь', { comms: 2 }],
    ['Кулинария', { food: 1, team: 1 }], ['Плотницкое дело', { craft: 2, tech: 1 }],
    ['Первая помощь', { med: 2 }], ['Пошив и ремонт одежды', { craft: 2 }], ['Ориентирование', { env: 2, body: 1 }],
    ['Фитнес и бег', { body: 2 }], ['Шахматы и логические задачи', { skill: 2 }]
  ],
  fear: [
    ['Боится темноты', { risk: -1 }], ['Боится высоты', { risk: -1 }], ['Боится открытой воды', { risk: -1 }],
    ['Боится больших скоплений людей', { team: -1 }], ['Боится огня', { risk: -1 }], ['Боится собак', { risk: -1 }],
    ['Боится замкнутых пространств', { risk: -1 }], ['Спокойно относится к стрессовым ситуациям', { team: 1 }]
  ],
  largeGear: [
    ['Набор ручного инструмента', { tech: 2, craft: 1 }], ['Портативная солнечная панель', { tech: 2 }],
    ['Компактный водяной фильтр', { water: 3 }], ['Набор для выращивания рассады', { food: 2 }],
    ['Медицинский набор', { med: 2 }], ['Печь для небольшого помещения', { heat: 2 }],
    ['Швейная машинка с ручным приводом', { craft: 2 }], ['Рация', { comms: 2 }],
    ['Комплект туристического снаряжения', { body: 1, env: 1 }], ['Набор для ремонта сантехники', { water: 2, tech: 1 }]
  ],
  backpack: [
    ['Фонарь', { tech: 1 }], ['Мультитул', { tech: 1, craft: 1 }], ['Компас', { env: 1 }],
    ['Верёвка и карабины', { body: 1, env: 1 }], ['Блокнот и карандаши', { skill: 1 }],
    ['Запас батареек', { tech: 1 }], ['Термокружка', { food: 0 }], ['Аптечка', { med: 1 }],
    ['Полевой фильтр для воды', { water: 2 }], ['Сухой продовольственный паёк', { food: 1 }],
    ['Складной нож для бытовых работ', { craft: 1 }], ['Набор семян', { food: 2 }]
  ],
  fact: [
    ['Умеет заготавливать продукты на долгий срок', { food: 2 }], ['Знает основы автономной энергетики', { tech: 2 }],
    ['Несколько лет жил за городом и привык к автономности', { env: 2, body: 1 }], ['Свободно говорит на трёх языках', { team: 1 }],
    ['Умеет распределять запасы и вести учёт', { food: 1, skill: 1 }], ['Знаком с базовыми правилами санитарии', { med: 1 }],
    ['Имеет опыт работы в команде спасателей', { team: 2, body: 1 }], ['Хорошо ориентируется по картам', { env: 2 }],
    ['Быстро обучается новым задачам', { skill: 2 }], ['Раньше отвечал за обслуживание большого здания', { tech: 2 }]
  ],
  extra: [
    ['Умеет экономно расходовать воду', { water: 2 }], ['Уверенно чинит простые механизмы', { tech: 2 }],
    ['Умеет сушить и хранить овощи', { food: 2 }], ['Знает правила безопасной работы с огнём', { heat: 1, risk: 1 }],
    ['Умеет обучать других своим навыкам', { team: 1, skill: 1 }], ['Привык работать ночью', { tech: 1, body: 1 }],
    ['Имеет опыт ведения журнала запасов', { food: 1, skill: 1 }], ['Хорошо переносит бытовую рутину', { team: 1 }],
    ['Имеет опыт работы в небольшом закрытом коллективе', { team: 2 }], ['Знает основы ремонта одежды и обуви', { craft: 2 }]
  ]
};

const CATASTROPHES = [
  { title: 'Жёсткая ядерная зима', desc: 'После глобального обмена ударами поверхность Земли покрыта пылью и сажей. Холодно, света мало, выходы наружу опасны.', duration: 30, foodNeed: 1.25, heatNeed: 1.35, envNeed: 1.2 },
  { title: 'Глобальное наводнение', desc: 'Огромные территории затоплены. Пресная вода доступна, но транспорт и производство разрушены.', duration: 24, foodNeed: 1.1, heatNeed: 0.85, envNeed: 1.35 },
  { title: 'Долгая засуха', desc: 'Осадки почти исчезли. Главные ресурсы — вода, семена, знания об экономии и производстве пищи.', duration: 36, foodNeed: 1.4, heatNeed: 1.0, envNeed: 1.2 },
  { title: 'Техногенный коллапс', desc: 'Энергосистема разрушена, связь нестабильна, вокруг много отказавшего оборудования.', duration: 26, foodNeed: 1.1, heatNeed: 1.2, envNeed: 1.15 },
  { title: 'Глобальная эпидемия', desc: 'Снаружи сохраняется высокий риск заражения. Главная сила бункера — медицина, санитария и дисциплина.', duration: 20, foodNeed: 1.0, heatNeed: 0.9, envNeed: 1.0 },
  { title: 'Падение крупного астероида', desc: 'Удар вызвал пожары, пыль и разрушения. Основные задачи — пережить ударную волну, наладить быт и запасы.', duration: 18, foodNeed: 1.15, heatNeed: 1.2, envNeed: 1.1 },
  { title: 'Климатический срыв', desc: 'Чередуются сильные морозы, жара и шторма. Вне бункера среда быстро меняется.', duration: 28, foodNeed: 1.2, heatNeed: 1.2, envNeed: 1.3 },
  { title: 'Пыльная буря на годы', desc: 'Почти постоянная пыль закрывает небо. Механизмы изнашиваются, воздух и вода требуют фильтрации.', duration: 32, foodNeed: 1.2, heatNeed: 1.1, envNeed: 1.25 }
];

const BUNKERS = [
  { title: 'Старый военный бункер', size: 640, rooms: 6, food: 14, water: 24, energy: 78, systems: ['генератор', 'склад инструментов', 'малый медпункт'], bonus: { tech: 2, med: 1 }, desc: 'Прочный, но часть систем требует обслуживания.' },
  { title: 'Научный подземный комплекс', size: 820, rooms: 6, food: 12, water: 30, energy: 86, systems: ['лаборатория', 'фильтрация воздуха', 'гидропоника'], bonus: { med: 2, food: 2, tech: 1 }, desc: 'Лучшие системы, но высокая зависимость от электроэнергии.' },
  { title: 'Горный резервный бункер', size: 520, rooms: 5, food: 18, water: 36, energy: 58, systems: ['скважина', 'печь', 'кладовая'], bonus: { water: 3, heat: 2 }, desc: 'Надёжный источник воды, мало свободного пространства.' },
  { title: 'Гражданское убежище', size: 900, rooms: 8, food: 10, water: 18, energy: 65, systems: ['мастерская', 'кухня', 'спальные комнаты'], bonus: { craft: 2, food: 1, team: 1 }, desc: 'Просторное помещение с посредственными запасами.' },
  { title: 'Скрытый сельскохозяйственный бункер', size: 760, rooms: 6, food: 16, water: 28, energy: 70, systems: ['семенной фонд', 'теплица', 'дождесбор'], bonus: { food: 4, water: 1 }, desc: 'Лучший вариант для долгой автономной жизни.' },
  { title: 'Подземный дата-узел', size: 430, rooms: 4, food: 9, water: 16, energy: 92, systems: ['серверная', 'резервное питание', 'связь'], bonus: { tech: 4, comms: 3 }, desc: 'Отличная техника, но мало места и пищи.' }
];

const REVEAL_QUOTA = {
  6: [3, 3, 2],
  7: [3, 2, 2, 1, 1], 8: [3, 2, 2, 1, 1],
  9: [3, 2, 1, 1, 1, 1], 10: [3, 2, 1, 1, 1, 1],
  11: [2, 2, 1, 1, 1, 1], 12: [2, 2, 1, 1, 1, 1],
  13: [2, 1, 1, 1, 1, 1, 1], 14: [2, 1, 1, 1, 1, 1, 1], 15: [2, 1, 1, 1, 1, 1, 1]
};

const state = {
  mode: 'start',
  isHost: false,
  isLeader: false,
  peer: null,
  hostId: null,
  roomCode: null,
  myId: null,
  myPlayerId: null,
  myName: '',
  connections: new Map(),
  pendingHost: null,
  game: null
};

let toastTimer = null;
let timerHandle = null;

function esc(v = '') {
  return String(v).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function toast(msg) {
  TOAST.textContent = msg;
  TOAST.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => TOAST.classList.remove('show'), 2500);
}
function setBadge(text, ok = false) {
  BADGE.textContent = text;
  BADGE.style.borderColor = ok ? 'rgba(86, 182, 116, .45)' : 'rgba(255,255,255,.2)';
  BADGE.style.color = ok ? '#bfe6c7' : '#ece7db';
}
function makeRoomCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
function getRoomFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get('room');
}
function playerById(id) { return state.game?.players?.find(p => p.id === id); }
function activePlayers() { return (state.game?.players || []).filter(p => !p.eliminated); }
function inBunkerPlayers() { return (state.game?.players || []).filter(p => p.bunkered); }
function remainingCardTypes(player) { return CARD_TYPES.map(x => x[0]).filter(type => !player.revealed.includes(type)); }

function createDeckCard(type) {
  const [value, mods] = pick(DECK[type]);
  return { type, value, mods: { ...mods } };
}

function makeCharacter() {
  const cards = {};
  for (const [type] of CARD_TYPES) cards[type] = createDeckCard(type);
  return cards;
}

function makePlayers(names, hostPlayerId, total) {
  const slots = Array.from({ length: total }, (_, idx) => names[idx] || `Игрок ${idx + 1}`);
  return slots.map((name, idx) => ({
    id: `p${Date.now().toString(36)}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    name: name || `Игрок ${idx + 1}`,
    connected: hostPlayerId === idx,
    ready: false,
    eliminated: false,
    bunkered: false,
    revealed: [],
    cards: makeCharacter(),
    lastRevealRound: -1,
    revealsThisRound: 0,
    mutedNextSpeech: false,
    vote: null,
    speechDone: false,
    hostPlayer: hostPlayerId === idx
  }));
}

function bunkerSlots(total) {
  return Math.floor(total / 2);
}

function createGame(settings, names, hostPlayerIdx = null) {
  const cat = pick(CATASTROPHES);
  const bunker = pick(BUNKERS);
  const players = makePlayers(names, hostPlayerIdx, settings.playerCount);
  return {
    version: 1,
    status: 'lobby',
    round: 0,
    settings,
    catastrophe: cat,
    bunker,
    capacity: bunkerSlots(players.length),
    players,
    currentTurnIndex: 0,
    currentPhase: 'lobby',
    currentSpeechIndex: 0,
    timeLeft: 0,
    timerRunning: false,
    skipUsed: false,
    doubleVoteNext: false,
    eliminationsThisRound: 0,
    voteRound: 0,
    votes: {},
    skipChoices: {},
    defendedThisRound: [],
    defenseCandidates: [],
    defenseQueue: [],
    needsRevote: false,
    currentRoundEliminationTarget: 1,
    farewellQueue: [],
    currentFarewellPlayerId: null,
    log: ['Комната создана.'],
    finalReport: null
  };
}

function revealQuota(total, round) {
  const q = REVEAL_QUOTA[total] || [2, 1, 1, 1, 1, 1, 1];
  return q[Math.max(0, round - 1)] || 1;
}

function startRound(round) {
  const g = state.game;
  g.round = round;
  g.status = 'playing';
  g.currentPhase = 'turns';
  g.currentTurnIndex = 0;
  g.currentSpeechIndex = 0;
  g.eliminationsThisRound = 0;
  g.voteRound = 0;
  g.votes = {};
  g.skipChoices = {};
  g.defendedThisRound = [];
  g.defenseCandidates = [];
  g.defenseQueue = [];
  g.needsRevote = false;
  g.farewellQueue = [];
  g.currentFarewellPlayerId = null;
  if (round === 1) g.currentRoundEliminationTarget = 1;
  activePlayers().forEach(p => {
    p.vote = null;
    p.speechDone = false;
    p.lastRevealRound = round;
    p.revealsThisRound = 0;
  });
  if (round === 1) {
    activePlayers().forEach(p => {
      p.revealed = ['profession'];
      p.revealsThisRound = 1;
    });
    g.log.push('Раунд 1: профессия открыта всем автоматически. Затем игрок открывает ещё 2 характеристики.');
  } else {
    g.log.push(`Раунд ${round} начат. ${g.currentRoundEliminationTarget === 2 ? 'В этом раунде нужно исключить двух игроков.' : 'Одно исключение.'}`);
  }
  syncAndRender();
}

function orderedActive() {
  const ps = activePlayers();
  if (!ps.length) return [];
  return state.game.round % 2 === 1 ? ps : [...ps].reverse();
}

function currentTurnPlayer() {
  const order = orderedActive();
  return order[state.game.currentTurnIndex] || order[0];
}

function localPlayer() {
  return playerById(state.myPlayerId);
}

function canReveal(player) {
  if (!player || player.eliminated) return false;
  const quota = revealQuota(state.game.settings.playerCount, state.game.round);
  return player.lastRevealRound === state.game.round && player.revealsThisRound < quota;
}

function playerOpenedCount(player) {
  return player.revealed.filter(Boolean).length;
}

function requiredAdditional(player) {
  const q = revealQuota(state.game.settings.playerCount, state.game.round);
  return Math.max(0, q - (player.revealsThisRound || 0));
}

function revealCard(playerId, type) {
  if (!state.isHost) { sendToHost({ action: 'reveal', playerId: state.myPlayerId, type }); return; }
  const g = state.game;
  if (g.currentPhase !== 'turns') return toast('Сейчас не фаза раскрытия.');
  const order = orderedActive();
  const expected = order[g.currentTurnIndex];
  if (!expected || expected.id !== playerId) return toast('Сейчас ход другого игрока.');
  const p = playerById(playerId);
  const q = revealQuota(g.settings.playerCount, g.round);
  if (p.revealsThisRound >= q) return toast('На этот раунд уже открыто всё необходимое.');
  if (p.revealed.includes(type)) return toast('Эта характеристика уже открыта.');
  p.revealed.push(type);
  p.revealsThisRound += 1;
  p.lastRevealRound = g.round;
  g.log.push(`${p.name} открыл «${CARD_NAMES[type]}».`);
  syncAndRender();
}

function finishTurn() {
  const g = state.game;
  if (g.currentPhase !== 'turns') return;
  const p = currentTurnPlayer();
  if (!p) return;
  if (p.revealsThisRound < revealQuota(g.settings.playerCount, g.round)) return toast('Сначала откройте все характеристики на этот раунд.');
  g.currentTurnIndex++;
  if (g.currentTurnIndex >= orderedActive().length) {
    beginDiscussion();
  } else {
    syncAndRender();
  }
}

function beginDiscussion() {
  state.game.currentPhase = 'discussion';
  state.game.timeLeft = 120;
  state.game.timerRunning = false;
  state.game.currentSpeechIndex = 0;
  state.game.log.push('Общее обсуждение: 2 минуты.');
  syncAndRender();
}

function beginSpeeches() {
  const g = state.game;
  g.currentPhase = 'speeches';
  g.currentSpeechIndex = 0;
  g.timeLeft = 30;
  g.timerRunning = false;
  activePlayers().forEach(p => p.speechDone = false);
  syncAndRender();
}

function nextSpeech() {
  const g = state.game;
  if (g.currentPhase !== 'speeches') return;
  const order = orderedActive();
  if (g.currentSpeechIndex + 1 >= order.length) return beginVote();
  g.currentSpeechIndex++;
  g.timeLeft = 30;
  g.timerRunning = false;
  syncAndRender();
}

function beginVote() {
  const g = state.game;
  g.currentPhase = 'vote';
  g.votes = {};
  g.skipChoices = {};
  g.voteRound += 1;
  g.timeLeft = 120;
  g.timerRunning = false;
  activePlayers().forEach(p => p.vote = null);
  g.log.push(g.voteRound === 1 ? 'Голосование началось: 2 минуты, голоса можно менять.' : 'Началось повторное голосование: 2 минуты.');
  syncAndRender();
}

function setSkipChoice(voterId, enabled) {
  if (!state.isHost) {
    sendToHost({ action: 'skipChoice', voterId: state.myPlayerId, enabled: !!enabled });
    return;
  }
  const g = state.game;
  if (g.currentPhase !== 'vote' || g.round !== 1 || g.voteRound !== 1 || g.skipUsed) return;
  if (!activePlayers().some(p => p.id === voterId)) return;
  g.skipChoices[voterId] = !!enabled;
  syncAndRender();
}

function castVote(voterId, targetId) {
  if (!state.isHost) { sendToHost({ action: 'vote', voterId: state.myPlayerId, targetId }); return; }
  const g = state.game;
  if (g.currentPhase !== 'vote') return;
  if (!activePlayers().some(p => p.id === voterId)) return;
  if (!activePlayers().some(p => p.id === targetId)) return;
  g.votes[voterId] = targetId;
  const voter = playerById(voterId);
  if (voter) voter.vote = targetId;
  syncAndRender();
}

function finishVote() {
  const g = state.game;
  if (g.currentPhase !== 'vote') return;
  const voters = activePlayers();
  if (!voters.length) return;

  // In the adapted version, missing votes are abstentions rather than self-votes.
  const entriesCount = {};
  Object.values(g.votes).forEach(target => {
    if (voters.some(p => p.id === target)) entriesCount[target] = (entriesCount[target] || 0) + 1;
  });

  // First-round skip: a majority may choose to skip the vote.
  if (g.round === 1 && g.voteRound === 1 && !g.skipUsed) {
    const skipCount = Object.values(g.skipChoices).filter(Boolean).length;
    if (skipCount > voters.length / 2) {
      g.skipUsed = true;
      g.currentRoundEliminationTarget = 2;
      g.log.push('Большинство выбрало пропуск. В следующем раунде нужно исключить двух игроков.');
      beginNextRound();
      return;
    }
  }

  const entries = Object.entries(entriesCount).sort((a,b) => b[1] - a[1]);
  if (!entries.length) {
    g.log.push('Никто не отдал голос. Голосование не завершено — нужен хотя бы один голос.');
    g.timeLeft = 120;
    g.timerRunning = false;
    syncAndRender();
    return toast('Нужен хотя бы один голос, чтобы определить кандидата.');
  }

  const top = entries[0][1];
  const leaders = entries.filter(x => x[1] === top).map(x => x[0]);
  const pct = top / voters.length;
  const alreadyDefended = id => g.defendedThisRound.includes(id);

  if (leaders.length === 1 && pct >= 0.70) {
    eliminatePlayers([leaders[0]]);
    return;
  }

  if (leaders.length === 1) {
    const id = leaders[0];
    if (!alreadyDefended(id)) {
      g.defenseCandidates = [id];
      g.defenseQueue = [id];
      g.currentPhase = 'defense';
      g.timeLeft = 30;
      g.timerRunning = false;
      syncAndRender();
      return;
    }
    // Candidate has already used their one defense in this round.
    eliminatePlayers([id]);
    return;
  }

  // Tie: every tied player gets one defense, then a revote.
  const needDefense = leaders.filter(id => !alreadyDefended(id));
  if (needDefense.length) {
    g.defenseCandidates = leaders;
    g.defenseQueue = needDefense;
    g.currentPhase = 'defense';
    g.timeLeft = 30;
    g.timerRunning = false;
    syncAndRender();
    return;
  }

  // Tie persisted after all tied candidates used their single defense.
  if (g.round === 1) {
    g.log.push('После оправданий голоса снова разделились поровну. Раунд завершается без исключения.');
    beginNextRound();
    return;
  }

  eliminatePlayers(leaders.slice(0, 2));
}

function finishDefense() {
  const g = state.game;
  if (g.currentPhase !== 'defense') return;
  const defended = g.defenseQueue.shift();
  if (defended && !g.defendedThisRound.includes(defended)) g.defendedThisRound.push(defended);
  if (g.defenseQueue.length) {
    g.timeLeft = 30;
    g.timerRunning = false;
    syncAndRender();
  } else {
    startRevote();
  }
}

function startRevote() {
  const g = state.game;
  g.currentPhase = 'vote';
  g.needsRevote = true;
  g.votes = {};
  g.skipChoices = {};
  g.voteRound += 1;
  g.timeLeft = 120;
  g.timerRunning = false;
  activePlayers().forEach(p => p.vote = null);
  g.log.push('Повторное голосование: 2 минуты.');
  syncAndRender();
}

function eliminatePlayers(ids) {
  const g = state.game;
  const unique = [...new Set(ids)].filter(id => { const p = playerById(id); return p && !p.eliminated; });
  if (!unique.length) return beginNextRound();
  unique.slice(0, g.currentRoundEliminationTarget === 2 ? 2 : 1).forEach(id => {
    const p = playerById(id);
    if (!p) return;
    p.eliminated = true;
    p.connected = false;
    p.vote = null;
    g.log.push(`${p.name} покидает временный лагерь.`);
    g.eliminationsThisRound++;
    if (state.myPlayerId === id) toast('Вы выбыли из лагеря.');
  });
  g.farewellQueue = unique.slice(0, g.currentRoundEliminationTarget === 2 ? 2 : 1);
  g.currentFarewellPlayerId = g.farewellQueue[0] || null;
  beginFarewell();
}

function beginFarewell() {
  const g = state.game;
  if (!g.farewellQueue.length) return afterEliminations();
  g.currentPhase = 'farewell';
  g.currentFarewellPlayerId = g.farewellQueue[0];
  g.timeLeft = 15;
  g.timerRunning = false;
  g.log.push(`Прощальная речь: 15 секунд для ${playerById(g.currentFarewellPlayerId)?.name || 'игрока'}.`);
  syncAndRender();
}

function finishFarewell() {
  const g = state.game;
  if (g.currentPhase !== 'farewell') return;
  g.farewellQueue.shift();
  if (g.farewellQueue.length) return beginFarewell();
  g.currentFarewellPlayerId = null;
  afterEliminations();
}

function afterEliminations() {
  const g = state.game;
  if (activePlayers().length <= g.capacity) {
    finishGame();
    return;
  }
  if (g.currentRoundEliminationTarget === 2 && g.eliminationsThisRound < 2) {
    beginVote();
    return;
  }
  beginNextRound();
}

function beginNextRound() {
  const g = state.game;
  g.currentRoundEliminationTarget = (g.round === 1 && g.skipUsed) ? 2 : 1;
  startRound(g.round + 1);
}

function skipVotingRoundOne() {
  if (!state.isHost) return toast('Пропуск определяется большинством игроков.');
  const g = state.game;
  if (g.round !== 1 || g.currentPhase !== 'vote' || g.voteRound !== 1) return toast('Пропуск доступен только в первом голосовании.');
  const voters = activePlayers();
  const skipCount = Object.values(g.skipChoices).filter(Boolean).length;
  if (skipCount <= voters.length / 2) return toast('Для пропуска нужно больше половины голосов игроков.');
  finishVote();
}


function finishGame() {
  const g = state.game;
  g.currentPhase = 'final';
  g.status = 'finished';
  g.players.forEach(p => { p.bunkered = !p.eliminated; });
  g.finalReport = calculateFinalReport();
  g.log.push('Бункер заполнен. Финальный результат готов.');
  syncAndRender();
}

function valueOfCard(type) {
  // Чем дальше карта от профессии, тем меньше её вклад в «силу» человека.
  // Это сохраняет роль всех характеристик, но не позволяет собрать сверхперсонажа
  // из нескольких удачных карт.
  return ({
    biology: 0.35,
    physique: 0.45,
    trait: 0.40,
    profession: 1.00,
    health: 0.45,
    hobby: 0.35,
    fear: 0.25,
    largeGear: 0.55,
    backpack: 0.30,
    fact: 0.35,
    extra: 0.30
  })[type] || 0.30;
}

function playerDomainProfile(player) {
  const raw = { tech:0, med:0, food:0, water:0, heat:0, env:0, body:0, team:0, skill:0, craft:0, comms:0, health:0, demo:0, power:0, risk:0 };
  CARD_TYPES.forEach(([type]) => {
    const card = player.cards[type];
    if (!card) return;
    const scale = valueOfCard(type);
    Object.entries(card.mods || {}).forEach(([k, v]) => {
      raw[k] = (raw[k] || 0) + Number(v || 0) * scale;
    });
  });

  // Жёсткий потолок вклада одного персонажа по каждому ключевому домену.
  const capped = {};
  Object.keys(raw).forEach(k => {
    const cap = ['tech','med','food','water','heat','env'].includes(k) ? 4.6 : 4.2;
    capped[k] = clamp(raw[k], -cap, cap);
  });
  return capped;
}

function addProfile(target, source) {
  Object.keys(source).forEach(k => target[k] = (target[k] || 0) + source[k]);
}

function diminishingPositive(value, cap, curve = 0.72) {
  if (value <= 0) return 0;
  return cap * (1 - Math.exp(-value / Math.max(0.01, cap * curve)));
}

function catastropheFocus(cat) {
  const base = { tech:1, med:1, food:1, water:1, heat:1, env:1, comms:1 };
  const title = cat.title.toLowerCase();
  let override = {};
  if (title.includes('ядер')) override = { heat:1.25, env:1.15, med:1.05, tech:1.05, food:1.10 };
  else if (title.includes('наводнен')) override = { water:1.25, env:1.20, food:1.05, tech:1.05, heat:0.85 };
  else if (title.includes('засух')) override = { water:1.35, food:1.25, env:1.15, heat:0.95, med:0.95 };
  else if (title.includes('техноген')) override = { tech:1.35, heat:1.10, comms:1.15, med:0.95 };
  else if (title.includes('эпидем')) override = { med:1.40, team:1.10, water:1.05, food:1.00, tech:1.00, env:1.00 };
  else if (title.includes('астероид')) override = { tech:1.15, heat:1.15, food:1.05, env:1.05, med:1.05 };
  else if (title.includes('климат')) override = { env:1.30, heat:1.20, food:1.10, water:1.10, tech:1.05 };
  else override = { env:1.25, tech:1.10, water:1.10, food:1.05, heat:1.05 };
  return { ...base, ...override };
}

function bunkerNeedMap(bunker) {
  const needs = [];
  const add = (tags, text) => needs.push({ tags, text });
  (bunker.systems || []).forEach(system => {
    const s = system.toLowerCase();
    if (s.includes('генератор') || s.includes('сервер') || s.includes('резервное пит')) add(['tech'], system);
    if (s.includes('инструмент') || s.includes('мастерская') || s.includes('сантех')) add(['tech','craft'], system);
    if (s.includes('медпункт') || s.includes('лаборатор')) add(['med','tech'], system);
    if (s.includes('фильтрац')) add(['med','env'], system);
    if (s.includes('гидропон') || s.includes('теплиц') || s.includes('семенн')) add(['food','water'], system);
    if (s.includes('скважин') || s.includes('дождесбор')) add(['water','env'], system);
    if (s.includes('печ') || s.includes('отоп')) add(['heat','tech'], system);
    if (s.includes('кухн') || s.includes('кладов')) add(['food'], system);
    if (s.includes('связ')) add(['comms','tech'], system);
  });
  return needs;
}

function calculateFinalReport() {
  const g = state.game;
  const survivors = inBunkerPlayers();
  const total = Math.max(1, survivors.length);
  const sum = { tech:0, med:0, food:0, water:0, heat:0, env:0, body:0, team:0, skill:0, craft:0, comms:0, health:0, demo:0, power:0, risk:0 };
  const playerProfiles = survivors.map(p => ({ player: p, profile: playerDomainProfile(p) }));
  playerProfiles.forEach(x => addProfile(sum, x.profile));
  Object.entries(g.bunker.bonus || {}).forEach(([k,v]) => sum[k] = (sum[k] || 0) + Number(v || 0));

  const focus = catastropheFocus(g.catastrophe);

  // Ресурсы зависят от навыков группы, но навыки улучшают исходные запасы лишь умеренно.
  const foodSupport = diminishingPositive(Math.max(0, sum.food) * (focus.food ?? 1) + Math.max(0, sum.craft) * 0.55, 9, 1.0);
  const waterSupport = diminishingPositive(Math.max(0, sum.water) * (focus.water ?? 1) + Math.max(0, sum.env) * 0.35, 8, 1.0);
  const foodMonths = Math.max(1, g.bunker.food + foodSupport * 1.25);
  const waterMonths = Math.max(1, g.bunker.water + waterSupport * 1.10);
  const foodTarget = g.catastrophe.duration * g.catastrophe.foodNeed;
  const waterTarget = g.catastrophe.duration * 0.65;
  const resourceFood = clamp((foodMonths / foodTarget) * 100, 0, 100);
  const resourceWater = clamp((waterMonths / waterTarget) * 100, 0, 100);
  const resource = clamp(resourceFood * 0.60 + resourceWater * 0.40, 0, 100);

  const techCore = diminishingPositive(Math.max(0, sum.tech) * (focus.tech ?? 1), 12, 1.15);
  const commsCore = diminishingPositive(Math.max(0, sum.comms) * (focus.comms ?? 1), 6, 1.2);
  const systems = clamp(34 + g.bunker.energy * 0.36 + techCore * 3.2 + commsCore * 1.4 - (g.catastrophe.title.includes('Техног') ? 5 : 0), 0, 100);

  const medCore = diminishingPositive(Math.max(0, sum.med) * (focus.med ?? 1), 12, 1.15);
  const healthCore = diminishingPositive(Math.max(0, sum.health), 8, 1.2);
  const medicine = clamp(32 + medCore * 4.4 + healthCore * 2.0 + (g.catastrophe.title.includes('эпидем') ? 7 : 0), 0, 100);

  const teamCore = diminishingPositive(Math.max(0, sum.team), 9, 1.1);
  const skillCore = diminishingPositive(Math.max(0, sum.skill), 7, 1.2);
  const teamPenalty = Math.min(18, Math.abs(Math.min(0, sum.team)) * 3.5 + Math.abs(Math.min(0, sum.risk)) * 1.5);
  const teamwork = clamp(38 + teamCore * 5.0 + skillCore * 2.0 - teamPenalty, 0, 100);

  const foodCore = diminishingPositive(Math.max(0, sum.food) * focus.food, 11, 1.1);
  const craftCore = diminishingPositive(Math.max(0, sum.craft), 7, 1.2);
  const food = clamp(30 + foodCore * 4.7 + craftCore * 2.0 + (g.bunker.systems.includes('теплица') ? 4 : 0), 0, 100);

  const envCore = diminishingPositive(Math.max(0, sum.env) * (focus.env ?? 1), 10, 1.1);
  const bodyCore = diminishingPositive(Math.max(0, sum.body), 9, 1.1);
  const environment = clamp(31 + envCore * 4.4 + bodyCore * 1.2, 0, 100);
  const physical = clamp(40 + bodyCore * 4.0 + diminishingPositive(Math.max(0, sum.power), 5, 1.2) * 1.8 - Math.abs(Math.min(0, sum.health)) * 2.5, 0, 100);

  const people = survivors.filter(p => {
    const value = p.cards.biology?.value || '';
    const v = value.match(/(Мужчина|Женщина),\s*(\d+)/i);
    return v && Number(v[2]) >= 18 && Number(v[2]) <= 45;
  });
  const men = people.filter(p => /^Мужчина/i.test(p.cards.biology.value)).length;
  const women = people.filter(p => /^Женщина/i.test(p.cards.biology.value)).length;
  const balancedWorkingAge = Math.min(men, women);
  // Демография — долгосрочный вторичный фактор, а не «суперспособность» отдельной карты.
  const workingAgeBase = clamp((people.length / Math.max(1, total)) * 55, 0, 55);
  const balance = clamp((balancedWorkingAge / Math.max(1, Math.ceil(total / 3))) * 25, 0, 25);
  const ageSpread = survivors.filter(p => /(?:19|20|23|24|29|31|36|38|42)/.test(p.cards.biology?.value || '')).length;
  const demographic = clamp(workingAgeBase + balance + (ageSpread >= Math.min(4,total) ? 10 : 0), 0, 100);

  // СИНЕРГИЯ: сначала покрытие разных задач, затем — небольшие бонусы за реальные связки.
  // Повторение одного и того же навыка имеет убывающую отдачу.
  const domainWeights = { tech:1.0, med:1.0, food:1.0, water:0.95, heat:0.90, env:0.95 };
  const targets = { tech:5.6, med:4.8, food:5.0, water:4.0, heat:3.2, env:4.2 };
  const coverage = {};
  Object.entries(targets).forEach(([domain,target]) => {
    const effective = diminishingPositive(Math.max(0, sum[domain]) * focus[domain] * domainWeights[domain], target * 1.5, 1.15);
    coverage[domain] = clamp(effective / (target * 0.72), 0, 1);
  });

  let covered = 0;
  Object.values(coverage).forEach(v => { if (v >= 0.62) covered += 1; });
  const strongCoverage = Object.values(coverage).filter(v => v >= 0.82).length;

  const pairRules = [
    ['food','water', 'пища + вода'],
    ['tech','heat', 'техника + тепло'],
    ['med','team', 'медицина + командная работа'],
    ['env','body', 'ориентирование + физическая выносливость'],
    ['food','craft', 'производство пищи + ремонт/изготовление'],
    ['tech','comms', 'техника + связь']
  ];
  let pairBonus = 0;
  const synergyReasons = [];
  pairRules.forEach(([a,b,label]) => {
    const aScore = diminishingPositive(Math.max(0, sum[a]), 6, 1.2);
    const bScore = diminishingPositive(Math.max(0, sum[b]), 6, 1.2);
    const pair = clamp(Math.min(aScore, bScore) / 5.0, 0, 1);
    const bonus = pair * 2.2;
    pairBonus += bonus;
    if (pair >= 0.52) synergyReasons.push(label);
  });

  // Разные люди полезнее одного «универсала»: считаем, сколько участников реально закрывают разные задачи.
  const contributors = {};
  Object.keys(targets).forEach(domain => {
    contributors[domain] = playerProfiles.filter(({profile}) => profile[domain] >= 1.05).length;
  });
  const diversityScore = Object.values(contributors).reduce((acc, count) => acc + Math.min(1.5, count * 0.55), 0);
  const specialistDiversity = clamp(diversityScore * 1.15, 0, 10);

  // Умеренные бонусы за соответствие системам именно этого бункера.
  const bunkerNeeds = bunkerNeedMap(g.bunker);
  let bunkerMatch = 0;
  bunkerNeeds.forEach(need => {
    const best = Math.max(...need.tags.map(t => coverage[t] || 0));
    bunkerMatch += best * 1.5;
    if (best >= 0.65) synergyReasons.push(`поддерживается система бункера: ${need.text}`);
  });
  bunkerMatch = clamp(bunkerMatch, 0, 8);

  const conflictPenalty = clamp(
    Math.abs(Math.min(0, sum.team)) * 2.8 + Math.abs(Math.min(0, sum.risk)) * 1.2,
    0, 10
  );

  const synergy = clamp(
    26 + covered * 5.2 + strongCoverage * 2.2 + pairBonus + specialistDiversity + bunkerMatch - conflictPenalty,
    0, 100
  );

  const weighted = resource*.18 + systems*.16 + medicine*.14 + teamwork*.13 + food*.12 + environment*.09 + physical*.05 + demographic*.08 + synergy*.05;
  const score = Math.round(clamp(weighted, 0, 100));

  let verdict = 'Низкая устойчивость';
  if (score >= 78) verdict = 'Высокая устойчивость';
  else if (score >= 56) verdict = 'Средняя устойчивость';

  const years = score >= 82 ? 40 : score >= 68 ? 25 : score >= 52 ? 12 : 5;
  const reasons = [];
  if (sum.tech < 4.0) reasons.push('технических навыков мало для спокойного обслуживания систем');
  if (sum.med < 3.8) reasons.push('медицинское покрытие группы ниже комфортного уровня');
  if (sum.food < 4.0) reasons.push('производство и сохранение пищи остаются уязвимыми');
  if (sum.water < 3.2) reasons.push('водная автономность требует особого внимания');
  if (covered >= 4) reasons.push('группа закрывает несколько ключевых задач, а не одну за счёт одного сильного персонажа');
  if (strongCoverage >= 3) reasons.push('несколько важных задач имеют устойчивое покрытие');
  if (pairBonus >= 5) reasons.push('есть несколько полезных связок навыков между разными характеристиками');
  if (synergy < 45) reasons.push('в составе есть пробелы между ключевыми задачами');
  if (conflictPenalty >= 5) reasons.push('часть характеристик снижает командную устойчивость');
  if (demographic >= 70) reasons.push('демографическая устойчивость состава относительно высокая');
  if (!reasons.length) reasons.push('результат определяется балансом ресурсов, навыков, бункера и состава');

  return {
    score, verdict, years,
    metrics: { resource, systems, medicine, teamwork, food, environment, physical, demographic, synergy },
    details: {
      men, women,
      survivors: survivors.length,
      foodMonths: Math.round(foodMonths),
      waterMonths: Math.round(waterMonths),
      covered,
      strongCoverage,
      conflictPenalty: Math.round(conflictPenalty),
      synergyReasons: [...new Set(synergyReasons)].slice(0, 8),
      contributors,
      reasons
    }
  };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function phaseLabel(g) {
  return ({ lobby:'Лобби', turns:'Ходы и раскрытие', discussion:'Общее обсуждение', speeches:'Речи', vote:'Голосование', defense:'Оправдание', farewell:'Прощальная речь', final:'Финал' })[g.currentPhase] || g.currentPhase;
}

function startTimer(seconds) {
  if (!state.isHost) return;
  const g = state.game;
  g.timeLeft = seconds;
  g.timerRunning = true;
  clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (!state.game || !state.game.timerRunning) return;
    state.game.timeLeft = Math.max(0, state.game.timeLeft - 1);
    if (state.game.timeLeft === 0) {
      state.game.timerRunning = false;
      clearInterval(timerHandle);
      autoAdvanceTimerPhase();
    }
    syncAndRender();
  }, 1000);
  syncAndRender();
}
function stopTimer() { if (!state.isHost) return; state.game.timerRunning = false; clearInterval(timerHandle); syncAndRender(); }
function autoAdvanceTimerPhase() {
  const g = state.game;
  if (g.currentPhase === 'discussion') beginSpeeches();
  else if (g.currentPhase === 'speeches') nextSpeech();
  else if (g.currentPhase === 'defense') finishDefense();
  else if (g.currentPhase === 'farewell') finishFarewell();
  else if (g.currentPhase === 'vote') finishVote();
}

function sanitizeForPeer(g, playerId) {
  const clone = structuredClone(g);
  clone.players = clone.players.map(p => {
    if (p.id === playerId) return p;
    const q = { ...p, cards: {} };
    for (const [type] of CARD_TYPES) {
      if (p.revealed.includes(type) || p.bunkered) q.cards[type] = { type, value: p.cards[type].value, mods: {} };
      else q.cards[type] = { type, value: 'Скрыто', mods: {} };
    }
    return q;
  });
  return clone;
}

function broadcast() {
  if (!state.isHost) return;
  for (const [peerId] of state.connections) {
    const conn = state.connections.get(peerId);
    if (conn?.open) conn.send({ type: 'state', game: sanitizeForPeer(state.game, state.game.players.find(p=>p.connected && p.peerId===peerId)?.id || null) });
  }
}

function sendStateToAll() {
  if (!state.isHost) return;
  // Per-connection state uses conn.metadata.playerId; fallback to room state.
  for (const conn of state.connections.values()) {
    if (!conn?.open) continue;
    const playerId = conn.metadata?.playerId || null;
    conn.send({ type: 'state', game: sanitizeForPeer(state.game, playerId) });
  }
}

function syncAndRender() {
  render();
  if (state.isHost) sendStateToAll();
}

function attachHostConnection(conn) {
  conn.on('open', () => {
    state.connections.set(conn.peer, conn);
    conn.send({ type: 'hello', roomCode: state.roomCode, game: sanitizeForPeer(state.game, null) });
    setBadge(`комната ${state.roomCode}`, true);
    render();
  });
  conn.on('data', msg => handleHostMessage(conn, msg));
  conn.on('close', () => { state.connections.delete(conn.peer); if (state.game) render(); });
  conn.on('error', e => console.warn(e));
}

function handleHostMessage(conn, msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.action === 'join') {
    const pid = state.game?.players.find(p => p.id === msg.playerId);
    if (pid) {
      pid.connected = true;
      pid.ready = true;
      pid.peerId = conn.peer;
      conn.metadata = { ...(conn.metadata || {}), playerId: pid.id };
      state.game.log.push(`${pid.name} подключился.`);
      conn.send({ type:'state', game: sanitizeForPeer(state.game, pid.id) });
      syncAndRender();
    }
    return;
  }
  switch (msg.action) {
    case 'reveal': revealCard(msg.playerId, msg.type); break;
    case 'finishTurn': finishTurn(); break;
    case 'vote': castVote(msg.voterId, msg.targetId); break;
    case 'skipChoice': setSkipChoice(msg.voterId, msg.enabled); break;
    case 'skipVote': skipVotingRoundOne(); break;
    case 'timerStart': startTimer(msg.seconds); break;
    case 'timerStop': stopTimer(); break;
    case 'discussionStart': beginDiscussion(); break;
    case 'speechesStart': beginSpeeches(); break;
    case 'nextSpeech': nextSpeech(); break;
    case 'startVote': beginVote(); break;
    case 'finishVote': finishVote(); break;
    case 'finishDefense': finishDefense(); break;
    case 'finishFarewell': finishFarewell(); break;
    default: break;
  }
}

function sendToHost(action) {
  const conn = state.pendingHost;
  if (conn?.open) conn.send(action);
}

function createHost(name, playerCount, leaderMode) {
  state.isHost = true;
  state.isLeader = leaderMode;
  state.roomCode = makeRoomCode();
  state.hostId = `bunker-${state.roomCode}`;
  state.myName = name.trim() || 'Ведущий';
  const peer = new Peer(state.hostId);
  state.peer = peer;
  setBadge('создаём комнату…');
  peer.on('open', () => {
    const playerNames = leaderMode ? [] : [state.myName];
    state.game = createGame({ playerCount, leaderMode }, playerNames, leaderMode ? null : 0);
    state.game.capacity = bunkerSlots(playerCount);
    if (leaderMode) state.game.players.forEach(p => { p.connected = false; });
    state.game.players.forEach(p => p.ready = true);
    state.myPlayerId = leaderMode ? null : state.game.players[0].id;
    state.mode = 'lobby';
    const url = new URL(location.href);
    url.search = `?room=${encodeURIComponent(state.roomCode)}`;
    history.replaceState(null, '', url);
    setBadge(`комната ${state.roomCode}`, true);
    render();
    toast('Комната создана. Отправьте ссылку друзьям.');
  });
  peer.on('connection', attachHostConnection);
  peer.on('error', err => {
    console.error(err);
    setBadge('ошибка подключения');
    toast('Не удалось создать комнату. Обновите страницу.');
  });
}

function joinRoom(roomCode, name) {
  const hostId = `bunker-${roomCode}`;
  state.isHost = false;
  state.hostId = hostId;
  state.roomCode = roomCode;
  state.myName = name.trim();
  state.mode = 'joining';
  setBadge(`подключение к ${roomCode}…`);
  const peer = new Peer();
  state.peer = peer;
  peer.on('open', myId => {
    state.myId = myId;
    const conn = peer.connect(hostId, { reliable: true });
    state.pendingHost = conn;
    conn.on('open', () => {
      setBadge(`комната ${roomCode}`, true);
      render();
      // A blank join request lets the host show lobby. The player slot is assigned by name.
      conn.send({ action:'joinLobby', name: state.myName, peerId: myId });
    });
    conn.on('data', msg => handleClientMessage(msg));
    conn.on('close', () => { setBadge('хост отключился'); toast('Хост закрыл комнату.'); });
    conn.on('error', err => { console.error(err); toast('Ошибка связи с комнатой.'); });
  });
  peer.on('error', err => { console.error(err); setBadge('ошибка связи'); toast('Не удалось подключиться. Проверьте ссылку.'); });
}

function handleClientMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'hello') {
    // Old state is only temporary; after lobby assignment, host sends the real state.
    state.game = msg.game;
    render();
    if (state.pendingHost) state.pendingHost.send({ action:'joinLobby', name: state.myName, peerId: state.myId });
    return;
  }
  if (msg.type === 'assigned') {
    state.myPlayerId = msg.playerId;
    if (state.pendingHost) state.pendingHost.send({ action:'join', playerId: msg.playerId });
    return;
  }
  if (msg.type === 'state') {
    state.game = msg.game;
    state.mode = state.game.status === 'finished' ? 'game' : 'game';
    render();
  }
}

function handleHostJoinLobby(conn, msg) {
  if (!state.isHost || !state.game || msg?.action !== 'joinLobby') return false;
  const free = state.game.players.find(p => !p.connected && !p.hostPlayer && p.name === msg.name) ||
               state.game.players.find(p => !p.connected && !p.hostPlayer);
  if (!free) {
    conn.send({ type:'error', message:'Мест больше нет.' });
    return true;
  }
  free.name = msg.name || free.name;
  free.peerId = conn.peer;
  free.connected = true;
  conn.metadata = { playerId: free.id };
  conn.send({ type:'assigned', playerId: free.id });
  conn.send({ type:'state', game: sanitizeForPeer(state.game, free.id) });
  state.connections.set(conn.peer, conn);
  state.game.log.push(`${free.name} вошёл в комнату.`);
  syncAndRender();
  return true;
}

// Patch host message handler to support lobby join before game actions.
const originalHostMessage = handleHostMessage;
handleHostMessage = function(conn, msg) {
  if (handleHostJoinLobby(conn, msg)) return;
  originalHostMessage(conn, msg);
};

function buildSetupHtml() {
  const room = getRoomFromUrl();
  return `
    <section class="hero">
      <div class="phase">простая браузерная версия</div>
      <h1>БУНКЕР</h1>
      <p>6–15 игроков. Сначала получаете случайного персонажа, затем по раундам открываете выбранные характеристики, обсуждаете состав и голосуете, кто останется снаружи.</p>
    </section>
    <div style="height:14px"></div>
    ${room ? `
      <section class="panel">
        <h2>Войти в комнату ${esc(room)}</h2>
        <div class="grid two">
          <div>
            <label>Ваше имя</label>
            <input id="joinName" placeholder="Например, Ахмад" maxlength="28" />
          </div>
          <div style="display:flex;align-items:end">
            <button class="btn primary" style="width:100%" onclick="uiJoin()">Войти</button>
          </div>
        </div>
        <p class="small" style="margin-top:12px">Ссылка комнаты уже содержит код. Просто отправьте её друзьям.</p>
      </section>
      <div style="height:14px"></div>
    ` : ''}
    <section class="panel">
      <div class="grid two">
        <div>
          <h2>Создать игру</h2>
          <label>Ваше имя</label>
          <input id="hostName" placeholder="Например, Али" maxlength="28" />
          <div style="height:10px"></div>
          <label>Количество игроков</label>
          <select id="playerCount">
            ${Array.from({length:10}, (_,i)=>i+6).map(n => `<option value="${n}">${n}</option>`).join('')}
          </select>
          <div style="height:10px"></div>
          <label>Формат</label>
          <select id="leaderMode">
            <option value="false">Без отдельного ведущего</option>
            <option value="true">С ведущим (создатель не играет)</option>
          </select>
          <div style="height:14px"></div>
          <button class="btn primary" onclick="uiCreate()">Создать комнату</button>
        </div>
        <div class="notice">
          <strong>Что здесь работает</strong>
          <p class="small" style="margin:8px 0 0">Выбор характеристики для открытия, обязательная профессия в 1-м раунде, 2 минуты общего обсуждения, 30 секунд речей, 2 минуты живого голосования, 70% порог, оправдание и повторное голосование, пропуск первого голосования и два исключения в следующем раунде.</p>
        </div>
      </div>
    </section>
  `;
}

function renderLobby() {
  const g = state.game;
  const connected = g.players.filter(p => p.connected).length;
  const required = g.settings.playerCount;
  APP.innerHTML = `
    <div class="tabs"><div class="tab active">Лобби</div><div class="tab">${connected}/${required}</div></div>
    <div class="grid two">
      <section class="panel">
        <div class="row space"><h2>Комната ${esc(state.roomCode)}</h2><button class="btn" onclick="copyRoomLink()">Скопировать ссылку</button></div>
        <p class="small">Попросите друзей открыть эту ссылку. Нажмите «Начать», когда все на месте.</p>
        <div class="notice" style="margin:12px 0">Мест в бункере: <strong>${g.capacity}</strong> из ${required} игроков.</div>
        <div class="player-list">
          ${g.players.map((p,i)=>`<div class="player"><div class="dot ${p.connected?'on':''}"></div><div><strong>${esc(p.name)}</strong><div class="small">${p.hostPlayer?'создатель':''}</div></div><div class="small">${p.connected?'в сети':'ожидает'}</div></div>`).join('')}
        </div>
      </section>
      <section class="panel">
        <h3>Как будет идти партия</h3>
        <div class="metric"><span>Катастрофа</span><strong>случайно</strong></div>
        <div class="metric"><span>Бункер</span><strong>случайно</strong></div>
        <div class="metric"><span>Карты персонажа</span><strong>11</strong></div>
        <div class="metric"><span>Спецусловия</span><strong>нет</strong></div>
        <div style="height:14px"></div>
        ${state.isHost ? `<button class="btn primary" style="width:100%" ${connected < required ? 'disabled':''} onclick="uiStartGame()">Начать игру</button>` : '<div class="notice">Ждём, пока создатель запустит игру.</div>'}
      </section>
    </div>
  `;
}

function renderGame() {
  const g = state.game;
  if (g.status === 'finished' || g.currentPhase === 'final') return renderFinal();
  const me = localPlayer();
  const current = currentTurnPlayer();
  const quota = revealQuota(g.settings.playerCount, g.round || 1);
  const canAct = me && current?.id === me.id && g.currentPhase === 'turns' && !me.eliminated;
  const myRemaining = me ? remainingCardTypes(me) : [];

  APP.innerHTML = `
    <div class="tabs">
      <div class="tab active">Раунд ${g.round}</div>
      <div class="tab">${phaseLabel(g)}</div>
      <div class="tab">Мест: ${g.capacity}</div>
      ${g.currentRoundEliminationTarget === 2 ? '<div class="tab">двойное исключение</div>' : ''}
    </div>

    <section class="panel">
      <div class="grid two">
        <div>
          <div class="phase">Катастрофа</div>
          <h2>${esc(g.catastrophe.title)}</h2>
          <p class="muted">${esc(g.catastrophe.desc)}</p>
        </div>
        <div>
          <div class="phase">Бункер</div>
          <h2>${esc(g.bunker.title)}</h2>
          <p class="muted">${esc(g.bunker.desc)}</p>
          <div class="grid three" style="margin-top:10px">
            <div class="notice"><strong>${g.bunker.food}</strong><div class="small">мес. еды</div></div>
            <div class="notice"><strong>${g.bunker.water}</strong><div class="small">мес. воды</div></div>
            <div class="notice"><strong>${g.bunker.energy}%</strong><div class="small">энергия</div></div>
          </div>
        </div>
      </div>
    </section>

    <div style="height:14px"></div>

    ${renderPhase(g, me, current, quota, canAct, myRemaining)}

    <div style="height:14px"></div>
    <section class="panel">
      <div class="row space"><h3>Игроки</h3><span class="small">зелёная точка — в сети</span></div>
      <div class="player-list">${g.players.map(p => renderPlayerRow(p)).join('')}</div>
    </section>

    <div style="height:14px"></div>
    <section class="panel">
      <h3>Моя карточка</h3>
      ${me ? renderMyCards(me, quota) : '<p class="muted">Режим ведущего: персонажа нет.</p>'}
    </section>

    <div style="height:14px"></div>
    <section class="panel">
      <h3>Журнал</h3>
      <div class="small">${g.log.slice(-8).map(x => `<div style="padding:5px 0;border-bottom:1px dashed var(--line)">${esc(x)}</div>`).join('')}</div>
    </section>

    ${state.isHost ? `<div class="sticky-action"><section class="panel"><div class="row space"><div><strong>Панель создателя</strong><div class="small">Ты можешь вести таймеры и переключать этапы.</div></div>${hostControls(g, current)}</div></section></div>` : ''}
  `;
}

function renderPhase(g, me, current, quota, canAct, myRemaining) {
  if (g.currentPhase === 'turns') {
    const p = current;
    const remaining = p ? Math.max(0, quota - (p.revealsThisRound || 0)) : 0;
    return `<section class="panel">
      <div class="row space">
        <div><div class="phase">Сейчас ходит</div><h2>${p ? esc(p.name) : '—'}</h2></div>
        <div class="center"><div class="small">открыто в этом раунде</div><strong>${p?.revealsThisRound || 0} / ${quota}</strong></div>
      </div>
      ${g.round === 1 ? '<div class="notice" style="margin:10px 0">Профессия уже открыта автоматически. В этом ходу игрок выбирает ещё 2 характеристики.</div>' : '<div class="notice" style="margin:10px 0">В свой ход игрок сам выбирает нужное количество оставшихся характеристик.</div>'}
      ${p && p.id === me?.id && canAct ? renderChooseCard(p, myRemaining, remaining) : '<p class="muted">Когда дойдёт ваша очередь, здесь появятся кнопки выбора.</p>'}
    </section>`;
  }
  if (g.currentPhase === 'discussion') return `<section class="panel center"><div class="phase">Общее обсуждение</div><div class="timer">${formatTime(g.timeLeft)}</div><p class="muted">2 минуты общего обсуждения. Можно свободно обсуждать полезность персонажей.</p>${g.timerRunning ? '' : `<button class="btn primary" onclick="uiTimer(120)">Запустить 120 сек</button>`}</section>`;
  if (g.currentPhase === 'speeches') {
    const p = orderedActive()[g.currentSpeechIndex];
    return `<section class="panel center"><div class="phase">Речь игрока</div><h2>${p ? esc(p.name) : '—'}</h2><div class="timer">${formatTime(g.timeLeft)}</div><p class="muted">30 секунд на обвинительную или оправдательную речь. Нераскрытые характеристики называть нельзя.</p></section>`;
  }
  if (g.currentPhase === 'defense') {
    const p = playerById(g.defenseQueue[0]);
    return `<section class="panel center"><div class="phase">Оправдание</div><h2>${p ? esc(p.name) : '—'}</h2><div class="timer">${formatTime(g.timeLeft)}</div><p class="muted">30 секунд. Нельзя объявлять характеристики, которые ещё не были раскрыты.</p></section>`;
  }
  if (g.currentPhase === 'farewell') {
    const p = playerById(g.currentFarewellPlayerId);
    return `<section class="panel center"><div class="phase">Прощальная речь</div><h2>${p ? esc(p.name) : '—'}</h2><div class="timer">${formatTime(g.timeLeft)}</div><p class="muted">15 секунд на прощание. После этого игрок окончательно покидает временный лагерь.</p></section>`;
  }
  if (g.currentPhase === 'vote') {
    const myVote = me?.vote || null;
    const everyone = activePlayers();
    const votedCount = Object.keys(g.votes || {}).length;
    const skipChoice = !!g.skipChoices?.[state.myPlayerId];
    const skipAvailable = g.round === 1 && g.voteRound === 1 && !g.skipUsed;
    return `<section class="panel"><div class="row space"><div><div class="phase">Голосование ${g.voteRound > 1 ? '(повторное)' : ''}</div><h2>Кого исключаем?</h2></div><div class="center"><div class="timer" style="font-size:34px">${formatTime(g.timeLeft)}</div></div></div>
      <div class="notice success"><strong>2 минуты · живое голосование</strong><div class="small" style="margin-top:5px">Пока таймер идёт, можно обсуждать, защищаться и менять свой голос. Нераскрытые характеристики нельзя объявлять вслух. Нажатие «Завершить голосование» фиксирует результат.</div></div>
      <div class="row space" style="margin:12px 0"><span class="small">Проголосовали: <strong>${votedCount}/${everyone.length}</strong></span>${votedCount===everyone.length ? '<span class="small">Все проголосовали — можно завершить раньше.</span>' : ''}</div>
      ${me && !me.eliminated ? `<div class="vote-grid">${everyone.map(p => `<label class="vote-option"><input type="radio" name="vote" value="${esc(p.id)}" ${myVote===p.id?'checked':''} onchange="uiVote('${p.id}')" /> <span>${esc(p.name)}</span></label>`).join('')}</div>` : '<div class="notice">Режим ведущего или вы уже выбыли.</div>'}
      ${skipAvailable && me && !me.eliminated ? `<div class="vote-skip"><div><strong>Вариант первого раунда: пропуск</strong><div class="small">Если за пропуск наберётся больше половины игроков, никто не выбывает, а в следующем раунде исключаются два человека.</div></div><button class="btn ${skipChoice?'primary':''}" onclick="uiSkipChoice(${skipChoice?'false':'true'})">${skipChoice?'✓ Я за пропуск':'Я за пропуск'}</button></div>` : ''}
    </section>`;
  }
  return '';
}

function renderChooseCard(p, types, remaining) {
  return `<div class="grid cards">
    ${types.map(type => `<div class="card hidden"><div class="card-head">${CARD_NAMES[type]}</div><div class="card-body"><strong>Скрыто</strong><p>Нажмите, чтобы открыть эту характеристику.</p></div><button class="btn primary reveal-btn" onclick="uiReveal('${type}')">Открыть</button></div>`).join('')}
    <div class="notice" style="grid-column:1/-1">Осталось открыть: <strong>${remaining}</strong></div>
    <button class="btn success" ${remaining>0?'disabled':''} onclick="uiFinishTurn()">Закончить ход</button>
  </div>`;
}

function renderMyCards(p, quota) {
  return `<div class="grid cards">
    ${CARD_TYPES.map(([type]) => {
      const open = p.revealed.includes(type) || p.bunkered;
      const card = p.cards[type];
      return `<div class="card ${open?'':'hidden'}"><div class="card-head">${CARD_NAMES[type]}</div><div class="card-body"><strong>${open ? esc(card.value) : 'Скрыто'}</strong><p>${open ? cardDescription(type, card) : 'Эту карточку увидит только игрок до раскрытия.'}</p></div></div>`;
    }).join('')}
  </div>`;
}
function cardDescription(type, card) {
  if (type==='profession') return 'Профессия — основной параметр знакомства.';
  if (type==='biology') return 'Пол и возраст используются только как абстрактный демографический параметр финальной симуляции.';
  return 'Карта помогает оценивать полезность персонажа в конкретном бункере и катастрофе.';
}
function renderPlayerRow(p) {
  const status = p.eliminated ? 'выбыл' : p.bunkered ? 'в бункере' : p.connected ? 'в лагере' : 'не в сети';
  const opened = p.revealed.map(t => CARD_NAMES[t]).join(', ') || 'ничего';
  return `<div class="player"><div class="dot ${p.eliminated?'out':p.connected?'on':''}"></div><div><strong>${esc(p.name)}</strong><div class="small">${status} · открыто: ${esc(opened)}</div></div><div class="small">${p.hostPlayer?'создатель':''}</div></div>`;
}

function hostControls(g, current) {
  if (g.currentPhase === 'turns') return `<button class="btn" onclick="uiFinishTurn()">${current ? 'Завершить ход' : '—'}</button>`;
  if (g.currentPhase === 'discussion') return `<div class="row"><button class="btn primary" onclick="uiTimer(120)">Старт 120 сек</button><button class="btn" onclick="uiSpeechesStart()">К речам</button></div>`;
  if (g.currentPhase === 'speeches') return `<div class="row"><button class="btn" onclick="uiTimer(30)">30 сек</button><button class="btn primary" onclick="uiNextSpeech()">Следующий</button></div>`;
  if (g.currentPhase === 'defense') return `<div class="row"><button class="btn" onclick="uiTimer(30)">30 сек</button><button class="btn primary" onclick="uiFinishDefense()">Дальше</button></div>`;
  if (g.currentPhase === 'farewell') return `<div class="row"><button class="btn" onclick="uiTimer(15)">15 сек</button><button class="btn primary" onclick="uiFinishFarewell()">Завершить речь</button></div>`;
  if (g.currentPhase === 'vote') return `<div class="row"><button class="btn" onclick="uiTimer(120)">120 сек</button><button class="btn primary" onclick="uiFinishVote()">Завершить голосование</button></div>`;
  return '';
}

function renderFinal() {
  const g = state.game;
  const r = g.finalReport || calculateFinalReport();
  const survivors = inBunkerPlayers();
  const synergyReasons = r.details.synergyReasons?.length
    ? r.details.synergyReasons.map(x => `<div style="padding:6px 0;border-bottom:1px dashed var(--line)">• ${esc(x)}</div>`).join('')
    : '<div class="small">Ярко выраженных дополнительных связок не обнаружено.</div>';
  APP.innerHTML = `
    <section class="hero"><div class="phase">финал</div><h1>${r.score}/100</h1><p>${esc(r.verdict)} · ориентировочный игровой прогноз: около ${r.years} лет устойчивой автономной жизни.</p></section>
    <div style="height:14px"></div>
    <div class="grid two">
      <section class="panel"><h2>Кто в бункере</h2><div class="player-list">${survivors.map(p=>`<div class="player"><div class="dot on"></div><div><strong>${esc(p.name)}</strong><div class="small">в бункере</div></div><div></div></div>`).join('')}</div></section>
      <section class="panel"><h2>Почему такой результат</h2>
        ${Object.entries(r.metrics).map(([k,v])=>`<div class="metric"><span>${metricName(k)}</span><strong>${Math.round(v)}/100</strong></div>`).join('')}
      </section>
    </div>
    <div style="height:14px"></div>
    <section class="panel"><h2>Синергия состава</h2>
      <p class="small">Синергия не складывает все бонусы напрямую. Основной вклад дают разные люди, закрывающие разные задачи; повтор одинакового навыка постепенно даёт меньше пользы.</p>
      <div class="metric"><span>Ключевых задач закрыто</span><strong>${r.details.covered}/6</strong></div>
      <div class="metric"><span>Задач с устойчивым покрытием</span><strong>${r.details.strongCoverage}/6</strong></div>
      <div class="metric"><span>Разброс по участникам и задачам</span><strong>${Math.round(Math.min(100, r.metrics.synergy))}/100</strong></div>
      <div style="height:8px"></div>
      <div class="small"><strong>Что сработало:</strong></div>
      <div style="margin-top:4px">${synergyReasons}</div>
    </section>
    <div style="height:14px"></div>
    <section class="panel"><h2>Демографическая устойчивость</h2><p class="muted">Это условный игровой показатель для долгосрочной симуляции. Он учитывает только возрастно-половой состав группы и не заменяет медицинский или демографический прогноз.</p><div class="metric"><span>Мужчины трудоспособного возраста</span><strong>${r.details.men}</strong></div><div class="metric"><span>Женщины трудоспособного возраста</span><strong>${r.details.women}</strong></div><div class="metric"><span>Запас еды с учётом навыков</span><strong>≈ ${r.details.foodMonths} мес.</strong></div><div class="metric"><span>Запас воды с учётом навыков</span><strong>≈ ${r.details.waterMonths} мес.</strong></div></section>
    <div style="height:14px"></div>
    <section class="panel"><h2>Что повлияло на результат</h2><div class="small">${r.details.reasons.map(x=>`<div style="padding:6px 0;border-bottom:1px dashed var(--line)">• ${esc(x)}</div>`).join('')}</div></section>
    <div style="height:14px"></div>
    <section class="panel"><h2>Все характеристики выживших</h2><div class="grid cards">${survivors.flatMap(p=>CARD_TYPES.map(([t])=>`<div class="card"><div class="card-head">${esc(p.name)} · ${CARD_NAMES[t]}</div><div class="card-body"><strong>${esc(p.cards[t].value)}</strong><p>${cardDescription(t,p.cards[t])}</p></div></div>`)).join('')}</div></section>
  `;
}

function metricName(k) { return ({ resource:'Ресурсы', systems:'Техника и энергия', medicine:'Медицина', teamwork:'Командная работа', food:'Производство пищи', environment:'Среда и автономность', demographic:'Демографическая устойчивость', physical:'Физическая устойчивость', synergy:'Синергия состава' })[k] || k; }
function formatTime(s) { const m = Math.floor(Math.max(0,s)/60); const sec = Math.max(0,s)%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

function render() {
  if (state.mode === 'start' || state.mode === 'joining') { APP.innerHTML = buildSetupHtml(); return; }
  if (!state.game) { APP.innerHTML = buildSetupHtml(); return; }
  if (state.game.status === 'lobby') { renderLobby(); return; }
  renderGame();
}

window.uiCreate = () => {
  const name = document.getElementById('hostName')?.value || '';
  const count = Number(document.getElementById('playerCount')?.value || 6);
  const leader = document.getElementById('leaderMode')?.value === 'true';
  if (!name.trim()) return toast('Введите имя.');
  createHost(name, count, leader);
};
window.uiJoin = () => {
  const name = document.getElementById('joinName')?.value || '';
  if (!name.trim()) return toast('Введите имя.');
  joinRoom(getRoomFromUrl(), name);
};
window.uiReveal = type => revealCard(state.myPlayerId, type);
window.uiFinishTurn = () => {
  if (state.isHost) finishTurn(); else sendToHost({ action:'finishTurn' });
};
window.uiVote = targetId => castVote(state.myPlayerId, targetId);
window.uiSkipChoice = enabled => setSkipChoice(state.myPlayerId, enabled);
window.uiSkipVote = () => skipVotingRoundOne();
window.uiTimer = seconds => { if (state.isHost) startTimer(seconds); else sendToHost({ action:'timerStart', seconds }); };
window.uiSpeechesStart = () => { if (state.isHost) beginSpeeches(); else sendToHost({ action:'speechesStart' }); };
window.uiNextSpeech = () => { if (state.isHost) nextSpeech(); else sendToHost({ action:'nextSpeech' }); };
window.uiFinishVote = () => { if (state.isHost) finishVote(); else sendToHost({ action:'finishVote' }); };
window.uiFinishDefense = () => { if (state.isHost) finishDefense(); else sendToHost({ action:'finishDefense' }); };
window.uiFinishFarewell = () => { if (state.isHost) finishFarewell(); else sendToHost({ action:'finishFarewell' }); };
window.uiStartGame = () => {
  if (!state.isHost) return;
  if (state.game.players.filter(p=>p.connected).length < state.game.settings.playerCount) return toast('В лобби не хватает игроков.');
  state.game.log.push(`Катастрофа: ${state.game.catastrophe.title}. Бункер: ${state.game.bunker.title}.`);
  state.game.currentRoundEliminationTarget = 1;
  startRound(1);
};
window.copyRoomLink = async () => {
  const url = location.href;
  try { await navigator.clipboard.writeText(url); toast('Ссылка скопирована.'); }
  catch { prompt('Скопируйте ссылку:', url); }
};

// Lobby connections need to be accepted before general host message handling.
// We attach a small wrapper by replacing the function called by PeerJS callbacks above.

render();
