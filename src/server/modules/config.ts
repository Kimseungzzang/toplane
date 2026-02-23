// @ts-nocheck
const TICK_RATE = 20;
const TICK_MS = Math.floor(1000 / TICK_RATE);
const WORLD_WIDTH = 2000;
const PLAYER_RADIUS = 28;
const RESPAWN_MS = 4000;
const TOWER_RANGE = 320;
const TOWER_DAMAGE = 18;
const TOWER_COOLDOWN = 0.6;
const MINION_SPEED = 70;
const MINION_RADIUS = 16;
const MINION_HP = 80;
const MINION_DAMAGE = 8;
const MINION_RANGE = 42;
const MINION_ATTACK_CD = 0.9;
const WAVE_INTERVAL = 8;
const WAVE_SIZE = 3;
const GOLD_PER_SEC = 4;
const GOLD_KILL_PLAYER = 120;
const GOLD_KILL_MINION = 18;
const TOWER_AGGRO_HOLD_MS = 1250;
const TOWER_WINDUP_MS = 240;
const TOWER_PROJECTILE_SPEED = 900;
const TOWER_CHAMP_STACK_RESET_MS = 3000;
const TOWER_CHAMP_STACK_BONUS = 0.4;
const TOWER_CHAMP_STACK_CAP = 4;
const BUSH_ZONES = [
  { start: 520, end: 760 },
  { start: 1240, end: 1480 },
];

const CHAMPIONS = {
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    hp: 390,
    moveSpeed: 255,
    attackRange: 95,
    attackDamage: 34,
    attackCd: 0.55,
    armor: 38,
    critChance: 0.1,
    critMult: 1.75,
    passive: { name: "Resolve", regenPerSec: 4.5, outOfCombatSec: 6 },
    q: { name: "Swift Slash", cd: 7, range: 120, bonusDamage: 34, msBonus: 70, msDur: 1.75 },
    w: { name: "Iron Guard", cd: 18, dur: 2.5, reduction: 0.35 },
    e: { name: "Cyclone Edge", cd: 9, dur: 2.7, tickDamage: 16, tickEvery: 0.45, range: 145 },
    r: { name: "Final Verdict", cd: 65, range: 210, base: 160, missingHpRatio: 0.28 },
  },
  executioner: {
    id: "executioner",
    name: "Executioner",
    hp: 430,
    moveSpeed: 235,
    attackRange: 100,
    attackDamage: 42,
    attackCd: 0.68,
    armor: 40,
    critChance: 0.05,
    critMult: 1.75,
    passive: { name: "Hemorrhage", stackDamage: 6, maxStacks: 5, dotDur: 5, adPerStack: 2 },
    q: { name: "Crimson Arc", cd: 8, innerRange: 75, outerRange: 165, innerDamage: 36, outerDamage: 72, healOuter: 20 },
    w: { name: "Crippling Blow", cd: 6, range: 115, bonusDamage: 42, slowDur: 1.1, slowAmt: 0.35 },
    e: { name: "Hook Pull", cd: 18, range: 200, pullDistance: 115, armorPenDur: 4, armorPenRatio: 0.28 },
    r: { name: "Doomfall", cd: 85, range: 190, base: 120, bleedStackScale: 40, resetWindow: 6 },
  },
};

const SHOP_ITEMS = {
  longsword: { id: "longsword", name: "Long Sword", cost: 300, desc: "+8 AD", apply: (p) => { p.attackDamage += 8; } },
  boots: { id: "boots", name: "Boots", cost: 250, desc: "+25 MS", apply: (p) => { p.moveSpeed += 25; } },
  ruby: { id: "ruby", name: "Ruby Crystal", cost: 350, desc: "+90 Max HP", apply: (p) => { p.maxHp += 90; p.hp = Math.min(p.maxHp, p.hp + 90); } },
  cloak: { id: "cloak", name: "Agile Cloak", cost: 400, desc: "+15% Crit", apply: (p) => { p.critChance += 0.15; } },
  potion: { id: "potion", name: "Potion", cost: 120, desc: "Heal 120", apply: (p) => { p.hp = Math.min(p.maxHp, p.hp + 120); } },
};

module.exports = {
  TICK_RATE,
  TICK_MS,
  WORLD_WIDTH,
  PLAYER_RADIUS,
  RESPAWN_MS,
  TOWER_RANGE,
  TOWER_DAMAGE,
  TOWER_COOLDOWN,
  MINION_SPEED,
  MINION_RADIUS,
  MINION_HP,
  MINION_DAMAGE,
  MINION_RANGE,
  MINION_ATTACK_CD,
  WAVE_INTERVAL,
  WAVE_SIZE,
  GOLD_PER_SEC,
  GOLD_KILL_PLAYER,
  GOLD_KILL_MINION,
  TOWER_AGGRO_HOLD_MS,
  TOWER_WINDUP_MS,
  TOWER_PROJECTILE_SPEED,
  TOWER_CHAMP_STACK_RESET_MS,
  TOWER_CHAMP_STACK_BONUS,
  TOWER_CHAMP_STACK_CAP,
  BUSH_ZONES,
  CHAMPIONS,
  SHOP_ITEMS,
};

