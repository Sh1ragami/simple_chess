// HTML要素の取得
const chessboard = document.getElementById('chessboard');
const resetButton = document.getElementById('reset');
const turnDisplay = document.getElementById('turn-display');
const whiteTimerDisplay = document.getElementById('white-timer');
const blackTimerDisplay = document.getElementById('black-timer');
const setTimeButton = document.getElementById('set-time');
const initialTimeInput = document.getElementById('initial-time');

// ゲームの状態管理
let selectedPiece = null;
let selectedPosition = null;
let enPassantTarget = null;
let castlingRights = {
    white: { king: true, rookA: true, rookH: true },
    black: { king: true, rookA: true, rookH: true }
};
let turn = 'white'; // 現在の手番

let whiteTime = 300; // 白の初期持ち時間（秒）
let blackTime = 300; // 黒の初期持ち時間（秒）
let whiteTimer, blackTimer;

let gameOverFlag = false; // ゲームオーバーフラグ

// ボードの作成
function createBoard() {
    chessboard.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.className = (i + j) % 2 === 0 ? 'white' : 'black';
            square.dataset.row = i;
            square.dataset.col = j;
            square.addEventListener('click', onSquareClick);
            chessboard.appendChild(square);
        }
    }
}

// 駒の初期配置
function setupPieces() {
    const initialSetup = [
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        [], [], [], [],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜']
    ];

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
            square.textContent = initialSetup[i][j] || ''; // 駒を配置
        }
    }
}

// 駒がクリックされた時の処理
function onSquareClick(event) {
    const square = event.target;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    const piece = square.textContent;

    if (gameOverFlag) {
        return;
    }
    else if (!selectedPiece) {
        // 駒が選択されていない場合
        if ((turn === 'white' && isWhitePiece(piece)) || (turn === 'black' && isBlackPiece(piece))) {
            selectedPiece = piece;
            selectedPosition = { row, col };
            highlightSelectedPiece(square);
            // 移動可能なマスをハイライト
            const possibleMoves = getPossibleMoves(piece, selectedPosition);
            possibleMoves.forEach(move => {
                const moveSquare = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
                if (moveSquare) {
                    moveSquare.classList.add('highlight');
                }
            });
        }
    } else {
        if (selectedPiece === '♔' && isValidCastling(selectedPosition, { row, col })) {
            handleCastling(selectedPosition, { row, col });
            resetSelection();
            switchTurn();
            stopTimer();
            startTimer();
        }
        // 駒が選択されている場合
        else if (isValidMove(selectedPiece, selectedPosition, { row, col })) {
            if (isMoveToFriendlyPiece(selectedPosition, { row, col })) {
                resetSelection();
                return;
            }

            movePiece(selectedPosition, { row, col });
            handleSpecialMoves(selectedPosition, { row, col });
            resetSelection();
            if (isKingCaptured()) {
                return;
            }
            switchTurn();
            stopTimer();
            startTimer();
        } else {
            resetSelection();
        }
    }
}

// 駒の選択をリセットする
function resetSelection() {
    clearHighlight();
    selectedPiece = null;
    selectedPosition = null;
}

// ハイライトのクリア
function clearHighlight() {
    const selectedSquare = document.querySelector('.selected');
    if (selectedSquare) {
        selectedSquare.classList.remove('selected');
    }
    // 移動可能なマスのハイライトもクリア
    const highlightedSquares = document.querySelectorAll('.highlight');
    highlightedSquares.forEach(square => {
        square.classList.remove('highlight');
    });
}

// タイマーの開始
function startTimer() {
    if (turn === 'white') {
        clearInterval(blackTimer);
        whiteTimer = setInterval(() => {
            whiteTime--;
            updateTimerDisplay();
            if (whiteTime <= 0) {
                clearInterval(whiteTimer);
                handleGameOver('白の持ち時間が終了しました。');
            }
        }, 1000);
    } else {
        clearInterval(whiteTimer);
        blackTimer = setInterval(() => {
            blackTime--;
            updateTimerDisplay();
            if (blackTime <= 0) {
                clearInterval(blackTimer);
                handleGameOver('黒の持ち時間が終了しました。');
            }
        }, 1000);
    }
}

