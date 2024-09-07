const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to SQLite database
const db = new sqlite3.Database("./chat.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("A user connected");

  // Load previous messages
  db.all(
    "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10",
    (err, rows) => {
      if (err) {
        console.error("Error fetching messages:", err.message);
      } else {
        socket.emit("load messages", rows.reverse());
      }
    }
  );

  socket.on("chat message", (data) => {
    const { username, message } = data;

    // Save message to database
    db.run(
      "INSERT INTO messages (username, message) VALUES (?, ?)",
      [username, message],
      (err) => {
        if (err) {
          console.error("Error saving message:", err.message);
        } else {
          // Broadcast message to all connected clients
          io.emit("chat message", { username, message });
        }
      }
    );
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
