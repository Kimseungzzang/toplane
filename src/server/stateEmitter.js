function createStateEmitter(deps) {
  const { WORLD_WIDTH, CHAMPIONS, SHOP_ITEMS, canViewerSeePlayer, roomReadyToStart } = deps;

  function serializeRoomForViewer(room, viewer) {
    return {
      code: room.code,
      started: room.started,
      ended: room.ended,
      winner: room.winner,
      worldWidth: WORLD_WIDTH,
      champions: Object.values(CHAMPIONS).map((c) => ({ id: c.id, name: c.name })),
      shopItems: Object.values(SHOP_ITEMS).map((i) => ({ id: i.id, name: i.name, cost: i.cost, desc: i.desc })),
      towers: { blue: { ...room.towers.blue }, red: { ...room.towers.red } },
      minions: room.minions.map((m) => ({ id: m.id, side: m.side, x: m.x, laneOffset: m.laneOffset, hp: m.hp, maxHp: m.maxHp })),
      effects: room.effects.map((f) => ({
        id: f.id,
        type: f.type,
        side: f.side,
        x: f.x,
        fromX: f.fromX ?? null,
        toX: f.toX ?? null,
        launchAt: f.launchAt ?? null,
        arriveAt: f.arriveAt ?? null,
        targetX: f.targetX ?? null,
        radius: f.radius ?? 0,
        color: f.color || "#ffffff",
        expiresAt: f.expiresAt,
      })),
      players: [...room.players.values()].map((p) => {
        const hidden = !canViewerSeePlayer(viewer, p);
        if (hidden) {
          return {
            id: p.id,
            side: p.side,
            championId: p.championId,
            championName: p.championName,
            hidden: true,
          };
        }
        return {
          id: p.id,
          side: p.side,
          x: p.x,
          hp: p.hp,
          maxHp: p.maxHp,
          dead: p.dead,
          respawnAt: p.respawnAt,
          score: p.score,
          moveSpeed: Math.round(p.moveSpeed),
          attackDamage: Math.round(p.attackDamage),
          armor: Math.round(p.armor),
          critChance: Number((p.critChance * 100).toFixed(1)),
          championId: p.championId,
          championName: p.championName,
          revealedUntil: p.revealedUntil || 0,
          attackCooldown: p.attackCooldown,
          qCooldown: p.qCooldown,
          wCooldown: p.wCooldown,
          eCooldown: p.eCooldown,
          rCooldown: p.rCooldown,
          gold: Math.floor(p.gold),
          inventory: p.inventory,
          lastSeq: p.input.seq || 0,
          pingMs: p.pingMs || 0,
          hidden: false,
        };
      }),
      serverTimeMs: Date.now(),
    };
  }

  function emitRoomState(io, room) {
    for (const viewer of room.players.values()) {
      io.to(viewer.id).emit("state", serializeRoomForViewer(room, viewer));
    }
  }

  function emitMatchStatus(io, room, disconnected = false) {
    io.to(room.code).emit("match_status", {
      started: room.started,
      count: room.players.size,
      disconnected,
      allSelected: roomReadyToStart(room),
    });
  }

  return {
    serializeRoomForViewer,
    emitRoomState,
    emitMatchStatus,
  };
}

module.exports = {
  createStateEmitter,
};
