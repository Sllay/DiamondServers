// server.js
const express = require("express");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const playerlist = require("./playerlist.js"); // ver abaixo

const app = express();
const PORT = 9090;
const server = app.listen(PORT, () =>
  console.log("Server listening on port: " + PORT)
);
const wss = new WebSocket.Server({ server });

// rooms: roomId -> Set<socket>
const rooms = {};

wss.on("connection", (socket) => {
  socket.id = uuidv4();
  socket.roomId = null;

  socket.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const { cmd, content } = msg;

    // REGISTER
    if (cmd === "register_request") {
      const ok = await playerlist.register(content.email, content.password);
      socket.send(JSON.stringify({
        cmd: "register_response",
        content: { ok }
      }));
      return;
    }

    // LOGIN
    if (cmd === "login_request") {
      const user = await playerlist.login(content.email, content.password);
      socket.send(JSON.stringify({
        cmd: "login_response",
        content: { success: !!user, player: user }
      }));
      return;
    }

    // CODE CONFIRM
    if (cmd === "confirm_code") {
      const valid = await playerlist.confirmCode(content.email, content.code);
      socket.send(JSON.stringify({
        cmd: "confirm_response",
        content: { valid }
      }));
      return;
    }

    // JOIN ROOM
    if (cmd === "join_room") {
      const { roomId, player } = content;
      // leave old room
      if (socket.roomId && rooms[socket.roomId]) {
        rooms[socket.roomId].delete(socket);
      }
      socket.roomId = roomId;
      rooms[roomId] = rooms[roomId] || new Set();
      rooms[roomId].add(socket);
      socket.player = player;

      // send existing players to newcomer
      const others = Array.from(rooms[roomId])
        .filter(s => s !== socket)
        .map(s => s.player);
      socket.send(JSON.stringify({
        cmd: "spawn_network_players",
        content: { players: others }
      }));

      // notify existing
      rooms[roomId].forEach(s => {
        if (s !== socket && s.readyState === WebSocket.OPEN) {
          s.send(JSON.stringify({
            cmd: "spawn_new_player",
            content: { player }
          }));
        }
      });
      return;
    }

    // BROADCAST WITHIN ROOM
    if (["position","chat"].includes(cmd)) {
      const room = rooms[socket.roomId] || new Set();
      const forward = {
        cmd: cmd === "position" ? "update_position" : "new_chat_message",
        content: cmd === "position"
          ? { uuid: socket.id, ...content }
          : content
      };
      room.forEach(s => {
        if (s !== socket && s.readyState === WebSocket.OPEN) {
          s.send(JSON.stringify(forward));
        }
      });
      return;
    }
  });

  socket.on("close", () => {
    if (socket.roomId && rooms[socket.roomId]) {
      rooms[socket.roomId].delete(socket);
      rooms[socket.roomId].forEach(s => {
        if (s.readyState === WebSocket.OPEN) {
          s.send(JSON.stringify({
            cmd: "player_disconnected",
            content: { uuid: socket.id }
          }));
        }
      });
    }
    playerlist.remove(socket.id);
  });
});