// タイマーの停止
function stopTimer() {
    clearInterval(whiteTimer);
    clearInterval(blackTimer);
}

// タイマー表示の更新
function updateTimerDisplay() {
    const formatTime = (time) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
    whiteTimerDisplay.textContent = formatTime(whiteTime);
    blackTimerDisplay.textContent = formatTime(blackTime);
}

// 白の駒かどうかを判定
function isWhitePiece(piece) {
    return piece && ['♙', '♖', '♘', '♗', '♕', '♔'].includes(piece);
}

// 黒の駒かどうかを判定
function isBlackPiece(piece) {
    return piece && ['♟', '♜', '♞', '♝', '♛', '♚'].includes(piece);
}

// 駒のハイライト
function highlightSelectedPiece(square) {
    clearHighlight();
    square.classList.add('selected');
}

// 移動が有効かどうかを判定
function isValidMove(piece, from, to) {
    const dx = Math.abs(to.row - from.row);
    const dy = Math.abs(to.col - from.col);

    switch (piece) {
        case '♙': // 白ポーン
            return (from.row === to.row - 1 && dy === 0 && !getPieceAt(to.row, to.col)) || // 1マス前進
                (from.row === 1 && to.row === from.row + 2 && dy === 0 && !getPieceAt(to.row, to.col)) || // 初期位置からの2マス前進
                (from.row === to.row - 1 && dy === 1 && isBlackPiece(getPieceAt(to.row, to.col))); // 捕獲
        case '♟': // 黒ポーン
            return (from.row === to.row + 1 && dy === 0 && !getPieceAt(to.row, to.col)) || // 1マス前進
                (from.row === 6 && to.row === from.row - 2 && dy === 0 && !getPieceAt(to.row, to.col)) || // 初期位置からの2マス前進
                (from.row === to.row + 1 && dy === 1 && isWhitePiece(getPieceAt(to.row, to.col))); // 捕獲
        case '♖': // ルーク
            return (dx === 0 || dy === 0) && !isObstructed(from, to);
        case '♗': // ビショップ
            return dx === dy && !isObstructed(from, to);
        case '♕': // クイーン
            return (dx === dy || dx === 0 || dy === 0) && !isObstructed(from, to);
        case '♔': // キング
            return (dx <= 1 && dy <= 1);
        case '♘': // ナイト
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        case '♜': // 黒ルーク
            return (dx === 0 || dy === 0) && !isObstructed(from, to);
        case '♞': // 黒ナイト
            return (dx === 2 && dy === 1) || (dx === 1 && dy === 2);
        case '♝': // 黒ビショップ
            return dx === dy && !isObstructed(from, to);
        case '♛': // 黒クイーン
            return (dx === dy || dx === 0 || dy === 0) && !isObstructed(from, to);
        case '♚': // 黒キング
            return (dx <= 1 && dy <= 1);
    }
    return false;
}


// 移動先に味方の駒があるかどうかを判定
function isMoveToFriendlyPiece(from, to) {
    const pieceAtTo = getPieceAt(to.row, to.col);
    return (turn === 'white' && isWhitePiece(pieceAtTo)) ||
        (turn === 'black' && isBlackPiece(pieceAtTo));
}

// 移動が妨げられているかどうかを判定
function isObstructed(from, to) {
    const dx = to.row - from.row;
    const dy = to.col - from.col;
    const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
    const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

    let x = from.row + stepX;
    let y = from.col + stepY;

    while (x !== to.row || y !== to.col) {
        if (getPieceAt(x, y)) {
            return true;
        }
        x += stepX;
        y += stepY;
    }

    return false;
}

// 駒を取得する関数
function getPieceAt(row, col) {
    const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    return square ? square.textContent : null;
}

// 駒を移動する
function movePiece(from, to) {
    const fromSquare = document.querySelector(`[data-row="${from.row}"][data-col="${from.col}"]`);
    const toSquare = document.querySelector(`[data-row="${to.row}"][data-col="${to.col}"]`);

    toSquare.textContent = fromSquare.textContent;
    fromSquare.textContent = '';
}

