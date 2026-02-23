const {
  TICK_RATE,
  TICK_MS,
  WAVE_INTERVAL,
  WORLD_WIDTH,
  CHAMPIONS,
  SHOP_ITEMS,
} = require("./modules/config");
const {
  createPlayer,
  createRoomState,
  setChampion,
} = require("./modules/factories");
const {
  rooms,
  createRoomCode,
  getRoomBySocket,
  cleanupRoomIfEmpty,
} = require("./modules/roomState");
const { canViewerSeePlayer, revealIfInBush } = require("./modules/vision");
const { registerSocketHandlers } = require("./socketHandlers");
const { createStateEmitter } = require("./stateEmitter");
const { roomReadyToStart, spawnWave, maybeEndRoom } = require("./roomLifecycle");
const { getPlayerBySide, getAlivePlayers, getOpponentPlayers } = require("./roomQueries");
const { pushEffect, pruneExpiredEffects } = require("./effects");
const { clamp } = require("./utils/math");
const { createGameSystems } = require("./gameSystems");
const { createGameLoop } = require("./gameLoop");

const { emitRoomState, emitMatchStatus } = createStateEmitter({
  WORLD_WIDTH,
  CHAMPIONS,
  SHOP_ITEMS,
  canViewerSeePlayer,
  roomReadyToStart,
});

const { combatSystem, towerSystem } = createGameSystems({
  pushEffect,
  clamp,
  getPlayerBySide,
  getOpponentPlayers,
  getAlivePlayers,
  revealIfInBush,
});

const startGameLoop = createGameLoop({
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
});

function attachGame(io) {
  registerSocketHandlers(io, {
    rooms,
    createRoomCode,
    createRoomState,
    createPlayer,
    getRoomBySocket,
    roomReadyToStart,
    setChampion,
    SHOP_ITEMS,
    emitRoomState,
    emitMatchStatus,
    cleanupRoomIfEmpty,
  });

  startGameLoop(io);
}

module.exports = { attachGame };
