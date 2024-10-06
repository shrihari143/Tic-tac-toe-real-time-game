// gamemodel.js
const mongoose = require('mongoose');

// Define the game schema
const gameSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    players: [{ name: String, symbol: String }],
    moves: [{ player: String, position: Number }],
    winner: { type: String, default: null },
    isDraw: { type: Boolean, default: false }
});

// Create the Game model
const Game = mongoose.model('Game', gameSchema);

// Export the model to use in other files
module.exports = Game;
