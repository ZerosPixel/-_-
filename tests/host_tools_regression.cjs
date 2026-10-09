const path = require('path');
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const el = () => ({ innerHTML:'', textContent:'', value:'', disabled:false, style:{}, classList:{add(){},remove(){}}, addEventListener(){}, removeEventListener(){}, setAttribute(){}, appendChild(){}, isConnected:true });
const elements = {app:el(), connectionBadge:el(), toast:el()};
const storage = new Map();
const sandbox = {
  console,
  Math,
  Date,
  JSON,
  Map,
  Set,
  Object,
  Array,
  Number,
  String,
  RegExp,
  Intl,
  URL,
  URLSearchParams,
  Promise,
  structuredClone: global.structuredClone,
  crypto: { randomUUID: () => 'test-client-id' },
  document: { getElementById: id => elements[id] || (elements[id]=el()), addEventListener(){}, visibilityState:'visible', querySelectorAll(){ return []; } },
  window: {},
  navigator: { userAgent:'node-test', clipboard:{writeText: async()=>{} } },
  location: { href:'http://localhost/', search:'' },
  history: { replaceState(){} },
  localStorage: { getItem:k=>storage.get(k)||null, setItem:(k,v)=>storage.set(k,String(v)) },
  setTimeout: (fn,ms)=>({fn,ms}),
  clearTimeout: ()=>{},
  setInterval: ()=>1,
  clearInterval: ()=>{},
  prompt: ()=>{},
  confirm: ()=>true
};
const src = fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8') + `\n;globalThis.__t = {state, DECK, CARD_TYPES, CARD_NAMES, BUNKER_EVENTS, createGame, assignUniqueItemCards, returnToLobby, beginVote, beginDiscussion, lockVote, castVote, setSkipChoice, canSkipCurrentVote, revealCard, finishTurn, handleHostJoinLobby, handleHostMessage, fillTestBots, addTestBot, removeTestBots, startRound, hostForceFinishTurn, resolveBunkerProblemsAtFinal, calculateFinalReport, kickPlayer, autoVoteForBots, hostBotVote, finishGame, activePlayers, currentTurnPlayer, revealQuota, playerDomainProfile, analyzeInfectionRisk, finalOutcome, finalEpilogue, renderFinal, startTimer, stopTimer, refreshTimerDisplay, beginSpeeches, nextSpeech, playerTwistStories, hostBotSkipChoice, autoSkipChoiceForBots, finishVote, rerollBotVotes, renderPhase, renderBunkerPanel, describeBunkerSituation, describeCatastrophePressure};`;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, {timeout:5000});
const t = sandbox.__t;
const realSyncAndRender = sandbox.syncAndRender;
const results=[];
function test(name, fn) {
  try { fn(); results.push({name, ok:true}); console.log('PASS', name); }
  catch (error) { results.push({name, ok:false, error:String(error.stack||error)}); console.error('FAIL', name, error); }
}
function resetGame(n=6) {
  t.state.isHost=true;
  t.state.mode='lobby';
  t.state.game=t.createGame({playerCount:n}, ['Хост', ...Array.from({length:n-1},(_,i)=>`Игрок ${i+1}`)], 0);
  t.state.game.players.forEach((p,i)=>{p.connected=true;p.ready=true;p.occupied=true;p.bot=i>0;p.hostPlayer=i===0;p.slot=i+1;});
  t.state.myPlayerId=t.state.game.players[0].id;
  t.state.game.capacity=Math.floor(n/2);
}
test('online transport uses WebSockets instead of PeerJS/WebRTC',()=>{
  const transport=fs.readFileSync(path.join(__dirname,'..','transport.js'),'utf8');
  const server=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
  const index=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert(transport.includes('new WebSocket(socketUrl())'));
  assert(server.includes("pathname !== '/ws'"));
  assert(index.includes('transport.js?v=20261009-bunker17'));
  assert(!index.includes('peerjs@'));
  assert(!transport.includes('RTCPeerConnection'));
});

test('Automatic recovery keeps the existing game screen instead of switching to the join page',()=>{
  const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  assert(app.includes("joinRoom(state.roomCode, state.myName, { silent: state.mode === 'game' && !!state.game })"));
  assert(app.includes("const silentReconnect = options?.silent === true && state.mode === 'game' && !!state.game && !state.isHost"));
  assert(app.includes("if (!silentReconnect) render();"));
  assert(app.includes("if (state.mode !== 'game') render();"));
  assert(app.includes("const activeGameRecovery = state.mode === 'game' && !!state.game"));
  assert(app.includes("if (state.autoRejoinCount >= MAX_AUTO_REJOIN && !activeGameRecovery) return false"));
});

