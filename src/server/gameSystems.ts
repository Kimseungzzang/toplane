const {
  CHAMPIONS,
  WORLD_WIDTH,
  PLAYER_RADIUS,
  RESPAWN_MS,
  GOLD_PER_SEC,
  GOLD_KILL_PLAYER,
  GOLD_KILL_MINION,
  MINION_DAMAGE,
  MINION_ATTACK_CD,
  MINION_RANGE,
  MINION_SPEED,
  MINION_RADIUS,
  TOWER_RANGE,
  TOWER_DAMAGE,
  TOWER_COOLDOWN,
  TOWER_AGGRO_HOLD_MS,
  TOWER_WINDUP_MS,
  TOWER_PROJECTILE_SPEED,
  TOWER_CHAMP_STACK_RESET_MS,
  TOWER_CHAMP_STACK_BONUS,
  TOWER_CHAMP_STACK_CAP,
} = require("./modules/config");
const { createCombatSystem } = require("./modules/combat");
const { createTowerSystem } = require("./modules/towerSystem");

function createGameSystems(deps) {
  const {
    pushEffect,
    clamp,
    getPlayerBySide,
    getOpponentPlayers,
    getAlivePlayers,
    revealIfInBush,
  } = deps;

  let towerSystem;
  const combatSystem = createCombatSystem({
    CHAMPIONS,
    WORLD_WIDTH,
    PLAYER_RADIUS,
    RESPAWN_MS,
    GOLD_PER_SEC,
    GOLD_KILL_PLAYER,
    GOLD_KILL_MINION,
    MINION_DAMAGE,
    MINION_ATTACK_CD,
    MINION_RANGE,
    MINION_SPEED,
    MINION_RADIUS,
    pushEffect,
    clamp,
    getPlayerBySide,
    getOpponentPlayers,
    getAlivePlayers,
    revealIfInBush,
    onPlayerDamaged: (room, targetPlayer, source) => {
      if (towerSystem) towerSystem.maybeTriggerTowerAggro(room, targetPlayer, source);
    },
  });

  towerSystem = createTowerSystem({
    TOWER_RANGE,
    TOWER_DAMAGE,
    TOWER_COOLDOWN,
    TOWER_AGGRO_HOLD_MS,
    TOWER_WINDUP_MS,
    TOWER_PROJECTILE_SPEED,
    TOWER_CHAMP_STACK_RESET_MS,
    TOWER_CHAMP_STACK_BONUS,
    TOWER_CHAMP_STACK_CAP,
    getAlivePlayers,
    getPlayerBySide,
    applyDamage: combatSystem.applyDamage,
    pushEffect,
  });

  return {
    combatSystem,
    towerSystem,
  };
}

module.exports = {
  createGameSystems,
};


