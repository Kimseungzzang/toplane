const { WORLD_WIDTH, MINION_HP, CHAMPIONS } = require("./config");

function createPlayer(id, side) {
  return {
    kind: "player",
    id,
    side,
    x: side === "blue" ? 200 : WORLD_WIDTH - 200,
    hp: 1,
    maxHp: 1,
    moveSpeed: 240,
    attackRange: 95,
    attackDamage: 30,
    attackCd: 0.6,
    armor: 30,
    armorPenRatio: 0,
    critChance: 0,
    critMult: 1.75,
    championId: null,
    championName: null,
    revealedUntil: 0,
    dead: false,
    respawnAt: 0,
    attackCooldown: 0,
    qCooldown: 0,
    wCooldown: 0,
    eCooldown: 0,
    rCooldown: 0,
    buffs: {
      damageReductionUntil: 0,
      bonusMsUntil: 0,
      bonusMs: 0,
      qEmpoweredUntil: 0,
      qBonusDamage: 0,
      wSlowUntil: 0,
      wSlowRatio: 0,
      spinningUntil: 0,
      spinTickAt: 0,
      spinTickDamage: 0,
      spinRange: 0,
      armorPenUntil: 0,
      rResetUntil: 0,
      outOfCombatAt: Date.now(),
    },
    dots: {
      bleedStacks: 0,
      bleedUntil: 0,
      bleedTickAt: 0,
      bleedTickDamage: 0,
    },
    input: {
      left: false,
      right: false,
      attack: false,
      skillQ: false,
      skillW: false,
      skillE: false,
      skillR: false,
      seq: 0,
    },
    lastPress: { attack: false, q: false, w: false, e: false, r: false },
    score: 0,
    pingMs: 0,
    gold: 500,
    inventory: {},
  };
}

function createTower(side) {
  return {
    kind: "tower",
    side,
    x: side === "blue" ? 70 : WORLD_WIDTH - 70,
    hp: 900,
    maxHp: 900,
    cooldown: 0,
    aggroPlayerId: null,
    aggroExpireAt: 0,
    windupUntil: 0,
    windupTarget: null,
    projectile: null,
    championShotStacks: 0,
    lastChampionShotAt: 0,
  };
}

function createMinion(side, x, laneOffset) {
  return {
    kind: "minion",
    id: `${side}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    side,
    x,
    laneOffset,
    hp: MINION_HP,
    maxHp: MINION_HP,
    cooldown: 0,
  };
}

function createRoomState(code) {
  return {
    code,
    started: false,
    ended: false,
    winner: null,
    players: new Map(),
    socketToPlayerId: new Map(),
    towers: { blue: createTower("blue"), red: createTower("red") },
    minions: [],
    waveTimer: 2,
    effects: [],
  };
}

function setChampion(player, championId) {
  const c = CHAMPIONS[championId];
  if (!c) return false;
  player.championId = c.id;
  player.championName = c.name;
  player.maxHp = c.hp;
  player.hp = c.hp;
  player.moveSpeed = c.moveSpeed;
  player.attackRange = c.attackRange;
  player.attackDamage = c.attackDamage;
  player.attackCd = c.attackCd;
  player.armor = c.armor;
  player.critChance = c.critChance;
  player.critMult = c.critMult;
  return true;
}

module.exports = { createPlayer, createTower, createMinion, createRoomState, setChampion };