test('Bunker resources and systems render as narrative prose, not metric tiles or progress bars',()=>{
  resetGame(6);
  const g=t.state.game;
  const html=t.renderBunkerPanel(g);
  const prose=t.describeBunkerSituation(g);
  assert(!html.includes('bunker-resource-grid'));
  assert(!html.includes('bunker-meter'));
  assert.match(prose.supplies,/еды|продовольственный запас/);
  assert.match(prose.supplies,/воды|водный запас/);
  assert.match(prose.systems,/Вентиляция/);
  assert.match(prose.systems,/электросистема/);
  assert.match(prose.systems,/восстановление воды/);
  assert.match(prose.systems,/производство пищи/);
  assert(!prose.systems.includes('/100'));
  assert(!prose.supplies.includes('%'));
  assert(!prose.supplies.includes('/100'));
});
test('Catastrophe summary explains scenario pressures in plain language',()=>{
  resetGame(6);
  t.state.game.catastrophe={title:'Жёсткая ядерная зима',scenarioTags:['cold','ash'],foodNeed:1.25,heatNeed:1.35,envNeed:1.2,techNeed:1.1,medicalNeed:1.05};
  const text=t.describeCatastrophePressure(t.state.game);
  assert.match(text,/Холод увеличивает потребность в тепле/);
  assert.match(text,/Пыль и загрязнение повышают нагрузку/);
  assert.match(text,/расход пищи будет повышен|расход пищи будет значительно выше обычного/);
  assert.match(text,/нагрузка на обогрев будет значительно выше обычной/);
});
test('Long-experience fact does not predetermine the character profession',()=>{
  assert(t.DECK.fact.some(([value])=>/30-летний стаж в своей области/.test(value)));
  assert(!t.DECK.fact.some(([value])=>/Электрик с 30-летним стажем/.test(value)));
});

test('Fill bot lobby reaches six participants',()=>{
  resetGame(1);
  t.state.game.players=t.state.game.players.slice(0,1);
  t.fillTestBots();
  assert.equal(t.state.game.players.length,6);
  assert.equal(t.state.game.players.filter(p=>p.bot).length,5);
  assert(t.state.game.players.every(p=>p.connected&&p.ready));
});
test('Host force-finish reveals up to two random hidden characteristics and advances turn',()=>{
  resetGame(6);
  t.state.game.status='playing';
  t.state.game.currentPhase='turns';
  t.state.game.round=1;
  t.state.game.settings.playerCount=6;
  t.state.game.players.forEach(p=>{p.revealed=['profession'];p.revealsThisRound=1;p.lastRevealRound=1;});
  t.state.game.currentTurnIndex=0;
  const p=t.currentTurnPlayer();
  t.hostForceFinishTurn();
  assert.equal(p.revealed.length,3);
  assert.equal(t.state.game.currentTurnIndex,1);
});
test('Normal turn button stays disabled until every allowed card is revealed, then becomes active',()=>{
  resetGame(6);
  const g=t.state.game;
  g.status='playing';g.currentPhase='turns';g.round=1;g.settings.playerCount=6;g.currentTurnIndex=0;
  g.players.forEach(p=>{p.revealed=['profession'];p.revealsThisRound=1;p.lastRevealRound=1;});
  const quota=t.revealQuota(6,1), me=g.players[0], current=t.currentTurnPlayer();
  let html=t.renderPhase(g,me,current,quota,true,[]);
  assert(html.includes('class="btn finish-turn-btn " onclick="uiFinishTurn()" disabled>Закончить ход'));
  assert(html.includes('class="turn-finish-hint " >Откройте ещё 2 характеристики, чтобы закончить ход.') || html.includes('class="turn-finish-hint ">Откройте ещё 2 характеристики, чтобы закончить ход.'));
  me.revealsThisRound=quota;
  html=t.renderPhase(g,me,current,quota,true,[]);
  assert(html.includes('class="btn finish-turn-btn is-ready" onclick="uiFinishTurn()" >Закончить ход'));
  const other=g.players[1];
  html=t.renderPhase(g,other,current,quota,false,[]);
  assert(html.includes('class="btn finish-turn-btn " onclick="uiFinishTurn()" disabled>Закончить ход'));
});
test('Normal finish-turn handler cannot advance before quota, but can advance after quota',()=>{
  resetGame(6);
  const g=t.state.game;
  g.status='playing';g.currentPhase='turns';g.round=1;g.settings.playerCount=6;g.currentTurnIndex=0;
  const me=g.players[0]; me.revealed=['profession'];me.revealsThisRound=1;me.lastRevealRound=1;
  sandbox.toast=()=>{};sandbox.syncAndRender=()=>{};
  sandbox.window.uiFinishTurn();
  assert.equal(g.currentTurnIndex,0,'incomplete turn should not advance');
  me.revealsThisRound=t.revealQuota(6,1);
  sandbox.window.uiFinishTurn();
  assert.equal(g.currentTurnIndex,1,'completed turn should advance');
});
test('Host skip control is clearly separated from normal turn completion',()=>{
  resetGame(6);
  const g=t.state.game;g.currentPhase='turns';
  const html=vm.runInContext('hostControls(state.game,currentTurnPlayer())',sandbox);
  assert.match(html,/Пропустить ход · открыть 2 случайные/);
  assert.match(html,/только если игрок отошёл|если игрок отошёл/i);
  assert(!html.includes('Завершить ход · открыть 2 случайные'));
});

