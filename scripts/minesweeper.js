const gameContainer = document.getElementById('minesweeperGame');
const statusText = document.getElementById('minesweeperStatus');
const restartBtn = document.getElementById('minesweeperRestart');

const gridSize = 10;
const mineCount = 15;
let grid = [];
let gameOver = false;

function createGrid() {
    gameContainer.innerHTML = '';
    grid = [];
    gameOver = false;
    statusText.textContent = '';

    // Create grid array
    for (let y = 0; y < gridSize; y++) {
        let row = [];
        for (let x = 0; x < gridSize; x++) {
            row.push({
                x,
                y,
                mine: false,
                revealed: false,
                flagged: false,
                adjacentMines: 0,
                element: null,
            });
        }
        grid.push(row);
    }

    // Place mines
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
        let x = Math.floor(Math.random() * gridSize);
        let y = Math.floor(Math.random() * gridSize);
        if (!grid[y][x].mine) {
            grid[y][x].mine = true;
            minesPlaced++;
        }
    }

    // Calculate adjacent mines
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            let cell = grid[y][x];
            cell.adjacentMines = countAdjacentMines(cell);
        }
    }

    // Create grid elements
    for (let y = 0; y < gridSize; y++) {
        let rowElement = document.createElement('div');
        rowElement.classList.add('minesweeper-row');
        for (let x = 0; x < gridSize; x++) {
            let cell = grid[y][x];
            let cellElement = document.createElement('div');
            cellElement.classList.add('minesweeper-cell');
            cellElement.dataset.x = x;
            cellElement.dataset.y = y;
            cellElement.addEventListener('click', cellClicked);
            cellElement.addEventListener('contextmenu', cellRightClicked);
            cell.element = cellElement;
            rowElement.appendChild(cellElement);
        }
        gameContainer.appendChild(rowElement);
    }
}

function countAdjacentMines(cell) {
    let count = 0;
    for (let y = cell.y - 1; y <= cell.y + 1; y++) {
        for (let x = cell.x - 1; x <= cell.x + 1; x++) {
            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                if (grid[y][x].mine) {
                    count++;
                }
            }
        }
    }
    return count;
}

function cellClicked(event) {
    if (gameOver) return;
    let x = parseInt(event.target.dataset.x);
    let y = parseInt(event.target.dataset.y);
    let cell = grid[y][x];
    if (cell.revealed || cell.flagged) return;
    revealCell(cell);
    checkWin();
}

function cellRightClicked(event) {
    event.preventDefault();
    if (gameOver) return;
    let x = parseInt(event.target.dataset.x);
    let y = parseInt(event.target.dataset.y);
    let cell = grid[y][x];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    cell.element.textContent = cell.flagged ? '🚩' : '';
}

function revealCell(cell) {
    if (cell.revealed || cell.flagged) return;
    cell.revealed = true;
    cell.element.classList.add('revealed');
    if (cell.mine) {
        cell.element.textContent = '💣';
        gameOver = true;
        statusText.textContent = 'Game Over!';
        revealAllMines();
    } else {
        if (cell.adjacentMines > 0) {
            cell.element.textContent = cell.adjacentMines;
        } else {
            cell.element.textContent = '';
            // Reveal adjacent cells
            for (let y = cell.y - 1; y <= cell.y + 1; y++) {
                for (let x = cell.x - 1; x <= cell.x + 1; x++) {
                    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                        revealCell(grid[y][x]);
                    }
                }
            }
        }
    }
}

function revealAllMines() {
    for (let row of grid) {
        for (let cell of row) {
            if (cell.mine) {
                cell.element.textContent = '💣';
                cell.element.classList.add('revealed');
            }
        }
    }
}

function checkWin() {
    let revealedCount = 0;
    for (let row of grid) {
        for (let cell of row) {
            if (cell.revealed) revealedCount++;
        }
    }
    if (revealedCount === gridSize * gridSize - mineCount) {
        gameOver = true;
        statusText.textContent = 'You Win!';
        revealAllMines();
    }
}

restartBtn.addEventListener('click', createGrid);
createGrid();
