const socket = io();

let gameState = null;
let mySymbol = null;

socket.on('playerAssigned', (data) => {
    console.log('Player assigned:', data);
    mySymbol = data.symbol;
    gameState = data.gameState;
    console.log('Game state received:', gameState);
    renderBoard();
    updateGameInfo();
});

socket.on('gameUpdate', (data) => {
    console.log('Game update received:', data);
    gameState = data;
    renderBoard();
    updateGameInfo();
});

function renderBoard() {
    const boardEl = document.getElementById('board');
    
    if (!gameState || !gameState.boards) {
        console.log('No game state or boards yet');
        return;
    }
    
    boardEl.innerHTML = '';
    console.log('Rendering board...');
    
    // Create 9 small boards
    for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
        const smallBoard = document.createElement('div');
        smallBoard.className = 'small-board';
        
        // Check if this board is active (where player must play)
        const isActive = gameState.activeBoard === null || gameState.activeBoard === boardIndex;
        const isWon = gameState.boardWinners[boardIndex] !== null;
        
        if (isActive && !isWon && gameState.winner === null) {
            smallBoard.classList.add('active');
        }
        
        // If board is won, show winner overlay
        if (isWon) {
            smallBoard.classList.add('won');
            const winnerOverlay = document.createElement('div');
            winnerOverlay.className = 'winner-overlay';
            winnerOverlay.textContent = gameState.boardWinners[boardIndex] === 'tie' ? '' : gameState.boardWinners[boardIndex];
            smallBoard.appendChild(winnerOverlay);
        }
        
        // Create 9 cells in each small board
        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            const cell = document.createElement('button');
            cell.className = 'cell';
            cell.textContent = gameState.boards[boardIndex][cellIndex];
            
            if (gameState.boards[boardIndex][cellIndex]) {
                cell.classList.add(gameState.boards[boardIndex][cellIndex].toLowerCase());
            }
            
            cell.onclick = () => makeMove(boardIndex, cellIndex);
            
            // Disable cell if:
            const isMyTurn = gameState.currentTurn === mySymbol;
            const isBoardActive = gameState.activeBoard === null || gameState.activeBoard === boardIndex;
            const cellFilled = gameState.boards[boardIndex][cellIndex] !== '';
            const boardWon = gameState.boardWinners[boardIndex] !== null;
            
            cell.disabled = !isMyTurn || 
                           !isBoardActive || 
                           cellFilled || 
                           boardWon || 
                           gameState.winner !== null ||
                           mySymbol === 'spectator';
            
            smallBoard.appendChild(cell);
        }
        
        boardEl.appendChild(smallBoard);
    }
    console.log('Board rendered successfully');
}

function makeMove(boardIndex, cellIndex) {
    if (!gameState) return;
    
    const isMyTurn = gameState.currentTurn === mySymbol;
    const isBoardActive = gameState.activeBoard === null || gameState.activeBoard === boardIndex;
    
    if (!isMyTurn || !isBoardActive || mySymbol === 'spectator') return;
    if (gameState.boards[boardIndex][cellIndex] !== '') return;
    if (gameState.boardWinners[boardIndex] !== null) return;
    if (gameState.winner !== null) return;
    
    console.log('Making move:', boardIndex, cellIndex);
    socket.emit('makeMove', { boardIndex, cellIndex });
}

function updateGameInfo() {
    if (!gameState) return;
    
    const statusEl = document.getElementById('status');
    const turnInfoEl = document.getElementById('turnInfo');
    const winnerEl = document.getElementById('winner');

    if (mySymbol === 'spectator') {
        statusEl.textContent = 'You are spectating';
    } else if (mySymbol) {
        statusEl.textContent = `You are: ${mySymbol}`;
    } else {
        statusEl.textContent = 'Connecting...';
    }

    if (gameState.winner) {
        if (gameState.winner === 'tie') {
            winnerEl.textContent = "It's a tie!";
        } else {
            winnerEl.textContent = `${gameState.winner} wins!`;
        }
        turnInfoEl.textContent = '';
    } else {
        winnerEl.textContent = '';
        
        if (!gameState.playerX || !gameState.playerO) {
            turnInfoEl.textContent = 'Waiting for another player...';
        } else if (gameState.currentTurn === mySymbol) {
            if (gameState.activeBoard === null) {
                turnInfoEl.textContent = 'Your turn! Play in any available board';
            } else {
                turnInfoEl.textContent = 'Your turn! Play in the highlighted board';
            }
        } else {
            turnInfoEl.textContent = `Waiting for ${gameState.currentTurn}...`;
        }
    }
}

function resetGame() {
    socket.emit('resetGame');
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('themeToggle').textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    localStorage.setItem('darkMode', isDark);
}

// Load saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').textContent = '☀️ Light Mode';
    }
});