test('Food storage event resolves through a surviving warehouse specialist',()=>{
  resetGame(6);
  const g=t.state.game;
  const specialist=g.players[0]; specialist.bunkered=true; specialist.eliminated=false;
  specialist.cards.profession.value='Кладовщик продовольственного склада';
  g.players.slice(1).forEach(p=>p.bunkered=false);
  const ev=t.BUNKER_EVENTS.find(e=>e.id==='weak-food-seal');
  g.bunkerState.events=[JSON.parse(JSON.stringify(ev))];
  g.bunkerState.activeProblems=[{id:ev.id,title:ev.title,problemType:ev.problemType,severity:1}];
  const prior=g.bunkerState.resources.food;
  const outcomes=t.resolveBunkerProblemsAtFinal(g);
  assert.equal(outcomes[0].resolved,true);
  assert.equal(g.bunkerState.activeProblems.length,0);
  assert.equal(g.bunkerState.resolvedProblems.length,1);
  assert(g.bunkerState.resources.food >= prior+2);
  assert.match(g.bunkerState.resolvedProblems[0].resolutionText,/Кладовщик/);
});
test('Unknown medicine remains unresolved without pharmacist or doctor',()=>{
  resetGame(6);
  const g=t.state.game;
  g.players.forEach(p=>{p.bunkered=true;p.eliminated=false;p.cards.profession.value='Обычный специалист';});
  const ev=t.BUNKER_EVENTS.find(e=>e.id==='unknown-medicine');
  g.bunkerState.events=[JSON.parse(JSON.stringify(ev))];
  g.bunkerState.activeProblems=[{id:ev.id,title:ev.title,problemType:ev.problemType,severity:1}];
  const outcomes=t.resolveBunkerProblemsAtFinal(g);
  assert.equal(outcomes[0].resolved,false);
  assert.equal(g.bunkerState.activeProblems.length,1);
});
test('Foreign language medicine problem resolves via English teacher',()=>{
  resetGame(6);
  const g=t.state.game;
  g.players.forEach(p=>{p.bunkered=false;p.eliminated=true;});
  const p=g.players[0]; p.bunkered=true;p.eliminated=false;p.cards.profession.value='Учитель английского языка';
  const ev=t.BUNKER_EVENTS.find(e=>e.id==='foreign-medicine-label');
  g.bunkerState.events=[JSON.parse(JSON.stringify(ev))];
  g.bunkerState.activeProblems=[{id:ev.id,title:ev.title,problemType:ev.problemType,severity:1}];
  const outcomes=t.resolveBunkerProblemsAtFinal(g);
  assert.equal(outcomes[0].resolved,true);
  assert.match(g.bunkerState.resolvedProblems[0].resolutionText,/Учитель английского языка/);
});
test('Bots can submit votes on behalf of host',()=>{
  resetGame(6);
  const g=t.state.game; g.status='playing'; g.currentPhase='vote';
  g.players.forEach(p=>{p.eliminated=false;p.occupied=true;});
  const bot=g.players[1], target=g.players[2];
  t.hostBotVote(bot.id,target.id);
  assert.equal(g.votes[bot.id],target.id);
});
test('Host can kick a non-host participant during a game',()=>{
  resetGame(6);
  const g=t.state.game; g.status='playing'; g.currentPhase='discussion';
  const target=g.players[2];
  t.kickPlayer(target.id);
  assert.equal(target.eliminated,true);
  assert.equal(target.connected,false);
});
test('Automatic bot votes fill only missing bot votes',()=>{
  resetGame(6);
  const g=t.state.game; g.status='playing'; g.currentPhase='vote'; g.votes={};
  t.autoVoteForBots();
  assert.equal(Object.keys(g.votes).length,5);
  assert.equal(Object.prototype.hasOwnProperty.call(g.votes,g.players[0].id),false);
  assert(g.players.filter(p=>p.bot).every(p=>g.players.some(target=>target.id===g.votes[p.id])));
});
test('Kicked players are removed immediately without defense or farewell phases',()=>{
  resetGame(6);
  const g=t.state.game; g.status='playing'; g.currentPhase='discussion'; g.capacity=2;
  const target=g.players[2]; g.voteLocks[target.id]=true; g.votes[target.id]=g.players[3].id;
  sandbox.syncAndRender=()=>{};
  t.kickPlayer(target.id);
  assert.equal(target.eliminated,true);
  assert.equal(target.connected,false);
  assert.equal(g.currentPhase,'discussion');
  assert.equal(Object.prototype.hasOwnProperty.call(g.voteLocks,target.id),false);
});
test('Bunker event problems have no manual repair button in rendered panel',()=>{
  resetGame(6);
  const g=t.state.game;
  g.status='playing';g.currentPhase='turns';g.round=1;g.settings.playerCount=6;
  const ev=t.BUNKER_EVENTS.find(e=>e.id==='weak-food-seal');
  g.bunkerState.events=[JSON.parse(JSON.stringify(ev))];
  g.bunkerState.activeProblems=[{id:ev.id,title:ev.title,problemType:ev.problemType,severity:1}];
  sandbox.__t.state.mode='game';
  sandbox.window.uiResolveBunkerEvent=undefined;
  const html = vm.runInContext('renderBunkerPanel(state.game)',sandbox);
  assert.equal(typeof sandbox.window.uiResolveBunkerEvent,'undefined');
  assert(!html.includes('Устранить проблему'));
  assert.match(html,/проверка навыков в финале|финальную экспертизу/i);
});
test('Finish game resolves problems using non-eliminated survivors before bunkered flags are assigned',()=>{
  resetGame(6);
  const g=t.state.game;
  g.status='playing'; g.currentPhase='turns'; g.round=3; g.bunkerEventPlan=[];
  g.players.forEach((p,i)=>{p.eliminated=i!==0; p.occupied=true; p.bunkered=false;});
  g.players[0].cards.profession.value='Кладовщик продовольственного склада';
  const ev=t.BUNKER_EVENTS.find(e=>e.id==='weak-food-seal');
  g.bunkerState.events=[JSON.parse(JSON.stringify(ev))];
  g.bunkerState.activeProblems=[{id:ev.id,title:ev.title,problemType:ev.problemType,severity:1}];
  // finishGame calls render/sync in the browser; suppress only that presentation side effect.
  sandbox.syncAndRender=()=>{};
  t.finishGame();
  assert.equal(g.status,'finished');
  assert.equal(g.bunkerState.finalProblemOutcomes[0].resolved,true);
  assert.equal(g.bunkerState.finalProblemOutcomes[0].specialist,g.players[0].name);
  assert.equal(g.players[0].bunkered,true);
});
test('Landing page has five compact stage steps and a no-wrap layout',()=>{
  const html=vm.runInContext('buildSetupHtml()',sandbox);
  assert.equal((html.match(/class="mini-step"/g)||[]).length,5);
  const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
  assert.match(css,/\.mini-flow[^}]*flex-wrap:\s*nowrap/s);
});
test('Host test tools are available for lobby, turns, voting, and removal',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
  assert(source.includes('onclick="uiFillBots()"'));
  assert(source.includes('onclick="uiHostFinishTurn()"'));
  assert(source.includes('onclick="uiRerollBotVotes()"'));
  assert(source.includes('function autoVoteForBots(showToast = true)'));
  assert(source.includes('onclick="uiKickPlayer('));
});

