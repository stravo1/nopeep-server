const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*" /* had to google it */,
    },
});

io.use((socket, next) => {
    const { roomId } = socket.handshake.auth;

    let room_obj = io.sockets.adapter.rooms.get(roomId);
    if (room_obj && room_obj.size == 2) {
        const err = new Error("room-full");
        next(err);
    } else {
        next();
    }

});

io.on("connection", (socket) => {
    const { roomId } = socket.handshake.auth;

    socket.join(roomId);
    let room_obj = io.sockets.adapter.rooms.get(roomId); // list of all the clients

    io.to(socket.id).emit("room-members", [
        ...room_obj,
    ]); /* should be manually seralized */

    io.to(roomId).emit("new-room-member", socket.id);

    socket.on("transfer-offer", (from, to, data) => {
        //console.log(from, to, "offer");
        io.to(to).emit("receive-offer", from, data);
    });

    socket.on("transfer-answer", (from, to, data) => {
        //console.log(from, to, "answer");
        io.to(to).emit("receive-answer", from, data);
    });

    socket.on("transfer-ice", (from, to, data) => {
        //console.log(from, to, "ice");
        io.to(to).emit("receive-ice", from, data);
    });

    socket.on("disconnect", () => {
        let room_obj = io.sockets.adapter.rooms.get(roomId);
        if (room_obj) {
            io.to(roomId).emit("remove-room-member", socket.id);
        }
    });
});

app.get("/", (req, res) => {
    res.send("ok");
});

httpServer.listen(8080);
