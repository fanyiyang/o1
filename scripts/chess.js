// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Chess.js game instance
    var game = new Chess();

    // Initialize Chessboard.js board
    var board = Chessboard('chessBoard', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
    });

    // Elements
    var statusElement = document.getElementById('chessStatus');
    var restartBtn = document.getElementById('chessRestart');

    // Update the game status text
    function updateStatus() {
        var status = '';

        var moveColor = 'White';
        if (game.turn() === 'b') {
            moveColor = 'Black';
        }

        // Checkmate?
        if (game.in_checkmate()) {
            status = 'Game over, ' + moveColor + ' is in checkmate.';
        }
        // Draw?
        else if (game.in_draw()) {
            status = 'Game over, drawn position.';
        }
        // Game still on
        else {
            status = moveColor + "'s turn to move";

            // Check?
            if (game.in_check()) {
                status += ', ' + moveColor + ' is in check.';
            }
        }

        statusElement.textContent = status;
    }

    // When a piece is picked up
    function onDragStart(source, piece, position, orientation) {
        // Do not pick up pieces if the game is over
        if (game.game_over()) return false;

        // Only pick up pieces that belong to the current player
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }

        // Allow the move
        return true;
    }

    // When a piece is dropped
    function onDrop(source, target) {
        // See if the move is legal
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // Promote to a queen for simplicity
        });

        // Illegal move
        if (move === null) return 'snapback';

        updateStatus();
    }

    // Update the board position after the piece snap
    function onSnapEnd() {
        board.position(game.fen());
    }

    // Restart the game
    function restartGame() {
        game.reset();
        board.start();
        updateStatus();
    }

    // Event listener for the restart button
    restartBtn.addEventListener('click', restartGame);

    // Initial status update
    updateStatus();
});
