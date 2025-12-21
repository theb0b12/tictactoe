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

// Store active games in memory
const games = {};

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
    console.log('New client connected:', socket.id);

    socket.on('createGame', (data) => {
        const { gameCode, playerName } = data;
        
        games[gameCode] = {
            board: ['', '', '', '', '', '', '', '', ''],
            currentTurn: 'X',
            player1: playerName,
            player2: null,
            winner: null,
            gameCode: gameCode,
            player1Socket: socket.id,
            player2Socket: null
        };

        socket.join(gameCode);
        socket.emit('gameCreated', { gameState: games[gameCode] });
        console.log(`Game created: ${gameCode} by ${playerName}`);
    });

    socket.on('joinGame', (data) => {
        const { gameCode, playerName } = data;
        
        if (!games[gameCode]) {
            socket.emit('gameNotFound');
            return;
        }

        if (games[gameCode].player2) {
            socket.emit('gameFull');
            return;
        }

        games[gameCode].player2 = playerName;
        games[gameCode].player2Socket = socket.id;

        socket.join(gameCode);
        
        io.to(gameCode).emit('gameUpdate', games[gameCode]);
        socket.emit('gameJoined', { symbol: 'O', gameState: games[gameCode] });
        
        console.log(`${playerName} joined game: ${gameCode}`);
    });

    socket.on('makeMove', (data) => {
        const { gameCode, index, playerSymbol } = data;
        
        if (!games[gameCode]) return;
        
        const game = games[gameCode];
        
        if (game.board[index] !== '' || game.winner !== null) return;
        if (game.currentTurn !== playerSymbol) return;

        game.board[index] = playerSymbol;
        game.currentTurn = playerSymbol === 'X' ? 'O' : 'X';
        
        const winner = checkWinner(game.board);
        if (winner) {
            game.winner = winner;
        }

        io.to(gameCode).emit('gameUpdate', game);
    });

    socket.on('leaveGame', (data) => {
        const { gameCode } = data;
        
        if (games[gameCode]) {
            delete games[gameCode];
            io.to(gameCode).emit('gameEnded');
            console.log(`Game deleted: ${gameCode}`);
        }
        
        socket.leave(gameCode);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Clean up games when a player disconnects
        for (let gameCode in games) {
            if (games[gameCode].player1Socket === socket.id || 
                games[gameCode].player2Socket === socket.id) {
                io.to(gameCode).emit('playerDisconnected');
                delete games[gameCode];
                console.log(`Game ${gameCode} ended due to disconnect`);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Other devices on your network can connect using your local IP address`);
});