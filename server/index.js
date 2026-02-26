const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 5000;

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

let connectedUsers = [];

io.on("connection", (socket) => {
  connectedUsers.push(socket.id);
  console.log("User Connected:", socket.id, "- Total online:", connectedUsers.length);

  socket.emit("me", socket.id);

  socket.on("callUser", (data) => {
    // Auto-Pairing logic: Find the first user who isn't the caller
    const partnerId = connectedUsers.find(id => id !== socket.id);

    if (partnerId) {
      console.log(`Routing call from ${socket.id} to ${partnerId}`);
      io.to(partnerId).emit("callUser", { 
        signal: data.signalData || data.signal, 
        from: socket.id, 
        name: data.name 
      });
    } else {
      console.log("No partner available to receive the call.");
    }
  });

  socket.on("answerCall", (data) => {
    console.log(`Answering Call to: ${data.to}`);
    io.to(data.to).emit("callAccepted", data.signal);
  });

  socket.on("disconnect", () => {
    connectedUsers = connectedUsers.filter(id => id !== socket.id);
    console.log("User Disconnected:", socket.id, "- Total online:", connectedUsers.length);
    socket.broadcast.emit("callEnded"); 
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
