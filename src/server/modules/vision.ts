// @ts-nocheck
const { BUSH_ZONES } = require("./config");

function isInBushX(x) {
  return BUSH_ZONES.some((z) => x >= z.start && x <= z.end);
}

function revealIfInBush(player, ms = 1000) {
  if (!player) return;
  if (!isInBushX(player.x)) return;
  player.revealedUntil = Math.max(player.revealedUntil || 0, Date.now() + ms);
}

function canViewerSeePlayer(viewer, target) {
  if (!viewer || !target) return true;
  if (viewer.id === target.id) return true;
  if (target.dead) return true;
  if (!isInBushX(target.x)) return true;
  if (isInBushX(viewer.x)) return true;
  return Date.now() <= (target.revealedUntil || 0);
}

module.exports = { isInBushX, revealIfInBush, canViewerSeePlayer };

