(() => {
  "use strict";

  const SIZE = 8;
  const STORAGE_KEY = "byteblast-best-score-v1";
  const SHAPES = [
    [[1]],
    [[1,1]], [[1],[1]],
    [[1,1,1]], [[1],[1],[1]],
    [[1,1,1,1]], [[1],[1],[1],[1]],
    [[1,1],[1,1]],
    [[1,1,1],[1,1,1],[1,1,1]],
    [[1,0],[1,1]], [[0,1],[1,1]], [[1,1],[1,0]], [[1,1],[0,1]],
    [[1,0,0],[1,0,0],[1,1,1]],
    [[1,1,1],[0,1,0]],
    [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]]
  ];

  const boardEl = document.getElementById("board");
  const trayEl = document.getElementById("tray");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const finalScoreEl = document.getElementById("finalScore");

  let grid = [];
  let pieces = [];
  let score = 0;
  let best = readBest();
  let cells = [];
  let drag = null;

  function readBest() {
    try {
      const value = Number(localStorage.getItem(STORAGE_KEY) || 0);
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveBest() {
    try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) {}
  }

  function init() {
    cancelDrag();
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    overlay.classList.add("hidden");
    buildBoard();
    newPieces();
    updateScore();
    drawBoard();
  }

  function buildBoard() {
    boardEl.innerHTML = "";
    cells = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      boardEl.appendChild(cell);
      cells.push(cell);
    }
  }

  function newPieces() {
    pieces = [0, 1, 2].map(() => ({
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      used: false
    }));
    drawTray();
  }

  function drawTray() {
    trayEl.innerHTML = "";
    pieces.forEach((piece, index) => {
      const el = document.createElement("div");
      el.className = "piece" + (piece.used ? " used" : "");
      el.style.gridTemplateColumns = `repeat(${piece.shape[0].length}, var(--piece-cell, 22px))`;
      el.setAttribute("aria-label", `Block ${index + 1}`);
      el.setAttribute("role", "button");
      el.tabIndex = piece.used ? -1 : 0;
      piece.shape.forEach(row => row.forEach(value => {
        const cell = document.createElement("div");
        cell.className = "pcell" + (value ? " on" : "");
        el.appendChild(cell);
      }));
      el.addEventListener("pointerdown", event => startDrag(event, index));
      el.addEventListener("keydown", event => {
        if ((event.key === "Enter" || event.key === " ") && !piece.used) {
          event.preventDefault();
          placeWithKeyboard(index);
        }
      });
      trayEl.appendChild(el);
    });
  }

  function drawBoard() {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        cells[row * SIZE + col].className = "cell" + (grid[row][col] ? " filled" : "");
      }
    }
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    bestEl.textContent = String(best);
  }

  function fits(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE || grid[rr][cc]) return false;
      }
    }
    return true;
  }

  function canPlaceAnywhere(shape) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (fits(shape, row, col)) return true;
      }
    }
    return false;
  }

  function startDrag(event, index) {
    if (pieces[index].used || event.button > 0) return;
    event.preventDefault();
    const shape = pieces[index].shape;
    const boardRect = boardEl.getBoundingClientRect();
    const cellStep = (boardRect.width - 14 - (SIZE - 1) * 4) / SIZE;
    const dragCell = Math.max(14, Math.min(42, cellStep));
    const ghost = document.createElement("div");
    ghost.className = "ghost";
    ghost.style.gridTemplateColumns = `repeat(${shape[0].length}, ${dragCell}px)`;
    ghost.style.setProperty("--drag-cell", `${dragCell}px`);
    shape.forEach(row => row.forEach(value => {
      const cell = document.createElement("div");
      cell.className = "pcell" + (value ? " on" : "");
      ghost.appendChild(cell);
    }));
    document.body.appendChild(ghost);
    drag = { index, shape, ghost, dragCell, target: null, pointerId: event.pointerId };
    moveDrag(event);
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  }

  function moveDrag(event) {
    if (!drag) return;
    const { ghost, shape } = drag;
    const width = ghost.offsetWidth;
    const height = ghost.offsetHeight;
    const left = event.clientX - width / 2;
    const top = event.clientY - height / 2 - 36;
    ghost.style.left = `${left}px`;
    ghost.style.top = `${top}px`;

    const rect = boardEl.getBoundingClientRect();
    const stepX = rect.width / SIZE;
    const stepY = rect.height / SIZE;
    const col = Math.round((event.clientX - rect.left - width / 2) / stepX);
    const row = Math.round((event.clientY - 36 - rect.top - height / 2) / stepY);
    drawBoard();

    const insideBoard = event.clientX >= rect.left - 10 && event.clientX <= rect.right + 10 &&
      event.clientY >= rect.top - 45 && event.clientY <= rect.bottom + 10;

    if (insideBoard && fits(shape, row, col)) {
      drag.target = { row, col };
      shape.forEach((line, r) => line.forEach((value, c) => {
        if (value) {
          const cell = cells[(row + r) * SIZE + col + c];
          if (cell) cell.classList.add("preview");
        }
      }));
    } else {
      drag.target = null;
      if (insideBoard) {
        // Give feedback when the attempted position is not valid.
        const startRow = Math.max(0, row);
        const startCol = Math.max(0, col);
        shape.forEach((line, r) => line.forEach((value, c) => {
          if (!value) return;
          const rr = startRow + r, cc = startCol + c;
          if (rr < SIZE && cc < SIZE) cells[rr * SIZE + cc].classList.add("invalid-preview");
        }));
      }
    }
  }

  function endDrag() {
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    if (!drag) return;
    const { index, shape, target, ghost } = drag;
    ghost.remove();
    drag = null;
    if (target) place(index, shape, target.row, target.col);
    else drawBoard();
  }

  function cancelDrag() {
    if (!drag) return;
    drag.ghost.remove();
    drag = null;
    window.removeEventListener("pointermove", moveDrag);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }

  function placeWithKeyboard(index) {
    const shape = pieces[index].shape;
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (fits(shape, row, col)) {
          place(index, shape, row, col);
          return;
        }
      }
    }
    announce("That block has no available position.");
  }

  function place(index, shape, row, col) {
    if (!fits(shape, row, col)) return;
    let count = 0;
    shape.forEach((line, r) => line.forEach((value, c) => {
      if (value) { grid[row + r][col + c] = 1; count++; }
    }));
    score += count;
    pieces[index].used = true;
    clearLines();
    if (score > best) {
      best = score;
      saveBest();
    }
    drawBoard();
    if (pieces.every(piece => piece.used)) newPieces();
    else drawTray();
    updateScore();
    checkGameOver();
  }

  function clearLines() {
    const fullRows = [];
    const fullCols = [];
    for (let row = 0; row < SIZE; row++) {
      if (grid[row].every(Boolean)) fullRows.push(row);
    }
    for (let col = 0; col < SIZE; col++) {
      if (grid.every(row => row[col])) fullCols.push(col);
    }
    const lines = fullRows.length + fullCols.length;
    if (!lines) return;
    fullRows.forEach(row => { for (let col = 0; col < SIZE; col++) grid[row][col] = 0; });
    fullCols.forEach(col => { for (let row = 0; row < SIZE; row++) grid[row][col] = 0; });
    score += lines * 10 * lines;
  }

  function checkGameOver() {
    const remaining = pieces.filter(piece => !piece.used);
    if (remaining.some(piece => canPlaceAnywhere(piece.shape))) return;
    if (score > best) {
      best = score;
      saveBest();
    }
    updateScore();
    finalScoreEl.textContent = String(score);
    overlay.classList.remove("hidden");
  }

  function announce(message) {
    // Use a simple accessible status without blocking gameplay.
    let status = document.getElementById("gameStatus");
    if (!status) {
      status = document.createElement("p");
      status.id = "gameStatus";
      status.className = "hint";
      status.setAttribute("role", "status");
      trayEl.insertAdjacentElement("afterend", status);
    }
    status.textContent = message;
  }

  document.getElementById("restart").addEventListener("click", init);
  document.getElementById("again").addEventListener("click", init);
  init();
})();
