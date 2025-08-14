// signaling-server/index.js
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // IMPORTANT: Adjust this in production to your Next.js app's URL
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 4000;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    console.log(`User ${userId} joined room ${roomId}`);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
      console.log(`User ${userId} disconnected from room ${roomId}`);
    });

    // WebRTC signaling messages
    socket.on('offer', (targetUserId, offer) => {
      socket.to(targetUserId).emit('offer', socket.id, offer);
    });

    socket.on('answer', (targetUserId, answer) => {
      socket.to(targetUserId).emit('answer', socket.id, answer);
    });

    socket.on('ice-candidate', (targetUserId, candidate) => {
      socket.to(targetUserId).emit('ice-candidate', socket.id, candidate);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});