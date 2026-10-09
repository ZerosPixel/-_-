const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') + `\n;globalThis.__sim = {state,createGame,createBunkerState,calculateFinalReport,finalOutcome};`;
const elements = {};
const stubElement = () => ({ innerHTML: '', textContent: '', value: '', disabled: false, style: {}, classList: { add() {}, remove() {} }, addEventListener() {}, removeEventListener() {}, setAttribute() {}, appendChild() {}, isConnected: true });
const storage = new Map();
let seed = 20261009;
const seededMath = Object.create(Math);
seededMath.random = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const sandbox = {
  console, Math: seededMath, Date, JSON, Map, Set, Object, Array, Number, String, RegExp, Intl,
  URL, URLSearchParams, Promise, structuredClone: global.structuredClone,
  crypto: { randomUUID: () => `sim-${seed}` },
  document: { getElementById: id => elements[id] || (elements[id] = stubElement()), addEventListener() {}, visibilityState: 'visible', querySelectorAll: () => [] },
  window: {}, navigator: { userAgent: 'simulation' }, location: { href: 'http://localhost/', search: '' }, history: { replaceState() {} },
  localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, String(v)) },
  setTimeout: () => ({}), clearTimeout() {}, setInterval: () => 1, clearInterval() {}, prompt() {}, confirm: () => true
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { timeout: 10000 });
const t = sandbox.__sim;
const trials = 500;
const scores = [];
const outcomes = { survived: 0, died: 0, uncontrolledInfection: 0, infectionContained: 0 };
for (let i = 0; i < trials; i++) {
  const game = t.createGame({ playerCount: 6 }, Array.from({ length: 6 }, (_, j) => `Sim ${j + 1}`), 0);
  t.state.game = game;
  t.state.isHost = true;
  t.state.mode = 'game';
  game.status = 'finished';
  game.currentPhase = 'final';
  game.round = 3;
  game.capacity = 3;
  game.players.forEach((player, index) => {
    player.occupied = true;
    player.connected = true;
    player.ready = true;
    player.eliminated = index >= 3;
    player.bunkered = index < 3;
    player.bot = index > 0;
  });
  game.bunkerState = t.createBunkerState(game.bunker, 6);
  game.bunkerState.capacity.base = 3;
  game.bunkerState.capacity.current = 3;
  game.bunkerState.infrastructure.ventilation = 50;
  game.bunkerState.infrastructure.sanitation = 50;
  const report = t.calculateFinalReport();
  const outcome = t.finalOutcome(game, report);
  scores.push(report.score);
  if (outcome.survived) outcomes.survived++;
  else outcomes.died++;
  if (outcome.infection?.outbreak) outcomes.uncontrolledInfection++;
  else if (outcome.infection?.threats?.length) outcomes.infectionContained++;
}
scores.sort((a, b) => a - b);
const result = {
  seed: 20261009,
  trials,
  setup: '6 generated characters; 3 retained in bunker; mid-level ventilation and sanitation. This is a smoke simulation, not a full balance certification.',
  outcomes,
  survivalRate: Number((outcomes.survived / trials).toFixed(3)),
  scorePercentiles: { p10: scores[Math.floor(trials * 0.1)], median: scores[Math.floor(trials * 0.5)], p90: scores[Math.floor(trials * 0.9)] }
};
assert(outcomes.survived > 0 && outcomes.died > 0, 'both survival and failure outcomes should be possible');
assert(outcomes.survived > trials * 0.1 && outcomes.survived < trials * 0.9, 'survival should not be nearly impossible or guaranteed in the reference setup');
fs.writeFileSync(path.join(__dirname, 'FINAL_OUTCOME_SIMULATION.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
