const COLS = 12;
const ROWS = 22;
const CELL = 28;

const boardEl   = document.getElementById('board');
const previewEl = document.getElementById('preview');
const bc = boardEl.getContext('2d');
const pc = previewEl.getContext('2d');

boardEl.width  = COLS * CELL;
boardEl.height = ROWS * CELL;

/* ── COLORES DE PIEZAS ── */
const COLOR = {
  I: '#22d3ee',
  O: '#fbbf24',
  T: '#a78bfa',
  S: '#34d399',
  Z: '#f87171',
  J: '#60a5fa',
  L: '#fb923c',
};

const BRIGHT = {
  I: '#67e8f9',
  O: '#fde68a',
  T: '#c4b5fd',
  S: '#6ee7b7',
  Z: '#fca5a5',
  J: '#93c5fd',
  L: '#fdba74',
};

/* ── FORMAS DE TETROMINOS ── */
const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
};

const PIECE_KEYS = Object.keys(SHAPES);

/* ── ESTADO DEL JUEGO ── */
let grid, cur, nxt, score, level, lines, interval, raf, running, paused, lastTime, acc;


function newGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randPiece() {
  const k = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
  return {
    type: k,
    shape: SHAPES[k].map(r => [...r]),
    x: Math.floor(COLS / 2) - Math.floor(SHAPES[k][0].length / 2),
    y: 0,
  };
}

function rotate(shape) {
  return shape[0].map((_, c) => shape.map(r => r[c]).reverse());
}

function fits(shape, ox, oy, g) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && g[ny][nx]) return false;
      }
    }
  }
  return true;
}

function lock() {
  cur.shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v && cur.y + r >= 0) {
        grid[cur.y + r][cur.x + c] = cur.type;
      }
    })
  );
  sweep();
  cur = nxt;
  nxt = randPiece();
  if (!fits(cur.shape, cur.x, cur.y, grid)) endGame();
}

function sweep() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r].every(v => v)) {
      grid.splice(r, 1);
      grid.unshift(Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (!cleared) return;

  const pts = [0, 100, 300, 500, 800][cleared] * level;
  score += pts;
  lines += cleared;
  level  = Math.floor(lines / 10) + 1;
  interval = Math.max(80, 800 - (level - 1) * 72);

  document.getElementById('score').textContent = score.toLocaleString();
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = lines;

  boardEl.classList.add('flash');
  setTimeout(() => boardEl.classList.remove('flash'), 220);
}

function ghostY() {
  let gy = cur.y;
  while (fits(cur.shape, cur.x, gy + 1, grid)) gy++;
  return gy;
}


function drawCell(ctx, x, y, type, size) {
  const s = size || CELL;
  ctx.save();

  /* Relleno principal */
  ctx.fillStyle = COLOR[type];
  ctx.beginPath();
  ctx.roundRect(x * s + 1, y * s + 1, s - 2, s - 2, 4);
  ctx.fill();

  /* Brillo superior */
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.roundRect(x * s + 3, y * s + 3, s - 6, Math.floor((s - 4) / 3), 2);
  ctx.fill();

  /* Sombra inferior y derecha */
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x * s + s - 4, y * s + 3, 3, s - 6);
  ctx.fillRect(x * s + 3, y * s + s - 4, s - 6, 3);

  ctx.restore();
}

function drawGrid(ctx, g) {
  /* Líneas de cuadrícula sutiles */
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
    }
  }

  /* Celdas bloqueadas */
  g.forEach((row, r) =>
    row.forEach((v, c) => { if (v) drawCell(ctx, c, r, v); })
  );
}

function draw() {
  bc.clearRect(0, 0, boardEl.width, boardEl.height);
  bc.fillStyle = '#0a0a12';
  bc.fillRect(0, 0, boardEl.width, boardEl.height);
  drawGrid(bc, grid);

  if (cur && running && !paused) {
    /* Pieza fantasma */
    const gy = ghostY();
    cur.shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v && gy + r !== cur.y + r) {
          bc.save();
          bc.globalAlpha = 0.18;
          bc.fillStyle = COLOR[cur.type];
          bc.beginPath();
          bc.roundRect((cur.x + c) * CELL + 1, (gy + r) * CELL + 1, CELL - 2, CELL - 2, 4);
          bc.fill();
          bc.restore();
        }
      })
    );

    /* Pieza activa */
    cur.shape.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) drawCell(bc, cur.x + c, cur.y + r, cur.type);
      })
    );
  }
}

function drawPreview() {
  pc.clearRect(0, 0, 80, 80);
  pc.fillStyle = '#0a0a12';
  pc.fillRect(0, 0, 80, 80);
  if (!nxt) return;

  const cs = 16;
  const pw = nxt.shape[0].length * cs;
  const ph = nxt.shape.length * cs;
  const ox = Math.floor((80 - pw) / 2 / cs);
  const oy = Math.floor((80 - ph) / 2 / cs);

  nxt.shape.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v) drawCell(pc, ox + c, oy + r, nxt.type, cs);
    })
  );
}


