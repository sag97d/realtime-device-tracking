const express = require('express');
const app = express();
const socketio = require("socket.io")
const http = require("http");
const path = require('path');

const server = http.createServer(app)
const io = socketio(server)

app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, "public")));

const users = {};


io.on("connection", (socket) => {
    socket.emit("existing-users", users);

    socket.on("send-location", (data) => {
        users[socket.id] = data;
        io.emit("receive-location", { id: socket.id, ...data })
    })
    socket.on("disconnect", ()=>{
        io.emit("user-disconnected", socket.id)
    })
    console.log("a new user connected");
})

app.get('/', (req, res) => {
    res.render('index')
})

server.listen(3000);
