const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

// Game state for Ultimate Tic-Tac-Toe
let gameState = {
    // 9 small boards, each with 9 cells
    boards: Array(9).fill(null).map(() => Array(9).fill('')),
    // Winners of each small board (null, 'X', 'O', or 'tie')
    boardWinners: Array(9).fill(null),
    // Overall game winner
    winner: null,
    currentTurn: 'X',
    // Which board must be played in next (null = any board)
    activeBoard: null,
    playerX: null,
    playerO: null,
    chatMessages: [],
    moveHistory: []
};

function checkWinner(board){
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for(let line of lines){
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]){
            return board[a];
        }
    }

    if(!board.includes('') && !board.includes(null)){
        return 'tie';
    }

    return null;
}

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);
    
    let playerSymbol = null;
    if(!gameState.playerX){
        gameState.playerX = socket.id;
        playerSymbol = 'X';
        console.log('Player assigned as X');
    }else if(!gameState.playerO){
        gameState.playerO = socket.id;
        playerSymbol = 'O';
        console.log('Player assigned as O');
    }else{
        playerSymbol = 'spectator';
        console.log('Player joined as spectator');
    }
    
    socket.emit('playerAssigned', { symbol: playerSymbol, gameState: gameState });
    io.emit('gameUpdate', gameState);

    socket.on('makeMove', (data) => {
        const { boardIndex, cellIndex } = data;
        
        const isPlayerX = socket.id === gameState.playerX;
        const isPlayerO = socket.id === gameState.playerO;
        const isTheirTurn = (isPlayerX && gameState.currentTurn === 'X') || 
                           (isPlayerO && gameState.currentTurn === 'O');
        
        if (!isTheirTurn) return;
        
        // Check if move is valid
        if (gameState.winner !== null) return;
        if (gameState.boardWinners[boardIndex] !== null) return;
        if (gameState.boards[boardIndex][cellIndex] !== '') return;
        if (gameState.activeBoard !== null && gameState.activeBoard !== boardIndex) return;

        // Make the move
        const symbol = gameState.currentTurn;
        gameState.boards[boardIndex][cellIndex] = symbol;
        
        // Add to move history
        gameState.moveHistory.push({
            player: symbol,
            boardIndex: boardIndex,
            cellIndex: cellIndex,
            timestamp: Date.now()
        });
        
        // Check if this small board is won
        const boardWinner = checkWinner(gameState.boards[boardIndex]);
        if(boardWinner){
            gameState.boardWinners[boardIndex] = boardWinner;
            
            // Check if overall game is won
            const gameWinner = checkWinner(gameState.boardWinners);
            if(gameWinner){
                gameState.winner = gameWinner;
            }
        }
        
        // Set next active board
        // If the target board is already won or tied, player can play anywhere
        if(gameState.boardWinners[cellIndex] !== null){
            gameState.activeBoard = null;
        } else{
            gameState.activeBoard = cellIndex;
        }
        
        // Switch turns
        gameState.currentTurn = gameState.currentTurn === 'X' ? 'O' : 'X';
        
        io.emit('gameUpdate', gameState);
    });

    socket.on('resetGame', () => {
        gameState.boards = Array(9).fill(null).map(() => Array(9).fill(''));
        gameState.boardWinners = Array(9).fill(null);
        gameState.winner = null;
        gameState.currentTurn = 'X';
        gameState.activeBoard = null;
        gameState.moveHistory = [];
        
        io.emit('gameUpdate', gameState);
        console.log('Game reset');
    });

    socket.on('chatMessage', (data) => {
        const { message } = data;
        
        console.log('Chat message received:', message, 'from socket:', socket.id);
        
        let username = 'Spectator';
        let playerSymbol = null;
        if (socket.id === gameState.playerX){
            username = 'Player X';
            playerSymbol = 'X';
        } else if (socket.id === gameState.playerO){
            username = 'Player O';
            playerSymbol = 'O';
        }
        
        const chatMessage = {
            username: username,
            message: message,
            timestamp: Date.now(),
            player: playerSymbol
        };
        
        gameState.chatMessages.push(chatMessage);
        
        // Keep only last 50 messages
        if(gameState.chatMessages.length > 50){
            gameState.chatMessages.shift();
        }
        
        console.log('Broadcasting chat message:', chatMessage);
        io.emit('chatMessage', chatMessage);
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (socket.id === gameState.playerX){
            gameState.playerX = null;
            console.log('Player X disconnected');
        } else if(socket.id === gameState.playerO){
            gameState.playerO = null;
            console.log('Player O disconnected');
        }
        
        io.emit('gameUpdate', gameState);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Other devices on your network can connect using your local IP address`);
});