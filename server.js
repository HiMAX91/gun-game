const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let players = {};
let gameOver = false;

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`玩家連線: ${socket.id}`);
    
    // 初始化新玩家，目前設定最多兩人
    if (Object.keys(players).length < 2) {
        players[socket.id] = { id: socket.id, x: 0, y: 1, z: Object.keys(players).length * 10 - 5, hp: 100 };
    }
    
    // 傳送狀態給新玩家，並廣播給其他人
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // 同步玩家移動
    socket.on('playerMovement', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].z = data.z;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // 射擊命中判定 (一槍定生死)
    socket.on('shootHit', (targetId) => {
        if (gameOver) return;
        if (players[targetId]) {
            players[targetId].hp -= 100; // 一槍斃命
            io.emit('hpUpdate', { id: targetId, hp: players[targetId].hp });

            if (players[targetId].hp <= 0) {
                gameOver = true;
                io.emit('victory', { winner: socket.id, loser: targetId });
            }
        }
    });

    // 玩家斷線處理
    socket.on('disconnect', () => {
        console.log(`玩家斷線: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
        gameOver = false; // 有人退出就重置遊戲結束狀態
    });
});

http.listen(3000, () => {
    console.log('伺服器啟動於 port 3000');
});
