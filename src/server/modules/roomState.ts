// @ts-nocheck
const rooms = new Map();

function randCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function createRoomCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = randCode();
    if (!rooms.has(code)) return code;
  }
  throw new Error("Failed to create unique room code");
}

function getRoomBySocket(socket) {
  for (const room of rooms.values()) {
    if (room.socketToPlayerId.has(socket.id)) return room;
  }
  return null;
}

function cleanupRoomIfEmpty(room) {
  if (room.players.size === 0) rooms.delete(room.code);
}

module.exports = { rooms, createRoomCode, getRoomBySocket, cleanupRoomIfEmpty };