test('Character decks include infectious illnesses, disability variations, autism and experience twists',()=>{
  assert(t.DECK.health.some(([v])=>/коронавирус/i.test(v)));
  assert(t.DECK.health.some(([v])=>/зомби-вирус/i.test(v)));
  assert(t.DECK.health.some(([v])=>/чума/i.test(v)));
  assert(t.DECK.physique.some(([v])=>/одна рука/i.test(v)));
  assert(t.DECK.physique.some(([v])=>/инвалидной коляске/i.test(v)));
  assert(t.DECK.trait.some(([v])=>/аутизм/i.test(v)));
  assert(t.DECK.fact.some(([v])=>/30-летний стаж в своей области/i.test(v)));
  assert(!t.DECK.fact.some(([v])=>/Электрик с 30-летним стажем/i.test(v)));
});
test('A hidden zombie-virus carrier can trigger bunker-wide failure without containment',()=>{
  resetGame(6); const g=t.state.game;
  g.players.forEach(p=>{p.eliminated=false;p.bunkered=true;p.occupied=true;p.cards.profession={type:'profession',value:'Работник без медподготовки',mods:{}};p.cards.health={type:'health',value:'Здоров, серьёзных ограничений нет',mods:{}};});
  g.players[0].cards.health={type:'health',value:'Зомби-вирус после укуса: уверяет, что это обычная царапина',mods:{health:-3,med:-2}};
  g.bunkerState.infrastructure.ventilation=0; g.bunkerState.infrastructure.sanitation=0;
  const report=t.calculateFinalReport(); const ending=t.finalOutcome(g,report);
  assert.equal(report.details.infectionRisk.outbreak,true);
  assert.equal(ending.survived,false);
  assert.match(ending.lead,/зараж|инфекц|источник|вспыш|изоляц/i);
  assert(ending.lead.length > 70, 'ending lead should provide a varied narrative, not a one-line label');
});
test('Medical staff and high ventilation can contain infection instead of forcing automatic failure',()=>{
  resetGame(6); const g=t.state.game;
  g.players.forEach((p,i)=>{p.eliminated=false;p.bunkered=true;p.occupied=true;p.cards.profession={type:'profession',value:i===1?'Врач-терапевт':'Работник без медподготовки',mods:i===1?{med:4}:{}};p.cards.health={type:'health',value:'Здоров, серьёзных ограничений нет',mods:{health:2}};});
  g.players[0].cards.health={type:'health',value:'Зомби-вирус после укуса: уверяет, что это обычная царапина',mods:{health:-3,med:-2}};
  g.bunkerState.infrastructure.ventilation=100; g.bunkerState.infrastructure.sanitation=100;
  const report=t.calculateFinalReport();
  assert.equal(report.details.infectionRisk.outbreak,false);
  assert.match(report.details.infectionRisk.summary,/помогли не допустить массового заражения/i);
});
test('Dementia reduces the specific boast about professional memory without erasing all skills',()=>{
  resetGame(6); const p=t.state.game.players[0];
  Object.keys(p.cards).forEach(k=>p.cards[k]={type:k,value:'',mods:{}});
  p.cards.profession={type:'profession',value:'Электрик',mods:{tech:3}};
  p.cards.fact={type:'fact',value:'Электрик с 30-летним стажем: коллеги считали его лучшим в профессии',mods:{tech:4,skill:2}};
  p.cards.health={type:'health',value:'Здоров, серьёзных ограничений нет',mods:{}};
  const clear=t.playerDomainProfile(p).tech;
  p.cards.health={type:'health',value:'Деменция: память иногда подводит в стрессовой ситуации',mods:{health:-1,skill:-1}};
  const impaired=t.playerDomainProfile(p).tech;
  assert(impaired < clear);
  assert(impaired > 0.5, 'profession remains useful and not all skill is erased');
});
test('Final screen prioritizes outcome banner and keeps extra reports behind collapsed details',()=>{
  resetGame(6); const g=t.state.game;
  g.status='finished';g.currentPhase='final';g.players.forEach(p=>{p.eliminated=false;p.bunkered=true;});
  g.finalReport=t.calculateFinalReport(); t.state.mode='game';
  t.renderFinal(); const html=elements.app.innerHTML;
  assert.match(html,/<section class="final-outcome final-outcome-(survived|lost)"/);
  assert.match(html,/<h1>ВЫ (ВЫЖИЛИ|ПОГИБЛИ)<\/h1>/);
  assert.match(html,/<details class="panel final-details">/);
  assert.match(html,/Вернуться в лобби с игроками/);
  assert((html.match(/<p>/g)||[]).length >= 6, 'final should contain several epilogue paragraphs');
  assert.match(html,/Итог катастрофы/);
  assert(!html.includes('/100'));
  assert(!html.includes('ориентировочный игровой прогноз'));
  assert(!html.includes('Демографическая устойчивость'));
});
test('Three-minute discussion timer expires once and resolves voting without speeches',()=>{
  resetGame(6); const g=t.state.game;g.status='playing';g.currentPhase='discussion';g.round=1;g.voteRound=1;g.currentRoundEliminationTarget=1;
  g.voteLocks={};g.votes={};g.skipChoices={};g.skipUsed=false;
  sandbox.syncAndRender=()=>{};
  const originalNow=sandbox.Date.now; let now=500000; sandbox.Date.now=()=>now;
  try {
    t.startTimer(1); assert.equal(g.timerRunning,true); assert.equal(g.timerDeadline,501000);
    now+=1200; t.refreshTimerDisplay(); assert.equal(g.round,2); assert.equal(g.currentPhase,'turns');
    t.refreshTimerDisplay(); assert.equal(g.round,2,'expiry must be handled only once');
    assert.equal(g.timerRunning,false);
  } finally { sandbox.Date.now=originalNow; }
});
test('Kicking a participant during combined discussion does not restart the shared timer',()=>{
  resetGame(6);const g=t.state.game;g.status='playing';g.currentPhase='discussion';g.round=2;g.voteRound=1;
  g.players.forEach(p=>{p.eliminated=false;p.occupied=true;p.connected=true;});
  const target=g.players[1];g.timerRunning=true;g.timerDeadline=Date.now()+45000;g.timeLeft=45;
  sandbox.syncAndRender=()=>{};t.kickPlayer(target.id);
  assert.equal(target.eliminated,true);assert.equal(g.currentPhase,'discussion');
  assert.equal(g.timeLeft,45);assert.equal(g.timerRunning,true);
});


