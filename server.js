const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.static(__dirname));

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("createRoom", () => {
    let room = makeRoomCode();
    while (rooms.has(room)) room = makeRoomCode();
    rooms.set(room, { host: socket.id, players: new Set([socket.id]) });
    socket.join(room);
    socket.emit("roomCreated", { room });
    io.to(room).emit("roomJoined", { room });
  });

  socket.on("joinRoom", ({ room }) => {
    room = String(room || "").trim().toUpperCase();
    if (!room) {
      socket.emit("roomError", "Room code is required.");
      return;
    }
    if (!rooms.has(room)) {
      socket.emit("roomError", "That room does not exist.");
      return;
    }
    const r = rooms.get(room);
    r.players.add(socket.id);
    socket.join(room);
    socket.emit("roomJoined", { room });
    io.to(room).emit("roomStatus", { room, players: r.players.size });
  });

  socket.on("disconnect", () => {
    for (const [room, data] of rooms.entries()) {
      data.players.delete(socket.id);
      if (data.players.size === 0) rooms.delete(room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
