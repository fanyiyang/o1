const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('snakeStatus');
const restartBtn = document.getElementById('snakeRestart');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let velocity = { x: 0, y: 0 };
let food = { x: 5, y: 5 };
let gameLoop;
let score = 0;

function gameStart() {
    snake = [{ x: 10, y: 10 }];
    velocity = { x: 0, y: 0 };
    placeFood();
    score = 0;
    statusText.textContent = 'Score: 0';
    clearInterval(gameLoop);
    gameLoop = setInterval(drawGame, 100);
}

function drawGame() {
    moveSnake();
    if (checkCollision()) {
        statusText.textContent = `Game Over! Final Score: ${score}`;
        clearInterval(gameLoop);
        return;
    }
    clearScreen();
    drawFood();
    drawSnake();
    checkFoodCollision();
}

function clearScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    ctx.fillStyle = 'lime';
    for (let segment of snake) {
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    }
}

function moveSnake() {
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
    snake.unshift(head);
    snake.pop();
}

function changeDirection(event) {
    const keyPressed = event.keyCode;
    const LEFT = 37;
    const UP = 38;
    const RIGHT = 39;
    const DOWN = 40;

    const goingUp = velocity.y === -1;
    const goingDown = velocity.y === 1;
    const goingRight = velocity.x === 1;
    const goingLeft = velocity.x === -1;

    if (keyPressed === LEFT && !goingRight) {
        velocity = { x: -1, y: 0 };
    }
    if (keyPressed === UP && !goingDown) {
        velocity = { x: 0, y: -1 };
    }
    if (keyPressed === RIGHT && !goingLeft) {
        velocity = { x: 1, y: 0 };
    }
    if (keyPressed === DOWN && !goingUp) {
        velocity = { x: 0, y: 1 };
    }
}

function drawFood() {
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

function placeFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
    };
}

function checkFoodCollision() {
    if (snake[0].x === food.x && snake[0].y === food.y) {
        snake.push({ ...snake[snake.length - 1] });
        score++;
        statusText.textContent = `Score: ${score}`;
        placeFood();
    }
}

function checkCollision() {
    // Wall collision
    if (snake[0].x < 0 || snake[0].x >= tileCount || snake[0].y < 0 || snake[0].y >= tileCount) {
        return true;
    }
    // Self collision
    for (let i = 1; i < snake.length; i++) {
        if (snake[0].x === snake[i].x && snake[0].y === snake[i].y) {
            return true;
        }
    }
    return false;
}

window.addEventListener('keydown', changeDirection);
restartBtn.addEventListener('click', gameStart);
gameStart();