test('Group can use one pass; it schedules two eliminations in the next round',()=>{
  resetGame(6); const g=t.state.game; g.status='playing'; g.currentPhase='discussion'; g.round=1; g.voteRound=1; g.skipUsed=false; g.votingLocked=false;
  const bots=g.players.filter(p=>p.bot);
  assert.equal(bots.length,5);
  bots.forEach(p=>assert.equal(t.hostBotSkipChoice(p.id,true),true));
  assert.equal(g.skipChoices[bots[0].id],true);
  assert.equal(t.hostBotSkipChoice(g.players[0].id,true),false,'a real player cannot be controlled through the bot helper');
  g.skipChoices[g.players[0].id]=true;
  assert.equal(t.lockVote(g.players[0].id),true);
  assert.equal(g.skipUsed,true);
  assert.equal(g.currentRoundEliminationTarget,2);
  assert.equal(g.round,2);
  assert.equal(g.currentPhase,'turns');
  assert.equal(t.canSkipCurrentVote(g),false,'pass cannot be repeated after it has been used');
});
test('Host vote panel exposes per-bot skip checkboxes only when skip is available',()=>{
  resetGame(6); const g=t.state.game; g.status='playing';g.currentPhase='discussion';g.round=1;g.voteRound=1;g.currentRoundEliminationTarget=1;g.skipUsed=false;
  const html=t.renderPhase(g,g.players[0],null,2,true,2);
  assert.match(html,/uiBotSkipChoice/);
  assert.match(html,/uiAutoSkipChoiceBots/);
  g.skipUsed=true;g.currentRoundEliminationTarget=2;
  const forcedDouble=t.renderPhase(g,g.players[0],null,2,true,2);
  assert(!forcedDouble.includes('uiBotSkipChoice'));
  assert.match(forcedDouble,/disabled/);
});
test('Personal turn and group discussion use three-minute deadlines',()=>{
  resetGame(6); const g=t.state.game;g.status='playing';g.currentPhase='turns';g.round=1;g.currentTurnIndex=0;
  const p=t.currentTurnPlayer();p.revealsThisRound=t.revealQuota(6,1);p.revealed=['profession','biology','physique'];
  sandbox.syncAndRender=()=>{};
  const originalNow=sandbox.Date.now;let now=800000;sandbox.Date.now=()=>now;
  try {
    assert.equal(t.finishTurn(),true); // next player gets their individual turn
    const active=t.currentTurnPlayer();active.revealsThisRound=t.revealQuota(6,1);active.revealed=['profession','biology','physique'];
    t.revealCard(active.id,'hobby'); // invalid in this fixture after quota, used to assert no duplicate reveal
    t.beginDiscussion();assert.equal(g.timeLeft,180);assert.equal(g.timerDeadline,now+180000);assert.equal(g.currentPhase,'discussion');
  } finally { sandbox.Date.now=originalNow; }
});


