const socketconnection = (Server) => {
  // Allow configuring the client origin via environment so backend can accept
  // socket connections from the correct frontend host in different environments.
  const clientOrigin =
    process.env.CLIENT_ORIGIN ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

  console.log(`[SOCKET] configuring CORS origin: ${clientOrigin}`);

  const io = require("socket.io")(Server, {
    cors: {
      origin: clientOrigin,
      methods: ["GET", "POST"],
    },
  });
  const jwt = require("jsonwebtoken");
  const userModel = require("../models/userModel");

  io.on("connection", (socket) => {
    console.log("Socket connection established ");
    socket.on("get-document", (documentID) => {
      const data = "";
      socket.join(documentID);
      socket.emit("load-document", data);
      socket.on("send-changes", (delta) => {
        socket.broadcast.to(documentID).emit("recv-changes", delta);
      });
    });
    socket.on("chat-room", (chatID) => {
      socket.join(chatID);
      socket.on("NEW_CHAT_MESSAGE_EVENT", (message) => {
        socket.broadcast.to(chatID).emit("get-message", message);
      });
    });
    socket.on("video-call", async (data) => {
      const { roomId, userName: clientUserName } = data || {};

      // Attempt to resolve authenticated username from handshake token
      let serverUserName = clientUserName || "";
      try {
        // token can be sent in socket.handshake.auth.token or Authorization header
        const token =
          (socket.handshake &&
            socket.handshake.auth &&
            socket.handshake.auth.token) ||
          (socket.handshake &&
            socket.handshake.headers &&
            socket.handshake.headers.authorization &&
            socket.handshake.headers.authorization.split(" ")[1]);
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            const user = await userModel.findById(decoded.id).lean();
            if (user && user.username) {
              serverUserName = user.username;
            }
          }
        }
      } catch (e) {
        console.error(
          "[SOCKET] Could not resolve authenticated username from token:",
          e.message || e
        );
        // fall back to client-provided userName
      }

      console.log(
        `[SOCKET] User ${socket.id} (${
          serverUserName || clientUserName
        }) joining room: ${roomId}`
      );
      socket.join(roomId);

      // Get current room info
      const room = io.sockets.adapter.rooms.get(roomId);
      const userCount = room ? room.size : 1;

      console.log(`[SOCKET] Room ${roomId} now has ${userCount} user(s)`);

      // Send room info to the joining user
      socket.emit("room-info", {
        userCount: userCount,
        roomId: roomId,
        userName: serverUserName || clientUserName || null,
      });

      // Notify others in the room that someone joined
      socket.to(roomId).emit("user-joined", {
        userId: socket.id,
        userName: serverUserName || clientUserName || null,
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(
          `[SOCKET] User ${socket.id} (${
            serverUserName || clientUserName
          }) disconnected from room ${roomId}`
        );
        socket.to(roomId).emit("user-left", {
          userId: socket.id,
          userName: serverUserName || clientUserName || null,
        });
      });
    });

    // WebRTC signaling - completely independent of room joining
    socket.on("offer", async (data) => {
      console.log(
        `[SOCKET] WebRTC offer from ${socket.id} to room ${data.roomId}`
      );
      // Try to resolve server username similar to join handling
      let offerUserName = data.userName || null;
      try {
        const token =
          (socket.handshake &&
            socket.handshake.auth &&
            socket.handshake.auth.token) ||
          (socket.handshake &&
            socket.handshake.headers &&
            socket.handshake.headers.authorization &&
            socket.handshake.headers.authorization.split(" ")[1]);
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            const user = await userModel.findById(decoded.id).lean();
            if (user && user.username) offerUserName = user.username;
          }
        }
      } catch (e) {
        // ignore and use client provided name
      }
      socket.to(data.roomId).emit("offer", {
        signal: data.signal,
        from: socket.id,
        userName: offerUserName,
      });
    });

    socket.on("answer", (data) => {
      console.log(`[SOCKET] WebRTC answer from ${socket.id} to ${data.to}`);
      io.to(data.to).emit("answer", {
        signal: data.signal,
        from: socket.id,
      });
    });

    socket.on("ice-candidate", (data) => {
      console.log(`[SOCKET] ICE candidate from ${socket.id} to ${data.to}`);
      io.to(data.to).emit("ice-candidate", {
        candidate: data.candidate,
        from: socket.id,
      });
    });

    // Room-level UI toggle events (forwarded by server so hosts are authoritative)
    socket.on("toggle-editor", (data) => {
      try {
        const { roomId, enabled } = data || {};
        if (roomId) {
          socket.to(roomId).emit("toggle-editor", { enabled });
        }
      } catch (e) {
        console.error("[SOCKET] toggle-editor error:", e.message || e);
      }
    });

    socket.on("toggle-questions", (data) => {
      try {
        const { roomId, enabled } = data || {};
        if (roomId) {
          socket.to(roomId).emit("toggle-questions", { enabled });
        }
      } catch (e) {
        console.error("[SOCKET] toggle-questions error:", e.message || e);
      }
    });
  });
};
module.exports = socketconnection;
