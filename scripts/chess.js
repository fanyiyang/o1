document.addEventListener('DOMContentLoaded', function() {
    var game = new Chess();

    var board = ChessBoard('chessBoard', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
    });

    var statusElement = document.getElementById('chessStatus');
    var restartBtn = document.getElementById('chessRestart');

    function updateStatus() {
        var status = '';
        var moveColor = 'White';
        if (game.turn() === 'b') {
            moveColor = 'Black';
        }

        if (game.in_checkmate()) {
            status = 'Game over, ' + moveColor + ' is in checkmate.';
        } else if (game.in_draw()) {
            status = 'Game over, drawn position.';
        } else {
            status = moveColor + "'s turn to move";
            if (game.in_check()) {
                status += ', ' + moveColor + ' is in check.';
            }
        }

        statusElement.textContent = status;
    }

    function onDragStart(source, piece, position, orientation) {
        if (game.game_over()) return false;
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }

    function onDrop(source, target) {
        var move = game.move({
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

    function restartGame() {
        game.reset();
        board.start();
        updateStatus();
    }

    restartBtn.addEventListener('click', restartGame);
    updateStatus();
});