test('Final epilogues read like concise factual bunker-log entries',()=>{
  resetGame(6);const g=t.state.game;g.catastrophe.title='Техногенный коллапс';g.storySeed='seed-one';
  const winners=g.players.slice(0,3);
  winners[0].cards.profession.value='Инженер';
  winners[1].cards.profession.value='Фельдшер';
  winners[2].cards.profession.value='Портной';
  g.bunker.systems=['серверная','резервное питание','связь'];
  const report=t.calculateFinalReport();
  const losses=t.finalEpilogue(g,{survived:false},[],report);
  const victory=t.finalEpilogue(g,{survived:true},winners,report);
  const winParagraphs=(victory.match(/<p>/g)||[]).length;
  const lossParagraphs=(losses.match(/<p>/g)||[]).length;
  assert(winParagraphs>=3 && winParagraphs<=7,`expected a short journal, got ${winParagraphs} paragraphs`);
  assert(lossParagraphs>=3 && lossParagraphs<=7,`expected a short journal, got ${lossParagraphs} paragraphs`);
  assert.match(victory,/наша община выбралась из бункера/i);
  assert.match(victory,/Инженер|Фельдшер|Портной/);
  assert.match(victory,/серверная.*резервное питание.*связь/);
  assert.match(losses,/не выбралась из бункера/i);
  assert.match(losses,/Зафиксированные причины|Нерешённые неисправности/);
  assert(!victory.includes('поддерживается система бункера:'));
  assert(!losses.includes('поддерживается система бункера:'));
  assert(!victory.includes('/100') && !losses.includes('/100'));
  assert(!victory.includes('финальной сценой с музыкой'));
});

 test('Kick during discussion resolves when all remaining votes were already fixed',()=>{
  resetGame(6);const g=t.state.game;g.status='playing';g.currentPhase='discussion';g.round=1;g.currentRoundEliminationTarget=1;g.votingLocked=false;g.capacity=3;
  g.players.forEach(p=>{p.eliminated=false;p.occupied=true;p.connected=true;p.bot=false;});
  const kicked=g.players[1], selected=g.players[2];
  g.votes={};g.voteLocks={};g.skipChoices={};
  g.players.forEach((p,i)=>{if(p.id!==kicked.id){g.votes[p.id]=(p.id===selected.id?g.players[3].id:selected.id);g.voteLocks[p.id]=true;}});
  sandbox.syncAndRender=()=>{};
  t.kickPlayer(kicked.id);
  assert.equal(kicked.eliminated,true);
  assert.equal(g.currentPhase,'turns','should advance instead of leaving every client locked in discussion');
  assert.equal(g.round,2);
  assert.equal(g.players.filter(p=>p.eliminated).length,2);
});

