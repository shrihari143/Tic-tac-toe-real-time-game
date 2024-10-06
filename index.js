const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require('dotenv').config(); 
const Game = require('./model/gameModel');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT= process.env.PORT||8000;
app.use(express.static(path.resolve("")));
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

  io.on("connection", (socket) => {
    console.log("New player connected: ", socket.id);

    socket.on("createRoom", (roomId, playerName) => {
        Game.findOne({ roomId }).then((foundGame) => {
            if (!foundGame) {
                // Create a new game if it doesn't exist
                const newGame = new Game({ roomId, players: [{ name: playerName, symbol: "X" }] });
                newGame.save().then(() => {
                    socket.join(roomId);
                    socket.emit("roomCreated", { roomId, playerSymbol: "X" });
                });
            } else {
                if (foundGame.players.length < 2) {
                    foundGame.players.push({ name: playerName, symbol: "O" });
                    foundGame.save().then(() => {
                        socket.join(roomId);
                        io.to(roomId).emit("roomJoined", { roomId, players: foundGame.players });
                    });
                } else {
                    socket.emit("roomFull", { roomId });
                }
            }
        });
    });

    socket.on("playing", ({ roomId, playerName, position }) => {
        Game.findOne({ roomId }).then((game) => {
            if (game) {
                game.moves.push({ player: playerName, position });
                game.save().then((updatedGame) => {
                    io.to(roomId).emit("updateGame", updatedGame);
                    checkWinner(updatedGame, roomId);
                });
            }
        });
    });

    socket.on("disconnect", () => {
        console.log("Player disconnected: ", socket.id);
    });
});

const checkWinner = (game, roomId) => {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], 
        [0, 3, 6], [1, 4, 7], [2, 5, 8], 
        [0, 4, 8], [2, 4, 6] 
    ];

    let xMoves = game.moves.filter(move => move.player === game.players[0].name).map(move => move.position);
    let oMoves = game.players.length > 1 ? game.moves.filter(move => move.player === game.players[1].name).map(move => move.position) : [];

    for (const combination of winningCombinations) {
        if (combination.every(index => xMoves.includes(index))) {
            game.winner = game.players[0].name;
            break;
        } else if (combination.every(index => oMoves.includes(index))) {
            game.winner = game.players[1] ? game.players[1].name : null;
            break;
        }
    }

    if (game.moves.length === 9 && !game.winner) {
        game.isDraw = true;
    }

    game.save().then(updatedGame => {
        if (updatedGame.winner) {
            io.to(roomId).emit("gameOver", { winner: updatedGame.winner });
        } else if (updatedGame.isDraw) {
            io.to(roomId).emit("gameOver", { winner: null });
        }
    });
};

app.get("/", (req, res) => {
    return res.sendFile(path.join(__dirname, "index.html"));
});
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
