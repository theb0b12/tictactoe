const socket = io();

let gameState = null;

socket.on('gameUpdate', (data) => {
    gameState = data;
    renderBoard();
    updateGameInfo();
});

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
        cell.disabled = gameState.board[i] !== '' || gameState.winner !== null;
        boardEl.appendChild(cell);
    }
}

function makeMove(index) {
    if (gameState.board[index] !== '' || gameState.winner !== null) return;
    socket.emit('makeMove', { index });
}

function updateGameInfo() {
    const statusEl = document.getElementById('status');
    const turnInfoEl = document.getElementById('turnInfo');
    const winnerEl = document.getElementById('winner');

    if (gameState.winner) {
        if (gameState.winner === 'tie') {
            winnerEl.textContent = "It's a tie!";
            statusEl.textContent = 'Game Over';
        } else {
            winnerEl.textContent = `${gameState.winner} wins!`;
            statusEl.textContent = 'Game Over';
        }
        turnInfoEl.textContent = '';
    } else {
        winnerEl.textContent = '';
        statusEl.textContent = `Current Turn: ${gameState.currentTurn}`;
        turnInfoEl.textContent = 'Click any empty cell to play';
    }
}

function resetGame() {
    socket.emit('resetGame');
}