test('A reconnect session is echoed at assignment and stale-session vote messages are rejected',()=>{
  resetGame(6);
  const g=t.state.game;g.status='lobby';g.currentPhase='lobby';
  const sent=[];
  const conn={peer:'peer-session-guest',open:true,metadata:{},send:m=>sent.push(m),close(){}};
  sandbox.syncAndRender=()=>{};
  t.handleHostJoinLobby(conn,{action:'joinLobby',clientId:'client-session-guest',name:'Guest',sessionId:'session-current'});
  assert.equal(conn.metadata.sessionId,'session-current');
  assert(sent.some(message=>message.type==='assigned'&&message.sessionId==='session-current'));
  const guest=g.players.find(player=>player.clientId==='client-session-guest');
  assert(guest);
  g.status='playing';g.currentPhase='discussion';g.round=1;g.currentRoundEliminationTarget=1;
  g.players.forEach(player=>{player.occupied=true;player.connected=true;player.eliminated=false;player.bot=false;});
  const target=g.players[0];
  t.handleHostMessage(conn,{action:'vote',targetId:target.id,sessionId:'session-old'});
  assert.equal(g.votes[guest.id],undefined,'stale session must not cast a vote');
  t.handleHostMessage(conn,{action:'vote',targetId:target.id,sessionId:'session-current'});
  assert.equal(g.votes[guest.id],target.id,'current session can vote normally');
});

test('Kick invalidates only votes targeting the removed participant and leaves the timer running',()=>{
  resetGame(6);const g=t.state.game;g.status='playing';g.currentPhase='discussion';g.round=2;g.currentRoundEliminationTarget=1;g.votingLocked=false;g.capacity=3;
  g.players.forEach(p=>{p.eliminated=false;p.occupied=true;p.connected=true;p.bot=false;});
  const kicked=g.players[1];g.timerRunning=true;g.timerDeadline=Date.now()+45000;g.timeLeft=45;
  g.votes={};g.voteLocks={};g.skipChoices={};
  g.players.filter(p=>p.id!==kicked.id).forEach((p,i)=>{g.votes[p.id]=kicked.id;g.voteLocks[p.id]=true;});
  sandbox.syncAndRender=()=>{};
  t.kickPlayer(kicked.id);
  assert.equal(g.currentPhase,'discussion');
  assert.equal(g.timeLeft,45);
  assert.equal(g.timerRunning,true);
  assert.equal(g.votingLocked,false);
  assert(g.players.filter(p=>!p.eliminated).some(p=>g.voteLocks[p.id]===false),'affected voter can make a new selection');
  assert.equal(Object.values(g.votes).includes(kicked.id),false);
});

test('Every party receives distinct random large gear and backpack items, including comic useless finds',()=>{
  const names=Array.from({length:15},(_,i)=>`Игрок ${i+1}`);
  const g=t.createGame({playerCount:15},names,0);
  for (const type of ['largeGear','backpack']) {
    const values=g.players.map(p=>p.cards[type].value);
    assert.equal(new Set(values).size,15,`${type} should not repeat within the party`);
  }
  const large=t.DECK.largeGear.map(x=>x[0]);
  const pack=t.DECK.backpack.map(x=>x[0]);
  assert(large.some(x=>/кот в переноске/i.test(x)));
  assert(large.some(x=>/велосипед/i.test(x)));
  assert(pack.some(x=>/пачка чипсов/i.test(x)));
  assert(pack.some(x=>/резиновая уточка/i.test(x)));
  assert(t.DECK.largeGear.length>=15 && t.DECK.backpack.length>=15);
});

test('Player may change a vote until locking it, then changes are rejected',()=>{
  resetGame(6); const g=t.state.game;g.status='playing';g.currentPhase='discussion';g.round=1;g.voteRound=1;g.currentRoundEliminationTarget=1;g.votes={};g.voteLocks={};g.skipChoices={};
  const voter=g.players[0], first=g.players[1], second=g.players[2];
  assert.equal(t.castVote(voter.id,first.id),true);
  assert.equal(t.castVote(voter.id,second.id),true);
  assert.equal(g.votes[voter.id],second.id);
  assert.equal(t.lockVote(voter.id),true);
  assert.equal(t.castVote(voter.id,first.id),false);
  assert.equal(g.votes[voter.id],second.id);
});

test('A group that kicked one player can still pass the following normal round once',()=>{
  resetGame(6); const g=t.state.game;g.status='playing';g.currentPhase='discussion';g.round=2;g.voteRound=1;g.currentRoundEliminationTarget=1;g.skipUsed=false;g.doubleVoteNext=false;g.votes={};g.voteLocks={};g.skipChoices={};
  g.players.filter(p=>p.bot).forEach(bot=>assert.equal(t.hostBotSkipChoice(bot.id,true),true));
  g.skipChoices[g.players[0].id]=true;
  assert.equal(t.lockVote(g.players[0].id),true);
  assert.equal(g.round,3);
  assert.equal(g.currentRoundEliminationTarget,2);
  assert.equal(g.currentPhase,'turns');
  assert.equal(g.players.filter(p=>p.eliminated).length,0);
  assert.equal(t.canSkipCurrentVote(g),false);
});