// キャスリングの処理
function handleCastling(from, to) {
    const piece = getPieceAt(from.row, from.col);
    const dx = Math.abs(from.row - to.row);
    const dy = Math.abs(from.col - to.col);

    if (piece === '♔' && dx === 0 && dy === 2) {
        // キャスリングの条件に合致する場合
        const isQueenside = to.col === 2;
        const rookCol = isQueenside ? 0 : 7;
        const rookDestCol = isQueenside ? 3 : 5;
        const rookRow = from.row;

        if (isValidCastling(from, to, isQueenside)) {
            // キングを移動
            movePiece(from, to);

            // ルークを移動
            const rook = getPieceAt(rookRow, rookCol);
            const rookSquare = document.querySelector(`[data-row="${rookRow}"][data-col="${rookCol}"]`);
            const rookDestSquare = document.querySelector(`[data-row="${rookRow}"][data-col="${rookDestCol}"]`);

            rookDestSquare.textContent = rook;
            rookSquare.textContent = '';
        }
    }
}

// キャスリングが有効かどうかを判定
function isValidCastling(kingFrom, kingTo, isQueenside) {
    const rookCol = isQueenside ? 0 : 7;
    const rookRow = kingFrom.row;

    // キングとルークの位置を取得
    const king = getPieceAt(kingFrom.row, kingFrom.col);
    const rook = getPieceAt(rookRow, rookCol);

    // キングとルークが未移動であるかを確認
    if (king !== '♔' || rook !== (isQueenside ? '♖' : '♖')) {
        return false;
    }

    // キングとルークの間に駒がないかを確認
    const minCol = Math.min(kingFrom.col, kingTo.col);
    const maxCol = Math.max(kingFrom.col, kingTo.col);
    for (let col = minCol + 1; col < maxCol; col++) {
        if (getPieceAt(kingFrom.row, col)) {
            return false;
        }
    }

    // キングがチェックを受けていないかを確認
    if (isInCheckAfterMove(kingFrom, kingTo)) {
        return false;
    }

    return true;
}

// 指定した移動後にキングがチェックを受けるかどうかを判定
function isInCheckAfterMove(from, to) {
    const tempBoard = cloneBoard();
    movePieceTemporary(from, to, tempBoard);

    // 仮のボードでキングがチェックされているかを確認
    const kingPosition = findKingPosition(turn);
    return isKingInCheck(kingPosition, tempBoard);
}

// ボードをクローンする
function cloneBoard() {
    const tempBoard = [];
    for (let row = 0; row < 8; row++) {
        tempBoard[row] = [];
        for (let col = 0; col < 8; col++) {
            tempBoard[row][col] = getPieceAt(row, col);
        }
    }
    return tempBoard;
}

// 仮のボードでの駒の移動
function movePieceTemporary(from, to, tempBoard) {
    const piece = tempBoard[from.row][from.col];
    tempBoard[to.row][to.col] = piece;
    tempBoard[from.row][from.col] = null;
}

// キングの位置を見つける
function findKingPosition(turn) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = getPieceAt(row, col);
            if ((turn === 'white' && piece === '♔') || (turn === 'black' && piece === '♚')) {
                return { row, col };
            }
        }
    }
    return null;
}

// キングがチェックされているかを判定
function isKingInCheck(kingPosition, board) {
    const { row, col } = kingPosition;

    // 敵の駒の位置を確認し、キングがチェックされているかを判定
    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], // 縦横
        [-1, -1], [-1, 1], [1, -1], [1, 1] // 対角線
    ];

    for (const [dx, dy] of directions) {
        let x = row + dx;
        let y = col + dy;

        while (x >= 0 && x < 8 && y >= 0 && y < 8) {
            const piece = board[x][y];
            if (piece) {
                // 敵の駒が見つかった場合
                if ((turn === 'white' && isBlackPiece(piece)) || (turn === 'black' && isWhitePiece(piece))) {
                    if (canAttackKing(piece, x, y, kingPosition)) {
                        return true;
                    }
                }
                break;
            }
            x += dx;
            y += dy;
        }
    }

    return false;
}

