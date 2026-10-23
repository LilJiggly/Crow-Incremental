(() => {
'use strict';

/* ================= CONFIG (tweak freely) ================= */
const CFG = {
  gravity: 1500, bounce: 0.45,
  objectLift: 8,     // px the sack and gift box sit above the floor line
  feetOffset: 0,     // nudge crow feet down (+) or up (-) in px if they float above or sink into the ground
  crowScale: 4,      // screen px per art px for the crow (32x32 art cells in images/crow3.png)
  floorFrac: 0.88,    // where the walkable floor sits in the background image (0 = top, 1 = bottom)
  crowSize: 46, foodSize: 22, itemSize: 30,
  startFood: 3,       // food charges in the sack at the start
  refillSecs: [9, 7.5, 6.3, 5.4, 4.7, 4.2, 3.8], // seconds per sack charge at Restock level 0, 1, 2 ...
  autoFeedSec: 5,     // Auto Feeder level 1: seconds between automatic food pops (each level is a bit faster)
  mealsBase: 6,       // meal points a crow eats before it flies off for a gift
  mealsStep: 12,      // every this many trips, crows need one more point...
  mealsCap: 10,       // ...up to this many
  maxAttract: 5,
  fullMax: 2,         // a crow with this much food in its belly ignores more
  fullDecay: 0.25,    // belly empties by this per second (1 food ~ 4s)
  petGain: 0.8,       // trust one pet (a click on the crow) gives
  petClicks: 3,       // pets that raise affection before the crow has had enough (it still enjoys more, it just does not grow fonder)
  petRefill: 40,      // seconds for those pets to refill completely
  crowSpawnCd: 40,    // min seconds between new crows arriving
  tripTime: [10, 16], // seconds a crow is away fetching
  tierEvery: 12,      // trust needed per rarity tier unlocked (trust 24 -> tier 2, 60 -> tier 5)
  tierChanceBase: 0.25, // chance to roll up one more tier at trust 0 ...
  tierChanceTrust: 0.20, // ... plus this much more at trust 100 (so friends bring rarer things)
  shyWalk: 130,      // px: at trust 0 a crow backs away when the cursor is this close...
  shyFly: 55,        // px: ...and flies off when it gets this close. Both shrink linearly as trust grows
  scareGrudge: 4,    // grudge a crow gains each time you scare it off (x its temper)
  grudgeDecay: 0.03, // grudge fades by this per second
  grudgeWarn: 70,    // a crow tells you it is fed up at this much grudge
  banAt: 100,        // at this grudge a crow leaves for good...
  minRoster: 4,      // ...but the game always keeps at least this many crows available
  startTrust: 10,    // trust a brand-new crow arrives with (10 = level 1, Curious)
  shyEnd: 25,        // trust at which a crow no longer avoids the cursor at all
  handTrust: 25,     // trust at which a crow will eat food straight from your hand
  grabPad: 26,       // px added around loose food/gifts when picking them up (bigger = easier to grab)
  sackReach: 54,     // px: how close a click must be to the sack centre to pop food
  pressT: 0.12,      // seconds the hand holds the crow down on each pet (the squish is a quick spring, so spam clicks just keep pressing)
  squish: 0.45,      // how much the crow is pressed down (0.45 = 45% shorter at full press), feet stay planted
  petReach: 44,      // px: a crow lets you touch it once its avoid range is smaller than this
  maxItems: 60, maxFood: 60,
};
// Better food unlocks with Tasty Treats (every 2 levels) and is worth more trust. spr = items.png cell, ui = ui.png icon.
const FOOD_TYPES = [ // pts = how many "meal points" one piece counts for on the way to a gift trip
  { n: 'Hazelnuts', e: '🌰', spr: 7, ui: 14, mult: 1,   q: 0, pts: 1 },
  { n: 'Peanuts',   e: '🥜', spr: 8, ui: 15, mult: 1.3, q: 2, pts: 2 },
  { n: 'Bread',     e: '🍞', spr: 9, ui: 16, mult: 1.6, q: 4, pts: 3 },
  { n: 'Corn',      e: '🌽', spr: 10, ui: 17, mult: 2,  q: 6, pts: 4 },
  { n: 'Cookies',   e: '🍪', spr: 11, ui: 18, mult: 2.5, q: 8, pts: 5 },
];
const ITEMS = [
  { e: '🔩', n: 'Bolt', v: 3 }, { e: '🥄', n: 'Spoon', v: 6 }, { e: '🔑', n: 'Key', v: 12 },
  { e: '🪙', n: 'Coin', v: 20 }, { e: '💍', n: 'Ring', v: 50 }, { e: '💎', n: 'Gem', v: 120 }, { e: '👑', n: 'Crown', v: 300 },
];
const LEVELS = [{ min: 0, n: 'Wary', col: '#c8c8d0' }, { min: 10, n: 'Curious', col: '#ffe9a8' }, { min: 25, n: 'Friendly', col: '#ffb3d1' }, { min: 60, n: 'Bonded', col: '#ffd34d' }];
const levelIdx = t => { let i = 0; LEVELS.forEach((l, j) => { if (t >= l.min) i = j; }); return i; };
/* ---- The roster: every crow is a little person (size = pixel scale: 3 tiny ... 5 huge, speed = how fast it walks and flies). pal = recolour of the 3-colour sprite (body / highlight / eye), size = pixel scale.
   Traits: shy (x comfort range), belly (pieces eaten before it is full), gen (gift value), temper (grudge speed), warm (trust speed). ---- */
const P0 = { body: [6, 6, 5], hi: [34, 32, 32], eye: [107, 37, 37] };
const ROSTER = [
  { id: 'edgar',   name: 'Edgar',   type: 'Fearless',   blurb: 'Bold and curious. Always the first to check out new food.',           size: 4,   pal: P0,                                                       shy: 0.6, belly: 2, gen: 1.0,  temper: 0.6, warm: 1.0,  easy: true, speed: 1.0, weight: 1 },
  { id: 'olive',   name: 'Olive',   type: 'Calm',       blurb: 'Takes everything slowly. Hard to upset, easy to like.',               size: 4,   pal: { body: [16, 16, 6], hi: [56, 58, 26], eye: [190, 140, 40] },   shy: 0.8, belly: 2, gen: 1.0,  temper: 0.4, warm: 1.1,  easy: true, speed: 0.8, weight: 1 },
  { id: 'nibbles', name: 'Nibbles', type: 'Chatty',     blurb: 'Small, loud and friendly. Cannot stop cawing.',                        size: 3.5, pal: { body: [14, 16, 22], hi: [52, 62, 86], eye: [255, 210, 90] }, shy: 0.8, belly: 2, gen: 1.0,  temper: 0.8, warm: 1.15, easy: true, speed: 1.2, weight: 1 },
  { id: 'pip',     name: 'Pip',     type: 'Eager',      blurb: 'Tiny and always hungry for attention. Eats very little though.',      size: 3, pal: { body: [20, 14, 10], hi: [58, 44, 34], eye: [200, 150, 50] }, shy: 0.8, belly: 1, gen: 0.9,  temper: 0.6, warm: 1.2,  easy: true, speed: 1.45, weight: 1 },
  { id: 'poe',     name: 'Poe',     type: 'Gloomy',     blurb: 'Quiet poet. Picks out thoughtful gifts but sulks easily.',            size: 4,   pal: { body: [6, 8, 16], hi: [28, 36, 64], eye: [120, 170, 220] },   shy: 1.0, belly: 2, gen: 1.2,  temper: 1.2, warm: 0.9,  speed: 0.85, weight: 1 },
  { id: 'biscuit', name: 'Biscuit', type: 'Greedy',     blurb: 'Big appetite, big feet. Will eat until it cannot move.',              size: 5, pal: { body: [30, 22, 16], hi: [78, 58, 42], eye: [214, 160, 40] }, shy: 0.8, belly: 3, gen: 0.9,  temper: 1.0, warm: 1.0,  speed: 0.75, weight: 1 },
  { id: 'soot',    name: 'Soot',    type: 'Skittish',   blurb: 'Jumps at its own shadow. Worth the patience.',                         size: 3.5, pal: { body: [2, 2, 2], hi: [20, 20, 20], eye: [170, 170, 170] },  shy: 1.5, belly: 2, gen: 1.1,  temper: 1.0, warm: 1.0,  speed: 1.3, weight: 1 },
  { id: 'ziggy',   name: 'Ziggy',   type: 'Hyper',      blurb: 'Never sits still. Eats a lot, gives a little.',                        size: 3.5, pal: { body: [6, 14, 8], hi: [30, 70, 40], eye: [200, 220, 60] },   shy: 0.7, belly: 3, gen: 0.8,  temper: 1.1, warm: 1.0,  speed: 1.6, weight: 1 },
  { id: 'coal',    name: 'Coal',    type: 'Stoic',      blurb: 'Large and unbothered. Rarely impressed, never rude.',                  size: 4.5, pal: { body: [12, 6, 6], hi: [52, 30, 28], eye: [230, 90, 40] },    shy: 1.1, belly: 2, gen: 1.0,  temper: 0.7, warm: 0.9,  speed: 0.7, weight: 1 },
  { id: 'bandit',  name: 'Bandit',  type: 'Sneaky',     blurb: 'Finds the best stuff, holds a grudge about everything.',               size: 4,   pal: { body: [26, 26, 28], hi: [84, 84, 90], eye: [230, 200, 40] }, shy: 1.2, belly: 2, gen: 1.15, temper: 1.3, warm: 0.95, speed: 1.15, weight: 1 },
  { id: 'onyx',    name: 'Onyx',    type: 'Aloof',      blurb: 'Hard to impress. Its gifts are worth the wait.',                       size: 4,   pal: { body: [4, 12, 14], hi: [22, 58, 64], eye: [70, 200, 190] },  shy: 1.3, belly: 2, gen: 1.3,  temper: 1.4, warm: 0.8,  speed: 0.9, weight: 0.6 },
  { id: 'mabel',   name: 'Mabel',   type: 'Gracious',   blurb: 'Elegant and generous with those she trusts.',                           size: 4,   pal: { body: [18, 8, 24], hi: [60, 34, 74], eye: [210, 90, 150] },   shy: 1.1, belly: 2, gen: 1.3,  temper: 0.5, warm: 1.0,  speed: 0.95, weight: 0.6 },
];
const ROSTER_BY_ID = Object.fromEntries(ROSTER.map(d => [d.id, d]));
const sizeWord = d => d.size <= 3 ? 'Tiny' : d.size <= 3.5 ? 'Small' : d.size <= 4 ? 'Average' : d.size <= 4.5 ? 'Large' : 'Huge';
const traitWords = d => ({
  pace: d.speed < 0.85 ? 'Slow and steady' : d.speed > 1.2 ? 'Quick' : 'Average pace',
  shy: d.shy < 0.8 ? 'Bold' : d.shy < 1.15 ? 'Cautious' : 'Skittish',
  belly: d.belly <= 1 ? 'Dainty eater' : d.belly >= 3 ? 'Hearty eater' : 'Average eater',
  warm: d.warm < 0.95 ? 'Reserved' : d.warm > 1.1 ? 'Affectionate' : 'Even-tempered about people',
  gen: d.gen < 0.95 ? 'Stingy' : d.gen > 1.15 ? 'Generous' : 'Fair',
  temper: d.temper < 0.7 ? 'Easygoing' : d.temper > 1.1 ? 'Touchy' : 'Normal temper',
});
const PIX = '"VT323", monospace';
const ico = (i, cls = '') => `<i class="px ${cls}" style="--i:${i}"></i>`; // icon from images/ui.png
const FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

/* Upgrade tree: col/row place the node on the grid, `parent` must be owned (level>=1) to unlock. */
const UPGRADES = [
  { id: 'quality',   ico: 6, n: 'Tasty Treats',   d: 'Better food every 2 levels (worth more meal points and trust), +10% trust each', col: 2, row: 2, parent: null,      base: 3, g: 2.3, max: 10 },
  { id: 'restock',   ico: 8, n: 'Restock',        d: 'The sack refills faster: 9s, 7s, 5.5s, 4.5s ... per charge', col: 1, row: 3, parent: 'quality', base: 4, g: 2.2, max: 6 },
  { id: 'bag',       ico: 7, n: 'Bigger Bag',     d: '+2 food charges in the sack', col: 1, row: 2, parent: 'quality', base: 6, g: 2.0, max: 10 },
  { id: 'handful',   ico: 7, n: 'Bigger Handful', d: 'Each pop throws one more piece for the same charge (never more than your crow slots)', col: 0, row: 2, parent: 'bag', base: 30, g: 2.8, max: 4, capFn: () => D.maxCrows - 1 },
  { id: 'gentle',    ico: 9, n: 'Gentle Hands',   d: '+40% trust from each pet', col: 2, row: 1, parent: 'quality', base: 12, g: 2.2, max: 10 },
  { id: 'flock',     ico: 10, n: 'Nesting Spot',   d: '+1 max crow (you start with one)', col: 3, row: 2, parent: 'quality', base: 6, g: 3.2, max: 8 },
  { id: 'wings',     ico: 11, n: 'Strong Wings',   d: 'Shorter trips; one less meal point needed per 2 levels', col: 4, row: 1, parent: 'flock',   base: 40, g: 2.4, max: 10 },
  { id: 'autofeed',    ico: 19, n: 'Auto Feeder',    d: 'The sack pops out food by itself every 5s (faster each level)', col: 2, row: 3, parent: 'quality', base: 4, g: 2.6, max: 5 },
  { id: 'autodeposit', ico: 20, n: 'Auto Deposit',   d: 'Crows drop gifts into the gift box themselves: 50% / 75% / 100%', col: 3, row: 3, parent: 'quality', base: 5, g: 3.0, max: 3 },
  { id: 'appraisal', ico: 12, n: 'Appraisal Eye',  d: '+25% value, rarer finds',   col: 4, row: 0, parent: 'wings',   base: 60, g: 2.6, max: 10 },
];
const upMax = u => u.capFn ? Math.max(0, Math.min(u.max, u.capFn())) : u.max; // some upgrades are capped by something else (e.g. crow slots)
const UP = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

/* ================= STATE ================= */
const SAVE_KEY = 'cawCollector.v1';
const fresh = () => ({ earned: 0, tiers: {}, mins: {}, playTime: 0, pieces: 0, pets: 0, scares: 0, bestGift: null, coins: 0, food: CFG.startFood, attract: 0, trips: 0, delivered: 0, up: {}, crows: [], roster: {} });
let S = fresh();
try { Object.assign(S, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
S.roster = S.roster || {}; S.tiers = S.tiers || {}; S.mins = S.mins || {}; S.playTime = S.playTime || 0; S.earned = S.earned || 0; S.pieces = S.pieces || 0; S.pets = S.pets || 0; S.scares = S.scares || 0;
const R = id => (S.roster[id] = S.roster[id] || {}); // per-crow memory that outlives a visit: seen, banned, best trust

const lvl = id => S.up[id] || 0;
const D = {
  get foodMax() { return CFG.startFood + 2 * lvl('bag'); },
  get refillSec() { return CFG.refillSecs[Math.min(lvl('restock'), CFG.refillSecs.length - 1)]; },
  get regen() { return 1 / D.refillSec; },
  get popSize() { return Math.min(1 + lvl('handful'), D.maxCrows); }, // pieces per pop: one charge, never more than your crow slots
  get maxCrows() { return 1 + lvl('flock'); },
  get foodTier() { let t = 0; FOOD_TYPES.forEach((f, i) => { if (lvl('quality') >= f.q) t = i; }); return t; },
  get petRate() { return 1.2 * (1 + 0.4 * lvl('gentle')); },
  get autoFeedEvery() { return CFG.autoFeedSec / (1 + 0.25 * (lvl('autofeed') - 1)); },
  get autoDepositChance() { return [0, 0.5, 0.75, 1][Math.min(3, lvl('autodeposit'))]; },
  get mealsNeeded() { return Math.max(3, Math.min(CFG.mealsCap, CFG.mealsBase + Math.floor((S.trips || 0) / CFG.mealsStep)) - Math.floor(lvl('wings') / 2)); },
  get valueMul() { return 1 + 0.25 * lvl('appraisal'); },
  get luck() { return 0.03 * lvl('appraisal'); },
};
const foodTrustOf = tier => 0.7 * FOOD_TYPES[tier].mult * (1 + 0.1 * lvl('quality')); // trust one meal gives
const upCost = u => Math.floor(u.base * Math.pow(u.g, lvl(u.id)));
const unlocked = u => !u.parent || lvl(u.parent) > 0;
const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ coins: S.coins, food: S.food, attract: S.attract, trips: S.trips, delivered: S.delivered, up: S.up, roster: S.roster, earned: S.earned, tiers: S.tiers, mins: S.mins, playTime: S.playTime, pieces: S.pieces, pets: S.pets, scares: S.scares, bestGift: S.bestGift, crows: S.crows.map(c => ({ id: c.id, trust: c.trust, meals: c.meals, grudge: c.grudge })) })); } catch (e) {} };

