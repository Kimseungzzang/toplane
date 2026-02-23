function createGameLoop(deps) {
  const {
    rooms,
    TICK_RATE,
    TICK_MS,
    WAVE_INTERVAL,
    spawnWave,
    maybeEndRoom,
    pruneExpiredEffects,
    combatSystem,
    towerSystem,
    emitRoomState,
  } = deps;

  return function startGameLoop(io) {
    setInterval(() => {
      const dtSec = 1 / TICK_RATE;
      for (const room of rooms.values()) {
        if (!room.started || room.ended) continue;
        pruneExpiredEffects(room);
        room.waveTimer -= dtSec;
        if (room.waveTimer <= 0) {
          spawnWave(room);
          room.waveTimer = WAVE_INTERVAL;
        }
        for (const p of room.players.values()) combatSystem.updatePlayer(room, p, dtSec);
        combatSystem.updateMinions(room, dtSec);
        towerSystem.updateTowers(room, dtSec);
        maybeEndRoom(room);
        emitRoomState(io, room);
      }
    }, TICK_MS);
  };
}

module.exports = {
  createGameLoop,
};


