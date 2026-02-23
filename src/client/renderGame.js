import { BUSH_ZONES } from "./constants";

const spriteCache = new Map();
const SPRITE_BY_CHAMPION = {
  vanguard: "/assets/champions/vanguard.svg",
  executioner: "/assets/champions/executioner.svg",
};

function getSprite(src) {
  if (!src || typeof Image === "undefined") return null;
  const cached = spriteCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  spriteCache.set(src, img);
  return img;
}

function projectX(x, worldWidth, canvasWidth) {
  return (x / worldWidth) * canvasWidth;
}

function isInBush(x) {
  return BUSH_ZONES.some((z) => x >= z.start && x <= z.end);
}

function drawHpBar(ctx, x, y, hp, maxHp, color) {
  const w = 54;
  const h = 7;
  const pct = Math.max(0, hp / Math.max(1, maxHp));
  ctx.fillStyle = "#111";
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * pct, h);
}

function drawTower(ctx, t, color, worldWidth, canvasWidth) {
  const x = projectX(t.x, worldWidth, canvasWidth);
  ctx.fillStyle = color;
  ctx.fillRect(x - 18, 220, 36, 120);
  drawHpBar(ctx, x, 208, t.hp, t.maxHp, color);
}

function drawPlayer(ctx, p, myId, worldWidth, canvasWidth) {
  const x = projectX(p.x, worldWidth, canvasWidth);
  const y = 280;
  const sprite = getSprite(SPRITE_BY_CHAMPION[p.championId]);
  const spriteSize = 56;
  if (sprite && sprite.complete) {
    ctx.drawImage(sprite, x - spriteSize / 2, y - spriteSize + 8, spriteSize, spriteSize);
  } else {
    ctx.fillStyle = p.side === "blue" ? "#4aa3ff" : "#ff6b6b";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 17, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#eef6ff";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(p.championName || "", x, y - 30);

  if (p.id === myId) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawHpBar(ctx, x, 245, p.hp, p.maxHp, p.side === "blue" ? "#6ec0ff" : "#ff8d8d");
  ctx.textAlign = "start";
}

function drawMinion(ctx, m, worldWidth, canvasWidth) {
  const x = projectX(m.x, worldWidth, canvasWidth);
  const y = 306 + m.laneOffset * 0.25;
  ctx.fillStyle = m.side === "blue" ? "#7ac7ff" : "#ff9a9a";
  ctx.fillRect(x - 8, y - 8, 16, 16);
}

function drawBushes(ctx, worldWidth, canvasWidth) {
  for (const z of BUSH_ZONES) {
    const x1 = projectX(z.start, worldWidth, canvasWidth);
    const x2 = projectX(z.end, worldWidth, canvasWidth);
    const w = x2 - x1;

    ctx.fillStyle = "rgba(64, 122, 58, 0.72)";
    ctx.fillRect(x1, 246, w, 72);

    ctx.fillStyle = "rgba(106, 164, 82, 0.65)";
    for (let i = 0; i < 18; i += 1) {
      const px = x1 + (i / 17) * w;
      ctx.beginPath();
      ctx.moveTo(px, 248);
      ctx.lineTo(px - 5, 260);
      ctx.lineTo(px + 5, 260);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawEffects(ctx, effects, worldWidth, canvasWidth) {
  const now = Date.now();
  for (const fx of effects) {
    if (fx.expiresAt <= now) continue;
    const x = projectX(fx.x, worldWidth, canvasWidth);
    const r = (fx.radius / worldWidth) * canvasWidth;
    ctx.strokeStyle = fx.color || "#fff";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.75;

    if (["ring", "spin", "shield", "execute", "tower_warn"].includes(fx.type)) {
      ctx.beginPath();
      ctx.arc(x, 280, Math.max(16, r), 0, Math.PI * 2);
      ctx.stroke();
    } else if (["line", "hook", "tower_shot"].includes(fx.type)) {
      const tx = projectX(fx.targetX ?? fx.x, worldWidth, canvasWidth);
      ctx.beginPath();
      ctx.moveTo(x, 280);
      ctx.lineTo(tx, 280);
      ctx.stroke();
    } else if (fx.type === "tower_projectile") {
      const fromX = projectX(fx.fromX ?? fx.x, worldWidth, canvasWidth);
      const toX = projectX(fx.toX ?? fx.targetX ?? fx.x, worldWidth, canvasWidth);
      const total = Math.max(1, (fx.arriveAt || now) - (fx.launchAt || now));
      const progress = Math.max(0, Math.min(1, (now - (fx.launchAt || now)) / total));
      const px = fromX + (toX - fromX) * progress;
      ctx.beginPath();
      ctx.moveTo(fromX, 280);
      ctx.lineTo(toX, 280);
      ctx.stroke();
      ctx.fillStyle = fx.color || "#fff2a8";
      ctx.beginPath();
      ctx.arc(px, 280, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export function renderGameFrame(ctx, canvas, state, myId) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#6d8650";
  ctx.fillRect(0, 240, canvas.width, 100);
  ctx.fillStyle = "#9fba76";
  ctx.fillRect(0, 340, canvas.width, 60);

  if (state.towers) {
    drawTower(ctx, state.towers.blue, "#4aa3ff", state.worldWidth, canvas.width);
    drawTower(ctx, state.towers.red, "#ff6b6b", state.worldWidth, canvas.width);
  }

  drawBushes(ctx, state.worldWidth, canvas.width);
  for (const m of state.minions) drawMinion(ctx, m, state.worldWidth, canvas.width);

  const me = state.players.find((p) => p.id === myId);
  for (const p of state.players) {
    if (p.hidden) continue;
    if (p.id !== myId && me && !me.dead) {
      const enemyHidden = isInBush(p.x) && !isInBush(me.x) && Date.now() > (p.revealedUntil || 0);
      if (enemyHidden) continue;
    }
    drawPlayer(ctx, p, myId, state.worldWidth, canvas.width);
  }

  drawEffects(ctx, state.effects || [], state.worldWidth, canvas.width);

  if (!state.started) {
    const allSelected = state.players.length === 2 && state.players.every((p) => p.championId);
    ctx.fillStyle = "rgba(10,12,20,0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(allSelected ? "Preparing match..." : "Waiting for both champion picks...", canvas.width / 2 - 170, canvas.height / 2);
  }

  if (state.ended) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(`Winner: ${state.winner?.toUpperCase() || "-"}`, canvas.width / 2 - 110, canvas.height / 2);
  }
}
