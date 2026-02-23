// @ts-nocheck
const { WORLD_WIDTH, WAVE_SIZE } = require("./modules/config");
const { createMinion } = require("./modules/factories");

function roomReadyToStart(room) {
  return room.players.size === 2 && [...room.players.values()].every((p) => p.championId);
}

function spawnWave(room) {
  for (let i = 0; i < WAVE_SIZE; i += 1) {
    room.minions.push(createMinion("blue", 250 - i * 30, -20 + i * 20));
    room.minions.push(createMinion("red", WORLD_WIDTH - 250 + i * 30, -20 + i * 20));
  }
}

function maybeEndRoom(room) {
  if (room.ended) return;
  if (room.towers.blue.hp <= 0) {
    room.ended = true;
    room.winner = "red";
    return;
  }
  if (room.towers.red.hp <= 0) {
    room.ended = true;
    room.winner = "blue";
  }
}

module.exports = {
  roomReadyToStart,
  spawnWave,
  maybeEndRoom,
};

