// Headless playtest: runs the real game.js with stubbed DOM and a simple "reasonable player" bot.
// Usage: node tools/playtest.js game.js <minutes> <seed> <good|casual>
const fs = require('fs'), vm = require('vm');
const SRC = fs.readFileSync(process.argv[2], 'utf8');
const MINUTES = +process.argv[3] || 30, SEED = +process.argv[4] || 1;
const SKILL = process.argv[5] || 'good'; // good = acts as soon as it can; casual = 2-4s reaction delays

// deterministic RNG
let seed = SEED; const rng = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const stub = () => new Proxy(function () {}, {
  get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : k === 'getBoundingClientRect' ? () => ({ width: 480, height: 530, left: 0, top: 0, right: 480, bottom: 530 }) : k === 'getContext' ? () => stub() : k === 'measureText' ? () => ({ width: 40 }) : k === 'forEach' ? () => {} : t[k] ?? stub(),
  set: (t, k, v) => { t[k] = v; return true; }, apply: () => stub(), construct: () => stub(),
});
const canvasHandlers = {};
const canvas = stub();
canvas.addEventListener = (type, fn) => { canvasHandlers[type] = fn; };
canvas.setPointerCapture = () => {};
canvas.getBoundingClientRect = () => ({ width: 480, height: 530, left: 0, top: 0 });
canvas.getContext = () => stub();
const elems = {};
const store = { 'cawCollector.v1': JSON.stringify({ tips: { intro: true, gift: true, scare: true, touch: true } }) }; // tutorials off for the simulation
let rafCb = null, NOW = 0;
const sandbox = {
  document: { querySelector: s => s === '#scene' ? canvas : (elems[s] ??= stub()), querySelectorAll: () => [], addEventListener() {}, createElement: () => stub(), createElementNS: () => stub(), documentElement: stub(), body: stub() },
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
  performance: { now: () => NOW }, requestAnimationFrame: f => { rafCb = f; }, ResizeObserver: class { observe() {} },
  Image: class { constructor() { this.complete = false; this.naturalWidth = 0; } addEventListener() {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' }), innerWidth: 1000, addEventListener() {}, confirm: () => true, location: {}, console,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext('Math.random = () => __rng();', Object.assign(sandbox, { __rng: rng }));
vm.runInContext(SRC, sandbox);
const G = sandbox.__caw;
const ev = (type, x, y) => canvasHandlers[type]({ clientX: x, clientY: y, pointerId: 1 });

// ---------- bot ----------
const DT = 0.05; let t = 0, queue = [], busyUntil = 0;
const log = { firstPet: null, firstCrow: null, firstMeal: null, firstTrip: null, firstDeposit: null, ups: [], tiers: {}, snaps: [], spooks: 0 };
const at = (delay, fn) => queue.push([t + delay, fn]);
const reaction = () => SKILL === 'good' ? 0.3 : 2 + rng() * 3;
const floorY = () => G.floorY(), W = () => G.W();
let lastTrips = 0, lastDelivered = 0, lastMeals = 0;

const away = delay => at(delay, () => canvasHandlers.pointerleave && canvasHandlers.pointerleave()); // cursor leaves the field
function feed(crow) { // clicking the sack pops the food out; a polite player then moves the cursor away from shy crows
  ev('pointerdown', G.BAG.x, G.BAG.y);
  at(0.1, () => ev('pointerup', G.BAG.x, G.BAG.y));
  away(0.3);
  busyUntil = t + 0.8 + reaction();
}
function pet(crow) { // click the crow a few times, then move the cursor away
  if (log.firstPet == null) log.firstPet = t;
  for (let i = 0; i < 3; i++) at(i * 0.45, () => { if (G.P.grab) return; ev('pointerdown', crow.x, crow.y - 6); ev('pointerup', crow.x, crow.y - 6); });
  away(1.5);
  busyUntil = t + 1.8 + reaction();
}
function deliver(item) {
  log.tiers[item.tier] = (log.tiers[item.tier] || 0) + 1;
  ev('pointerdown', item.x, item.y);
  const cx = G.CRATE.x, cy = G.CRATE.y;
  at(0.2, () => ev('pointermove', (item.x + cx) / 2, cy - 60));
  at(0.5, () => ev('pointermove', cx, cy - 10));
  at(0.9, () => ev('pointerup', cx, cy - 10));
  away(1.0);
  busyUntil = t + 1.1 + reaction();
}
function botThink() {
  const crows = G.crows, bodies = G.bodies, S = G.S;
  // 1. buy the cheapest affordable upgrade
  const aff = G.UPGRADES.filter(G.canBuy).sort((a, b) => a.cost - b.cost);
  if (aff.length) { G.buy(aff[0].id); log.ups.push([+(t / 60).toFixed(1), aff[0].id, ""]); }
  // 2. deliver loose gifts
  const gift = bodies.find(b => b.kind === 'item' && !b.grab);
  if (gift) return deliver(gift);
  // 3. feed when there is a hungry crow on the ground and little food lying around
  const hungry = crows.filter(c => (c.state === 'idle') && c.full < G.CFG.fullMax);
  const foodOut = bodies.filter(b => b.kind === 'food').length;
  if (G.S.food >= 1 && ((crows.length === 0 && foodOut < 4) || (foodOut < 2 && hungry.length) || (foodOut === 0 && crows.length < G.D.maxCrows))) return feed(hungry[0]);
  // 4. pet a crow that is ready
  const petable = crows.filter(c => (c.state === 'idle' || c.state === 'eat') && G.walkRange(c) < G.CFG.petReach && c.petBank >= 1);
  if (petable.length) return pet(petable[0]);
}

const END = MINUTES * 60, SNAP = [2, 5, 10, 15, 20, 30, 45, 60].map(m => m * 60);
while (t < END) {
  t += DT; NOW = t * 1000;
  const f = rafCb; rafCb = null; f(NOW);
  const due = queue.filter(q => q[0] <= t); queue = queue.filter(q => q[0] > t); for (const q of due) q[1]();
  if (t >= busyUntil && !queue.length) botThink();
  const S = G.S, cs = G.crows;
  if (log.firstCrow == null && cs.length) log.firstCrow = t;
  const meals = cs.reduce((a, c) => a + c.meals, 0) + (S.trips || 0) * 99;
  if (log.firstMeal == null && cs.some(c => c.meals > 0)) log.firstMeal = t;
  if (log.firstTrip == null && S.trips > 0) log.firstTrip = t;
  if (log.firstDeposit == null && S.delivered > 0) log.firstDeposit = t;
  if (SNAP.includes(Math.round(t))) {
    if (!log.snaps.some(s => s.min === Math.round(t) / 60)) log.snaps.push({ min: Math.round(t) / 60, coins: Math.floor(S.coins), delivered: S.delivered, trips: S.trips, crows: cs.length, trust: cs.map(c => Math.floor(c.trust)).join(','), mealsNeeded: G.D.mealsNeeded, ups: G.CHAIN_IDS.filter(k => G.lvl(k)).map(k => k + G.lvl(k)).join(' ') });
  }
}
const fm = x => x == null ? 'never' : (x / 60).toFixed(1) + ' min';
console.log(`SKILL=${SKILL} seed=${SEED}  first pet ${fm(log.firstPet)} | first crow ${fm(log.firstCrow)} | first meal ${fm(log.firstMeal)} | first trip ${fm(log.firstTrip)} | first deposit ${fm(log.firstDeposit)}`);
console.log('gift tiers delivered:', JSON.stringify(log.tiers));
console.log('upgrades:', log.ups.map(u => `${u[0]}m:${u[1]}${u[2]}`).join(' '));
for (const s of log.snaps) console.log(JSON.stringify(s));