function loop(ts) {
  if (!running || paused) return;
  if (!lastTime) lastTime = ts;
  acc += ts - lastTime;
  lastTime = ts;

  if (acc >= interval) {
    acc = 0;
    if (fits(cur.shape, cur.x, cur.y + 1, grid)) cur.y++;
    else lock();
  }

  draw();
  drawPreview();
  raf = requestAnimationFrame(loop);
}

function startGame() {
  cancelAnimationFrame(raf);
  grid = newGrid();
  score = 0; level = 1; lines = 0;
  interval = 800; acc = 0; lastTime = 0;

  document.getElementById('score').textContent = '0';
  document.getElementById('level').textContent = '1';
  document.getElementById('lines').textContent = '0';

  cur = randPiece();
  nxt = randPiece();
  running = true;
  paused  = false;

  showOverlay(null);
  raf = requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  document.getElementById('ov-score').textContent = score.toLocaleString();
  showOverlay('ov-gameover');
}

function showOverlay(id) {
  ['ov-start', 'ov-gameover', 'ov-pause'].forEach(o => {
    document.getElementById(o).classList.toggle('hidden', o !== id);
  });
}


document.addEventListener('keydown', e => {
  if (!running) return;

  /* Pausa */
  if (e.key === 'p' || e.key === 'P') {
    paused = !paused;
    if (paused) {
      showOverlay('ov-pause');
    } else {
      showOverlay(null);
      lastTime = 0;
      acc = 0;
      raf = requestAnimationFrame(loop);
    }
    return;
  }

  if (paused) return;

  if (e.key === 'ArrowLeft') {
    if (fits(cur.shape, cur.x - 1, cur.y, grid)) cur.x--;

  } else if (e.key === 'ArrowRight') {
    if (fits(cur.shape, cur.x + 1, cur.y, grid)) cur.x++;

  } else if (e.key === 'ArrowDown') {
    if (fits(cur.shape, cur.x, cur.y + 1, grid)) {
      cur.y++;
      score++;
      document.getElementById('score').textContent = score.toLocaleString();
    } else {
      lock();
    }
    acc = 0;
    e.preventDefault();

  } else if (e.key === 'ArrowUp') {
    const r = rotate(cur.shape);
    if      (fits(r, cur.x,     cur.y, grid)) { cur.shape = r; }
    else if (fits(r, cur.x + 1, cur.y, grid)) { cur.shape = r; cur.x++; }
    else if (fits(r, cur.x - 1, cur.y, grid)) { cur.shape = r; cur.x--; }

  } else if (e.key === ' ') {
    const gy = ghostY();
    score += (gy - cur.y) * 2;
    cur.y = gy;
    lock();
    acc = 0;
    document.getElementById('score').textContent = score.toLocaleString();
    e.preventDefault();
  }

  draw();
  drawPreview();
});

/* ══════════════════════════════════
   TÁCTIL (MÓVIL)
   ══════════════════════════════════ */

let tx = 0, ty = 0, tt = 0;

boardEl.addEventListener('touchstart', e => {
  tx = e.touches[0].clientX;
  ty = e.touches[0].clientY;
  tt = Date.now();
  e.preventDefault();
}, { passive: false });

boardEl.addEventListener('touchend', e => {
  if (!running || paused) return;

  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;
  const dt = Date.now() - tt;

  if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 220) {
    /* Toque rápido = rotar */
    const r = rotate(cur.shape);
    if      (fits(r, cur.x,     cur.y, grid)) { cur.shape = r; }
    else if (fits(r, cur.x + 1, cur.y, grid)) { cur.shape = r; cur.x++; }
    else if (fits(r, cur.x - 1, cur.y, grid)) { cur.shape = r; cur.x--; }

  } else if (Math.abs(dx) > Math.abs(dy)) {
    /* Deslizar horizontal = mover */
    const dir   = dx > 0 ? 1 : -1;
    const steps = Math.max(1, Math.round(Math.abs(dx) / 32));
    for (let i = 0; i < steps; i++) {
      if (fits(cur.shape, cur.x + dir, cur.y, grid)) cur.x += dir;
    }

  } else if (dy > 50) {
    /* Deslizar abajo = caída */
    const gy = ghostY();
    score += (gy - cur.y) * 2;
    cur.y = gy;
    lock();
    acc = 0;
    document.getElementById('score').textContent = score.toLocaleString();
  }

  draw();
  drawPreview();
  e.preventDefault();
}, { passive: false });


grid = newGrid();
bc.fillStyle = '#0a0a12';
bc.fillRect(0, 0, boardEl.width, boardEl.height);
drawGrid(bc, grid);
