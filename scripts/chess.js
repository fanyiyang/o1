const boardElement = document.getElementById('chessBoard');
const statusElement = document.getElementById('chessStatus');
const restartBtn = document.getElementById('chessRestart');

const game = new Chess();
const board = Chessboard('chessBoard', {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
});

function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;
    if (
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)
    ) {
        return false;
    }
}

function onDrop(source, target) {
    const move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    if (move === null) return 'snapback';
    updateStatus();
}

function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    let status = '';

    let moveColor = game.turn() === 'b' ? 'Black' : 'White';

    if (game.in_checkmate()) {
        status = `Game over, ${moveColor} is in checkmate.`;
    } else if (game.in_draw()) {
        status = 'Game over, drawn position.';
    } else {
        status = `${moveColor}'s turn`;
        if (game.in_check()) {
            status += `, ${moveColor} is in check`;
        }
    }
    statusElement.textContent = status;
}

function restartGame() {
    game.reset();
    board.start();
    updateStatus();
}

restartBtn.addEventListener('click', restartGame);
updateStatus();
