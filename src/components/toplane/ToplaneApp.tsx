import { useEffect, useMemo, useRef, useState } from "react";
import { renderGameFrame } from "../../client/renderGame";
import { SKILL_TIPS } from "../../client/constants";
import { useToplaneGame } from "../../client/useToplaneGame";

function bindPress(setInput, key) {
  return {
    onPointerDown: (e) => {
      e.preventDefault();
      setInput(key, true);
    },
    onPointerUp: (e) => {
      e.preventDefault();
      setInput(key, false);
    },
    onPointerCancel: (e) => {
      e.preventDefault();
      setInput(key, false);
    },
    onPointerLeave: (e) => {
      e.preventDefault();
      setInput(key, false);
    },
  };
}

export default function ToplaneApp({
  autoJoinCode = "",
  autoCreate = false,
  hideCreateButton = false,
} = {}) {
  const {
    game,
    myPlayer,
    statusText,
    roomInfo,
    createRoom,
    joinRoom,
    selectChampion,
    purchaseItem,
    setInput,
  } = useToplaneGame();

  const [roomInput, setRoomInput] = useState("");
  const autoJoinOnceRef = useRef(false);
  const autoCreateOnceRef = useRef(false);
  const canvasRef = useRef(null);
  const gameRef = useRef(game);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (autoJoinOnceRef.current) return;
    if (!autoJoinCode) return;
    autoJoinOnceRef.current = true;
    setRoomInput(autoJoinCode);
    joinRoom(autoJoinCode);
  }, [autoJoinCode, joinRoom]);

  useEffect(() => {
    if (autoCreateOnceRef.current) return;
    if (!autoCreate) return;
    if (game.roomCode) return;
    autoCreateOnceRef.current = true;
    createRoom();
  }, [autoCreate, game.roomCode, createRoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = null;

    const loop = () => {
      renderGameFrame(ctx, canvas, gameRef.current, gameRef.current.myId);
      raf = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const championInfoText = useMemo(() => {
    if (!game.roomCode) return "Create or join a room first.";
    if (!myPlayer) return "Syncing player...";
    const enemy = game.players.find((p) => p.id !== game.myId);
    return `Me: ${myPlayer.championName || "-"} | Enemy: ${enemy?.championName || "-"}`;
  }, [game.roomCode, game.players, game.myId, myPlayer]);

  const skillTipText = useMemo(
    () => SKILL_TIPS[myPlayer?.championId] || "Select a champion to view QWER details.",
    [myPlayer?.championId]
  );

  const inventoryText = useMemo(() => {
    if (!myPlayer) return "-";
    return Object.entries(myPlayer.inventory || {})
      .map(([k, c]) => `${k}x${c}`)
      .join(", ") || "-";
  }, [myPlayer]);

  const blue = game.players.find((p) => p.side === "blue");
  const red = game.players.find((p) => p.side === "red");

  const hudText = (p, sideName) => {
    if (!p) return `${sideName} waiting`;
    if (p.hidden) return `${sideName} ${p.championName || "-"}\nHidden in bush`;
    return `${sideName} ${p.championName || "-"}\nHP ${Math.round(p.hp)}/${p.maxHp} | AD ${p.attackDamage} | Crit ${p.critChance}%`;
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Toplane Duel</h1>
        <div id="statusText">{statusText}</div>
      </header>

      <section className="lobby" id="lobby">
        {!hideCreateButton && <button id="createBtn" onClick={createRoom}>Create Invite Code</button>}
        <div className="join">
          <input
            id="roomInput"
            maxLength={6}
            placeholder="Invite code (6 chars)"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            disabled={Boolean(autoJoinCode)}
          />
          <button id="joinBtn" onClick={() => joinRoom(roomInput)} disabled={Boolean(autoJoinCode)}>Join</button>
        </div>
        <div id="roomInfo">{roomInfo}</div>
      </section>

      <section className="champ-select" id="champSelect">
        <div className="champ-title">Champion Select</div>
        <div className="champ-buttons">
          {game.champions.map((c) => (
            <button
              key={c.id}
              className={`champ-btn ${myPlayer?.championId === c.id ? "selected" : ""}`}
              data-champion={c.id}
              onClick={() => selectChampion(c.id)}
              disabled={!game.roomCode || game.started}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div id="champInfo">{championInfoText}</div>
      </section>

      <section className="shop" id="shop">
        <div className="shop-title">Shop</div>
        <div className="shop-buttons">
          {game.shopItems.map((item) => (
            <button
              key={item.id}
              className="shop-btn"
              data-item={item.id}
              title={`${item.name}: ${item.desc || ""}`}
              onClick={() => purchaseItem(item.id)}
              disabled={!myPlayer || myPlayer.gold < item.cost || myPlayer.dead}
            >
              {item.name} ({item.cost})
            </button>
          ))}
        </div>
        <div id="shopInfo">
          {myPlayer ? `Gold ${myPlayer.gold} | Inv: ${inventoryText}` : "Buy items with gold."}
        </div>
      </section>

      <section className="hud" id="hud">
        <div id="leftHud" className="hud-card" style={{ whiteSpace: "pre-line" }}>{hudText(blue, "Blue")}</div>
        <div id="rightHud" className="hud-card" style={{ whiteSpace: "pre-line" }}>{hudText(red, "Red")}</div>
      </section>

      <canvas id="gameCanvas" ref={canvasRef} width={900} height={400} />

      <section className="controls">
        <button id="leftBtn" className="ctrl-btn" {...bindPress(setInput, "left")}>LEFT</button>
        <button id="attackBtn" className="ctrl-btn attack" {...bindPress(setInput, "attack")}>ATK</button>
        <button id="qBtn" className="ctrl-btn skill" {...bindPress(setInput, "skillQ")}>Q {myPlayer ? Math.max(0, myPlayer.qCooldown).toFixed(1) : "-"}</button>
        <button id="wBtn" className="ctrl-btn skill" {...bindPress(setInput, "skillW")}>W {myPlayer ? Math.max(0, myPlayer.wCooldown).toFixed(1) : "-"}</button>
        <button id="eBtn" className="ctrl-btn skill" {...bindPress(setInput, "skillE")}>E {myPlayer ? Math.max(0, myPlayer.eCooldown).toFixed(1) : "-"}</button>
        <button id="rBtn" className="ctrl-btn skill" {...bindPress(setInput, "skillR")}>R {myPlayer ? Math.max(0, myPlayer.rCooldown).toFixed(1) : "-"}</button>
        <button id="rightBtn" className="ctrl-btn" {...bindPress(setInput, "right")}>RIGHT</button>
      </section>

      <section className="tips" id="tips">
        <div className="tips-title">Skill Tooltips</div>
        <div id="skillTips">{skillTipText}</div>
      </section>
    </div>
  );
}