/* ================= HELPERS ================= */
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const levelOf = t => { let l = LEVELS[0]; for (const x of LEVELS) if (t >= x.min) l = x; return l; };
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/* ================= SCENE ================= */
const canvas = $('#scene'), ctx = canvas.getContext('2d');
let W = 0, H = 0, floorY = 0, colors = {};
const bodies = [], floaters = [];
let BG_W = 800, BG_H = 334; // real size is read from images/crowbackground.webp once it loads
const IMG = {};
for (const [k, src] of Object.entries({ bg: 'images/crowbackground.webp', crow3: 'images/crow3.png', items: 'images/items.png', ui: 'images/ui.png' })) { const i = new Image(); i.src = src; IMG[k] = i; }
const ready = k => IMG[k].complete && IMG[k].naturalWidth > 0;
const HEART_SPR = 12;
function drawIcon(spr, x, y, scale = 2) { // 16x16 cell centered on x,y
  const sz = 16 * scale; ctx.drawImage(IMG.items, spr * 16, 0, 16, 16, Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
}
let bg = { x: 0, y: 0, s: 1 };
IMG.bg.addEventListener('load', () => layoutBg());
function layoutBg() { // "cover" the stage, bottom-aligned, crop left/right/top
  if (ready('bg')) { BG_W = IMG.bg.naturalWidth; BG_H = IMG.bg.naturalHeight; }
  const s = Math.max(W / BG_W, H / BG_H);
  bg = { s, x: (W - BG_W * s) / 2, y: H - BG_H * s };
  floorY = bg.y + BG_H * s * CFG.floorFrac;
  layoutObjects();
}

function resize() {
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  W = r.width; H = r.height; layoutBg();
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  colors = { top: cssVar('--sky-top'), bottom: cssVar('--sky-bottom'), grass: cssVar('--grass'), ground: cssVar('--ground') };
  for (const b of bodies) { b.x = clamp(b.x, b.r, W - b.r); }
}
new ResizeObserver(resize).observe(canvas);

function spawnBody(o) {
  const b = Object.assign({ x: 0, y: 0, vx: 0, vy: 0, r: 12, a: 0, va: 0, grab: false, size: 24 }, o);
  bodies.push(b);
  const same = bodies.filter(x => x.kind === b.kind);
  const cap = b.kind === 'food' ? CFG.maxFood : CFG.maxItems;
  if (same.length > cap) bodies.splice(bodies.indexOf(same[0]), 1);
  return b;
}
function floater(x, y, text, size = 18, spr = null) { floaters.push({ x, y, text, size, spr, t: 0, life: 1.1 }); }
const heart = (x, y) => floater(x, y, '', 0, HEART_SPR);

/* ---- Food sack (left) and gift crate (right). Positions are set in layoutObjects(). ---- */
const SACK_SPR = 13, CRATE_SPR = 14, OBJ_SCALE = 4;
const BAG = { x: 0, y: 0, cd: 0, shake: 0 };
const CRATE = { x: 0, y: 0, bounce: 0 };
function layoutObjects() { BAG.x = W / 2 - 38; BAG.y = floorY - 32 - CFG.objectLift; CRATE.x = W / 2 + 32; CRATE.y = floorY - 26 - CFG.objectLift; }
const inCrate = b => Math.abs(b.x - CRATE.x) < 30 && b.y > CRATE.y - 34 && b.y < CRATE.y + 30;
function creditGift(value, tier = 0) { // a gift reaches the crate: shinies, bounce and a popup (plus the numbers for the Stats screen)
  S.coins += value; S.earned += value; S.delivered = (S.delivered || 0) + 1; CRATE.bounce = 0.3;
  S.tiers[tier] = (S.tiers[tier] || 0) + 1; if (!S.bestGift || value > S.bestGift.value) S.bestGift = { n: ITEMS[tier].n, value };
  const m = Math.floor(S.playTime / 60), b = S.mins[m] = S.mins[m] || { e: 0, g: 0 }; b.e += value; b.g += 1;
  floater(CRATE.x, CRATE.y - 50, `+${value}`, 22, 3);
  save();
}
function deposit(b) { bodies.splice(bodies.indexOf(b), 1); creditGift(b.value, b.tier); } // dropped or thrown into the crate by the player
const AUTO = { t: 5 }; // Auto Feeder countdown
function popFood() { // pops D.popSize pieces out of the sack for ONE charge, up and in random directions
  S.food -= 1; S.attract = Math.min(CFG.maxAttract, S.attract + 0.6);
  const tier = D.foodTier, ft = FOOD_TYPES[tier];
  for (let i = 0; i < D.popSize; i++) {
    const ang = rand(-0.95, 0.95), sp = rand(520, 700); // ang: radians off vertical
    spawnBody({ kind: 'food', tier, e: ft.e, spr: ft.spr, x: BAG.x + rand(-6, 6), y: BAG.y - 34, vx: Math.sin(ang) * sp, vy: -Math.cos(ang) * sp, r: 9, size: 28, va: rand(-8, 8) });
  }
  BAG.shake = 0.15;
}
function grabFromSack() { // the player can click as fast as they like; only the charges limit them
  if (S.food < 1) { BAG.shake = 0.25; floater(BAG.x, BAG.y - 78, 'empty!', 14); return; }
  popFood(); floater(BAG.x, BAG.y - 82, 'pop!', 12);
}
function drawWorldObjects() {
  if (!ready('items')) return;
  ctx.imageSmoothingEnabled = false; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const label = (t, x, y, col = '#fff') => { ctx.font = `18px ${PIX}`; ctx.fillStyle = '#000'; ctx.fillText(t, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(t, x, y); };
  // sack
  const sh = BAG.shake > 0 ? Math.sin(BAG.shake * 60) * 3 : 0, sz = 16 * OBJ_SCALE;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(BAG.x, floorY + 12 - CFG.objectLift, 30, 6, 0, 0, 7); ctx.fill();
  ctx.globalAlpha = S.food < 1 ? 0.65 : 1;
  ctx.drawImage(IMG.items, SACK_SPR * 16, 0, 16, 16, Math.round(BAG.x - sz / 2 + sh), Math.round(BAG.y - sz / 2 + 6), sz, sz);
  ctx.globalAlpha = 1;
  const max = D.foodMax, full = Math.floor(S.food), frac = S.food - full, py = BAG.y - 52, pw = 12, gap = 4, tw = max * (pw + gap) - gap;
  for (let i = 0; i < max; i++) { // charge pips: full, partly refilled, empty
    const x = Math.round(BAG.x - tw / 2 + i * (pw + gap));
    ctx.fillStyle = '#000'; ctx.fillRect(x - 2, py - 2, pw + 4, 12);
    ctx.fillStyle = '#3b3048'; ctx.fillRect(x, py, pw, 8);
    ctx.fillStyle = '#ffcf5a'; if (i < full) ctx.fillRect(x, py, pw, 8); else if (i === full) ctx.fillRect(x, py, Math.round(pw * frac), 8);
  }
  if (lvl('autofeed') > 0) { // auto feeder timer: fills up until the next automatic pop
    const f = 1 - clamp(AUTO.t / D.autoFeedEvery, 0, 1);
    ctx.fillStyle = '#000'; ctx.fillRect(BAG.x - 26, py - 12, 52, 6); ctx.fillStyle = S.food < 1 ? '#7a5a5a' : '#7be39a'; ctx.fillRect(BAG.x - 24, py - 10, Math.round(48 * f), 2);
  }
  const wait = Math.ceil((1 - frac) / D.regen);
  const name = FOOD_TYPES[D.foodTier].n, txt = S.food < 1 ? `${name} ${wait}s` : lvl('autofeed') > 0 ? `${name} (auto)` : name;
  label(txt, BAG.x + 8, py - 22, S.food < 1 ? '#e0566a' : '#fff');
  drawIcon(FOOD_TYPES[D.foodTier].spr, BAG.x + 8 - ctx.measureText(txt).width / 2 - 14, py - 22, 1.5);
  // crate
  const bo = CRATE.bounce > 0 ? -Math.abs(Math.sin(CRATE.bounce * 18)) * 6 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(CRATE.x, floorY + 12 - CFG.objectLift, 34, 6, 0, 0, 7); ctx.fill();
  ctx.drawImage(IMG.items, CRATE_SPR * 16, 0, 16, 16, Math.round(CRATE.x - sz / 2), Math.round(CRATE.y - sz / 2 + 4 + bo), sz, sz);
  label(P.grab && P.grab.kind === 'item' ? 'DROP HERE' : 'GIFT BOX', CRATE.x, CRATE.y - 44, P.grab && P.grab.kind === 'item' ? '#ffcf5a' : '#fff');
}

/* ================= CROWS ================= */
const crows = S.crows = migrateCrows(S.crows || []);
let selCrow = null; // crow picked in the Flock list
function makeCrow(def, saved) {
  const r = R(def.id); r.seen = true;
  const trust = saved ? (saved.trust || 0) : (r.trust ?? CFG.startTrust);
  return {
    id: def.id, def, name: def.name, trust, grudge: saved?.grudge || 0,
    x: 0, y: 0, vx: 0, vy: 0, state: 'away', t: rand(0.2, 1.5), trip: false, gift: null,
    meals: saved?.meals || 0, lvl: levelIdx(trust), fleeT: 0, cawT: 0, lift: 0, petBank: CFG.petClicks, sq: 0, sqV: 0, pressT: 0, petGap: 0, holdT: 0, petMsg: 0, scareCd: 0, warned: false, full: 0, heartT: 0, face: 1, clock: Math.random() * 10, lx: 0, ly: 0, wx: 0, target: null,
  };
}
function migrateCrows(list) { // rebuild saved crows; old saves only had names
  const used = new Set(), out = [];
  for (const sv of list) {
    let d = ROSTER_BY_ID[sv.id] || ROSTER.find(x => x.name === sv.name && !used.has(x.id)) || ROSTER.find(x => !used.has(x.id) && !R(x.id).banned);
    if (!d || used.has(d.id)) continue;
    used.add(d.id); out.push(makeCrow(d, sv));
  }
  return out;
}
function pickArrival() { // who shows up next: random, not banned, not already here; new faces slightly favoured; the very first visitor is an easy one
  const here = new Set(crows.map(c => c.id)), pool = ROSTER.filter(d => !R(d.id).banned && !here.has(d.id));
  if (!pool.length) return null;
  const first = !ROSTER.some(d => R(d.id).seen), cand = first ? pool.filter(d => d.easy) : pool;
  const w = cand.map(d => d.weight * (R(d.id).seen ? 1 : 1.4)); let t = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cand.length; i++) { t -= w[i]; if (t <= 0) return cand[i]; }
  return cand[cand.length - 1];
}
function scare(c) { // you drove it off: it remembers. Enough of that and it stops visiting for good.
  if (c.scareCd > 0) return; c.scareCd = 1.5; S.scares++;
  c.grudge = Math.min(CFG.banAt, c.grudge + CFG.scareGrudge * c.def.temper);
  if (!c.warned && c.grudge >= CFG.grudgeWarn) { c.warned = true; floater(c.x, c.y - 96, `${c.name} is fed up!`, 18); }
  if (c.grudge >= CFG.banAt) {
    if (ROSTER.filter(d => !R(d.id).banned).length > CFG.minRoster) { R(c.id).banned = true; c.banned = true; floater(c.x, c.y - 96, `${c.name} is gone for good`, 20); }
    else c.grudge = CFG.banAt - 1; // never run out of crows
  }
}
function flyIn(c) {
  c.state = 'fly_in';
  c.x = Math.random() < 0.5 ? -40 : W + 40; c.y = rand(20, H * 0.35);
  c.lx = rand(60, W - 60); c.ly = floorY - 6;
}
function leave(c, trip) {
  c.state = 'flee'; c.trip = trip; c.gift = null; c.fleeT = 0;
  const dir = c.x < W / 2 ? -1 : 1;
  c.vx = dir * 220 * c.def.speed; c.vy = -280 * c.def.speed;
}
function rollGift(c) {
  // Rarity is capped by trust (no gems from a new friend) and each step up gets less likely.
  const cap = Math.min(ITEMS.length - 1, Math.floor(c.trust / CFG.tierEvery) + Math.floor(lvl('appraisal') / 3));
  const p = CFG.tierChanceBase + CFG.tierChanceTrust * clamp(c.trust, 0, 100) / 100 + D.luck + (c.def.gen - 1) * 0.15; // friendlier crows roll up more often
  let tier = 0;
  while (tier < cap && Math.random() < p) tier++;
  const it = ITEMS[tier];
  return { ...it, tier, value: Math.max(1, Math.round(it.v * D.valueMul * c.def.gen * rand(0.9, 1.2))) };
}
function autoDeposit(c) { // Auto Deposit upgrade: the crow puts the gift in the box itself
  const g = c.gift; c.gift = null; c.face = c.x < CRATE.x ? -1 : 1;
  floater(c.x, c.y - 56, 'in the box!', 14); creditGift(g.value, g.tier);
}
function dropGift(c) {
  const g = c.gift; c.gift = null;
  spawnBody({ kind: 'item', e: g.e, spr: g.tier, tier: g.tier, value: g.value, x: c.x, y: c.y - 30, vx: rand(-80, 80), vy: -250, r: 14, size: 32 });
  floater(c.x, c.y - 56, 'caw!', 16);
}

const handReach = (c, b) => b.grab && c.trust >= CFG.handTrust && b.y > floorY - 120; // held food a trusting crow can reach
function nearestFood(c) {
  if (c.full >= c.def.belly) return null;
  let best = null, bd = 1e9;
  for (const b of bodies) {
    if (b.kind === 'food' && handReach(c, b)) { const d = Math.abs(b.x - c.x); if (d < bd) { bd = d; best = b; } continue; }
    if (b.kind !== 'food' || b.grab || Math.abs(b.vy) > 200 || b.y < floorY - 40) continue;
    const d = Math.abs(b.x - c.x);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}

function petCrow(c) { // a click on a crow that is comfortable enough to be touched. Pet as much as you like: it stays put, but only the first few pets add affection.
  if (c.petGap > 0) return;
  c.petGap = 0.05; c.holdT = 1.2; c.happy = 0.7; c.pressT = CFG.pressT; S.pets = (S.pets || 0) + 1;
  if (c.petBank >= 1) {
    c.petBank -= 1; c.trust = Math.min(100, c.trust + CFG.petGain * (1 + 0.4 * lvl('gentle')) * trustMul(c));
    for (let i = 0; i < 3; i++) heart(c.x + rand(-26, 26), c.y - rand(40, 70) * (c.def.size / 4));
  } else if (c.petMsg <= 0) { floater(c.x, c.y - 70 * (c.def.size / 4), 'content~', 14); c.petMsg = 2.5; } // happy, but no fonder
}
function levelUp(c, idx) {
  floater(c.x, c.y - 96, `${LEVELS[idx].n}!`, 22);
  for (let i = 0; i < 6; i++) heart(c.x + rand(-34, 34), c.y - rand(40, 80));
  c.happy = 1.2;
}
const shyK = c => Math.max(0, 1 - c.trust / CFG.shyEnd); // 1 = very shy ... 0 = trusts you
const grudgeK = c => clamp(c.grudge, 0, 100) / 150; // a crow with a grudge keeps its distance even if it likes you
const walkRange = c => CFG.shyWalk * (shyK(c) * c.def.shy + grudgeK(c)), flyRange = c => CFG.shyFly * (shyK(c) * c.def.shy + grudgeK(c));
const trustMul = c => c.def.warm * (1 - clamp(c.grudge, 0, 100) / 150); // how quickly it warms up to you
function updateCrow(c, dt) {
  c.clock += dt; c.t -= dt; c.petBank = Math.min(CFG.petClicks, c.petBank + dt * CFG.petClicks / CFG.petRefill); c.pressT = Math.max(0, c.pressT - dt); c.sqV += (320 * ((c.pressT > 0 ? 1 : 0) - c.sq) - 26 * c.sqV) * dt; c.sq = clamp(c.sq + c.sqV * dt, -0.12, 1); c.holdT = Math.max(0, c.holdT - dt); c.petMsg = Math.max(0, c.petMsg - dt); c.petGap = Math.max(0, (c.petGap || 0) - dt); c.scareCd = Math.max(0, c.scareCd - dt); c.squishT = Math.max(0, (c.squishT || 0) - dt); c.grudge = Math.max(0, c.grudge - CFG.grudgeDecay * dt); c.full = Math.max(0, c.full - CFG.fullDecay * dt); c.happy = Math.max(0, (c.happy || 0) - dt); c.cawT = Math.max(0, c.cawT - dt); c.walking = false;
  const grounded = c.state === 'idle' || c.state === 'seek' || c.state === 'eat';
  const pd = Math.hypot(P.x - c.x, P.y - c.y);

  c.scared = Math.max(0, (c.scared || 0) - dt);
  const li = levelIdx(c.trust); if (li > c.lvl) levelUp(c, li); c.lvl = li;
  const wr = walkRange(c), shy = wr >= CFG.petReach; // a crow that can be touched (range under the pet reach) lets the cursor come all the way
  // true if stepping to nx would take a shy crow inside the cursor's range (it waits at the edge instead)
  const blocked = nx => shy && P.over && Math.hypot(P.x - nx, P.y - c.y) < wr + 6 && Math.hypot(P.x - nx, P.y - c.y) < pd;
  if (shy && grounded && P.over && c.state !== 'eat') { // back away first, fly off if the cursor keeps coming; the closer to trust, the smaller the range
    if (pd < flyRange(c) || (pd < 0.7 * wr && P.speed > 150)) { scare(c); leave(c, false); return; }
    if (pd < wr - 4) {
      const dir = c.x >= P.x ? 1 : -1, wx = clamp(c.x + dir * 160, 40, W - 40);
      if (Math.abs(wx - c.x) < 8) { scare(c); leave(c, false); return; } // cornered against the edge
      c.state = 'idle'; c.target = null; c.wx = wx; c.t = 0.6; c.scared = 0.5;
    }
  }
  switch (c.state) {
    case 'fly_in': {
      const dx = c.lx - c.x, dy = c.ly - c.y, d = Math.hypot(dx, dy), sp = Math.min(300, 80 + d * 1.2) * c.def.speed;
      if (d < 8) { c.x = c.lx; c.y = c.ly; c.state = 'idle'; c.t = rand(0.5, 2); if (c.gift) { if (c.autoDeposit) autoDeposit(c); else dropGift(c); } c.autoDeposit = false; }
      else { c.vx = dx / d * sp; c.vy = dy / d * sp; c.x += c.vx * dt; c.y += c.vy * dt; c.face = c.vx > 0 ? -1 : 1; }
      break;
    }
    case 'idle': {
      c.y = floorY - 6;
      if (c.holdT > 0) { c.wx = c.x; c.walking = false; break; } // being petted: stay exactly here, feet on the ground
      const food = nearestFood(c);
      if (food && (!shy || pd > wr)) { c.state = 'seek'; c.target = food; break; }
      if (c.t <= 0) { c.wx = clamp(c.x + rand(-140, 140), 40, W - 40); c.t = rand(1, 3); if (Math.random() < 0.2) c.cawT = 0.5; if (shy && P.over && Math.abs(c.wx - P.x) < wr) c.wx = c.x; }
      const dx = c.wx - c.x;
      const nx = c.x + Math.sign(dx) * (c.scared > 0 ? 110 : 50) * c.def.speed * dt;
      if (Math.abs(dx) > 4 && blocked(nx)) c.wx = c.x; // wait at the edge of the cursor's range, keep facing the same way
      else if (Math.abs(dx) > 4) { c.walking = true; c.x = nx; c.face = dx > 0 ? -1 : 1; c.y -= Math.abs(Math.sin(c.clock * 9)) * 12; } // hop on the idle pose
      break;
    }
    case 'seek': {
      c.y = floorY - 6;
      const f = c.target;
      if (c.holdT > 0) break; // stay put while being petted
      if (!f || !bodies.includes(f) || (f.grab && !handReach(c, f))) { c.state = 'idle'; break; }
      const dx = f.x - c.x, nx = c.x + Math.sign(dx) * 120 * c.def.speed * dt;
      if (Math.abs(dx) >= (f.grab ? 28 : 14) && blocked(nx)) break; // food is inside the cursor's range: wait at the edge, no turning
      c.face = dx > 0 ? -1 : 1;
      const reach = f.grab ? 28 : 14; // food in the player's hand is eaten from a little further away
      if (Math.abs(dx) < reach) {
        bodies.splice(bodies.indexOf(f), 1);
        const fromHand = f === P.grab; if (fromHand) P.grab = null;
        c.trust = Math.min(100, c.trust + foodTrustOf(f.tier ?? 0) * (fromHand ? 1.5 : 1) * trustMul(c)); c.full += 1; c.meals += FOOD_TYPES[f.tier ?? 0].pts; S.pieces++;
        if (fromHand) { floater(c.x, c.y - 70, 'from your hand!', 14); c.happy = 0.8; heart(c.x - 14, c.y - 50); }
        heart(c.x, c.y - 40);
        c.state = 'eat'; c.t = 0.7;
      } else { c.x = nx; c.y -= Math.abs(Math.sin(c.clock * 11)) * 14; } // hurried hop
      break;
    }
    case 'eat':
      c.y = floorY - 6;
      if (c.t <= 0) {
        if (c.meals >= D.mealsNeeded) { c.meals = 0; S.trips = (S.trips || 0) + 1; floater(c.x, c.y - 56, 'off to find something!', 14); leave(c, true); }
        else { c.state = 'idle'; c.t = rand(0.3, 1); }
      }
      break;
    case 'flee':
      c.fleeT += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.face = c.vx > 0 ? -1 : 1;
      if (c.banned && (c.y < -60 || c.x < -80 || c.x > W + 80)) { c.gone = true; break; }
      if (c.y < -60 || c.x < -80 || c.x > W + 80) { c.state = 'away'; c.t = c.trip ? rand(...CFG.tripTime) / (1 + 0.1 * lvl('wings')) / c.def.speed : rand(5, 9); }
      break;
    case 'away':
      if (c.t <= 0) {
        flyIn(c);
        if (c.trip) {
          c.gift = rollGift(c); c.trip = false;
          if (Math.random() < D.autoDepositChance) { c.autoDeposit = true; c.lx = clamp(CRATE.x + (Math.random() < 0.5 ? -1 : 1) * rand(55, 90), 60, W - 60); } // Auto Deposit: lands by the gift box
        }
      }
      break;
  }
}

// crow3.png: 36 frames of 32x32 art px (6x6 grid), all facing left. Frame groups from crow-reference3.gif:
//  0-3 idle | 4-5 caw | 9-15 peck | 18-22 wing flutter (takeoff) | 23 lean/hop | 24-29 flap loop | 30-31 wings up | 32-35 landing
const CROW_CELL = 32, FEET_ROW = 32, AIR_ROW = 24; // FEET_ROW: idle feet sit on this row of the cell; flight frames sit ~8 rows higher
const FLAP = [24, 25, 26, 27, 28, 29], FLUTTER = [19, 20, 21, 22], LAND = [32, 33, 34, 35], PECK = [9, 10, 11, 12, 13, 14, 15];
function crowFrame(c) {
  const t = c.clock;
  switch (c.state) {
    case 'fly_in': {
      const d = Math.hypot(c.lx - c.x, c.ly - c.y);
      return d < 90 ? LAND[Math.min(3, Math.floor((1 - d / 90) * 4))] : FLAP[Math.floor(t * 14) % 6];
    }
    case 'flee': return c.fleeT < 0.3 ? FLUTTER[Math.floor(c.fleeT * 14) % 4] : FLAP[Math.floor(t * 14) % 6];
    case 'eat': return PECK[Math.min(6, Math.floor((0.7 - c.t) * 10))];
    case 'seek': return 0; // hopping is done by moving the crow, the pose stays idle
    default:
      if (c.happy > 0) return 4 + Math.floor(t * 8) % 2;
      if (c.cawT > 0) return 4 + Math.floor(t * 6) % 2;
      return 0;
  }
}
const tintCache = {};
function tintedAtlas(def) { // the crow sprite recoloured with this crow's palette (exact colour swap of its three colours)
  if (def.pal === P0 || !ready('crow3')) return IMG.crow3;
  if (tintCache[def.id]) return tintCache[def.id];
  const cv = document.createElement('canvas'); cv.width = IMG.crow3.naturalWidth; cv.height = IMG.crow3.naturalHeight;
  const g = cv.getContext('2d'); g.drawImage(IMG.crow3, 0, 0);
  try {
    const d = g.getImageData(0, 0, cv.width, cv.height), px = d.data, M = { '6,6,5': def.pal.body, '34,32,32': def.pal.hi, '107,37,37': def.pal.eye };
    for (let i = 0; i < px.length; i += 4) { if (!px[i + 3]) continue; const m = M[`${px[i]},${px[i + 1]},${px[i + 2]}`]; if (m) { px[i] = m[0]; px[i + 1] = m[1]; px[i + 2] = m[2]; } }
    g.putImageData(d, 0, 0);
  } catch (e) { return IMG.crow3; } // e.g. opened from file://, where the canvas is locked
  return (tintCache[def.id] = cv);
}
const squishAmt = c => Math.max(0, c.sq); // 0 = standing, 1 = fully pressed
function drawCrow(c) {
  if (c.state === 'away') return;
  const S = c.def.size, k = S / 4, atlas = tintedAtlas(c.def); // k: scale for labels and hearts so a huge crow is not covered by its own name
  // lift: 0 = standing, 1 = airborne (blends the foot anchor so takeoff and landing do not pop)
  const target = c.state === 'fly_in' ? clamp(Math.hypot(c.lx - c.x, c.ly - c.y) / 90, 0, 1) : c.state === 'flee' ? clamp(c.fleeT / 0.35, 0, 1) : 0;
  c.lift += (target - c.lift) * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; // ground shadow
  const hop = c.lift < 0.2 ? Math.max(0, floorY - 6 - c.y) : 0; // height of the current hop
  ctx.beginPath(); ctx.ellipse(c.x, floorY + CFG.feetOffset - 1, (22 - 8 * c.lift) * (1 - hop / 40), 5 * (1 - hop / 60), 0, 0, 7); ctx.fill();
  const wr = walkRange(c); // comfort range: shows how close the cursor can come, shrinking as the crow trusts you
  if (wr >= CFG.petReach && (c === selCrow || (P.over && Math.hypot(P.x - c.x, P.y - c.y) < wr * 1.8))) {
    ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(c.x, floorY, wr, wr * 0.3, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(224,86,106,0.75)'; ctx.beginPath(); ctx.ellipse(c.x, floorY, flyRange(c), flyRange(c) * 0.3, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  if (ready('crow3')) {
    const f = crowFrame(c), pivot = FEET_ROW - (FEET_ROW - AIR_ROW) * c.lift;
    const dx = Math.round(c.x - CROW_CELL / 2 * S), dy = Math.round(c.y + 6 + CFG.feetOffset - pivot * S);
    ctx.save();
    if (c.sq > 0.005) { const sq = squishAmt(c), fy = c.y + 6 + CFG.feetOffset; ctx.translate(c.x, fy); ctx.scale(1, 1 - CFG.squish * sq); ctx.translate(-c.x, -fy); } // pet: pressed down from above, feet stay put
    if (c.face < 0) { ctx.translate(Math.round(c.x) * 2, 0); ctx.scale(-1, 1); }
    ctx.drawImage(atlas, (f % 6) * CROW_CELL, Math.floor(f / 6) * CROW_CELL, CROW_CELL, CROW_CELL, dx, dy, CROW_CELL * S, CROW_CELL * S); ctx.restore();
  }
  if (c.sq > 0.02 && ready('ui')) { // a hand comes down on the crow's head and presses it
    const sq = squishAmt(c), top = c.y + 6 + CFG.feetOffset - 13 * S * (1 - CFG.squish * sq), hy = top - 18 - (1 - sq) * 26;
    ctx.drawImage(IMG.ui, 9 * 16, 0, 16, 16, Math.round(c.x - 24), Math.round(hy - 24), 48, 48);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (c.gift && ready('items')) drawIcon(c.gift.tier, c.x + (c.face < 0 ? 1 : -1) * 36, c.y + 6, 1.5);
  if (c === selCrow) { // bouncing marker above the picked crow
    const my = c.y - 112 * k + Math.sin(performance.now() / 180) * 3; ctx.fillStyle = '#000'; ctx.fillRect(c.x - 8, my - 1, 16, 4); ctx.fillRect(c.x - 5, my + 3, 10, 4); ctx.fillRect(c.x - 2, my + 7, 4, 3);
    ctx.fillStyle = '#ffcf5a'; ctx.fillRect(c.x - 6, my, 12, 2); ctx.fillRect(c.x - 4, my + 2, 8, 3); ctx.fillRect(c.x - 1, my + 5, 2, 3);
  }
  if (ready('items')) { // three hearts: each fills from the bottom as the crow warms up to the next level
    for (let i = 0; i < 3; i++) {
      const lo = LEVELS[i].min, hi = LEVELS[i + 1].min, p = clamp((c.trust - lo) / (hi - lo), 0, 1), hx = c.x + (i - 1) * 28, hy = c.y - 76 * k, n = Math.ceil(6 * p);
      ctx.globalAlpha = 0.3; ctx.drawImage(IMG.items, HEART_SPR * 16, 0, 16, 16, Math.round(hx - 24), Math.round(hy - 24), 48, 48);
      ctx.globalAlpha = 1; if (p >= 1) ctx.drawImage(IMG.items, HEART_SPR * 16, 0, 16, 16, Math.round(hx - 24), Math.round(hy - 24), 48, 48); else if (n > 0) ctx.drawImage(IMG.items, HEART_SPR * 16, 11 - n, 16, n, Math.round(hx - 24), Math.round(hy - 24 + (11 - n) * 3), 48, n * 3);
    }
  }
  const lv = LEVELS[levelIdx(c.trust)];
  ctx.font = `18px ${PIX}`; ctx.fillStyle = '#000'; ctx.fillText(c.name, c.x + 1, c.y - 51 * k); ctx.fillStyle = lv.col; ctx.fillText(c.name, c.x, c.y - 52 * k);
  if (c.grudge >= 40) { const nw = ctx.measureText(c.name).width / 2 + 10; ctx.fillStyle = '#000'; ctx.fillText(c.grudge >= CFG.grudgeWarn ? '!!' : '!', c.x + nw + 1, c.y - 51 * k); ctx.fillStyle = '#e0566a'; ctx.fillText(c.grudge >= CFG.grudgeWarn ? '!!' : '!', c.x + nw, c.y - 52 * k); } // it is getting annoyed
}

/* ================= PHYSICS ================= */
function stepPhysics(dt) {
  const sub = 2, h = dt / sub;
  for (let s = 0; s < sub; s++) {
    for (const b of bodies) {
      if (b.grab) continue;
      b.vy += CFG.gravity * h; b.x += b.vx * h; b.y += b.vy * h; b.a += b.va * h;
      if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * CFG.bounce; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx * CFG.bounce; }
      const lim = floorY + 14;
      if (b.y + b.r > lim) {
        b.y = lim - b.r;
        if (b.vy > 0) b.vy = b.vy > 120 ? -b.vy * CFG.bounce : 0;
        b.vx -= b.vx * Math.min(1, 6 * h);
        b.va += (b.vx / b.r - b.va) * Math.min(1, 10 * h);
      }
    }
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j];
      if (a.grab && b.grab) continue;
      let dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d >= min || d === 0) continue;
      dx /= d; dy /= d;
      const wa = a.grab ? 0 : 1, wb = b.grab ? 0 : 1, tw = wa + wb, pen = min - d;
      a.x -= dx * pen * wa / tw; a.y -= dy * pen * wa / tw; b.x += dx * pen * wb / tw; b.y += dy * pen * wb / tw;
      const vn = (b.vx - a.vx) * dx + (b.vy - a.vy) * dy;
      if (vn < 0) {
        const j2 = -(1 + CFG.bounce) * vn / tw;
        a.vx -= dx * j2 * wa; a.vy -= dy * j2 * wa; b.vx += dx * j2 * wb; b.vy += dy * j2 * wb;
      }
    }
  }
}

