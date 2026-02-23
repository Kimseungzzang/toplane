function createCombatSystem(deps) {
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
    pushEffect,
    clamp,
    getPlayerBySide,
    getOpponentPlayers,
    getAlivePlayers,
    revealIfInBush,
    onPlayerDamaged,
  } = deps;

  function effectiveArmor(target, sourcePlayer) {
    const pen = sourcePlayer?.buffs.armorPenUntil > Date.now() ? sourcePlayer.armorPenRatio : 0;
    return Math.max(0, target.armor * (1 - pen));
  }

  function scaleByArmor(rawDamage, armor) {
    return rawDamage * (100 / (100 + Math.max(0, armor)));
  }

  function applyBleedIfNeeded(target, sourcePlayer) {
    if (!sourcePlayer || sourcePlayer.championId !== "executioner") return;
    const now = Date.now();
    const cfg = CHAMPIONS.executioner.passive;
    target.dots.bleedStacks = Math.min(cfg.maxStacks, target.dots.bleedStacks + 1);
    target.dots.bleedUntil = now + cfg.dotDur * 1000;
    target.dots.bleedTickAt = now + 1000;
    target.dots.bleedTickDamage = cfg.stackDamage * target.dots.bleedStacks;
  }

  function addGoldToSide(room, side, amount) {
    const p = getPlayerBySide(room, side);
    if (p) p.gold += amount;
  }

  function markCombat(player) {
    player.buffs.outOfCombatAt = Date.now();
  }

  function applyDamage(room, target, rawDamage, source) {
    if (!target || rawDamage <= 0) return;
    if (target.kind === "player" && target.dead) return;
    if (target.kind === "player" && onPlayerDamaged) {
      onPlayerDamaged(room, target, source);
    }
    const now = Date.now();
    let finalDamage = rawDamage;

    if (target.kind === "player") {
      const srcPlayer = source.kind === "player" ? source.player : getPlayerBySide(room, source.side);
      const armor = effectiveArmor(target, srcPlayer);
      finalDamage = scaleByArmor(rawDamage, armor);
      if (target.buffs.damageReductionUntil > now) {
        finalDamage *= 1 - target.buffs.damageReductionRatio;
      }
      markCombat(target);
      if (srcPlayer) markCombat(srcPlayer);
    }

    target.hp -= finalDamage;
    if (target.hp > 0) return;
    target.hp = 0;

    if (target.kind === "player") {
      target.dead = true;
      target.respawnAt = now + RESPAWN_MS;
      const killer = getPlayerBySide(room, source.side);
      if (killer) killer.score += 1;
      if (source.kind === "player" || source.kind === "skill") addGoldToSide(room, source.side, GOLD_KILL_PLAYER);
      if (source.kind === "skill" && source.skillKey === "r" && killer?.championId === "executioner") {
        killer.buffs.rResetUntil = now + CHAMPIONS.executioner.r.resetWindow * 1000;
      }
      return;
    }

    if (target.kind === "minion") {
      if (source.kind === "player" || source.kind === "skill") addGoldToSide(room, source.side, GOLD_KILL_MINION);
    }
  }

  function nearestEnemyPlayer(room, player, range) {
    return getOpponentPlayers(room, player.side)
      .filter((e) => Math.abs(e.x - player.x) <= range)
      .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0];
  }

  function tryBasicAttack(room, player) {
    if (player.dead || player.attackCooldown > 0 || !player.championId) return;
    const enemySide = player.side === "blue" ? "red" : "blue";
    const candidates = [];
    const enemyP = nearestEnemyPlayer(room, player, player.attackRange);
    if (enemyP) candidates.push(enemyP);
    room.minions
      .filter((m) => m.side === enemySide && Math.abs(m.x - player.x) <= player.attackRange)
      .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))
      .slice(0, 1)
      .forEach((m) => candidates.push(m));
    const enemyTower = room.towers[enemySide];
    if (enemyTower.hp > 0 && Math.abs(enemyTower.x - player.x) <= player.attackRange) candidates.push(enemyTower);
    if (!candidates.length) return;
    revealIfInBush(player, 1000);
    const target = candidates[0];

    let damage = player.attackDamage;
    if (Math.random() < player.critChance) damage *= player.critMult;
    if (player.buffs.qEmpoweredUntil > Date.now()) {
      damage += player.buffs.qBonusDamage;
      player.buffs.qEmpoweredUntil = 0;
      player.buffs.qBonusDamage = 0;
    }

    applyDamage(room, target, damage, { side: player.side, kind: "player", player });
    if (target.kind === "player") applyBleedIfNeeded(target, player);
    player.attackCooldown = player.attackCd;
  }

  function castQ(room, player) {
    if (player.qCooldown > 0 || player.dead) return;
    revealIfInBush(player, 1000);
    const c = CHAMPIONS[player.championId];
    if (!c) return;
    if (player.championId === "vanguard") {
      player.buffs.bonusMs = c.q.msBonus;
      player.buffs.bonusMsUntil = Date.now() + c.q.msDur * 1000;
      player.buffs.qEmpoweredUntil = Date.now() + c.q.msDur * 1000;
      player.buffs.qBonusDamage = c.q.bonusDamage;
      pushEffect(room, { type: "ring", side: player.side, x: player.x, radius: c.q.range, color: "#f5d06f" }, 500);
    } else if (player.championId === "executioner") {
      const enemies = getOpponentPlayers(room, player.side);
      for (const e of enemies) {
        const dist = Math.abs(e.x - player.x);
        if (dist <= c.q.outerRange) {
          const dmg = dist <= c.q.innerRange ? c.q.innerDamage : c.q.outerDamage;
          applyDamage(room, e, dmg, { side: player.side, kind: "skill", skillKey: "q" });
          applyBleedIfNeeded(e, player);
          if (dist > c.q.innerRange) player.hp = Math.min(player.maxHp, player.hp + c.q.healOuter);
        }
      }
      pushEffect(room, { type: "ring", side: player.side, x: player.x, radius: c.q.outerRange, color: "#ff8a8a" }, 550);
    }
    player.qCooldown = c.q.cd;
  }

  function castW(room, player) {
    if (player.wCooldown > 0 || player.dead) return;
    revealIfInBush(player, 1000);
    const c = CHAMPIONS[player.championId];
    if (!c) return;
    if (player.championId === "vanguard") {
      player.buffs.damageReductionUntil = Date.now() + c.w.dur * 1000;
      player.buffs.damageReductionRatio = c.w.reduction;
      pushEffect(room, { type: "shield", side: player.side, x: player.x, radius: 85, color: "#6ec0ff" }, 700);
    } else if (player.championId === "executioner") {
      const t = nearestEnemyPlayer(room, player, c.w.range);
      if (t) {
        applyDamage(room, t, player.attackDamage + c.w.bonusDamage, { side: player.side, kind: "skill", skillKey: "w" });
        applyBleedIfNeeded(t, player);
        t.buffs.wSlowUntil = Date.now() + c.w.slowDur * 1000;
        t.buffs.wSlowRatio = c.w.slowAmt;
        player.attackCooldown = 0;
        pushEffect(room, { type: "line", side: player.side, x: player.x, targetX: t.x, color: "#ff7171" }, 350);
      }
    }
    player.wCooldown = c.w.cd;
  }

  function castE(room, player) {
    if (player.eCooldown > 0 || player.dead) return;
    revealIfInBush(player, 1000);
    const c = CHAMPIONS[player.championId];
    if (!c) return;
    if (player.championId === "vanguard") {
      player.buffs.spinningUntil = Date.now() + c.e.dur * 1000;
      player.buffs.spinTickAt = Date.now();
      player.buffs.spinTickDamage = c.e.tickDamage;
      player.buffs.spinRange = c.e.range;
      pushEffect(room, { type: "spin", side: player.side, x: player.x, radius: c.e.range, color: "#ffd39a" }, 1000);
    } else if (player.championId === "executioner") {
      const target = nearestEnemyPlayer(room, player, c.e.range);
      if (target) {
        target.x = clamp(player.x + (player.side === "blue" ? 1 : -1) * c.e.pullDistance, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
        player.buffs.armorPenUntil = Date.now() + c.e.armorPenDur * 1000;
        player.armorPenRatio = c.e.armorPenRatio;
        applyBleedIfNeeded(target, player);
        pushEffect(room, { type: "hook", side: player.side, x: player.x, targetX: target.x, color: "#ff9aa2" }, 420);
      }
    }
    player.eCooldown = c.e.cd;
  }

  function castR(room, player) {
    if (player.rCooldown > 0 || player.dead) return;
    revealIfInBush(player, 1000);
    const c = CHAMPIONS[player.championId];
    if (!c) return;
    const target = nearestEnemyPlayer(room, player, c.r.range);
    if (!target) return;

    let damage = c.r.base;
    if (player.championId === "vanguard") {
      damage += (target.maxHp - target.hp) * c.r.missingHpRatio;
    } else if (player.championId === "executioner") {
      damage += target.dots.bleedStacks * c.r.bleedStackScale;
    }

    applyDamage(room, target, damage, { side: player.side, kind: "skill", skillKey: "r" });
    pushEffect(room, { type: "execute", side: player.side, x: target.x, radius: c.r.range * 0.4, color: "#ffffff" }, 550);

    if (player.championId === "executioner" && player.buffs.rResetUntil > Date.now()) {
      player.rCooldown = 0;
    } else {
      player.rCooldown = c.r.cd;
    }
  }

  function updatePlayerEffects(room, player, dtSec) {
    const now = Date.now();
    if (player.dead) return;

    if (player.buffs.spinningUntil > now && player.buffs.spinTickAt <= now) {
      player.buffs.spinTickAt = now + CHAMPIONS.vanguard.e.tickEvery * 1000;
      const enemySide = player.side === "blue" ? "red" : "blue";
      for (const e of getOpponentPlayers(room, player.side)) {
        if (Math.abs(e.x - player.x) <= player.buffs.spinRange) {
          applyDamage(room, e, player.buffs.spinTickDamage, { side: player.side, kind: "skill", skillKey: "e" });
        }
      }
      for (const m of room.minions) {
        if (m.side !== enemySide) continue;
        if (Math.abs(m.x - player.x) <= player.buffs.spinRange) {
          applyDamage(room, m, player.buffs.spinTickDamage, { side: player.side, kind: "skill", skillKey: "e" });
        }
      }
    }

    if (player.dots.bleedStacks > 0 && player.dots.bleedUntil > now && player.dots.bleedTickAt <= now) {
      player.dots.bleedTickAt = now + 1000;
      applyDamage(room, player, player.dots.bleedTickDamage, { side: player.side === "blue" ? "red" : "blue", kind: "dot" });
    }
    if (player.dots.bleedUntil <= now) {
      player.dots.bleedStacks = 0;
      player.dots.bleedTickDamage = 0;
    }

    const c = CHAMPIONS[player.championId];
    if (c?.passive?.regenPerSec && now - player.buffs.outOfCombatAt >= c.passive.outOfCombatSec * 1000) {
      player.hp = Math.min(player.maxHp, player.hp + c.passive.regenPerSec * dtSec);
    }
  }

  function updatePlayer(room, player, dtSec) {
    const now = Date.now();
    if (!player.championId) return;

    if (player.dead) {
      if (now >= player.respawnAt) {
        player.dead = false;
        player.hp = player.maxHp;
        player.x = player.side === "blue" ? 200 : WORLD_WIDTH - 200;
        player.dots.bleedStacks = 0;
        player.dots.bleedUntil = 0;
      }
      return;
    }

    player.attackCooldown = Math.max(0, player.attackCooldown - dtSec);
    player.qCooldown = Math.max(0, player.qCooldown - dtSec);
    player.wCooldown = Math.max(0, player.wCooldown - dtSec);
    player.eCooldown = Math.max(0, player.eCooldown - dtSec);
    player.rCooldown = Math.max(0, player.rCooldown - dtSec);
    player.gold += GOLD_PER_SEC * dtSec;

    const slow = player.buffs.wSlowUntil > now ? player.buffs.wSlowRatio : 0;
    const msBonus = player.buffs.bonusMsUntil > now ? player.buffs.bonusMs : 0;
    const effectiveMs = Math.max(100, (player.moveSpeed + msBonus) * (1 - slow));
    const dir = (player.input.right ? 1 : 0) - (player.input.left ? 1 : 0);
    player.x = clamp(player.x + dir * effectiveMs * dtSec, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);

    const atk = Boolean(player.input.attack);
    if (atk && !player.lastPress.attack) tryBasicAttack(room, player);
    player.lastPress.attack = atk;

    const q = Boolean(player.input.skillQ);
    if (q && !player.lastPress.q) castQ(room, player);
    player.lastPress.q = q;

    const w = Boolean(player.input.skillW);
    if (w && !player.lastPress.w) castW(room, player);
    player.lastPress.w = w;

    const e = Boolean(player.input.skillE);
    if (e && !player.lastPress.e) castE(room, player);
    player.lastPress.e = e;

    const r = Boolean(player.input.skillR);
    if (r && !player.lastPress.r) castR(room, player);
    player.lastPress.r = r;

    updatePlayerEffects(room, player, dtSec);
  }

  function pickMinionTarget(room, minion) {
    const enemySide = minion.side === "blue" ? "red" : "blue";
    const enemyMinions = room.minions.filter((m) => m.side === enemySide && Math.abs(m.x - minion.x) <= MINION_RANGE);
    if (enemyMinions.length) return enemyMinions[0];
    const enemyPlayers = getAlivePlayers(room, enemySide).filter((p) => Math.abs(p.x - minion.x) <= MINION_RANGE);
    if (enemyPlayers.length) return enemyPlayers[0];
    const enemyTower = room.towers[enemySide];
    if (enemyTower.hp > 0 && Math.abs(enemyTower.x - minion.x) <= MINION_RANGE) return enemyTower;
    return null;
  }

  function updateMinions(room, dtSec) {
    for (const minion of room.minions) {
      minion.cooldown = Math.max(0, minion.cooldown - dtSec);
      const target = pickMinionTarget(room, minion);
      if (target) {
        if (minion.cooldown === 0) {
          applyDamage(room, target, MINION_DAMAGE, { side: minion.side, kind: "minion" });
          minion.cooldown = MINION_ATTACK_CD;
        }
        continue;
      }
      const dir = minion.side === "blue" ? 1 : -1;
      minion.x = clamp(minion.x + dir * MINION_SPEED * dtSec, MINION_RADIUS, WORLD_WIDTH - MINION_RADIUS);
    }
    room.minions = room.minions.filter((m) => m.hp > 0);
  }

  return {
    applyDamage,
    updatePlayer,
    updateMinions,
  };
}

module.exports = {
  createCombatSystem,
};
