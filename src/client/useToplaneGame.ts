import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { DEFAULT_CHAMPIONS, DEFAULT_SHOP_ITEMS } from "./constants";

const INITIAL_STATE = {
  roomCode: null,
  myId: null,
  worldWidth: 2000,
  started: false,
  ended: false,
  winner: null,
  players: [],
  towers: null,
  minions: [],
  pingMs: 0,
  shopItems: [],
  champions: [],
  effects: [],
};

export function useToplaneGame() {
  const [game, setGame] = useState(INITIAL_STATE);
  const [statusText, setStatusText] = useState("Connecting...");
  const [roomInfo, setRoomInfo] = useState("");

  const socketRef = useRef(null);
  const pendingInputsRef = useRef([]);
  const inputRef = useRef({
    left: false,
    right: false,
    attack: false,
    skillQ: false,
    skillW: false,
    skillE: false,
    skillR: false,
    seq: 0,
  });

  const myPlayer = useMemo(
    () => game.players.find((p) => p.id === game.myId) || null,
    [game.players, game.myId]
  );

  const setInput = useCallback((key, value) => {
    inputRef.current[key] = value;
  }, []);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => setStatusText("Connected"));
    socket.on("disconnect", () => setStatusText("Disconnected"));

    socket.on("match_status", (payload) => {
      setGame((prev) => ({ ...prev, started: Boolean(payload.started) }));
      if (payload.disconnected) return setStatusText("Enemy disconnected");
      if (payload.started) return setStatusText("Match started");
      if (payload.count < 2) return setStatusText("Waiting for enemy");
      if (!payload.allSelected) return setStatusText("Both players must pick champion");
      setStatusText("Preparing start");
    });

    socket.on("state", (s) => {
      setGame((prev) => {
        const nextPlayers = [...(s.players || [])];
        const me = nextPlayers.find((p) => p.id === prev.myId);
        if (me) {
          while (
            pendingInputsRef.current.length &&
            pendingInputsRef.current[0].seq <= (me.lastSeq || 0)
          ) {
            pendingInputsRef.current.shift();
          }
          if (!me.dead && s.started) {
            const dt = 1 / 20;
            let x = me.x;
            for (const p of pendingInputsRef.current) {
              const dir = (p.right ? 1 : 0) - (p.left ? 1 : 0);
              x += dir * (me.moveSpeed || 240) * dt;
            }
            me.x = Math.max(28, Math.min(s.worldWidth - 28, x));
          }
        }

        return {
          ...prev,
          started: s.started,
          ended: s.ended,
          winner: s.winner,
          worldWidth: s.worldWidth,
          players: nextPlayers,
          towers: s.towers,
          minions: s.minions || [],
          shopItems: s.shopItems || [],
          champions: s.champions || [],
          effects: s.effects || [],
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (k === "a" || e.key === "ArrowLeft") inputRef.current.left = true;
      if (k === "d" || e.key === "ArrowRight") inputRef.current.right = true;
      if (k === "j" || e.key === " ") inputRef.current.attack = true;
      if (k === "q") inputRef.current.skillQ = true;
      if (k === "w") inputRef.current.skillW = true;
      if (k === "e") inputRef.current.skillE = true;
      if (k === "r") inputRef.current.skillR = true;
    };
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === "a" || e.key === "ArrowLeft") inputRef.current.left = false;
      if (k === "d" || e.key === "ArrowRight") inputRef.current.right = false;
      if (k === "j" || e.key === " ") inputRef.current.attack = false;
      if (k === "q") inputRef.current.skillQ = false;
      if (k === "w") inputRef.current.skillW = false;
      if (k === "e") inputRef.current.skillE = false;
      if (k === "r") inputRef.current.skillR = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!game.roomCode || !game.myId || !game.started || !socketRef.current) return;
      inputRef.current.seq += 1;
      const packet = {
        ...inputRef.current,
        seq: inputRef.current.seq,
        clientSentAtMs: Date.now(),
      };
      pendingInputsRef.current.push(packet);
      if (pendingInputsRef.current.length > 20) pendingInputsRef.current.shift();
      socketRef.current.emit("input", packet);
    }, 50);

    return () => clearInterval(timer);
  }, [game.roomCode, game.myId, game.started]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!socketRef.current) return;
      socketRef.current.emit("ping_check", Date.now(), (p) => {
        const pingMs = Math.max(0, Date.now() - p.clientTs);
        setGame((prev) => ({ ...prev, pingMs }));
        if (game.started) setStatusText(`Ping ${pingMs}ms`);
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [game.started]);

  const createRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit("create_room", (res) => {
      if (!res?.ok) return setRoomInfo("Failed to create room");
      setGame((prev) => ({ ...prev, roomCode: res.roomCode, myId: res.playerId }));
      setRoomInfo(`Room code: ${res.roomCode}`);
      setStatusText("Room created. Select champion.");
    });
  }, []);

  const joinRoom = useCallback((code) => {
    if (!socketRef.current || !code) return;
    socketRef.current.emit("join_room", { code: code.trim().toUpperCase() }, (res) => {
      if (!res?.ok) return setRoomInfo(`Join failed: ${res.reason || "unknown"}`);
      setGame((prev) => ({ ...prev, roomCode: res.roomCode, myId: res.playerId }));
      setRoomInfo(`Joined room: ${res.roomCode}`);
      setStatusText("Joined. Select champion.");
    });
  }, []);

  const selectChampion = useCallback((championId) => {
    if (!socketRef.current || !game.roomCode || game.started) return;
    socketRef.current.emit("select_champion", { championId }, (res) => {
      if (!res?.ok) setStatusText(`Pick failed: ${res?.reason || "unknown"}`);
    });
  }, [game.roomCode, game.started]);

  const purchaseItem = useCallback((itemId) => {
    if (!socketRef.current || !game.roomCode) return;
    socketRef.current.emit("purchase_item", { itemId }, (res) => {
      if (!res?.ok) return setStatusText(`Purchase failed: ${res?.reason || "unknown"}`);
      setStatusText(`Purchased ${res.itemId}`);
    });
  }, [game.roomCode]);

  return {
    game: {
      ...game,
      champions: game.champions.length ? game.champions : DEFAULT_CHAMPIONS,
      shopItems: game.shopItems.length ? game.shopItems : DEFAULT_SHOP_ITEMS,
    },
    myPlayer,
    statusText,
    roomInfo,
    createRoom,
    joinRoom,
    selectChampion,
    purchaseItem,
    setInput,
  };
}
