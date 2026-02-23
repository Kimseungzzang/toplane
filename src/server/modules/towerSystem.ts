// @ts-nocheck
function createTowerSystem(deps) {
  const {
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
    applyDamage,
    pushEffect,
  } = deps;

  function maybeTriggerTowerAggro(room, targetPlayer, source) {
    if (!targetPlayer || targetPlayer.kind !== "player") return;
    if (source.kind !== "player" && source.kind !== "skill") return;
    const attacker = getPlayerBySide(room, source.side);
    if (!attacker || attacker.dead) return;
    if (attacker.side === targetPlayer.side) return;

    const allyTower = room.towers[targetPlayer.side];
    if (!allyTower || allyTower.hp <= 0) return;
    const victimInTower = Math.abs(targetPlayer.x - allyTower.x) <= TOWER_RANGE;
    const attackerInTower = Math.abs(attacker.x - allyTower.x) <= TOWER_RANGE;
    if (!victimInTower || !attackerInTower) return;
    allyTower.aggroPlayerId = attacker.id;
    allyTower.aggroExpireAt = Date.now() + TOWER_AGGRO_HOLD_MS;
  }

  function getTowerTarget(room, tower) {
    const now = Date.now();
    const enemySide = tower.side === "blue" ? "red" : "blue";

    if (tower.aggroPlayerId) {
      const aggroPlayer = room.players.get(tower.aggroPlayerId);
      const validAggro =
        aggroPlayer &&
        !aggroPlayer.dead &&
        aggroPlayer.side === enemySide &&
        Math.abs(aggroPlayer.x - tower.x) <= TOWER_RANGE;
      if (validAggro && now <= tower.aggroExpireAt) return aggroPlayer;
      tower.aggroPlayerId = null;
      tower.aggroExpireAt = 0;
    }

    const enemyMinions = room.minions
      .filter((m) => m.side === enemySide && Math.abs(m.x - tower.x) <= TOWER_RANGE)
      .sort((a, b) => Math.abs(a.x - tower.x) - Math.abs(b.x - tower.x));
    if (enemyMinions.length) return enemyMinions[0];

    const enemyPlayers = getAlivePlayers(room, enemySide)
      .filter((p) => Math.abs(p.x - tower.x) <= TOWER_RANGE)
      .sort((a, b) => Math.abs(a.x - tower.x) - Math.abs(b.x - tower.x));
    return enemyPlayers[0];
  }

  function getTowerTargetByRef(room, tower, targetRef) {
    if (!targetRef) return null;
    const enemySide = tower.side === "blue" ? "red" : "blue";
    if (targetRef.kind === "player") {
      const p = room.players.get(targetRef.id);
      if (!p || p.dead || p.side !== enemySide) return null;
      if (Math.abs(p.x - tower.x) > TOWER_RANGE) return null;
      return p;
    }
    if (targetRef.kind === "minion") {
      const m = room.minions.find((x) => x.id === targetRef.id && x.side === enemySide);
      if (!m) return null;
      if (Math.abs(m.x - tower.x) > TOWER_RANGE) return null;
      return m;
    }
    return null;
  }

  function toTargetRef(target) {
    if (!target) return null;
    if (target.kind === "player") return { kind: "player", id: target.id };
    if (target.kind === "minion") return { kind: "minion", id: target.id };
    return null;
  }

  function computeTowerDamage(tower, target) {
    if (target?.kind !== "player") {
      tower.championShotStacks = 0;
      return TOWER_DAMAGE;
    }
    const now = Date.now();
    if (now - tower.lastChampionShotAt > TOWER_CHAMP_STACK_RESET_MS) {
      tower.championShotStacks = 0;
    }
    const damage = TOWER_DAMAGE * (1 + tower.championShotStacks * TOWER_CHAMP_STACK_BONUS);
    tower.championShotStacks = Math.min(TOWER_CHAMP_STACK_CAP, tower.championShotStacks + 1);
    tower.lastChampionShotAt = now;
    return damage;
  }

  function maybeResetTowerStacks(tower) {
    if (Date.now() - tower.lastChampionShotAt > TOWER_CHAMP_STACK_RESET_MS) {
      tower.championShotStacks = 0;
    }
  }

  function updateTowers(room, dtSec) {
    for (const tower of Object.values(room.towers || {}) as any[]) {
      const now = Date.now();
      maybeResetTowerStacks(tower);
      tower.cooldown = Math.max(0, tower.cooldown - dtSec);
      if (tower.hp <= 0) continue;

      if (tower.projectile && now >= tower.projectile.arriveAt) {
        const impactTarget = getTowerTargetByRef(room, tower, tower.projectile.targetRef);
        if (impactTarget) {
          applyDamage(room, impactTarget, tower.projectile.damage, {
            side: tower.side,
            kind: "tower",
          });
          pushEffect(
            room,
            {
              type: "tower_impact",
              side: tower.side,
              x: impactTarget.x,
              radius: 78,
              color: "#ffe5a6",
            },
            220
          );
        }
        tower.projectile = null;
      }

      if (tower.windupUntil > 0 && now >= tower.windupUntil) {
        const lockedTarget = getTowerTargetByRef(room, tower, tower.windupTarget);
        tower.windupUntil = 0;
        tower.windupTarget = null;
        if (!lockedTarget) continue;
        const shotDamage = computeTowerDamage(tower, lockedTarget);
        const travelMs = Math.max(
          120,
          Math.floor((Math.abs(lockedTarget.x - tower.x) / TOWER_PROJECTILE_SPEED) * 1000)
        );
        tower.projectile = {
          targetRef: toTargetRef(lockedTarget),
          damage: shotDamage,
          fromX: tower.x,
          toX: lockedTarget.x,
          launchAt: now,
          arriveAt: now + travelMs,
        };
        pushEffect(
          room,
          {
            type: "tower_projectile",
            side: tower.side,
            x: tower.x,
            targetX: lockedTarget.x,
            fromX: tower.x,
            toX: lockedTarget.x,
            launchAt: now,
            arriveAt: now + travelMs,
            color: "#fff2a8",
          },
          travelMs + 40
        );
        tower.cooldown = TOWER_COOLDOWN;
        continue;
      }

      if (tower.cooldown > 0 || tower.windupUntil > 0 || tower.projectile) continue;
      const target = getTowerTarget(room, tower);
      if (!target) continue;
      tower.windupTarget = toTargetRef(target);
      tower.windupUntil = now + TOWER_WINDUP_MS;
      pushEffect(
        room,
        {
          type: "tower_warn",
          side: tower.side,
          x: target.x,
          radius: 92,
          color: "#ffd37d",
        },
        TOWER_WINDUP_MS
      );
    }
    room.minions = room.minions.filter((m) => m.hp > 0);
  }

  return {
    maybeTriggerTowerAggro,
    updateTowers,
  };
}

module.exports = {
  createTowerSystem,
};

