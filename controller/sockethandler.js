const socketconnection = (Server) => {
  // Allow configuring the client origin via environment so backend can accept
  // socket connections from the correct frontend host in different environments.
  const clientOrigin =
    process.env.CLIENT_ORIGIN ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";

  const { populateErrorTable } = require("../utils/logger");

  const io = require("socket.io")(Server, {
    cors: {
      origin: clientOrigin,
      methods: ["GET", "POST"],
    },
  });
  const jwt = require("jsonwebtoken");
  const userModel = require("../models/userModel");

  io.on("connection", (socket) => {
    // connection established (debug logs removed per requested replacement)
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
        // Persist unexpected errors
        populateErrorTable(
          "error",
          "[SOCKET] Could not resolve authenticated username from token",
          { message: e && e.message ? e.message : e }
        );
        // fall back to client-provided userName
      }

      // Check current room occupancy BEFORE allowing the join. Limit to 4
      // participants to enforce the requirement that multiple people can
      // join but cap the room size.
      const existingRoom = io.sockets.adapter.rooms.get(roomId);
      const currentCount = existingRoom ? existingRoom.size : 0;
      const MAX_PARTICIPANTS = 4;

      if (currentCount >= MAX_PARTICIPANTS) {
        // Inform the joining client that the room is full and do not join
        socket.emit("room-full", {
          roomId: roomId,
          userCount: currentCount,
          message: `Room is full (max ${MAX_PARTICIPANTS} participants)`,
        });
        return;
      }

      // Determine existing members before joining so the joining client can
      // initiate direct offers to them. We compute this list before calling
      // socket.join so it represents the pre-join occupants.
      const existingIds = existingRoom ? Array.from(existingRoom) : [];

      // user joining room (debug log removed)
      socket.join(roomId);

      // Get current room info after join
      const room = io.sockets.adapter.rooms.get(roomId);
      const userCount = room ? room.size : 1;

      // room user count (debug log removed)

      // Send room info to the joining user
      socket.emit("room-info", {
        userCount: userCount,
        roomId: roomId,
        userName: serverUserName || clientUserName || null,
        existingMembers: existingIds,
      });

      // Notify others in the room that someone joined
      socket.to(roomId).emit("user-joined", {
        userId: socket.id,
        userName: serverUserName || clientUserName || null,
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        // user disconnected (debug log removed)
        socket.to(roomId).emit("user-left", {
          userId: socket.id,
          userName: serverUserName || clientUserName || null,
        });
      });

      // Allow clients to explicitly leave a room (e.g., 'Leave' button) without
      // tearing down the entire socket connection. Broadcast a 'user-left' event
      // to other occupants so they can cleanup immediately.
      socket.on("leave-room", (data) => {
        try {
          const { roomId } = data || {};
          if (roomId) {
            socket.to(roomId).emit("user-left", {
              userId: socket.id,
              userName: serverUserName || clientUserName || null,
            });
            socket.leave(roomId);
          }
        } catch (e) {
          populateErrorTable("error", "leave-room error", {
            message: e && e.message ? e.message : e,
          });
        }
      });
    });

    // WebRTC signaling - completely independent of room joining
    socket.on("offer", async (data) => {
      // WebRTC offer (debug log removed)
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
      // If a specific recipient is requested, send directly to that socket id.
      // This reduces unnecessary broadcast traffic when the joining client
      // targets existing members individually.
      if (data && data.to) {
        io.to(data.to).emit("offer", {
          signal: data.signal,
          from: socket.id,
          userName: offerUserName,
        });
      } else {
        socket.to(data.roomId).emit("offer", {
          signal: data.signal,
          from: socket.id,
          userName: offerUserName,
        });
      }
    });

    socket.on("answer", (data) => {
      // WebRTC answer (debug log removed)
      io.to(data.to).emit("answer", {
        signal: data.signal,
        from: socket.id,
      });
    });

    socket.on("ice-candidate", (data) => {
      // ICE candidate (debug log removed)
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
        populateErrorTable("error", "toggle-editor error", {
          message: e && e.message ? e.message : e,
        });
      }
    });

    socket.on("toggle-questions", (data) => {
      try {
        const { roomId, enabled } = data || {};
        if (roomId) {
          socket.to(roomId).emit("toggle-questions", { enabled });
        }
      } catch (e) {
        populateErrorTable("error", "toggle-questions error", {
          message: e && e.message ? e.message : e,
        });
      }
    });
  });
};
module.exports = socketconnection;
