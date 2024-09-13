
const canvas = document.getElementById('tetrisCanvas');
const context = canvas.getContext('2d');
const statusText = document.getElementById('tetrisStatus');
const restartBtn = document.getElementById('tetrisRestart');

context.scale(20, 20);

const matrixes = {
    T: [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
    ],
    O: [
        [2, 2],
        [2, 2],
    ],
    L: [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
    ],
    J: [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0],
    ],
    I: [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
    ],
    S: [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
    ],
    Z: [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
    ],
};

function createPiece(type) {
    return matrixes[type];
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = 'rgb(' + (value * 40 % 255) + ', ' + (value * 60 % 255) + ', ' + (value * 80 % 255) + ')';
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; y++) {
        for (let x = 0; x < m[y].length; x++) {
            if (
                m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
            ) {
                return true;
            }
        }
    }
    return false;
}

function createArena(w, h) {
    const arena = [];
    while (h--) {
        arena.push(new Array(w).fill(0));
    }
    return arena;
}

let arena = createArena(12, 20);

let player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
};

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function playerReset() {
    const pieces = 'TJLOSZI';
    player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
    player.pos.y = 0;
    player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    rotate(player.matrix, dir);
    const pos = player.pos.x;
    let offset = 1;
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < y; x++) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function arenaSweep() {
    outer: for (let y = arena.length - 1; y > 0; y--) {
        for (let x = 0; x < arena[y].length; x++) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        y++;
        player.score += 10;
        updateScore();
    }
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    statusText.textContent = `Score: ${player.score}`;
}

function tetrisStart() {
    arena = createArena(12, 20);
    player.score = 0;
    updateScore();
    playerReset();
    update();
}

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        // Left
        playerMove(-1);
    } else if (event.keyCode === 39) {
        // Right
        playerMove(1);
    } else if (event.keyCode === 40) {
        // Down
        playerDrop();
    } else if (event.keyCode === 81) {
        // Q
        playerRotate(-1);
    } else if (event.keyCode === 87) {
        // W
        playerRotate(1);
    }
});

restartBtn.addEventListener('click', tetrisStart);
tetrisStart();
