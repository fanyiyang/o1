const canvas = document.getElementById('gomokuCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('gomokuStatus');
const restartBtn = document.getElementById('gomokuRestart');
const gridSize = 15;
const cellSize = canvas.width / gridSize;
let board = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
let currentPlayer = 'black';
let gameActive = true;

function drawBoard() {
    ctx.strokeStyle = '#000';
    for (let i = 0; i < gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(cellSize / 2, cellSize / 2 + i * cellSize);
        ctx.lineTo(canvas.width - cellSize / 2, cellSize / 2 + i * cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cellSize / 2 + i * cellSize, cellSize / 2);
        ctx.lineTo(cellSize / 2 + i * cellSize, canvas.height - cellSize / 2);
        ctx.stroke();
    }
}

function placeStone(x, y) {
    ctx.beginPath();
    ctx.arc(
        cellSize / 2 + x * cellSize,
        cellSize / 2 + y * cellSize,
        cellSize / 2 - 2,
        0,
        2 * Math.PI
    );
    ctx.fillStyle = currentPlayer;
    ctx.fill();
}

function handleCanvasClick(event) {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const y = Math.floor((event.clientY - rect.top) / cellSize);

    if (board[y][x]) return;

    board[y][x] = currentPlayer;
    placeStone(x, y);

    if (checkWin(x, y)) {
        statusText.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} wins!`;
        gameActive = false;
    } else {
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        statusText.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
    }
}

function checkWin(x, y) {
    const directions = [
        { dx: 1, dy: 0 },  // Horizontal
        { dx: 0, dy: 1 },  // Vertical
        { dx: 1, dy: 1 },  // Diagonal \
        { dx: 1, dy: -1 }  // Diagonal /
    ];
    for (let { dx, dy } of directions) {
        let count = 1;
        count += countStones(x, y, dx, dy);
        count += countStones(x, y, -dx, -dy);
        if (count >= 5) return true;
    }
    return false;
}

function countStones(x, y, dx, dy) {
    let count = 0;
    let i = 1;
    while (true) {
        const nx = x + dx * i;
        const ny = y + dy * i;
        if (
            nx >= 0 && nx < gridSize &&
            ny >= 0 && ny < gridSize &&
            board[ny][nx] === currentPlayer
        ) {
            count++;
            i++;
        } else {
            break;
        }
    }
    return count;
}

function restartGame() {
    board = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    currentPlayer = 'black';
    gameActive = true;
    statusText.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
}

canvas.addEventListener('click', handleCanvasClick);
restartBtn.addEventListener('click', restartGame);
drawBoard();
statusText.textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s turn`;
