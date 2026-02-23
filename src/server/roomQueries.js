function getPlayerBySide(room, side) {
  return [...room.players.values()].find((p) => p.side === side);
}

function getAlivePlayers(room, side) {
  return [...room.players.values()].filter((p) => p.side === side && !p.dead);
}

function getOpponentPlayers(room, side) {
  return [...room.players.values()].filter((p) => p.side !== side && !p.dead);
}

module.exports = {
  getPlayerBySide,
  getAlivePlayers,
  getOpponentPlayers,
};
