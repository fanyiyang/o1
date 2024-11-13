document.addEventListener('DOMContentLoaded', function() {
    // 初始化Chess.js游戏实例
    var game = new Chess();

    // 初始化ChessBoard.js棋盘
    var board = ChessBoard('chessBoard', {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
    });

    // 元素
    var statusElement = document.getElementById('chessStatus');
    var restartBtn = document.getElementById('chessRestart');

    // 更新游戏状态文本
    function updateStatus() {
        var status = '';
        var moveColor = 'White';
        if (game.turn() === 'b') {
            moveColor = 'Black';
        }

        // 判断是否为将死状态
        if (game.in_checkmate()) {
            status = 'Game over, ' + moveColor + ' is in checkmate.';
        }
        // 判断是否为平局
        else if (game.in_draw()) {
            status = 'Game over, drawn position.';
        }
        // 游戏进行中
        else {
            status = moveColor + "'s turn to move";
            // 判断是否被将军
            if (game.in_check()) {
                status += ', ' + moveColor + ' is in check.';
            }
        }

        statusElement.textContent = status;
    }

    // 当棋子被拿起
    function onDragStart(source, piece, position, orientation) {
        // 如果游戏结束，不允许拿起棋子
        if (game.game_over()) return false;

        // 只允许当前玩家的棋子
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }

    // 当棋子被放下
    function onDrop(source, target) {
        // 检查是否为合法移动
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // 简化为升变为皇后
        });

        // 如果是非法移动，则返回原位
        if (move === null) return 'snapback';

        updateStatus();
    }

    // 在棋子放下后更新棋盘位置
    function onSnapEnd() {
        board.position(game.fen());
    }

    // 重新开始游戏
    function restartGame() {
        game.reset();
        board.start();
        updateStatus();
    }

    // 为重新开始按钮添加事件监听器
    restartBtn.addEventListener('click', restartGame);

    // 初始状态更新
    updateStatus();
});
