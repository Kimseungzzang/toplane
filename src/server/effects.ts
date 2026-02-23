function pushEffect(room, effect, durationMs = 400) {
  room.effects.push({
    ...effect,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expiresAt: Date.now() + durationMs,
  });
}

function pruneExpiredEffects(room, now = Date.now()) {
  room.effects = room.effects || [];
  room.effects = room.effects.filter((fx) => fx.expiresAt > now);
}

module.exports = {
  pushEffect,
  pruneExpiredEffects,
};


