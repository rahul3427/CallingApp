const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 5000;
const APP_PASSWORD = process.env.APP_PASSWORD || "Rahul12345"; 
const CHAT_HISTORY_FILE = path.join(__dirname, "chat_history.json");

// Serve static files from the React client build
app.use(express.static(path.join(__dirname, '../client/dist')));

// Load Chat History
let chatHistory = [];
try {
  if (fs.existsSync(CHAT_HISTORY_FILE)) {
    chatHistory = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, "utf-8"));
    console.log(`Loaded ${chatHistory.length} messages from history.`);
  }
} catch (err) {
  console.error("Error loading chat history:", err);
}

// Save Chat History
function saveChatHistory() {
  try {
    fs.writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
  } catch (err) {
    console.error("Error saving chat history:", err);
  }
}

// Active room users: map of socket.id -> { id, nickname }
let activeUsers = {};

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id}`);

  // Send socket id back to the user
  socket.emit("me", socket.id);

  // Authenticate and join the chat room
  socket.on("join-room", (data) => {
    const { nickname, password } = data;
    
    if (password !== APP_PASSWORD) {
      console.log(`Failed login attempt from ${socket.id} with nick: ${nickname}`);
      socket.emit("join-error", "Incorrect passphrase. Please try again.");
      return;
    }

    // Register user
    const userNick = nickname || `User-${socket.id.slice(0, 4)}`;
    activeUsers[socket.id] = { id: socket.id, nickname: userNick };
    console.log(`User joined: ${userNick} (${socket.id})`);

    // Let the user know they joined successfully
    socket.emit("join-success", {
      me: socket.id,
      chatHistory: chatHistory
    });

    // Notify other users in the room
    const systemMsg = {
      id: `sys-${Date.now()}`,
      sender: "System",
      text: `${userNick} joined the room`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    chatHistory.push(systemMsg);
    if (chatHistory.length > 200) chatHistory.shift();
    saveChatHistory();

    // Broadcast system message and updated user list
    io.emit("receive-message", systemMsg);
    io.emit("user-list", Object.values(activeUsers));
  });

  // Handle regular chat messages
  socket.on("send-message", (data) => {
    const user = activeUsers[socket.id];
    if (!user) return; // User not logged in

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sender: user.nickname,
      text: data.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHeart: data.isHeart || false
    };

    chatHistory.push(msg);
    if (chatHistory.length > 200) chatHistory.shift();
    saveChatHistory();

    io.emit("receive-message", msg);
  });

  // Handle Heart pulse (Vibration event)
  socket.on("send-heart", () => {
    const user = activeUsers[socket.id];
    if (!user) return;
    console.log(`Heart sent by ${user.nickname}`);
    // Broadcast heart to everyone except the sender
    socket.broadcast.emit("receive-heart", { sender: user.nickname });
  });

  // Clear Chat History
  socket.on("clear-chat", () => {
    const user = activeUsers[socket.id];
    if (!user) return;

    chatHistory = [];
    saveChatHistory();

    const systemMsg = {
      id: `sys-${Date.now()}`,
      sender: "System",
      text: `Chat history cleared by ${user.nickname}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    chatHistory.push(systemMsg);
    saveChatHistory();

    io.emit("chat-cleared", systemMsg);
  });

  // Emergency Reset from Login Screen (Forgot Gmail Reset)
  socket.on("forgot-reset", () => {
    chatHistory = [];
    saveChatHistory();

    const systemMsg = {
      id: `sys-${Date.now()}`,
      sender: "System",
      text: `Chat history cleared via emergency Workspace reset.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    chatHistory.push(systemMsg);
    saveChatHistory();

    io.emit("chat-cleared", systemMsg);
    console.log("Emergency wipe triggered via login page reset.");
  });

  // WebRTC Video/Audio Call signaling routing
  socket.on("callUser", (data) => {
    const caller = activeUsers[socket.id];
    if (!caller) return;

    console.log(`Call initiated by ${caller.nickname} (${socket.id}) to ${data.to} - Type: ${data.type}`);
    io.to(data.to).emit("callUser", {
      signal: data.signalData || data.signal,
      from: socket.id,
      name: caller.nickname,
      type: data.type // 'audio' or 'video'
    });
  });

  socket.on("answerCall", (data) => {
    console.log(`Call answered by ${socket.id} to ${data.to}`);
    io.to(data.to).emit("callAccepted", {
      signal: data.signal,
      from: socket.id
    });
  });

  socket.on("endCall", (data) => {
    console.log(`Call ended by ${socket.id} to partner ${data?.to}`);
    if (data?.to) {
      io.to(data.to).emit("callEnded");
    } else {
      socket.broadcast.emit("callEnded");
    }
  });

  socket.on("disconnect", () => {
    const user = activeUsers[socket.id];
    if (user) {
      console.log(`User disconnected: ${user.nickname} (${socket.id})`);
      
      const systemMsg = {
        id: `sys-${Date.now()}`,
        sender: "System",
        text: `${user.nickname} left the room`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      };
      chatHistory.push(systemMsg);
      if (chatHistory.length > 200) chatHistory.shift();
      saveChatHistory();

      // Clean up user
      delete activeUsers[socket.id];

      // Broadcast system notification of departure and new user list
      io.emit("receive-message", systemMsg);
      io.emit("user-list", Object.values(activeUsers));
    }
    
    // Always notify standard callEnded just in case
    socket.broadcast.emit("callEnded");
  });
});

// The catch-all handler for serving client HTML pages (SPA)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

