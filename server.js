const express = require("express");
const app = express();
const server = require("http").Server(app);
const Queue = require('bull');
const roomQueue = new Queue('roomqueue', { redis: { port: 6379, host: 'video-chat-redis-001.9ux6qq.0001.aps1.cache.amazonaws.com' } });
const roomIDQueue = new Queue('room_id_queue', { redis: { port: 6379, host: 'video-chat-redis-001.9ux6qq.0001.aps1.cache.amazonaws.com' } });

const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*'
  }
});
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});


app.use("/peerjs", peerServer);
app.use(express.static("public"));


// app.get("/", (req, res) => {
//   res.redirect(`/${uuidv4()}`);
//   });

app.get("/", (req, res) => {
  res.render("room", {});
});

io.on("connection", (socket) => {
  roomQueue.add({ socket_id: socket.id, type: "join" });
  socket.on("join-room", async (roomId, userId, userName) => {
    socket.join(roomId);
    console.log(
      `Room join ------------------------------------------- ${roomId} User: ${userName}`
    );
    socket.to(roomId).emit("user-connected", userId);
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });

    socket.on("disconnect", async (reason) => {
      console.log(`User disconnected: ${userName} due to ${reason}`);
      roomQueue.add({ room_id: roomId, type: "leave" });
      io.to(roomId).emit("user-disconnected", userName);
    });
  });
});

roomQueue.process(async function (job, done) {
  const data = job.data;
  if (data.type == "join") {
    let value = await roomIDQueue.getNextJob();
    console.log("VALUE -------", value?.data);
    let room_id = null;
    if (!value || !value.data) {
      room_id = uuidv4();
      await roomIDQueue.add({ room_id });
    } else {
      room_id = value.data.room_id;
    }
    console.log("room_id", { roomId: room_id, socketId: data.socket_id });
    io.to(data.socket_id).emit("room_id", room_id);
  } else if (data.type == "leave") {
    let value = await roomIDQueue.getNextJob();
    console.log(value?.data, data);
    if (value && value.data && value.data.room_id != data.room_id) {
      await roomIDQueue.add({ room_id: value.data.room_id });
    }
  }
  done();
});

server.listen(process.env.PORT || 3030, () => {
  console.log("Server started at 3030")
});