function drawBody(b) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(b.x, floorY + 16, b.r * 0.9, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; // emoji glyphs inherit fillStyle alpha
  ctx.translate(b.x, b.y); ctx.rotate(b.a);
  if (b.kind === 'item' && b.tier >= 3) { ctx.shadowColor = b.tier >= 5 ? '#9fe8ff' : '#ffd166'; ctx.shadowBlur = 12 + Math.sin(performance.now() / 250) * 4; }
  if (b.spr != null && ready('items')) { const sz = b.kind === 'food' ? 28 : 32; ctx.imageSmoothingEnabled = false; ctx.drawImage(IMG.items, b.spr * 16, 0, 16, 16, -sz / 2, -sz / 2, sz, sz); }
  else { ctx.font = `${b.size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.e, 0, 2); }
  ctx.restore();
}

/* ================= INPUT ================= */
const P = { x: -999, y: -999, speed: 0, over: false, grab: null, last: 0, lx: 0, ly: 0, downX: 0, downY: 0, downT: 0, ox: 0, oy: 0, moved: 0 };
function pos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
canvas.addEventListener('pointerenter', () => P.over = true);
canvas.addEventListener('pointerleave', () => { if (!P.grab) P.over = false; });
canvas.addEventListener('pointermove', e => {
  const [x, y] = pos(e), now = performance.now(), dt = Math.max(1, now - P.last) / 1000;
  P.speed += (Math.hypot(x - P.x, y - P.y) / dt - P.speed) * 0.4;
  if (P.x < -900) P.speed = 0;
  P.x = x; P.y = y; P.last = now; P.over = true;
  if (!P.grab) canvas.style.cursor = Math.hypot(x - BAG.x, y - BAG.y) < CFG.sackReach || bodies.some(b => Math.hypot(b.x - x, b.y - y) < b.r + CFG.grabPad) ? 'grab' : 'default';
});
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  [P.x, P.y] = pos(e); P.over = true; P.speed = 0;
  P.downX = P.x; P.downY = P.y; P.downT = performance.now(); P.moved = 0;
  let pick = null, best = 1e9; // with the bigger reach, take the closest thing to the cursor, not just the topmost
  for (const b of bodies) { const d = Math.hypot(b.x - P.x, b.y - P.y) - b.r; if (d < CFG.grabPad && d < best) { best = d; pick = b; } }
  if (pick) { P.grab = pick; pick.grab = true; P.ox = pick.x - P.x; P.oy = pick.y - P.y; return; }
  // the sack or a crow? whichever is closer to the click wins (a crow standing by the sack must still be clickable)
  let hit = null, hd = 46;
  for (const c of crows) {
    if (c.state === 'away' || c.state === 'fly_in' || c.state === 'flee') continue;
    const d = Math.hypot(c.x - P.x, c.y - (P.y + 6)) / (c.def.size / 4); if (d < hd) { hd = d; hit = c; } // distance in 'crow-sizes' so big crows are easier to hit
  }
  const sd = Math.hypot(P.x - BAG.x, P.y - BAG.y);
  if (sd < 30 || (sd < CFG.sackReach && (!hit || (hd > 34 && sd < hd)))) { grabFromSack(); return; } // the sack's own body always pops food; elsewhere a click on a crow's body goes to the crow
  if (hit) { if (walkRange(hit) >= CFG.petReach) { scare(hit); leave(hit, false); } else petCrow(hit); }
});
const release = () => {
  const b = P.grab; if (!b) return;
  b.grab = false; P.grab = null;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

/* ================= UPGRADE TREE UI ================= */
const treeEl = $('#tree'), detailEl = $('#detail'), overlay = $('#tree-overlay');
let selected = 'quality';
const CELL = () => parseFloat(getComputedStyle(treeEl).getPropertyValue('--cell')) || 6.5;
const nodeEls = {}, lineEls = [];
let lastDetail = '';
detailEl.addEventListener('click', e => { if (e.target.closest('button')) buy(selected); });

function buildTree() {
  const cols = Math.max(...UPGRADES.map(u => u.col)) + 1, rows = Math.max(...UPGRADES.map(u => u.row)) + 1;
  treeEl.style.width = `calc(var(--cell) * ${cols})`; treeEl.style.height = `calc(var(--cell) * ${rows})`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${cols * 100} ${rows * 100}`); svg.setAttribute('preserveAspectRatio', 'none');
  treeEl.appendChild(svg);
  for (const u of UPGRADES) {
    if (u.parent) {
      const p = UP[u.parent], l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', p.col * 100 + 50); l.setAttribute('y1', p.row * 100 + 50);
      l.setAttribute('x2', u.col * 100 + 50); l.setAttribute('y2', u.row * 100 + 50);
      svg.appendChild(l); lineEls.push([l, u]);
    }
    const n = document.createElement('button');
    n.className = 'node';
    n.style.left = `calc(var(--cell) * ${u.col} + (var(--cell) - var(--node)) / 2)`;
    n.style.top = `calc(var(--cell) * ${u.row} + (var(--cell) - var(--node)) / 2)`;
    n.innerHTML = `${ico(u.ico)}<span class="lv"></span>`;
    n.onclick = () => { selected = u.id; renderTree(); };
    treeEl.appendChild(n); nodeEls[u.id] = n;
  }
}
function buy(id) {
  const u = UP[id], c = upCost(u);
  if (!unlocked(u) || lvl(id) >= upMax(u) || S.coins < c) return;
  S.coins -= c; S.up[id] = lvl(id) + 1;
  if (id === 'autofeed') AUTO.t = Math.min(AUTO.t, D.autoFeedEvery);
  if (id === 'flock') { S.attract = Math.max(S.attract, CFG.maxAttract / 2); spawnCd = 0; spawnT = 0; } // a new nesting spot draws the next crow right away
  save(); renderTree();
}
function renderTree() {
  for (const u of UPGRADES) {
    const n = nodeEls[u.id], l = lvl(u.id), open = unlocked(u), can = open && l < upMax(u) && S.coins >= upCost(u);
    n.className = 'node' + (!open ? ' locked' : '') + (can ? ' can' : '') + (l > 0 ? ' owned' : '') + (l >= u.max ? ' maxed' : '') + (selected === u.id ? ' sel' : '');
    n.querySelector('.lv').textContent = open ? `${l}/${u.capFn ? upMax(u) : u.max}` : '';
    const pic = n.querySelector('.px'); pic.style.setProperty('--i', open ? u.ico : 4); pic.classList.toggle('lock', !open);
  }
  for (const [l, u] of lineEls) l.classList.toggle('on', lvl(u.id) > 0);
  const u = UP[selected], l = lvl(u.id), maxed = l >= u.max, open = unlocked(u), capped = !maxed && l >= upMax(u);
  const html = `${ico(u.ico)}
    <div class="info"><b>${u.n} · Lv ${l}/${u.max}</b><span>${u.d}${open ? '' : ` — requires ${UP[u.parent].n}`}</span></div>
    <button class="btn-primary" ${(!open || maxed || capped || S.coins < upCost(u)) ? 'disabled' : ''}>${maxed ? 'Maxed' : capped ? 'Needs more crow slots' : `Buy ${upCost(u)}`}</button>`;
  if (html !== lastDetail) { detailEl.innerHTML = html; lastDetail = html; } // only touch the DOM when it changed, or clicks get lost
  $('#tree-coins').textContent = Math.floor(S.coins);
}
$('#open-tree').onclick = () => { overlay.hidden = false; renderTree(); };
$('#close-tree').onclick = () => overlay.hidden = true;
overlay.addEventListener('pointerdown', e => { if (e.target === overlay) overlay.hidden = true; });
window.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.hidden = true; });
$('#reset').onclick = () => { if (confirm('Reset all progress?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } };

/* ================= HUD + CROW LIST ================= */
const fmtT = sec => sec >= 60 ? `${Math.floor(sec / 60)}m ${Math.ceil(sec % 60)}s` : `${Math.ceil(sec)}s`;
const row = (k, v) => `<div class="row"><span>${k}</span><b>${v}</b></div>`;
const stat = (k, v) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`;

// Text for the popovers opened by clicking a HUD chip. Functions so the numbers stay live.
const INFO = {
  coins: () => ({ t: 'Shinies', h: `<p>Your money. Crows bring gifts; drag each gift into the gift box on the right of the field to turn it into shinies. Spend them in Upgrades.</p>${stat('Gifts delivered', S.delivered || 0)}${stat('Gift tiers', ITEMS.map(i => i.n).join(' · '))}` }),
  food: () => {
    const frac = S.food - Math.floor(S.food), full = S.food >= D.foodMax;
    return { t: 'Food charges', h: `<p>Grab food from the sack on the left, then drag and throw it out. Each pop uses one charge; there is no cooldown, so click as fast as you like.</p><p>Meal points: ${FOOD_TYPES.map(f => `${f.n} ${f.pts}`).join(', ')}.</p>${stat('Food', `${FOOD_TYPES[D.foodTier].n} (x${FOOD_TYPES[D.foodTier].mult} trust)`)}${stat('Charges', `${Math.floor(S.food)} / ${D.foodMax}`)}${stat('Next charge', full ? 'full' : fmtT((1 - frac) / D.regen))}${stat('Time per charge', fmtT(D.refillSec))}${stat('Pieces per pop', D.popSize)}${stat('Auto Feeder', lvl('autofeed') > 0 ? `every ${fmtT(D.autoFeedEvery)} (next ${fmtT(AUTO.t)})` : 'not bought')}<p style="margin-top:.5rem;color:var(--muted)">${FOOD_TYPES[D.foodTier + 1] ? `Next food: ${FOOD_TYPES[D.foodTier + 1].n} at Tasty Treats lv ${FOOD_TYPES[D.foodTier + 1].q}. ` : 'Best food unlocked. '}Bigger Bag adds charges, Restock refills faster, Bigger Handful throws more pieces per pop.</p>` };
  },
  crows: () => ({ t: 'Flock', h: `<p>Crows arrive when they notice food. Feed and pet them to earn trust. After enough meals a crow flies off and returns with a gift.</p>${stat('Crows', `${crows.length} / ${D.maxCrows}`)}${stat('Meal points per trip', D.mealsNeeded)}${stat('Next crow can arrive', spawnCd > 0 ? fmtT(spawnCd) : 'now')}<p style="margin-top:.5rem;color:var(--muted)">Click a crow in the Flock list for details. Nesting Spot adds room.</p>` }),
  attract: () => ({ t: 'Attraction', h: `<p>Rises each time you grab food and slowly fades. When it is high enough and there is room, a new crow may arrive.</p>${stat('Attraction', `${S.attract.toFixed(1)} / ${CFG.maxAttract}`)}${stat('Needed for a new crow', '0.5+')}${stat('Arrival cooldown', spawnCd > 0 ? fmtT(spawnCd) : 'ready')}` }),
};
const popEl = $('#info-pop'); let infoKey = null, infoBtn = null;
let lastPop = '';
function renderInfo() {
  if (!infoKey) return;
  const i = INFO[infoKey](), html = `<h3>${i.t}</h3>${i.h}`; if (html !== lastPop) { popEl.innerHTML = html; lastPop = html; } popEl.hidden = false;
  const r = infoBtn.getBoundingClientRect(), w = popEl.offsetWidth;
  popEl.style.top = `${r.bottom + 12}px`; popEl.style.left = `${clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8)}px`;
}
function closeInfo() { infoKey = null; lastPop = ''; popEl.hidden = true; document.querySelectorAll('button.chip.open').forEach(b => b.classList.remove('open')); }
document.querySelectorAll('button.chip[data-info]').forEach(btn => btn.addEventListener('click', e => {
  e.stopPropagation();
  const k = btn.dataset.info, same = infoKey === k; closeInfo();
  if (!same) { infoKey = k; infoBtn = btn; btn.classList.add('open'); renderInfo(); }
}));
document.addEventListener('click', e => { if (infoKey && !popEl.contains(e.target)) closeInfo(); });
window.addEventListener('keydown', e => { if (e.key === 'Escape') closeInfo(); });

const statusOf = c => c.state === 'away' ? (c.trip ? 'Away, finding a gift' : 'Away (spooked)') : c.state === 'flee' ? (c.trip ? 'Flying off for a gift' : 'Spooked!')
  : c.state === 'fly_in' ? (c.gift ? `Returning with a ${c.gift.n}` : 'Flying in') : c.state === 'eat' ? 'Eating' : c.state === 'seek' ? 'Going for food' : 'Looking around';
let lastCard = '', lastList = '';
function renderCard() {
  const card = $('#crow-card');
  if (!selCrow || !crows.includes(selCrow)) { selCrow = null; card.hidden = true; return; }
  const c = selCrow, d = c.def, lv = levelOf(c.trust), next = LEVELS.find(l => l.min > c.trust), rev = levelIdx(c.trust), tw = traitWords(d);
  const cap = Math.min(ITEMS.length - 1, Math.floor(c.trust / CFG.tierEvery) + Math.floor(lvl('appraisal') / 3));
  const trait = (need, k, v) => row(k, rev >= need ? v : '???'); // personality is revealed as you get to know the crow
  card.hidden = false;
  const html = `<h3>${c.name} <span class="lvl">· ${d.type}</span></h3>
    <div class="tip" style="margin:0 0 .4rem">${d.blurb}</div>
    ${row('Mood', lv.n)}
    <div class="bar"><div class="bar-fill" style="width:${c.trust}%"></div></div>
    ${row('Trust', `${Math.floor(c.trust)} / 100${next ? ` · ${next.n} at ${next.min}` : ''}`)}
    ${c.grudge > 1 ? `<div class="bar"><div class="bar-fill red" style="width:${c.grudge}%"></div></div>${row('Grudge', `${Math.floor(c.grudge)} / ${CFG.banAt}${c.grudge >= CFG.grudgeWarn ? ' (fed up!)' : ''}`)}` : ''}
    ${row('Meal points to trip', `${Math.floor(c.meals)} / ${D.mealsNeeded}`)}
    ${row('Belly', c.full >= d.belly ? `Full (${fmtT((c.full - d.belly + 1) / CFG.fullDecay)})` : 'Hungry')}
    ${row('Shyness', walkRange(c) >= CFG.petReach ? `backs off at ${Math.round(walkRange(c))}px, flies at ${Math.round(flyRange(c))}px` : 'lets you come close')}
    ${row('Hand feeding', c.trust >= CFG.handTrust ? 'Eats from your hand' : `at trust ${CFG.handTrust}`)}
    ${row('Petting', walkRange(c) >= CFG.petReach ? 'Too shy yet' : c.petBank >= 1 ? `Likes it (${Math.floor(c.petBank)} left to grow fonder)` : `Content (fonder again in ${fmtT((1 - c.petBank) * CFG.petRefill / CFG.petClicks)})`)}
    ${row('Doing', statusOf(c))}
    ${row('Gift quality', `up to ${ITEMS[cap].n}`)}
    ${row('Size', sizeWord(d))}${trait(1, 'Pace', tw.pace)}${trait(1, 'Nerve', tw.shy)}${trait(2, 'Appetite', tw.belly)}${trait(2, 'Warmth', tw.warm)}${trait(3, 'Generosity', tw.gen)}${trait(3, 'Temper', tw.temper)}
    <div class="tip">${walkRange(c) >= CFG.petReach ? 'Shy: backs away when the cursor comes near and flies off if it gets too close. Every scare adds to its grudge. Feed it from a distance.' : walkRange(c) >= CFG.petReach * 0.6 ? 'Getting used to you. Move slowly toward it, then click to pet.' : c.trust >= CFG.handTrust ? 'Click it to pet it, or hold food low near it to feed it by hand.' : 'Click it to pet it.'}</div>`;
  if (html !== lastCard) { card.innerHTML = html; lastCard = html; }
}
$('#crow-list').addEventListener('click', e => {
  const li = e.target.closest('li.crow'); if (!li) return;
  const c = crows[+li.dataset.i]; selCrow = selCrow === c ? null : c; updateUI(true);
});

/* ---- Field guide: every crow in the roster, silhouettes until you have met them ---- */
const guideOv = $('#guide-overlay'), guideGrid = $('#guide-grid');
let lastGuide = '';
function renderGuide() {
  if (!guideOv || guideOv.hidden) return;
  const here = new Set(crows.map(c => c.id)), seen = ROSTER.filter(d => R(d.id).seen).length;
  $('#guide-count').textContent = `${seen}/${ROSTER.length} met`;
  const html = ROSTER.map(d => {
    const r = R(d.id), met = !!r.seen, tw = traitWords(d), rev = met ? levelIdx(r.best || 0) : -1;
    const status = r.banned ? '<span style="color:#e0566a">Gone for good</span>' : here.has(d.id) ? '<span style="color:var(--good)">In your flock</span>' : met ? 'Not around right now' : 'Not met yet';
    const line = (need, k, v) => met ? `<div class="row"><span>${k}</span><b>${rev >= need ? v : '???'}</b></div>` : '';
    return `<div class="guide-card${met ? '' : ' unmet'}"><canvas class="thumb" width="96" height="96" data-id="${d.id}"></canvas>
      <div><h3>${met ? d.name : '???'} <span class="lvl">${met ? '· ' + d.type : ''}</span></h3>
      <div class="tip">${met ? d.blurb : 'Keep feeding and it might show up.'}</div>
      <div class="row"><span>Status</span><b>${status}</b></div>
      ${met ? `<div class="row"><span>Best bond</span><b>${levelOf(r.best || 0).n}</b></div>` : ''}
      ${met ? `<div class="row"><span>Size</span><b>${sizeWord(d)}</b></div>` : ''}${line(1, 'Pace', tw.pace)}${line(1, 'Nerve', tw.shy)}${line(2, 'Appetite', tw.belly)}${line(2, 'Warmth', tw.warm)}${line(3, 'Generosity', tw.gen)}${line(3, 'Temper', tw.temper)}</div></div>`;
  }).join('');
  if (html === lastGuide) return; lastGuide = html; guideGrid.innerHTML = html;
  guideGrid.querySelectorAll('canvas.thumb').forEach(cv => { // draw each crow's idle frame in its own colours
    const d = ROSTER_BY_ID[cv.dataset.id], g = cv.getContext('2d'), at = tintedAtlas(d); g.imageSmoothingEnabled = false;
    if (ready('crow3')) g.drawImage(at, 0, 0, 32, 32, 0, 0, 96, 96);
    if (!R(d.id).seen) cv.style.filter = 'brightness(0) opacity(0.55)';
  });
}
$('#open-guide')?.addEventListener('click', () => { guideOv.hidden = false; lastGuide = ''; renderGuide(); });
$('#close-guide')?.addEventListener('click', () => { guideOv.hidden = true; });
guideOv?.addEventListener('pointerdown', e => { if (e.target === guideOv) guideOv.hidden = true; });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && guideOv) guideOv.hidden = true; });
/* ---- Stats: tiles + three charts (income per minute, gifts by rarity, bond with each crow), drawn straight on canvases ---- */
const statsOv = $('#stats-overlay'), tipEl = $('#chart-tip');
const INK = { text: '#f2ecff', muted: '#a79bc2', grid: 'rgba(167,155,194,0.22)', bar: '#ffcf5a', barDim: 'rgba(255,207,90,0.45)', track: '#2d2438' };
const fmtDur = sec => { const m = Math.floor(sec / 60), h = Math.floor(m / 60); return h ? `${h}h ${m % 60}m` : `${m}m ${Math.floor(sec % 60)}s`; };
const fmtNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));
const chartHits = {}; // per canvas: regions for the hover tooltip
function prepCanvas(id, cssH) {
  const cv = $('#' + id); if (!cv || !cv.getContext) return null;
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 300, h = cssH;
  cv.style.height = h + 'px'; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.imageSmoothingEnabled = false; g.textBaseline = 'middle';
  chartHits[id] = []; return { g, w, h };
}
let incomeHover = -1; // minute under the cursor on the income chart
function chartIncome() { // shinies earned in each of the last 30 minutes, as a line
  const c = prepCanvas('ch-income', 190); if (!c) return; const { g, w, h } = c, N = 30, now = Math.floor(S.playTime / 60);
  const vals = Array.from({ length: N }, (_, i) => { const m = now - (N - 1 - i); return m >= 0 ? (S.mins[m]?.e || 0) : 0; });
  const top = niceMax(Math.max(10, ...vals)), L = 40, B = 22, T = 10, pw = w - L - 12, ph = h - B - T;
  const px = i => L + 6 + i * (pw - 6) / (N - 1), py = v => T + ph - ph * v / top;
  g.font = '16px VT323, monospace'; g.textAlign = 'right';
  for (let i = 0; i <= 2; i++) { const y = Math.round(T + ph - ph * i / 2); g.fillStyle = INK.grid; g.fillRect(L, y, pw + 6, 1); g.fillStyle = INK.muted; g.fillText(fmtNum(top * i / 2), L - 6, y); }
  g.beginPath(); g.moveTo(px(0), py(0)); vals.forEach((v, i) => g.lineTo(px(i), py(v))); g.lineTo(px(N - 1), py(0)); g.closePath(); g.fillStyle = 'rgba(255,207,90,0.14)'; g.fill(); // soft area under the line
  g.lineWidth = 2; g.lineJoin = 'round'; g.strokeStyle = INK.bar; g.beginPath(); vals.slice(0, N - 1).forEach((v, i) => i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))); g.stroke();
  g.setLineDash([4, 4]); g.strokeStyle = INK.barDim; g.beginPath(); g.moveTo(px(N - 2), py(vals[N - 2])); g.lineTo(px(N - 1), py(vals[N - 1])); g.stroke(); g.setLineDash([]); // this minute is not finished yet
  vals.forEach((v, i) => chartHits['ch-income'].push({ idx: i, x: px(i) - (pw - 6) / (N - 1) / 2, y: 0, w: (pw - 6) / (N - 1), h, tip: `${i === N - 1 ? 'This minute so far' : (N - 1 - i) + ' min ago'}: ${v} shinies${S.mins[now - (N - 1 - i)]?.g ? ` from ${S.mins[now - (N - 1 - i)].g} gifts` : ''}` }));
  const mark = (i, fill) => { g.fillStyle = INK.bar; g.fillRect(Math.round(px(i)) - 5, Math.round(py(vals[i])) - 5, 10, 10); if (!fill) { g.fillStyle = '#171120'; g.fillRect(Math.round(px(i)) - 2, Math.round(py(vals[i])) - 2, 4, 4); } };
  mark(N - 1, false);
  if (incomeHover >= 0 && incomeHover < N) { g.fillStyle = INK.muted; g.fillRect(Math.round(px(incomeHover)), T, 1, ph); mark(incomeHover, true); } // crosshair + marker
  g.fillStyle = INK.muted; g.textAlign = 'left'; g.fillText('30 min ago', L, h - 8); g.textAlign = 'right'; g.fillText('now', L + pw + 6, h - 8);
}
const niceMax = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 5, 10].map(m => m * p).find(x => x >= v) || v; };
function chartTiers() { // how many gifts of each rarity you have delivered
  const rows = ITEMS.length, rh = 34, c = prepCanvas('ch-tiers', rows * rh + 4); if (!c) return; const { g, w } = c, max = Math.max(1, ...ITEMS.map((_, i) => S.tiers[i] || 0)), L = 124, R = 44, pw = w - L - R;
  g.font = '18px VT323, monospace';
  ITEMS.forEach((it, i) => {
    const n = S.tiers[i] || 0, y = i * rh + 2, cy = y + rh / 2;
    if (ready('items')) g.drawImage(IMG.items, i * 16, 0, 16, 16, 2, y + 1, 32, 32);
    g.fillStyle = INK.text; g.textAlign = 'left'; g.fillText(it.n, 40, cy);
    g.fillStyle = INK.track; g.fillRect(L, cy - 5, pw, 10); const bw = Math.round(pw * n / max); g.fillStyle = INK.bar; if (bw > 0) g.fillRect(L, cy - 5, bw, 10);
    g.fillStyle = INK.text; g.textAlign = 'right'; g.fillText(String(n), w - 4, cy);
    const total = Object.values(S.tiers).reduce((a, b) => a + b, 0);
    chartHits['ch-tiers'].push({ x: 0, y, w, h: rh, tip: `${it.n}: ${n} delivered${total ? ` (${Math.round(100 * n / total)}% of all gifts)` : ''}, worth ${it.v} each` });
  });
}
function chartTrust() { // bond with every crow in the flock: bar = trust, red tick = grudge, ticks mark the levels
  const list = crows, rh = 32, c = prepCanvas('ch-trust', Math.max(1, list.length) * rh + 24); if (!c) return; const { g, w } = c, L = 90, R = 40, pw = w - L - R;
  g.font = '18px VT323, monospace';
  if (!list.length) { g.fillStyle = INK.muted; g.textAlign = 'left'; g.fillText('No crows yet. Throw some food.', 4, 20); return; }
  list.forEach((cr, i) => {
    const y = i * rh + 4, cy = y + rh / 2 - 2, lv = LEVELS[levelIdx(cr.trust)];
    g.fillStyle = INK.text; g.textAlign = 'left'; g.fillText(cr.name, 4, cy);
    g.fillStyle = INK.track; g.fillRect(L, cy - 6, pw, 12); g.fillStyle = lv.col; g.fillRect(L, cy - 6, Math.round(pw * cr.trust / 100), 12);
    if (cr.grudge > 1) { g.fillStyle = '#e0566a'; g.fillRect(L, cy + 7, Math.round(pw * cr.grudge / CFG.banAt), 3); }
    g.fillStyle = INK.text; g.textAlign = 'right'; g.fillText(String(Math.floor(cr.trust)), w - 4, cy);
    chartHits['ch-trust'].push({ x: 0, y, w, h: rh, tip: `${cr.name} (${cr.def.type}): ${Math.floor(cr.trust)}/100, ${lv.n}${cr.grudge > 1 ? `, grudge ${Math.floor(cr.grudge)}/${CFG.banAt}` : ''}` });
  });
  const base = list.length * rh + 12; g.fillStyle = INK.muted; g.font = '15px VT323, monospace'; g.textAlign = 'center';
  LEVELS.slice(1).forEach(l => { const x = L + pw * l.min / 100; g.fillStyle = INK.grid; g.fillRect(Math.round(x), 2, 1, list.length * rh); g.fillStyle = INK.muted; g.fillText(l.n, x, base + 4); });
}
function renderStats() {
  if (!statsOv || statsOv.hidden) return;
  const now = Math.floor(S.playTime / 60), last5 = [0, 1, 2, 3, 4].reduce((a, i) => a + (now - i >= 0 ? (S.mins[now - i]?.e || 0) : 0), 0) / Math.min(5, now + 1);
  const met = ROSTER.filter(d => R(d.id).seen).length, tile = (k, v) => `<div class="tile"><span>${k}</span><b>${v}</b></div>`;
  const html = tile('Time played', fmtDur(S.playTime)) + tile('Shinies earned', fmtNum(S.earned)) + tile('Per minute (last 5)', last5.toFixed(1)) + tile('Gifts delivered', fmtNum(S.delivered || 0))
    + tile('Best gift', S.bestGift ? `${S.bestGift.n} (${S.bestGift.value})` : 'none yet') + tile('Gift trips', S.trips || 0) + tile('Pieces fed', fmtNum(S.pieces)) + tile('Pets given', fmtNum(S.pets))
    + tile('Crows met', `${met} / ${ROSTER.length}`) + tile('Times you scared one', S.scares);
  const el = $('#stat-tiles'); if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; }
  chartIncome(); chartTiers(); chartTrust();
}
document.querySelectorAll('canvas.chart-cv').forEach(cv => { // hover: one tooltip for whichever mark is under the cursor
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, hit = (chartHits[cv.id] || []).find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
    if (cv.id === 'ch-income') { const was = incomeHover; incomeHover = hit ? hit.idx : -1; if (was !== incomeHover) chartIncome(); }
    if (!hit) { tipEl.hidden = true; return; }
    tipEl.textContent = hit.tip; tipEl.hidden = false; tipEl.style.left = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 8) + 'px'; tipEl.style.top = (e.clientY + 16) + 'px';
  });
  cv.addEventListener('pointerleave', () => { tipEl.hidden = true; if (cv.id === 'ch-income') { incomeHover = -1; chartIncome(); } });
});
$('#open-stats')?.addEventListener('click', () => { statsOv.hidden = false; renderStats(); });
$('#close-stats')?.addEventListener('click', () => { statsOv.hidden = true; tipEl.hidden = true; });
statsOv?.addEventListener('pointerdown', e => { if (e.target === statsOv) statsOv.hidden = true; });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && statsOv) { statsOv.hidden = true; tipEl.hidden = true; } });
const hudFoodIcon = document.querySelector('[data-info="food"] .px') || { style: { setProperty() {} } };
function updateUI() {
  for (const c of crows) R(c.id).best = Math.max(R(c.id).best || 0, c.trust);
  $('#hud-coins').textContent = Math.floor(S.coins);
  $('#hud-food').textContent = `${Math.floor(S.food)}/${D.foodMax}`;
  hudFoodIcon.style.setProperty('--i', FOOD_TYPES[D.foodTier].ui);
  $('#hud-crows').textContent = `${crows.length}/${D.maxCrows}`;
  $('#hud-attract').style.width = (S.attract / CFG.maxAttract * 100) + '%';
  const afford = UPGRADES.some(u => unlocked(u) && lvl(u.id) < upMax(u) && S.coins >= upCost(u));
  $('#tree-badge').hidden = !afford;
  const listHtml = crows.length ? crows.map((c, i) => {
    const lv = levelOf(c.trust), st = c.state === 'away' ? (c.trip ? 'fetching' : 'away') : c.gift ? ico(13) : `${Math.floor(c.meals)}/${D.mealsNeeded}`;
    return `<li class="crow${c === selCrow ? ' sel' : ''}" data-i="${i}">${ico(2)}<span class="name">${c.name} <span class="lvl">${lv.n}${c.grudge >= 40 ? ' <b style="color:#e0566a">!</b>' : ''}</span></span><span class="lvl">${st}</span><div class="bar"><div class="bar-fill" style="width:${c.trust}%"></div></div></li>`;
  }).join('') : '<li class="empty">No crows yet. Grab food from the sack and throw it out.</li>';
  if (listHtml !== lastList) { $('#crow-list').innerHTML = listHtml; lastList = listHtml; }
  renderCard(); renderInfo(); renderGuide(); renderStats();
  if (!overlay.hidden) renderTree();
}

/* ================= DEBUG PANEL ================= */
const DBG = { speed: 1, giftTier: 0, rosterId: 'edgar' };
const spawnDef = d => { if (!d || crows.some(c => c.id === d.id)) return; const c = makeCrow(d); c.t = 0; crows.push(c); flyIn(c); selCrow = c; };
const dbgTarget = () => selCrow && crows.includes(selCrow) ? selCrow : crows[0];
const dbgCrowAction = fn => () => { const c = dbgTarget(); if (c) fn(c); else floater(W / 2, floorY - 120, 'no crow', 16); };
const DEBUG_TOOLS = [
  { group: 'Crows (acts on the selected crow, else the first)' },
  { label: 'Spawn random crow', fn: () => spawnDef(pickArrival()) },
  { label: 'Spawn specific crow', select: () => ROSTER.map(d => [d.id, d.name]), key: 'rosterId', fn: () => spawnDef(ROSTER_BY_ID[DBG.rosterId]) },
  { label: 'Remove crow', fn: dbgCrowAction(c => { R(c.id).trust = c.trust; crows.splice(crows.indexOf(c), 1); selCrow = null; }) },
  { label: 'Grudge +30', fn: dbgCrowAction(c => { c.grudge = Math.min(CFG.banAt - 1, c.grudge + 30); }) },
  { label: 'Grudge 0', fn: dbgCrowAction(c => { c.grudge = 0; c.warned = false; }) },
  { label: 'Unban all crows', fn: () => ROSTER.forEach(d => { R(d.id).banned = false; }) },
  { label: 'Send for gift', fn: dbgCrowAction(c => { if (c.state === 'idle' || c.state === 'eat' || c.state === 'seek') leave(c, true); }) },
  { label: 'All crows: send for gift', fn: () => crows.forEach(c => { if (c.state === 'idle' || c.state === 'eat' || c.state === 'seek') leave(c, true); }) },
  { label: 'Meals: one point short of trip', fn: dbgCrowAction(c => { c.meals = D.mealsNeeded - 1; }) },
  { label: 'Trust +10', fn: dbgCrowAction(c => { c.trust = Math.min(100, c.trust + 10); }) },
  { label: 'Trust 100', fn: dbgCrowAction(c => { c.trust = 100; }) },
  { label: 'Trust 0', fn: dbgCrowAction(c => { c.trust = 0; }) },
  { label: 'Refill pets + hunger', fn: dbgCrowAction(c => { c.petBank = CFG.petClicks; c.full = 0; }) },
  { group: 'Gifts and money' },
  { label: 'Drop gift of tier', select: () => ITEMS.map((it, i) => [i, `${i}: ${it.n}`]), key: 'giftTier', fn: () => { const it = ITEMS[DBG.giftTier]; spawnBody({ kind: 'item', e: it.e, spr: DBG.giftTier, tier: DBG.giftTier, value: Math.round(it.v * D.valueMul), x: W / 2, y: 60, vx: rand(-80, 80), vy: 0, r: 14, size: 32 }); } },
  { label: 'Coins +100', fn: () => { S.coins += 100; } },
  { label: 'Coins +10000', fn: () => { S.coins += 10000; } },
  { label: 'Clear loose items', fn: () => { for (let i = bodies.length - 1; i >= 0; i--) if (!bodies[i].grab) bodies.splice(i, 1); } },
  { group: 'Food and world' },
  { label: 'Refill sack', fn: () => { S.food = D.foodMax; } },
  { label: 'Fill attraction', fn: () => { S.attract = CFG.maxAttract; spawnCd = 0; } },
  { label: 'Trips counter +10', fn: () => { S.trips = (S.trips || 0) + 10; } },
  { label: 'Game speed', select: () => [[1, '1x'], [3, '3x'], [10, '10x'], [30, '30x']], key: 'speed', fn: () => {} },
];
(function buildDebug() {
  const box = $('#debug-body'); if (!box) return;
  for (const t of DEBUG_TOOLS) {
    if (t.group) { const h = document.createElement('h4'); h.textContent = t.group; box.appendChild(h); continue; }
    const row = document.createElement('div'); row.className = 'dbg-row';
    const b = document.createElement('button'); b.className = 'btn-ghost'; b.textContent = t.label; b.onclick = t.fn; row.appendChild(b);
    if (t.select) {
      const sel = document.createElement('select');
      for (const [v, n] of t.select()) { const o = document.createElement('option'); o.value = v; o.textContent = n; sel.appendChild(o); }
      sel.value = DBG[t.key]; sel.onchange = () => { DBG[t.key] = isNaN(+sel.value) ? sel.value : +sel.value; if (t.key === 'speed') b.textContent = `Game speed: ${sel.options[sel.selectedIndex].text}`; };
      row.appendChild(sel); if (t.key === 'speed') b.textContent = 'Game speed: 1x';
    }
    box.appendChild(row);
  }
})();
const dbgPanel = $('#debug'), toggleDebug = () => { if (dbgPanel) dbgPanel.hidden = !dbgPanel.hidden; };
$('#open-debug')?.addEventListener('click', toggleDebug); $('#close-debug')?.addEventListener('click', toggleDebug);
window.addEventListener('keydown', e => { if (e.key === '`') toggleDebug(); });

/* ================= MAIN LOOP ================= */
let spawnT = 2, spawnCd = 0, uiT = 0, saveT = 0, last = performance.now();
function tick(dt) {
  S.playTime += dt;
  P.speed *= Math.exp(-6 * dt); BAG.shake = Math.max(0, BAG.shake - dt); CRATE.bounce = Math.max(0, CRATE.bounce - dt);

  S.food = Math.min(D.foodMax, S.food + D.regen * dt);
  if (lvl('autofeed') > 0) { // Auto Feeder: one food every few seconds, never piling up more than 2 loose pieces
    AUTO.t -= dt;
    if (AUTO.t <= 0) { AUTO.t = D.autoFeedEvery; if (S.food >= 1 && bodies.filter(b => b.kind === 'food').length < D.popSize + 2) popFood(); }
  }
  S.attract = Math.max(0, S.attract - 0.08 * dt);
  spawnT -= dt; spawnCd -= dt;
  if (spawnT <= 0) {
    spawnT = 2;
    if (spawnCd <= 0 && S.attract >= 0.5 && crows.length < D.maxCrows && Math.random() < Math.min(1, S.attract * 0.4)) {
      const d = pickArrival();
      if (d) { const c = makeCrow(d); c.t = 0; crows.push(c); flyIn(c); S.attract -= 0.5; spawnCd = CFG.crowSpawnCd; floater(W / 2, 90, R(d.id).seen && R(d.id).visits ? `${d.name} is back!` : `${d.name} is here!`, 20); R(d.id).visits = (R(d.id).visits || 0) + 1; }
    }
  }
  // dragged body follows pointer
  if (P.grab) {
    const b = P.grab, tx = P.x + P.ox, ty = P.y + P.oy, ox = b.x, oy = b.y;
    b.x = clamp(ox + (tx - ox) * Math.min(1, 25 * dt), b.r, W - b.r);
    b.y = Math.min(floorY + 14 - b.r, oy + (ty - oy) * Math.min(1, 25 * dt));
    b.vx += ((b.x - ox) / dt - b.vx) * 0.5; b.vy += ((b.y - oy) / dt - b.vy) * 0.5;
    const m = Math.hypot(b.vx, b.vy); if (m > 2500) { b.vx *= 2500 / m; b.vy *= 2500 / m; }
    P.moved = Math.max(P.moved, Math.hypot(P.x - P.downX, P.y - P.downY));
  }
  stepPhysics(dt);
  for (const b of bodies.slice()) if (b.kind === 'item' && !b.grab && inCrate(b)) deposit(b);
  for (const c of crows) updateCrow(c, dt);
  for (let i = crows.length - 1; i >= 0; i--) if (crows[i].gone) { if (selCrow === crows[i]) selCrow = null; crows.splice(i, 1); save(); }
  for (const f of floaters) { f.t += dt; f.y -= 30 * dt; }
  for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].t > floaters[i].life) floaters.splice(i, 1);
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  for (let i = 0; i < DBG.speed; i++) tick(dt); // debug game speed runs extra small steps, never bigger ones

  // draw
  ctx.imageSmoothingEnabled = false;
  if (ready('bg')) ctx.drawImage(IMG.bg, bg.x, bg.y, BG_W * bg.s, BG_H * bg.s);
  else { ctx.fillStyle = colors.top; ctx.fillRect(0, 0, W, H); }
  drawWorldObjects();
  for (const b of bodies) drawBody(b);
  for (const c of crows) drawCrow(c);
  for (const f of floaters) { ctx.globalAlpha = Math.max(0, 1 - f.t / f.life); if (f.text) { ctx.font = `${Math.round(f.size * 1.3)}px ${PIX}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const w = ctx.measureText(f.text).width, tx = f.spr != null ? f.x - 14 : f.x; ctx.fillStyle = '#000'; ctx.fillText(f.text, tx + 1, f.y + 1); ctx.fillStyle = '#fff'; ctx.fillText(f.text, tx, f.y); if (f.spr != null && ready('items')) drawIcon(f.spr, tx + w / 2 + 14, f.y, 1.5); }
    else if (f.spr != null && ready('items')) drawIcon(f.spr, f.x, f.y); }
  ctx.globalAlpha = 1;

  uiT -= dt; if (uiT <= 0) { uiT = 0.2; updateUI(); }
  saveT -= dt; if (saveT <= 0) { saveT = 5; save(); }
  requestAnimationFrame(frame);
}

buildTree(); renderTree(); resize();
for (const c of crows) { flyIn(c); c.t = 0; }
window.__caw = { S, D, crows, bodies, CFG, ROSTER, R, pickArrival, scare, BAG, CRATE, P, UPGRADES, buy, upCost, unlocked, lvl, floorY: () => floorY, W: () => W };
requestAnimationFrame(frame);
})();
