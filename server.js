const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Single game state for everyone
let gameState = {
    board: ['', '', '', '', '', '', '', '', ''],
    currentTurn: 'X',
    winner: null
};

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    if (!board.includes('')) {
        return 'tie';
    }

    return null;
}

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    
    // Send current game state to new player
    socket.emit('gameUpdate', gameState);

    socket.on('makeMove', (data) => {
        const { index } = data;
        
        if (gameState.board[index] !== '' || gameState.winner !== null) return;

        gameState.board[index] = gameState.currentTurn;
        gameState.currentTurn = gameState.currentTurn === 'X' ? 'O' : 'X';
        
        const winner = checkWinner(gameState.board);
        if (winner) {
            gameState.winner = winner;
        }

        // Send update to all connected players
        io.emit('gameUpdate', gameState);
    });

    socket.on('resetGame', () => {
        gameState = {
            board: ['', '', '', '', '', '', '', '', ''],
            currentTurn: 'X',
            winner: null
        };
        
        io.emit('gameUpdate', gameState);
        console.log('Game reset');
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Other devices on your network can connect using your local IP address`);
});