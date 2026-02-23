const express = require("express");
const http = require("http");
const next = require("next");
const { Server } = require("socket.io");
const { attachGame } = require("./src/server/gameCore");

const PORT = Number(process.env.PORT || 3000);
const dev = process.env.NODE_ENV !== "production";

async function start() {
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  attachGame(io);

  app.all("*", (req, res) => handle(req, res));
  httpServer.listen(PORT, () => {
    console.log(`Toplane Duel (Next.js) running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