test('Discussion timeout in a mandatory double-elimination round removes two players',()=>{
  resetGame(6); const g=t.state.game;g.status='playing';g.currentPhase='discussion';g.round=2;g.voteRound=1;g.currentRoundEliminationTarget=2;g.skipUsed=true;g.votes={};g.voteLocks={};g.skipChoices={};
  sandbox.syncAndRender=()=>{};
  assert.equal(t.finishVote(true),true);
  assert.equal(g.players.filter(p=>p.eliminated).length,2);
  assert.equal(g.currentPhase,'turns');
});

test('Bots automatically cast votes when a voting phase begins',()=>{
  resetGame(6);
  const g=t.state.game; g.status='playing';g.round=1;g.currentPhase='turns';g.currentRoundEliminationTarget=1;g.votes={};g.voteRound=0;
  sandbox.syncAndRender=()=>{};
  t.beginVote();
  const bots=g.players.filter(p=>p.bot && !p.eliminated);
  assert.equal(g.currentPhase,'discussion');
  assert.equal(g.timeLeft,180);
  assert.equal(g.timerRunning,true);
  assert.equal(bots.filter(p=>Object.prototype.hasOwnProperty.call(g.votes,p.id)).length,bots.length);
  bots.forEach(bot=>assert(g.players.some(target=>target.id===g.votes[bot.id] && !target.eliminated)));
});
test('A deciding vote eliminates the target immediately without any speech phase',()=>{
  resetGame(6);
  const g=t.state.game; g.status='playing';g.currentPhase='discussion';g.round=1;g.voteRound=1;g.votingLocked=false;g.capacity=3;
  const target=g.players[1];
  g.votes={};g.voteLocks={};g.skipChoices={};
  g.players.filter(p=>p.id!==target.id).forEach(p=>{g.votes[p.id]=target.id;p.vote=target.id;g.voteLocks[p.id]=true;});
  g.votes[target.id]=g.players[2].id;g.voteLocks[target.id]=true;
  sandbox.syncAndRender=()=>{};
  t.finishVote();
  assert.equal(target.eliminated,true);
  assert.equal(target.bunkered,false);
  assert.equal(g.currentPhase,'turns');
  assert(!['speeches','defense','farewell'].includes(g.currentPhase));
});
test('Returning to lobby preserves live player identities and peer connections but resets the game',()=>{
  resetGame(6);
  const g=t.state.game;
  const [host,connected,disconnected,bot]=g.players;
  g.players.forEach(p=>{p.bot=false;p.hostPlayer=false;});
  host.hostPlayer=true;host.bot=false;host.peerId='host-peer';
  connected.hostPlayer=false;connected.bot=false;connected.peerId='peer-open';connected.clientId='client-open';connected.eliminated=true;connected.connected=false;connected.bunkered=false;
  disconnected.hostPlayer=false;disconnected.bot=false;disconnected.peerId='peer-closed';disconnected.clientId='client-closed';disconnected.eliminated=true;
  bot.bot=true;bot.hostPlayer=false;bot.peerId=null;bot.eliminated=true;
  g.status='finished';g.currentPhase='final';g.stateSeq=50;g.players.forEach(p=>{p.eliminated=true;p.revealed=['profession','health'];p.vote='stale-vote';});
  t.state.roomCode='TESTROOM';
  const sent=[];
  t.state.connections=new Map([['peer-open',{peer:'peer-open',open:true,metadata:{playerId:connected.id},send:m=>sent.push(m)}]]);
  const retainedIds=[host.id,connected.id,bot.id];
  sandbox.syncAndRender=realSyncAndRender;
  assert.equal(t.returnToLobby(),true);
  const lobby=t.state.game;
  assert.equal(lobby.status,'lobby');assert.equal(lobby.currentPhase,'lobby');
  assert(lobby.stateSeq>50,'the next lobby snapshot must have a sequence higher than the finished game');
  assert.deepEqual(lobby.players.map(p=>p.id),retainedIds);
  assert.equal(t.state.roomCode,'TESTROOM');
  lobby.players.forEach(p=>{assert.equal(p.eliminated,false);assert.equal(p.bunkered,false);assert.equal(p.revealed.length,0);assert.equal(p.vote,null);});
  assert.equal(lobby.players.find(p=>p.id===connected.id).peerId,'peer-open');
  assert.equal(lobby.players.find(p=>p.id===connected.id).connected,true);
  assert(sent.some(m=>m.type==='state' && m.game.status==='lobby'));
});

console.log(`\nRESULT ${results.filter(r=>r.ok).length}/${results.length} tests passed`);
fs.writeFileSync(path.join(__dirname,'HOST_TOOLS_RESULTS.json'),JSON.stringify({passed:results.filter(r=>r.ok).length,total:results.length,tests:results},null,2));
if(results.some(r=>!r.ok)) process.exitCode=1;
