function registerSocketHandlers(io, deps) {
  const {
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
  } = deps;

  io.on("connection", (socket) => {
    socket.on("create_room", (ack = () => {}) => {
      if (getRoomBySocket(socket)) return ack({ ok: false, reason: "already-in-room" });
      const room = createRoomState(createRoomCode());
      const p = createPlayer(socket.id, "blue");
      room.players.set(socket.id, p);
      room.socketToPlayerId.set(socket.id, socket.id);
      rooms.set(room.code, room);
      socket.join(room.code);
      ack({ ok: true, roomCode: room.code, playerId: socket.id, side: "blue", started: false });
      emitRoomState(io, room);
    });

    socket.on("join_room", (payload = {}, ack = () => {}) => {
      const code = String(payload.code || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) return ack({ ok: false, reason: "room-not-found" });
      if (room.players.size >= 2) return ack({ ok: false, reason: "room-full" });
      if (room.ended) return ack({ ok: false, reason: "room-ended" });
      const side = [...room.players.values()].some((p) => p.side === "blue") ? "red" : "blue";
      const p = createPlayer(socket.id, side);
      room.players.set(socket.id, p);
      room.socketToPlayerId.set(socket.id, socket.id);
      room.started = roomReadyToStart(room);
      socket.join(room.code);
      ack({ ok: true, roomCode: room.code, playerId: socket.id, side, started: room.started });
      emitMatchStatus(io, room);
      emitRoomState(io, room);
    });

    socket.on("select_champion", (payload = {}, ack = () => {}) => {
      const room = getRoomBySocket(socket);
      if (!room || room.ended) return ack({ ok: false, reason: "room-not-found" });
      if (room.started) return ack({ ok: false, reason: "match-started" });
      const p = room.players.get(socket.id);
      if (!p) return ack({ ok: false, reason: "player-not-found" });
      if (!setChampion(p, String(payload.championId || "").toLowerCase())) return ack({ ok: false, reason: "invalid-champion" });
      room.started = roomReadyToStart(room);
      ack({ ok: true });
      emitMatchStatus(io, room);
      emitRoomState(io, room);
    });

    socket.on("purchase_item", (payload = {}, ack = () => {}) => {
      const room = getRoomBySocket(socket);
      if (!room || room.ended) return ack({ ok: false, reason: "room-not-found" });
      const p = room.players.get(socket.id);
      if (!p || p.dead || !p.championId) return ack({ ok: false, reason: "player-not-ready" });
      const item = SHOP_ITEMS[String(payload.itemId || "").toLowerCase()];
      if (!item) return ack({ ok: false, reason: "invalid-item" });
      if (p.gold < item.cost) return ack({ ok: false, reason: "not-enough-gold" });
      p.gold -= item.cost;
      p.inventory[item.id] = (p.inventory[item.id] || 0) + 1;
      item.apply(p);
      ack({ ok: true, itemId: item.id, gold: Math.floor(p.gold) });
      emitRoomState(io, room);
    });

    socket.on("input", (payload = {}) => {
      const room = getRoomBySocket(socket);
      if (!room || room.ended || !room.started) return;
      const p = room.players.get(socket.id);
      if (!p) return;
      p.input = {
        left: Boolean(payload.left),
        right: Boolean(payload.right),
        attack: Boolean(payload.attack),
        skillQ: Boolean(payload.skillQ),
        skillW: Boolean(payload.skillW),
        skillE: Boolean(payload.skillE),
        skillR: Boolean(payload.skillR),
        seq: Number(payload.seq || 0),
      };
      if (typeof payload.clientSentAtMs === "number") {
        p.pingMs = Math.round(Math.max(0, Date.now() - payload.clientSentAtMs) * 2);
      }
    });

    socket.on("ping_check", (clientTs, ack = () => {}) => ack({ serverTs: Date.now(), clientTs }));

    socket.on("disconnect", () => {
      const room = getRoomBySocket(socket);
      if (!room) return;
      room.players.delete(socket.id);
      room.socketToPlayerId.delete(socket.id);
      room.started = roomReadyToStart(room);
      emitMatchStatus(io, room, true);
      emitRoomState(io, room);
      cleanupRoomIfEmpty(room);
    });
  });
}

module.exports = {
  registerSocketHandlers,
};
