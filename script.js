let gameCode = '';
let playerName = '';
let playerSymbol = '';
let gameState = null;
let pollInterval = null;

function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function joinGame() {
    const code = document.getElementById('gameCode').value.trim().toUpperCase();
    playerName = document.getElementById('playerName').value.trim();

    if (!playerName) {
        alert('Please enter your name');
        return;
    }

    try {
        if (code) {
            gameCode = code;
            const result = await window.storage.get(`game:${gameCode}`, true);
            
            if (!result) {
                alert('Game not found');
                return;
            }

            gameState = JSON.parse(result.value);

            if (gameState.player2) {
                alert('Game is full');
                return;
            }

            gameState.player2 = playerName;
            playerSymbol = 'O';
            await window.storage.set(`game:${gameCode}`, JSON.stringify(gameState), true);
        } else {
            gameCode = generateGameCode();
            playerSymbol = 'X';
            gameState = {
                board: ['', '', '', '', '', '', '', '', ''],
                currentTurn: 'X',
                player1: playerName,
                player2: null,
                winner: null,
                gameCode: gameCode
            };
            await window.storage.set(`game:${gameCode}`, JSON.stringify(gameState), true);
        }

        document.getElementById('setupScreen').classList.add('hidden');
        document.getElementById('gameScreen').classList.remove('hidden');
        
        renderBoard();
        updateGameInfo();
        startPolling();
    } catch (error) {
        console.error('Error joining game:', error);
        alert('Error joining game. Please try again.');
    }
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('button');
        cell.className = 'cell';
        cell.textContent = gameState.board[i];
        if (gameState.board[i]) {
            cell.classList.add(gameState.board[i].toLowerCase());
        }
        cell.onclick = () => makeMove(i);
        cell.disabled = gameState.board[i] !== '' || 
                        gameState.winner !== null || 
                        gameState.currentTurn !== playerSymbol ||
                        !gameState.player2;
        boardEl.appendChild(cell);
    }
}

async function makeMove(index) {
    if (gameState.board[index] !== '' || gameState.winner !== null) return;
    if (gameState.currentTurn !== playerSymbol) return;
    if (!gameState.player2) return;

    gameState.board[index] = playerSymbol;
    gameState.currentTurn = playerSymbol === 'X' ? 'O' : 'X';
    
    const winner = checkWinner();
    if (winner) {
        gameState.winner = winner;
    }

    try {
        await window.storage.set(`game:${gameCode}`, JSON.stringify(gameState), true);
        renderBoard();
        updateGameInfo();
    } catch (error) {
        console.error('Error making move:', error);
        alert('Error making move. Please try again.');
    }
}

function checkWinner() {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (let line of lines) {
        const [a, b, c] = line;
        if (gameState.board[a] && 
            gameState.board[a] === gameState.board[b] && 
            gameState.board[a] === gameState.board[c]) {
            return gameState.board[a];
        }
    }

    if (!gameState.board.includes('')) {
        return 'tie';
    }

    return null;
}

function updateGameInfo() {
    const statusEl = document.getElementById('status');
    const gameInfoEl = document.getElementById('gameInfo');
    const turnInfoEl = document.getElementById('turnInfo');
    const winnerEl = document.getElementById('winner');

    gameInfoEl.textContent = `Game Code: ${gameCode} | You are: ${playerSymbol}`;

    if (!gameState.player2) {
        statusEl.textContent = 'Waiting for opponent to join...';
        statusEl.classList.add('waiting');
        turnInfoEl.textContent = 'Share the game code with your friend!';
        winnerEl.textContent = '';
    } else {
        statusEl.classList.remove('waiting');
        
        if (gameState.winner) {
            if (gameState.winner === 'tie') {
                winnerEl.textContent = "It's a tie!";
                statusEl.textContent = 'Game Over';
            } else {
                const winnerName = gameState.winner === 'X' ? gameState.player1 : gameState.player2;
                winnerEl.textContent = `${winnerName} wins!`;
                statusEl.textContent = 'Game Over';
            }
            turnInfoEl.textContent = '';
        } else {
            winnerEl.textContent = '';
            const currentPlayer = gameState.currentTurn === 'X' ? gameState.player1 : gameState.player2;
            statusEl.textContent = `${gameState.player1} (X) vs ${gameState.player2} (O)`;
            
            if (gameState.currentTurn === playerSymbol) {
                turnInfoEl.textContent = 'Your turn!';
            } else {
                turnInfoEl.textContent = `Waiting for ${currentPlayer}...`;
            }
        }
    }
}

function startPolling() {
    pollInterval = setInterval(async () => {
        try {
            const result = await window.storage.get(`game:${gameCode}`, true);
            if (result) {
                gameState = JSON.parse(result.value);
                renderBoard();
                updateGameInfo();
            }
        } catch (error) {
            console.error('Error polling game state:', error);
        }
    }, 1000);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

async function resetGame() {
    stopPolling();
    
    try {
        await window.storage.delete(`game:${gameCode}`, true);
    } catch (error) {
        console.error('Error deleting game:', error);
    }

    gameCode = '';
    playerName = '';
    playerSymbol = '';
    gameState = null;

    document.getElementById('setupScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameCode').value = '';
    document.getElementById('playerName').value = '';
}

function leaveGame() {
    resetGame();
}