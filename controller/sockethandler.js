const socketconnection = (Server) => {
  const io = require("socket.io")(Server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET, POST"],
    },
  });
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
    socket.on("video-call", (data) => {
      const { roomId, userName } = data;

      console.log(
        `[SOCKET] User ${socket.id} (${userName}) joining room: ${roomId}`
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
      });

      // Notify others in the room that someone joined
      socket.to(roomId).emit("user-joined", {
        userId: socket.id,
        userName: userName,
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(
          `[SOCKET] User ${socket.id} (${userName}) disconnected from room ${roomId}`
        );
        socket.to(roomId).emit("user-left", {
          userId: socket.id,
          userName: userName,
        });
      });
    });

    // WebRTC signaling - completely independent of room joining
    socket.on("offer", (data) => {
      console.log(
        `[SOCKET] WebRTC offer from ${socket.id} to room ${data.roomId}`
      );
      socket.to(data.roomId).emit("offer", {
        signal: data.signal,
        from: socket.id,
        userName: data.userName,
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
  });
};
module.exports = socketconnection;
