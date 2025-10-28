const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Используем переменную PORT от Render, если она есть
const port = process.env.PORT || 3000;

// Подключаем WebSocket сервер
const wss = new WebSocket.Server({ server });

// Сохраняем игроков по комнатам
const rooms = {};

// При подключении клиента
wss.on("connection", (ws) => {
  let roomID;
  let playerID;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      roomID = data.room;
      playerID = data.player;

      if (!rooms[roomID]) rooms[roomID] = {};
      rooms[roomID][playerID] = ws;

      // Если оба игрока подключились, шлём готовность
      if (Object.keys(rooms[roomID]).length === 2) {
        Object.values(rooms[roomID]).forEach((client) => {
          client.send(JSON.stringify({ type: "start" }));
        });
      }
    }

    // Пересылаем ходы другому игроку
    if (data.type === "move") {
      Object.entries(rooms[roomID]).forEach(([id, client]) => {
        if (id !== playerID) client.send(JSON.stringify(data));
      });
    }
  });

  ws.on("close", () => {
    if (roomID && rooms[roomID]) {
      delete rooms[roomID][playerID];
      // Если комната пуста, удаляем её
      if (Object.keys(rooms[roomID]).length === 0) delete rooms[roomID];
    }
  });
});

// Подключаем фронтенд
app.use(express.static(path.join(__dirname, "public")));

// Запуск сервера
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