// キングを攻撃できるかどうかを判定
function canAttackKing(piece, fromRow, fromCol, kingPosition) {
    const dx = Math.abs(kingPosition.row - fromRow);
    const dy = Math.abs(kingPosition.col - fromCol);

    switch (piece) {
        case '♙': // ポーン
            return dx === 1 && dy === 1;
        case '♟': // 黒ポーン
            return dx === 1 && dy === 1;
        case '♖': // ルーク
            return dx === 0 || dy === 0;
        case '♗': // ビショップ
            return dx === dy;
        case '♕': // クイーン
            return dx === dy || dx === 0 || dy === 0;
        case '♔': // キング
            return dx <= 1 && dy <= 1;
        case '♚': // 黒キング
            return dx <= 1 && dy <= 1;
    }

    return false;
}


// アンパッサンの処理
function handleEnPassant(from, to) {
    if (enPassantTarget && from.row === enPassantTarget.row && Math.abs(from.col - to.col) === 1 && to.row === enPassantTarget.row + (turn === 'white' ? 1 : -1)) {
        // アンパッサンの処理
        const capturedPawn = document.querySelector(`[data-row="${enPassantTarget.row}"][data-col="${enPassantTarget.col}"]`);
        capturedPawn.textContent = '';
    }
}

// 特殊な移動の処理（キャスリング、アンパッサンなど）
function handleSpecialMoves(from, to) {
    handleCastling(from, to);
    handleEnPassant(from, to);
}

// チェックメイトの検出
function isCheckMate() {
    const kingPosition = findKingPosition(turn);

    if (!kingPosition) {
        return false; // キングが見つからない場合はチェックメイトではない
    }

    if (!isKingInCheck(kingPosition, cloneBoard())) {
        return false; // キングがチェックされていない場合はチェックメイトではない
    }

    // 現在のプレイヤーの全ての駒の移動可能な手をチェック
    const pieces = document.querySelectorAll(`[data-row="${kingPosition.row}"][data-col="${kingPosition.col}"] .piece`);
    for (const piece of pieces) {
        const piecePosition = { row: piece.dataset.row, col: piece.dataset.col };
        const possibleMoves = getPossibleMoves(piece.textContent, piecePosition);

        for (const move of possibleMoves) {
            const tempBoard = cloneBoard();
            movePieceTemporary(piecePosition, move, tempBoard);

            const newKingPosition = findKingPosition(turn);
            if (!isKingInCheck(newKingPosition, tempBoard)) {
                return false; // いずれかの移動がチェックを解消する場合
            }
        }
    }

    return true; // いずれの手もチェックを解消できない場合
}

// キングが取られたかの判定
function isKingCaptured() {
    const whiteKingPosition = findKingPosition('white');
    const blackKingPosition = findKingPosition('black');

    // 白のキングが取られているか
    if (!whiteKingPosition) {
        handleGameOver('黒の勝利');
        return true;
    }

    // 黒のキングが取られているか
    if (!blackKingPosition) {
        handleGameOver('白の勝利');
        return true;
    }

    return false;
}


// 手番を切り替える
function switchTurn() {
    turn = turn === 'white' ? 'black' : 'white';
    var name = turn === 'white' ? '白' : '黒';
    turnDisplay.textContent = name;

    if (isCheckMate()) {
        handleGameOver(`${name}のチェック`);
    }
}

// ゲームオーバーの処理
function handleGameOver(message) {
    gameOverFlag = true;
    alert(message);
    stopTimer();
}

// リセットボタンのイベントリスナー
resetButton.addEventListener('click', () => {
    createBoard();
    setupPieces();
    resetSelection();
    turn = 'white';
    turnDisplay.textContent = `白`;
    stopTimer();
    whiteTime = blackTime = parseInt(initialTimeInput.value) || 300;
    updateTimerDisplay();
    startTimer();
});

// タイマー設定ボタンのイベントリスナー
setTimeButton.addEventListener('click', () => {
    whiteTime = blackTime = parseInt(initialTimeInput.value) || 300;
    updateTimerDisplay();
});

// 初期化処理
createBoard();
setupPieces();
updateTimerDisplay();
startTimer();
