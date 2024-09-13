const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('pongRestart');

const player = {
    x: 10,
    y: canvas.height / 2 - 50,
    width: 10,
    height: 100,
    score: 0,
};

const ai = {
    x: canvas.width - 20,
    y: canvas.height / 2 - 50,
    width: 10,
    height: 100,
    score: 0,
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 7,
    speed: 5,
    velocityX: 5,
    velocityY: 5,
};

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
}

function drawText(text, x, y) {
    ctx.fillStyle = '#FFF';
    ctx.font = '45px Arial';
    ctx.fillText(text, x, y);
}

function render() {
    // Clear the canvas
    drawRect(0, 0, canvas.width, canvas.height, '#000');

    // Draw the net
    for (let i = 0; i <= canvas.height; i += 15) {
        drawRect(canvas.width / 2 - 1, i, 2, 10, '#FFF');
    }

    // Draw scores
    drawText(player.score, canvas.width / 4, canvas.height / 5);
    drawText(ai.score, (3 * canvas.width) / 4, canvas.height / 5);

    // Draw paddles
    drawRect(player.x, player.y, player.width, player.height, '#FFF');
    drawRect(ai.x, ai.y, ai.width, ai.height, '#FFF');

    // Draw the ball
    drawCircle(ball.x, ball.y, ball.radius, '#05EDFF');
}

canvas.addEventListener('mousemove', movePaddle);

function movePaddle(evt) {
    let rect = canvas.getBoundingClientRect();
    player.y = evt.clientY - rect.top - player.height / 2;
}

function collision(b, p) {
    p.top = p.y;
    p.bottom = p.y + p.height;
    p.left = p.x;
    p.right = p.x + p.width;

    b.top = b.y - b.radius;
    b.bottom = b.y + b.radius;
    b.left = b.x - b.radius;
    b.right = b.x + b.radius;

    return (
        b.right > p.left &&
        b.bottom > p.top &&
        b.left < p.right &&
        b.top < p.bottom
    );
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 5;
    ball.velocityX = -ball.velocityX;
}

function update() {
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Simple AI
    ai.y += (ball.y - (ai.y + ai.height / 2)) * 0.1;

    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
        ball.velocityY = -ball.velocityY;
    }

    let playerOrAi = ball.x + ball.radius < canvas.width / 2 ? player : ai;

    if (collision(ball, playerOrAi)) {
        // Determine where the ball hit the paddle
        let collidePoint = ball.y - (playerOrAi.y + playerOrAi.height / 2);
        collidePoint = collidePoint / (playerOrAi.height / 2);

        // Calculate angle
        let angleRad = (Math.PI / 4) * collidePoint;

        // Change direction
        let direction = ball.x + ball.radius < canvas.width / 2 ? 1 : -1;
        ball.velocityX = direction * ball.speed * Math.cos(angleRad);
        ball.velocityY = ball.speed * Math.sin(angleRad);

        // Increase speed
        ball.speed += 0.5;
    }

    // Update scores
    if (ball.x - ball.radius < 0) {
        ai.score++;
        resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
        player.score++;
        resetBall();
    }
}

function gameLoop() {
    update();
    render();
}

let framePerSecond = 50;
let loop = setInterval(gameLoop, 1000 / framePerSecond);

function restartGame() {
    player.score = 0;
    ai.score = 0;
    resetBall();
}

restartBtn.addEventListener('click', restartGame);
