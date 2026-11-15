(() => {
  'use strict';

  const canvas = document.querySelector('#screen');
  const ctx = canvas.getContext('2d');
  const W = 1920;
  const H = 720;

  const FONT = {
    display: '"Barlow Condensed", "Arial Narrow", sans-serif',
    body: '"Manrope", "Helvetica Neue", Arial, sans-serif',
    mono: '"DM Mono", "SFMono-Regular", Consolas, monospace'
  };

  const C = {
    lime: '#c8f56a',
    cyan: '#6de0ef',
    amber: '#ffc46b',
    violet: '#c0a3ff',
    coral: '#ff8090',
    text: '#f3f6ef',
    text2: '#a9b6b1',
    text3: '#75827d',
    surface: '#0a1213',
    surface2: '#0d1718',
    surface3: '#121e1f',
    line: '#22312e',
    bg: '#070b0c'
  };

  const games = [
    {
      id: 'race',
      name: 'LANE RACER',
      eyebrow: 'REFLEX · DRIVING',
      mode: 'SOLO · ENDLESS',
      sub: 'Thread the traffic at full throttle. Change lanes, burn the turbo and chase a new distance record.',
      diff: 'EASY',
      level: 1,
      players: '1',
      color: C.lime,
      controls: [
        { keys: ['←', '→'], label: 'CHANGE LANE' },
        { keys: ['↑'], label: 'TURBO' },
        { keys: ['ENTER'], label: 'PAUSE' }
      ]
    },
    {
      id: 'target',
      name: 'TARGET HUNT',
      eyebrow: 'REFLEX · AIM',
      mode: 'SOLO · SCORE ATTACK',
      sub: 'Sweep the range before the clock runs out. Line up a target, fire and keep your streak alive.',
      diff: 'EASY',
      level: 1,
      players: '1',
      color: C.cyan,
      controls: [
        { keys: ['←', '→'], label: 'AIM HORIZONTAL' },
        { keys: ['↑', '↓'], label: 'AIM VERTICAL' },
        { keys: ['ENTER'], label: 'FIRE' }
      ]
    },
    {
      id: 'tetris',
      name: 'TETRIS',
      eyebrow: 'CLASSIC · BLOCKS',
      mode: 'SOLO · ENDLESS',
      sub: 'Stack clean and clear fast. Rotate, slide and drop pieces before the stack reaches the top.',
      diff: 'MEDIUM',
      level: 2,
      players: '1',
      color: C.amber,
      controls: [
        { keys: ['←', '→'], label: 'MOVE' },
        { keys: ['↑'], label: 'ROTATE' },
        { keys: ['↓'], label: 'HARD DROP' }
      ]
    },
    {
      id: 'breakout',
      name: 'PONG / BREAKOUT',
      eyebrow: 'ARCADE · PADDLE',
      mode: 'SOLO · ARCADE',
      sub: 'Hold the line. Move the paddle, launch the ball and dismantle every brick in the wall.',
      diff: 'EASY',
      level: 1,
      players: '1',
      color: C.violet,
      controls: [
        { keys: ['←', '→'], label: 'MOVE PADDLE' },
        { keys: ['ENTER'], label: 'LAUNCH / PAUSE' }
      ]
    },
    {
      id: 'snake',
      name: 'SNAKE',
      eyebrow: 'ARCADE · DIRECTION',
      mode: 'SOLO · ENDLESS',
      sub: 'Grow without tripping over yourself. Plan two turns ahead and own every corner of the grid.',
      diff: 'EASY',
      level: 1,
      players: '1',
      color: C.coral,
      controls: [
        { keys: ['←', '→', '↑', '↓'], label: 'TURN' },
        { keys: ['ENTER'], label: 'PAUSE' }
      ]
    }
  ];

  const HOME = {
    hero: { x: 72, y: 112, w: 1776, h: 376 },
    art: { x: 1192, y: 136, w: 632, h: 328 },
    cta: { x: 112, y: 390, w: 252, h: 56 },
    rail: { x: 72, y: 528, gap: 16, h: 136 },
    railHeaderY: 510
  };

  const GAME = {
    x: 488,
    y: 112,
    w: 1360,
    h: 540,
    header: 52,
    content: { x: 512, y: 180, w: 1312, h: 444 }
  };

  const SIDEBAR = { x: 72, w: 388 };
  const PAUSE_BTN = { x: GAME.x + GAME.w - 118, y: GAME.y + 11, w: 94, h: 30 };
  const PAUSE_HIT = { x: PAUSE_BTN.x - 8, y: PAUSE_BTN.y - 8, w: PAUSE_BTN.w + 16, h: PAUSE_BTN.h + 16 };
  const TARGET = { x: 678, y: 206, cw: 196, ch: 106, cols: 5, rows: 3, life: 2300 };
  const TETRIS = { x: 1058, y: 182, cell: 22 };
  const BREAKOUT = { x: 676, y: 184, w: 984, h: 428 };
  const SNAKE = { x: 872, y: 184, cell: 22, n: 20 };

  const dust = Array.from({ length: 34 }, (_, i) => ({
    x: (i * 233 + 71) % W,
    y: (i * 97 + 37) % H,
    r: (i % 3 === 0 ? 1.4 : 0.9) + (i % 5) * 0.12,
    a: 0.04 + (i % 5) * 0.016,
    v: 2.2 + (i % 4) * 1.7
  }));

  const pieces = [
    [[1, 1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 1], [1, 1, 0]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]]
  ];

  const blockColors = [null, C.amber, C.cyan, C.violet, C.coral, C.lime, C.lime, C.cyan];

  const storageKey = 'roi-games-hub-best-v1';
  let bestScores = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object') bestScores = saved;
  } catch (err) {
    bestScores = {};
  }

  let selected = 0;
  let screen = 'home';
  let last = performance.now();
  let elapsed = 0;
  let ambientT = 0;
  let score = 0;
  let paused = false;
  let over = false;
  let recorded = false;
  let newBest = false;

  let lane = 1;
  let turbo = 0;
  let traffic = [];
  let raceSpawnTimer = 0;

  let aim = { x: 2, y: 1 };
  let targets = [];
  let targetTimer = 0;
  let misses = 0;

  let board = [];
  let pieceX = 3;
  let pieceY = 0;
  let pieceType = 0;
  let pieceRot = 0;
  let gravity = 0;
  let lines = 0;
  let pieceQueue = [];

  let paddleX = 0;
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let launched = false;
  let bricks = [];

  let snake = [];
  let snakeDir = { x: 1, y: 0 };
  let nextSnakeDir = { x: 1, y: 0 };
  let food = { x: 12, y: 9 };
  let snakeClock = 0;

  let hoverCard = -1;
  let hoverCta = false;
  let overlayPrimary = null;
  let overlaySecondary = null;
  let started = false;
  let connectedPad = null;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const inside = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  function alpha(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  function roundPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function round(x, y, w, h, r, fill, stroke) {
    roundPath(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function setFont(size, font = FONT.body, weight = 500) {
    ctx.font = `${weight} ${size}px ${font}`;
  }

  function text(s, x, y, size, color = C.text, font = FONT.body, weight = 500, align = 'left') {
    setFont(size, font, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  }

  function tracked(s, x, y, size, color, font = FONT.mono, weight = 400, spacing = 1.2, align = 'left') {
    setFont(size, font, weight);
    const chars = Array.from(s);
    const widths = chars.map(ch => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
    let cx = x;
    if (align === 'center') cx = x - total / 2;
    if (align === 'right') cx = x - total;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    chars.forEach((ch, i) => {
      ctx.fillText(ch, cx, y);
      cx += widths[i] + spacing;
    });
    return total;
  }

  function measure(s, size, font = FONT.mono, weight = 500) {
    setFont(size, font, weight);
    return ctx.measureText(s).width;
  }

  function paragraph(s, x, y, size, maxWidth, lineHeight, color, font = FONT.body, weight = 500) {
    setFont(size, font, weight);
    const words = s.split(' ');
    let line = '';
    let cy = y;
    words.forEach(word => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(line, x, cy);
        line = word;
        cy += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) {
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(line, x, cy);
    }
    return cy;
  }

  function formatScore(n) {
    return String(Math.floor(n)).padStart(5, '0');
  }

  function bestOf(id) {
    return bestScores[id] || 0;
  }

  function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function persistBest() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(bestScores));
    } catch (err) {
      /* preview only */
    }
  }

  function recordScore() {
    recorded = true;
    const id = games[selected].id;
    const prev = bestOf(id);
    if (score > prev) {
      bestScores[id] = Math.floor(score);
      newBest = true;
      persistBest();
    }
  }

  function keycap(label, x, cy, options = {}) {
    const h = options.h || 26;
    const size = options.size || 10;
    const pad = options.pad || 9;
    const color = options.color || '#c6d2cc';
    const minW = options.minW || h;
    setFont(size, FONT.mono, 600);
    const w = Math.max(minW, ctx.measureText(label).width + pad * 2);
    round(x, cy - h / 2, w, h, 6, options.bg || '#14201f', options.border || '#33423f');
    rect(x + 1, cy + h / 2 - 1, w - 2, 1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, cy + 0.5);
    ctx.textBaseline = 'alphabetic';
    return w;
  }

  function pill(label, x, cy, color, options = {}) {
    const size = options.size || 9.5;
    const h = options.h || 24;
    const pad = options.pad || 11;
    const tracking = options.tracking || 1.1;
    const width = options.width || (measure(label, size, FONT.mono, 500) + tracking * Math.max(0, label.length - 1) + pad * 2);
    round(x, cy - h / 2, width, h, h / 2, options.bg || alpha(color, 0.075), options.border || alpha(color, 0.24));
    tracked(label, x + width / 2, cy + size * 0.36, size, options.textColor || color, FONT.mono, 500, tracking, 'center');
    return width;
  }

  function diffPill(label, level, x, cy, color, options = {}) {
    const size = 9;
    const h = options.h || 24;
    const labelW = measure(label, size, FONT.mono, 500) + label.length * 1.1;
    const width = 14 + 13 + 7 + labelW + 12;
    round(x, cy - h / 2, width, h, h / 2, options.bg || 'rgba(10,17,18,0.72)', options.border || alpha(color, 0.26));
    for (let i = 0; i < 3; i++) {
      rect(x + 12 + i * 5, cy - 4, 3, 8, i < level ? color : alpha(color, 0.18));
    }
    tracked(label, x + 39, cy + size * 0.36, size, color, FONT.mono, 500, 1.1);
    return width;
  }

  function button(label, x, y, w, h, accent, options = {}) {
    const fill = options.fill || accent;
    const dark = options.dark || '#0a100d';
    if (options.glow !== false) {
      ctx.save();
      ctx.shadowColor = alpha(accent, 0.28);
      ctx.shadowBlur = 26;
      ctx.shadowOffsetY = 8;
      round(x, y, w, h, 12, fill);
      ctx.restore();
    } else {
      round(x, y, w, h, 12, fill);
    }
    if (options.triangle) {
      ctx.beginPath();
      ctx.moveTo(x + 26, y + h / 2 - 6);
      ctx.lineTo(x + 36, y + h / 2);
      ctx.lineTo(x + 26, y + h / 2 + 6);
      ctx.closePath();
      ctx.fillStyle = dark;
      ctx.fill();
    }
    tracked(label, options.triangle ? x + 50 : x + w / 2, y + h / 2 + 4, options.size || 12, dark, FONT.mono, 600, 1.2, options.triangle ? 'left' : 'center');
  }

  // ── Generated texture ─────────────────────────────────────

  const dotPattern = (() => {
    const tile = document.createElement('canvas');
    tile.width = 36;
    tile.height = 36;
    const g = tile.getContext('2d');
    g.fillStyle = 'rgba(178, 208, 194, 0.13)';
    g.fillRect(17, 17, 1.4, 1.4);
    return ctx.createPattern(tile, 'repeat');
  })();

  function drawGameIcon(id, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 100, size / 100);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = (width = 5) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
    };
    const circle = (cx, cy, r, fill = null) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      } else {
        ctx.stroke();
      }
    };

    if (id === 'race') {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      round(-43, -20, 77, 34, 12, color);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(-24, -19);
      ctx.lineTo(-12, -38);
      ctx.lineTo(13, -38);
      ctx.lineTo(27, -19);
      ctx.closePath();
      ctx.fillStyle = '#0d191a';
      ctx.fill();
      circle(-25, 17, 10, '#0a1112');
      circle(20, 17, 10, '#0a1112');
      circle(-25, 17, 4, '#aab5b0');
      circle(20, 17, 4, '#aab5b0');
      stroke(4);
      ctx.beginPath();
      ctx.moveTo(42, -23);
      ctx.lineTo(49, -23);
      ctx.lineTo(49, 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(40, -30);
      ctx.lineTo(49, -23);
      ctx.lineTo(40, -16);
      ctx.stroke();
    } else if (id === 'target') {
      stroke(5);
      circle(0, 0, 37);
      circle(0, 0, 23);
      circle(0, 0, 8, color);
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(0, -31);
      ctx.moveTo(0, 31);
      ctx.lineTo(0, 48);
      ctx.moveTo(-48, 0);
      ctx.lineTo(-31, 0);
      ctx.moveTo(31, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();
    } else if (id === 'tetris') {
      const blocks = [[-31, -31], [-7, -31], [17, -31], [-7, -7], [-7, 17], [17, 17]];
      blocks.forEach(([bx, by], i) => round(bx, by, 21, 21, 4, i === 3 ? '#fff2d6' : color));
    } else if (id === 'breakout') {
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) round(-39 + c * 27, -32 + r * 19, 22, 13, 4, r === 0 ? color : '#d8c9ff');
      }
      circle(27, 4, 7, '#f4f4ed');
      stroke(4);
      ctx.beginPath();
      ctx.moveTo(-35, 34);
      ctx.lineTo(35, 34);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(17, 14);
      ctx.lineTo(24, 7);
      ctx.stroke();
    } else {
      stroke(10);
      ctx.beginPath();
      ctx.moveTo(-34, -27);
      ctx.lineTo(-34, 0);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-5, 27);
      ctx.lineTo(24, 27);
      ctx.stroke();
      circle(-34, -27, 8, color);
      circle(-34, 0, 7, '#101a19');
      circle(-5, 0, 7, '#101a19');
      circle(-5, 27, 7, '#101a19');
      circle(24, 27, 11, color);
      circle(27, 24, 2, '#101516');
    }
    ctx.restore();
  }

  // ── Page background & chrome ──────────────────────────────

  function background(accent) {
    rect(0, 0, W, H, C.bg);

    const glow = ctx.createRadialGradient(1440, 130, 0, 1440, 130, 980);
    glow.addColorStop(0, alpha(accent, 0.115));
    glow.addColorStop(0.44, alpha(accent, 0.035));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const cool = ctx.createRadialGradient(110, 690, 0, 110, 690, 760);
    cool.addColorStop(0, 'rgba(66, 148, 146, 0.075)');
    cool.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cool;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = dotPattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    if (!reduceMotion) {
      dust.forEach(d => {
        const x = (d.x + ambientT * d.v) % W;
        ctx.globalAlpha = d.a;
        rect(x, d.y, d.r, d.r, '#d9e7df');
      });
      ctx.globalAlpha = 1;
    }

    const vignette = ctx.createRadialGradient(W / 2, H / 2, 250, W / 2, H / 2, 1130);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = alpha(accent, 0.26);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(28, 28);
    ctx.lineTo(28, 46);
    ctx.moveTo(28, 28);
    ctx.lineTo(46, 28);
    ctx.moveTo(W - 28, H - 28);
    ctx.lineTo(W - 28, H - 46);
    ctx.moveTo(W - 28, H - 28);
    ctx.lineTo(W - 46, H - 28);
    ctx.stroke();
  }

  function topbar(mode, game) {
    // Brand mark
    const markX = 72;
    const markY = 26;
    const markGrad = ctx.createLinearGradient(markX, markY, markX + 42, markY + 42);
    markGrad.addColorStop(0, 'rgba(200,245,106,0.22)');
    markGrad.addColorStop(1, 'rgba(200,245,106,0.035)');
    round(markX, markY, 42, 42, 11, markGrad, alpha(C.lime, 0.42));
    ctx.save();
    ctx.shadowColor = alpha(C.lime, 0.3);
    ctx.shadowBlur = 16;
    text('R', markX + 21, markY + 30, 26, C.lime, FONT.display, 700, 'center');
    ctx.restore();

    text('ROI', 126, 45, 18, C.text, FONT.body, 800);
    text('GAME HUB', 126 + measure('ROI', 18, FONT.body, 800) + 7, 45, 18, '#8b9994', FONT.body, 600);
    tracked('PARKED ARCADE', 127, 63, 8, '#5b6964', FONT.mono, 400, 2.1);

    const center = game ? `LIBRARY  /  ${game.name}` : 'LIBRARY  /  FEATURED';
    tracked(center, W / 2, 48, 10, '#84928d', FONT.mono, 400, 1.4, 'center');

    const statusMap = {
      home: ['PARKED · READY', C.lime],
      live: ['PARKED · IN PLAY', C.lime],
      paused: ['PARKED · PAUSED', C.amber],
      over: ['PARKED · RUN OVER', C.coral]
    };
    const [status, statusColor] = statusMap[mode] || statusMap.home;
    const statusW = measure(status, 9.5, FONT.mono, 500) + status.length * 1.05 + 50;
    const statusX = W - 72 - statusW;
    round(statusX, 27, statusW, 32, 16, 'rgba(12,19,19,0.7)', alpha(statusColor, 0.2));
    ctx.save();
    ctx.shadowColor = alpha(statusColor, 0.65);
    ctx.shadowBlur = 10;
    rect(statusX + 15, 42, 5, 5, statusColor);
    ctx.restore();
    tracked(status, statusX + 29, 47.5, 9.5, statusColor, FONT.mono, 500, 1.05);

    tracked('ID7 · 1920 × 720', statusX - 20, 48, 9.5, '#61706a', FONT.mono, 400, 1.1, 'right');

    const divider = ctx.createLinearGradient(72, 0, W - 72, 0);
    divider.addColorStop(0, alpha(C.lime, 0.3));
    divider.addColorStop(0.08, 'rgba(60, 78, 72, 0.55)');
    divider.addColorStop(0.92, 'rgba(60, 78, 72, 0.35)');
    divider.addColorStop(1, 'rgba(60, 78, 72, 0)');
    rect(72, 86, W - 144, 1, divider);
  }

  function canvasFooter(accent) {
    const cy = 690;
    let x = 72;
    x += keycap('←', x, cy, { h: 24, size: 10 }) + 4;
    x += keycap('→', x, cy, { h: 24, size: 10 }) + 8;
    tracked('BROWSE', x, cy + 4, 9, '#68756f', FONT.mono, 500, 1.3);
    x += measure('BROWSE', 9, FONT.mono, 500) + 28;
    x += keycap('↵', x, cy, { h: 24, size: 10, color: accent, border: alpha(accent, 0.32) }) + 8;
    tracked('SELECT', x, cy + 4, 9, '#68756f', FONT.mono, 500, 1.3);

    tracked('ROI GAME HUB  /  CONCEPT BUILD v0.1', W / 2, cy + 4, 8.5, '#46534e', FONT.mono, 400, 1.5, 'center');

    const safety = 'PARKED ONLY · 0 KM/H';
    const sw = measure(safety, 9, FONT.mono, 500) + safety.length * 1.2;
    ctx.save();
    ctx.shadowColor = alpha(C.lime, 0.6);
    ctx.shadowBlur = 8;
    rect(W - 72 - sw - 15, cy - 2, 5, 5, C.lime);
    ctx.restore();
    tracked(safety, W - 72, cy + 4, 9, '#7c8a84', FONT.mono, 500, 1.2, 'right');
  }

  // ── Home ──────────────────────────────────────────────────

  function drawHeroArt(g, index) {
    const { x, y, w, h } = HOME.art;
    const cx = x + w / 2;
    const cy = y + 132;
    round(x, y, w, h, 18, '#0a1213', '#233331');

    ctx.save();
    roundPath(x, y, w, h, 18);
    ctx.clip();

    ctx.globalAlpha = 0.34;
    ctx.fillStyle = dotPattern;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 210);
    glow.addColorStop(0, alpha(g.color, 0.11));
    glow.addColorStop(0.55, alpha(g.color, 0.035));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, w, h);

    text(String(index + 1).padStart(2, '0'), x + w - 8, y + h - 94, 206, alpha(g.color, 0.05), FONT.display, 700, 'right');

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = alpha(g.color, 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = alpha(g.color, 0.38);
    ctx.setLineDash([2, 8]);
    ctx.lineDashOffset = reduceMotion ? 0 : -ambientT * 12;
    ctx.beginPath();
    ctx.arc(0, 0, 106, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!reduceMotion) {
      const a = ambientT * 0.5;
      ctx.save();
      ctx.shadowColor = alpha(g.color, 0.9);
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 106, Math.sin(a) * 106, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = g.color;
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    drawGameIcon(g.id, cx, cy, 90, g.color);
    ctx.restore();

    diffPill(g.diff, g.level, x + 24, y + 34, g.color);
    tracked('FEATURED', x + w - 24, y + 42, 8.5, '#6e7c76', FONT.mono, 500, 1.7, 'right');

    rect(x + 24, y + h - 88, w - 48, 1, alpha(g.color, 0.13));

    const stats = [
      ['BEST', bestOf(g.id) ? formatScore(bestOf(g.id)) : '—'],
      ['PLAYERS', g.players],
      ['MODE', 'SOLO']
    ];
    stats.forEach((stat, i) => {
      const sx = x + 24 + i * 194;
      if (i > 0) rect(sx - 24, y + h - 64, 1, 38, 'rgba(150, 180, 168, 0.1)');
      tracked(stat[0], sx, y + h - 64, 8.5, '#64726c', FONT.mono, 500, 1.5);
      text(stat[1], sx, y + h - 28, i === 0 ? 26 : 21, i === 0 ? g.color : C.text, FONT.display, 600);
    });
  }

  function drawHero() {
    const g = games[selected];
    const { x, y, w, h } = HOME.hero;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 18;
    round(x, y, w, h, 20, '#0c1415', '#253532');
    ctx.restore();

    const wash = ctx.createLinearGradient(x, y, x + w * 0.65, y + h);
    wash.addColorStop(0, alpha(g.color, 0.075));
    wash.addColorStop(0.5, 'rgba(10,17,18,0.02)');
    wash.addColorStop(1, 'rgba(10,17,18,0)');
    round(x, y, w, h, 20, wash);

    rect(x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,0.035)');

    const ex = x + 40;
    rect(ex, y + 44, 28, 2, g.color);
    tracked(`${String(selected + 1).padStart(2, '0')}  /  ${g.eyebrow}`, ex + 40, y + 51, 10, g.color, FONT.mono, 500, 1.5);

    text(g.name, ex - 4, y + 134, 84, C.text, FONT.display, 700);

    paragraph(g.sub, ex, y + 174, 17, 620, 26, C.text2, FONT.body, 500);

    let cx = ex;
    const controlY = y + 252;
    g.controls.forEach(control => {
      control.keys.forEach((key, i) => {
        cx += keycap(key, cx, controlY, { h: 30, size: 11 }) + 4;
        if (i === control.keys.length - 1) cx -= 4;
      });
      tracked(control.label, cx + 9, controlY + 4, 9, '#7b8983', FONT.mono, 500, 1.1);
      cx += 9 + measure(control.label, 9, FONT.mono, 500) + control.label.length * 1.1 + 26;
    });

    button('PLAY NOW', HOME.cta.x, HOME.cta.y, HOME.cta.w, HOME.cta.h, g.color, {
      triangle: true,
      size: 11.5
    });

    if (hoverCta) {
      round(HOME.cta.x - 4, HOME.cta.y - 4, HOME.cta.w + 8, HOME.cta.h + 8, 16, null, alpha(g.color, 0.5));
    }

    const hintX = HOME.cta.x + HOME.cta.w + 20;
    const keyW = keycap('↵', hintX, HOME.cta.y + HOME.cta.h / 2, { h: 30, size: 10, color: g.color, border: alpha(g.color, 0.3) });
    tracked('OR PRESS ENTER', hintX + keyW + 10, HOME.cta.y + HOME.cta.h / 2 + 4, 9, '#5f6d67', FONT.mono, 500, 1.2);

    drawHeroArt(g, selected);
  }

  function drawRail() {
    const headerY = HOME.railHeaderY;
    tracked('GAME LIBRARY', HOME.rail.x, headerY, 10, '#697771', FONT.mono, 500, 1.6);
    const lineStart = HOME.rail.x + 134;
    const lineEnd = W - 72 - 66;
    rect(lineStart, headerY - 4, lineEnd - lineStart, 1, 'rgba(120, 150, 138, 0.11)');
    tracked(`${String(selected + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}`, W - 72, headerY, 10, '#697771', FONT.mono, 500, 1.4, 'right');

    const cardW = (W - 144 - HOME.rail.gap * (games.length - 1)) / games.length;
    games.forEach((g, i) => {
      const x = HOME.rail.x + i * (cardW + HOME.rail.gap);
      const y = HOME.rail.y;
      const h = HOME.rail.h;
      const active = i === selected;
      const hover = i === hoverCard && !active;

      ctx.save();
      if (active) {
        ctx.shadowColor = alpha(g.color, 0.16);
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 6;
      }
      let fill = '#0c1415';
      if (active) {
        fill = ctx.createLinearGradient(x, y, x + cardW, y + h);
        fill.addColorStop(0, 'rgba(9, 15, 16, 0.96)');
        fill.addColorStop(0.52, 'rgba(11, 18, 19, 0.92)');
        fill.addColorStop(1, alpha(g.color, 0.16));
      } else if (hover) {
        fill = '#111b1c';
      }
      round(x, y, cardW, h, 13, fill, active ? alpha(g.color, 0.52) : hover ? 'rgba(150,180,168,0.25)' : '#22302e');
      ctx.restore();

      if (active) {
        rect(x + 18, y + 1, cardW - 36, 2, g.color);
      }

      tracked(String(i + 1).padStart(2, '0'), x + 20, y + 31, 9.5, active ? g.color : '#5f6d67', FONT.mono, 500, 1.3);
      drawGameIcon(g.id, x + cardW - 40, y + 46, 44, active ? g.color : '#7a8882');

      text(g.name, x + 20, y + 78, 24, active ? C.text : '#dce4df', FONT.display, 700);
      tracked(g.eyebrow, x + 20, y + 99, 8.5, active ? alpha(g.color, 0.85) : '#68756f', FONT.mono, 500, 1.2);

      diffPill(g.diff, g.level, x + 20, y + 121, active ? g.color : '#7b8883', {
        bg: active ? 'rgba(8, 14, 15, 0.66)' : '#111a1b',
        border: active ? alpha(g.color, 0.34) : '#293633'
      });

      if (active) {
        ctx.beginPath();
        ctx.moveTo(x + cardW - 64, y + 114);
        ctx.lineTo(x + cardW - 55, y + 121);
        ctx.lineTo(x + cardW - 64, y + 128);
        ctx.closePath();
        ctx.fillStyle = g.color;
        ctx.fill();
        tracked('PLAY', x + cardW - 20, y + 125, 9, g.color, FONT.mono, 600, 1.3, 'right');
      } else {
        const best = bestOf(g.id);
        if (best) {
          tracked('BEST', x + cardW - 84, y + 125, 8.5, '#4f5c57', FONT.mono, 400, 1.2, 'right');
          tracked(formatScore(best), x + cardW - 20, y + 125, 9, '#8b9993', FONT.mono, 500, 1.1, 'right');
        }
      }
    });
  }

  function home() {
    const g = games[selected];
    background(g.color);
    topbar('home', null);
    drawHero();
    drawRail();
    canvasFooter(g.color);
  }

  // ── Game shell ────────────────────────────────────────────

  function drawGameFrame(g) {
    round(GAME.x, GAME.y, GAME.w, GAME.h, 20, C.surface, '#283836');

    ctx.save();
    roundPath(GAME.x, GAME.y, GAME.w, GAME.h, 20);
    ctx.clip();
    rect(GAME.x, GAME.y, GAME.w, GAME.header, '#0d1718');
    const headGlow = ctx.createLinearGradient(GAME.x, GAME.y, GAME.x + GAME.w, GAME.y);
    headGlow.addColorStop(0, alpha(g.color, 0.1));
    headGlow.addColorStop(0.38, 'rgba(0,0,0,0)');
    ctx.fillStyle = headGlow;
    ctx.fillRect(GAME.x, GAME.y, GAME.w, GAME.header);
    rect(GAME.x, GAME.y + GAME.header, GAME.w, 1, '#22312e');
    ctx.restore();

    const badgeX = GAME.x + 24;
    round(badgeX, GAME.y + 14, 24, 24, 6, alpha(g.color, 0.11), alpha(g.color, 0.28));
    text(String(selected + 1).padStart(2, '0'), badgeX + 12, GAME.y + 30.5, 10.5, g.color, FONT.mono, 600, 'center');
    tracked(g.name, badgeX + 38, GAME.y + 31, 10, '#b7c4bf', FONT.mono, 500, 1.2);

    const stateLabel = over ? 'RUN OVER' : paused ? 'PAUSED' : 'LIVE';
    const stateColor = over ? C.coral : paused ? C.amber : g.color;
    const time = formatTime(elapsed);
    tracked(`${stateLabel}  ·  ${time}`, PAUSE_BTN.x - 18, GAME.y + 31, 9, stateColor, FONT.mono, 500, 1.2, 'right');

    const pb = PAUSE_BTN;
    round(pb.x, pb.y, pb.w, pb.h, 8, 'rgba(14,23,23,0.9)', 'rgba(140, 170, 158, 0.22)');
    rect(pb.x + 15, pb.y + 10, 2.5, 10, '#b7c3be');
    rect(pb.x + 20, pb.y + 10, 2.5, 10, '#b7c3be');
    tracked(paused ? 'RESUME' : 'PAUSE', pb.x + 32, pb.y + 19.5, 8.5, '#a5b2ad', FONT.mono, 500, 1.1);
  }

  function drawSidebar(g) {
    const x = SIDEBAR.x;
    tracked('NOW PLAYING', x, 144, 10, g.color, FONT.mono, 500, 1.6);

    text(g.name, x - 4, 204, 55, C.text, FONT.display, 700);

    let chipX = x;
    chipX += pill(g.mode, chipX, 230, g.color, { h: 25, size: 8.5 }) + 8;
    diffPill(g.diff, g.level, chipX, 230, g.color, { h: 25 });

    paragraph(g.sub, x, 274, 14.5, SIDEBAR.w - 8, 23, C.text2, FONT.body, 500);

    round(x, 342, SIDEBAR.w, 126, 12, '#0c1415', '#23312e');
    tracked('CONTROLS', x + 20, 366, 8.5, '#64726c', FONT.mono, 500, 1.6);
    g.controls.forEach((control, i) => {
      const cy = 394 + i * 27;
      let kx = x + 20;
      control.keys.forEach(key => {
        kx += keycap(key, kx, cy, { h: 22, size: 9.5, pad: 7 }) + 4;
      });
      tracked(control.label, kx + 4, cy + 3.5, 9, '#8e9c96', FONT.mono, 500, 1.05);
    });

    tracked('SCORE', x, 508, 8.5, '#64726c', FONT.mono, 500, 1.6);
    text(formatScore(score), x - 2, 553, 44, C.text, FONT.display, 700);

    if (bestOf(g.id)) {
      tracked('BEST', x + 212, 508, 8.5, '#64726c', FONT.mono, 500, 1.6);
      text(formatScore(bestOf(g.id)), x + 210, 550, 26, alpha(g.color, 0.92), FONT.display, 600);
    }

    const backW = 198;
    round(x, 582, backW, 46, 8, '#101a1b', '#2b3936');
    const kw = keycap('ESC', x + 14, 605, { h: 24, size: 9 });
    tracked('BACK TO LIBRARY', x + 14 + kw + 10, 609, 9, '#9eaaa5', FONT.mono, 500, 1.05);

    rect(460, 112, 1, 540, 'rgba(120, 150, 138, 0.08)');
  }

  function drawOverlay(g) {
    const mw = 560;
    const mh = 244;
    const cx = GAME.x + GAME.w / 2;
    const mx = cx - mw / 2;
    const my = 260;

    rect(GAME.x, GAME.y, GAME.w, GAME.h, 'rgba(4, 8, 8, 0.72)');

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 40;
    round(mx, my, mw, mh, 18, '#101a1b', '#3a4c48');
    ctx.restore();

    const label = over ? 'RUN COMPLETE' : 'SESSION PAUSED';
    const title = over ? 'Nice run.' : 'Take your time.';
    const accent = over ? g.color : C.amber;
    tracked(label, cx, my + 42, 9, accent, FONT.mono, 500, 1.8, 'center');
    text(title, cx, my + 86, 38, C.text, FONT.display, 700, 'center');

    if (over) {
      const bestValue = newBest
        ? formatScore(score)
        : bestOf(g.id)
          ? formatScore(bestOf(g.id))
          : '—';
      tracked(`SCORE ${formatScore(score)}   ·   BEST ${bestValue}`, cx, my + 116, 9.5, '#8c9a94', FONT.mono, 500, 1.2, 'center');
      if (newBest) {
        pill('NEW BEST', cx - 34, my + 140, C.lime, { h: 22, size: 8, bg: alpha(C.lime, 0.1), border: alpha(C.lime, 0.3) });
      }
    } else {
      tracked('THE RUN IS FROZEN UNTIL YOU ARE READY', cx, my + 116, 9.5, '#8c9a94', FONT.mono, 500, 1.2, 'center');
    }

    const by = my + 166;
    const pw = 208;
    const sw = 164;
    const gap = 12;
    const start = cx - (pw + sw + gap) / 2;
    overlayPrimary = { x: start, y: by, w: pw, h: 48 };
    overlaySecondary = { x: start + pw + gap, y: by, w: sw, h: 48 };

    button(over ? 'PLAY AGAIN' : 'RESUME', overlayPrimary.x, overlayPrimary.y, pw, 48, accent, {
      triangle: !over,
      size: 10.5
    });
    round(overlaySecondary.x, by, sw, 48, 12, '#121d1e', '#32423e');
    tracked('LIBRARY', overlaySecondary.x + sw / 2, by + 28, 10, '#a7b4af', FONT.mono, 500, 1.3, 'center');
  }

  function panel(dt) {
    const g = games[selected];
    background(g.color);
    topbar(paused ? 'paused' : over ? 'over' : 'live', g);
    drawSidebar(g);
    drawGameFrame(g);

    if (selected === 0) drawRace(dt);
    else if (selected === 1) drawTargetHunt(dt);
    else if (selected === 2) drawTetris();
    else if (selected === 3) drawBreakout(dt);
    else drawSnake();

    if (paused || over) drawOverlay(g);
    else {
      overlayPrimary = null;
      overlaySecondary = null;
    }
    canvasFooter(g.color);
  }

  // ── Games ────────────────────────────────────────────────

  function drawSideCar(x, y, color, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    round(-62, -20, 116, 42, 14, color);
    round(-30, -39, 51, 28, 12, color);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-21, -34);
    ctx.lineTo(-8, -53);
    ctx.lineTo(12, -53);
    ctx.lineTo(24, -34);
    ctx.closePath();
    ctx.fillStyle = '#0d191a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-32, 22, 13, 0, Math.PI * 2);
    ctx.arc(37, 22, 13, 0, Math.PI * 2);
    ctx.fillStyle = '#0a1112';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-32, 22, 6, 0, Math.PI * 2);
    ctx.arc(37, 22, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#aeb8b6';
    ctx.fill();
    round(48, -10, 9, 8, 3, '#fff7d8');
    round(-61, -8, 7, 12, 3, '#ff635f');
    ctx.restore();
  }

  function drawRace(dt) {
    const { x, y, w, h } = GAME.content;
    const roadY = y + 30;
    const roadH = h - 60;
    const rows = [roadY + roadH * 0.22, roadY + roadH * 0.5, roadY + roadH * 0.78];
    const playerX = 1040;

    const scene = ctx.createLinearGradient(x, y, x + w, y + h);
    scene.addColorStop(0, '#10282b');
    scene.addColorStop(0.46, '#0b1a1c');
    scene.addColorStop(1, '#0a1415');
    round(x, y, w, h, 14, scene, '#2c403c');

    ctx.save();
    roundPath(x, y, w, h, 14);
    ctx.clip();

    const sky = ctx.createLinearGradient(x, y, x, y + 60);
    sky.addColorStop(0, 'rgba(109, 224, 239, 0.08)');
    sky.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sky;
    ctx.fillRect(x, y, w, 80);

    // City strips above and below the road.
    for (let i = 0; i < 17; i++) {
      const bx = x + ((i * 127 - elapsed * 0.045) % (w + 160) + w + 160) % (w + 160) - 80;
      const bh = 8 + (i % 5) * 4;
      round(bx, y + 2, 54 + (i % 3) * 16, bh, 3, '#0a1718');
      const win = i % 4 === 0 ? C.lime : i % 4 === 1 ? C.cyan : '#d8e6dc';
      ctx.globalAlpha = 0.35;
      rect(bx + 9, y + 6, 3, 2, win);
      rect(bx + 20, y + 6, 3, 2, win);
      ctx.globalAlpha = 1;
      round(bx + 14, y + h - bh - 2, 56 + (i % 4) * 12, bh, 3, '#091415');
    }

    round(x + 30, roadY, w - 60, roadH, 8, '#0d1718');
    const roadGlow = ctx.createRadialGradient(x + w * 0.55, roadY + roadH / 2, 0, x + w * 0.55, roadY + roadH / 2, w * 0.55);
    roadGlow.addColorStop(0, 'rgba(200, 245, 106, 0.04)');
    roadGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = roadGlow;
    ctx.fillRect(x + 30, roadY, w - 60, roadH);

    rect(x + 30, roadY, w - 60, 2, 'rgba(200, 245, 106, 0.22)');
    rect(x + 30, roadY + roadH - 2, w - 60, 2, 'rgba(200, 245, 106, 0.18)');

    // Warning lights along the guard rails.
    for (let i = 0; i < 13; i++) {
      const sx = x + 40 + ((i * 143 + elapsed * 0.2) % (w - 80));
      round(sx, roadY + 9, 32, 4, 2, 'rgba(200, 245, 106, 0.26)');
      round(sx + 46, roadY + roadH - 13, 32, 4, 2, 'rgba(200, 245, 106, 0.22)');
    }

    ctx.strokeStyle = 'rgba(229, 238, 215, 0.2)';
    ctx.lineWidth = 3;
    ctx.setLineDash([32, 26]);
    ctx.lineDashOffset = reduceMotion ? 0 : -elapsed * 0.12;
    for (let i = 1; i < 3; i++) {
      const yy = roadY + (roadH / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x + 40, yy);
      ctx.lineTo(x + w - 40, yy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Speed streaks.
    for (let i = 0; i < 16; i++) {
      const sx = x + ((i * 173 - elapsed * (0.25 + turbo * 0.004)) % (w + 180) + w + 180) % (w + 180);
      const sy = roadY + 30 + ((i * 73) % (roadH - 60));
      rect(sx, sy, 34 + (i % 4) * 18, 1, 'rgba(214, 232, 220, 0.07)');
    }

    if (!paused && !over) {
      raceSpawnTimer += dt * (1 + turbo * 0.004);
      if (raceSpawnTimer > 1450) {
        raceSpawnTimer = 0;
        traffic.push({
          x: x + w + 80,
          lane: Math.floor(Math.random() * 3),
          color: [C.coral, C.cyan, C.amber, C.violet][Math.floor(Math.random() * 4)]
        });
      }
      const speed = dt * (0.22 + turbo * 0.0035);
      traffic.forEach(car => {
        car.x -= speed;
      });
      traffic = traffic.filter(car => {
        if (car.x < x - 100) {
          score += 100;
          return false;
        }
        return true;
      });
      traffic.forEach(car => drawSideCar(car.x, rows[car.lane], car.color, 0.86));
      if (traffic.some(car => Math.abs(car.x - playerX) < 102 && car.lane === lane)) over = true;
    } else {
      traffic.forEach(car => drawSideCar(car.x, rows[car.lane], car.color, 0.86));
    }

    const headlight = ctx.createLinearGradient(playerX + 44, 0, playerX + 300, 0);
    headlight.addColorStop(0, 'rgba(255, 249, 214, 0.12)');
    headlight.addColorStop(1, 'rgba(255, 249, 214, 0)');
    ctx.beginPath();
    ctx.moveTo(playerX + 44, rows[lane] - 22);
    ctx.lineTo(playerX + 310, rows[lane] - 54);
    ctx.lineTo(playerX + 310, rows[lane] + 54);
    ctx.lineTo(playerX + 44, rows[lane] + 22);
    ctx.closePath();
    ctx.fillStyle = headlight;
    ctx.fill();

    drawSideCar(playerX, rows[lane], C.lime, 1.02);

    // HUD
    round(x + 18, y + 16, 206, 54, 10, 'rgba(5, 11, 12, 0.72)', 'rgba(200, 245, 106, 0.18)');
    tracked('TURBO', x + 32, y + 36, 8.5, '#8a988f', FONT.mono, 500, 1.5);
    text(`${Math.round(turbo)}%`, x + 210, y + 36, 9.5, C.lime, FONT.mono, 500, 'right');
    round(x + 32, y + 44, 178, 6, 3, 'rgba(200, 245, 106, 0.13)');
    round(x + 32, y + 44, 178 * clamp(turbo / 100, 0, 1), 6, 3, C.lime);

    round(x + w - 224, y + 16, 206, 54, 10, 'rgba(5, 11, 12, 0.72)', 'rgba(200, 245, 106, 0.14)');
    tracked('DISTANCE', x + w - 208, y + 36, 8.5, '#8a988f', FONT.mono, 500, 1.5);
    text(`${String(Math.floor(elapsed / 35)).padStart(4, '0')} M`, x + w - 32, y + 58, 17, C.text, FONT.display, 600, 'right');

    ctx.restore();
  }

  function drawTargetHunt(dt) {
    const { x, y } = TARGET;
    const { cw, ch } = TARGET;

    tracked('TARGET RANGE', GAME.content.x, 192, 8.5, '#64726c', FONT.mono, 500, 1.5);
    tracked('THREE MISSES ENDS THE RUN', GAME.content.x + GAME.content.w, 192, 8.5, '#64726c', FONT.mono, 500, 1.5, 'right');

    for (let r = 0; r < TARGET.rows; r++) {
      for (let c = 0; c < TARGET.cols; c++) {
        const xx = x + c * cw;
        const yy = y + r * ch;
        const active = aim.x === c && aim.y === r;
        round(xx, yy, cw - 10, ch - 10, 10, active ? 'rgba(109, 224, 239, 0.08)' : '#0e1819', active ? alpha(C.cyan, 0.72) : '#253432');

        if (active) {
          ctx.strokeStyle = C.cyan;
          ctx.lineWidth = 2;
          const pad = 12;
          const len = 9;
          ctx.beginPath();
          ctx.moveTo(xx + pad, yy + pad + len);
          ctx.lineTo(xx + pad, yy + pad);
          ctx.lineTo(xx + pad + len, yy + pad);
          ctx.moveTo(xx + cw - 10 - pad, yy + pad);
          ctx.lineTo(xx + cw - 10 - pad - len, yy + pad);
          ctx.lineTo(xx + cw - 10 - pad, yy + pad + len);
          ctx.moveTo(xx + pad, yy + ch - 10 - pad - len);
          ctx.lineTo(xx + pad, yy + ch - 10 - pad);
          ctx.lineTo(xx + pad + len, yy + ch - 10 - pad);
          ctx.moveTo(xx + cw - 10 - pad, yy + ch - 10 - pad - len);
          ctx.lineTo(xx + cw - 10 - pad, yy + ch - 10 - pad);
          ctx.lineTo(xx + cw - 10 - pad - len, yy + ch - 10 - pad);
          ctx.stroke();
        }

        const cx = xx + (cw - 10) / 2;
        const cy = yy + (ch - 10) / 2;
        const target = targets.find(t => t.x === c && t.y === r);

        if (target) {
          const pulse = 1 + Math.sin(ambientT * 12) * 0.06;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(pulse, pulse);
          ctx.shadowColor = alpha(C.coral, 0.75);
          ctx.shadowBlur = 22;
          ctx.beginPath();
          ctx.arc(0, 0, 25, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 128, 144, 0.18)';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = C.coral;
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fillStyle = C.coral;
          ctx.fill();

          if (!paused && !over) {
            ctx.strokeStyle = 'rgba(255,255,255,0.75)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(target.life / TARGET.life, 0, 1));
            ctx.stroke();
          }
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, 13, 0, Math.PI * 2);
          ctx.strokeStyle = active ? alpha(C.cyan, 0.48) : '#344240';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fillStyle = active ? C.cyan : '#344240';
          ctx.fill();
        }
      }
    }

    if (!paused && !over) {
      targetTimer += dt;
      if (targetTimer > 720) {
        targetTimer = 0;
        const open = [];
        for (let r = 0; r < TARGET.rows; r++) {
          for (let c = 0; c < TARGET.cols; c++) {
            if (!targets.some(t => t.x === c && t.y === r)) open.push({ x: c, y: r });
          }
        }
        if (open.length) {
          const spot = open[Math.floor(Math.random() * open.length)];
          targets.push({ ...spot, life: TARGET.life });
        }
      }
      targets.forEach(t => {
        t.life -= dt;
      });
      const expired = targets.filter(t => t.life <= 0).length;
      if (expired) {
        misses += expired;
        if (misses >= 3) over = true;
      }
      targets = targets.filter(t => t.life > 0);
    }

    const hudY = y + TARGET.rows * ch + 26;
    const items = [
      ['AIM', `${String(aim.x + 1).padStart(2, '0')} / ${String(aim.y + 1).padStart(2, '0')}`, C.cyan],
      ['HITS', String(Math.floor(score / 100)).padStart(2, '0'), C.text],
      ['MISSES', `${misses} / 3`, misses ? C.coral : '#9aa7a1']
    ];
    items.forEach((item, i) => {
      const aligned = i === 0 ? 'left' : i === 1 ? 'center' : 'right';
      const px = i === 0 ? x : i === 1 ? x + (TARGET.cols * cw) / 2 : x + TARGET.cols * cw - 10;
      tracked(item[0], px, hudY, 8.5, '#64726c', FONT.mono, 500, 1.5, aligned);
      text(item[1], px, hudY + 24, 15, item[2], FONT.mono, 500, aligned);
    });

    tracked('ARROWS TO AIM   ·   ENTER TO FIRE', x + (TARGET.cols * cw) / 2, hudY + 54, 8.5, '#5f6d67', FONT.mono, 400, 1.4, 'center');
  }

  function currentShape() {
    let shape = pieces[pieceType].map(row => row.slice());
    for (let r = 0; r < pieceRot % 4; r++) {
      shape = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
    }
    return shape;
  }

  function collides(px, py, shape = currentShape()) {
    return shape.some((row, dy) => row.some((v, dx) => v && (px + dx < 0 || px + dx >= 10 || py + dy >= 20 || (py + dy >= 0 && board[py + dy][px + dx]))));
  }

  function refillQueue() {
    while (pieceQueue.length < 4) pieceQueue.push(Math.floor(Math.random() * pieces.length));
  }

  function spawnPiece() {
    refillQueue();
    pieceType = pieceQueue.shift();
    refillQueue();
    pieceRot = 0;
    pieceX = 3;
    pieceY = 0;
    if (collides(pieceX, pieceY)) over = true;
  }

  function lockPiece() {
    const shape = currentShape();
    shape.forEach((row, dy) => row.forEach((v, dx) => {
      if (v && pieceY + dy >= 0) board[pieceY + dy][pieceX + dx] = pieceType + 1;
    }));
    let cleared = 0;
    board = board.filter(row => {
      if (row.every(Boolean)) {
        cleared++;
        return false;
      }
      return true;
    });
    while (board.length < 20) board.unshift(Array(10).fill(0));
    score += cleared * [0, 100, 300, 500, 800][cleared];
    lines += cleared;
    spawnPiece();
  }

  function drawPreview(type, cx, cy, cell, color) {
    const shape = pieces[type];
    const w = shape[0].length * cell;
    const h = shape.length * cell;
    shape.forEach((row, dy) => row.forEach((v, dx) => {
      if (v) round(cx - w / 2 + dx * cell + 1, cy - h / 2 + dy * cell + 1, cell - 2, cell - 2, 3, color, 'rgba(255,255,255,0.14)');
    }));
  }

  function drawTetris() {
    const { x, y, cell } = TETRIS;
    const bw = 10 * cell;
    const bh = 20 * cell;

    round(x - 10, y - 10, bw + 20, bh + 20, 14, '#0b1314', '#2c3d39');

    for (let r = 0; r < 20; r++) {
      for (let c = 0; c < 10; c++) {
        if ((r + c) % 2 === 0) rect(x + c * cell, y + r * cell, cell, cell, 'rgba(160, 190, 176, 0.018)');
      }
    }

    board.forEach((row, r) => row.forEach((v, c) => {
      if (v) {
        const color = blockColors[v] || C.amber;
        round(x + c * cell + 2, y + r * cell + 2, cell - 4, cell - 4, 4, color, 'rgba(255,255,255,0.12)');
        rect(x + c * cell + 4, y + r * cell + 4, cell - 8, 2, 'rgba(255,255,255,0.16)');
      }
    }));

    let ghostY = pieceY;
    while (!collides(pieceX, ghostY + 1)) ghostY++;
    const shape = currentShape();
    shape.forEach((row, dy) => row.forEach((v, dx) => {
      if (v) round(x + (pieceX + dx) * cell + 2, y + (ghostY + dy) * cell + 2, cell - 4, cell - 4, 4, alpha(C.amber, 0.08), alpha(C.amber, 0.18));
    }));
    shape.forEach((row, dy) => row.forEach((v, dx) => {
      if (v) {
        round(x + (pieceX + dx) * cell + 2, y + (pieceY + dy) * cell + 2, cell - 4, cell - 4, 4, C.amber, 'rgba(255,255,255,0.28)');
        rect(x + (pieceX + dx) * cell + 4, y + (pieceY + dy) * cell + 4, cell - 8, 2, 'rgba(255,255,255,0.22)');
      }
    }));

    ctx.globalAlpha = 0.11;
    drawGameIcon('tetris', 780, 342, 190, C.amber);
    ctx.globalAlpha = 1;
    tracked('20 × 10 PLAYFIELD', 780, 466, 8.5, '#5f6d67', FONT.mono, 500, 1.5, 'center');
    tracked('LINE CLEAR  ·  LEVEL UP', 780, 492, 8.5, '#46534e', FONT.mono, 400, 1.2, 'center');

    const px = 1332;
    tracked('NEXT', px, 204, 8.5, '#64726c', FONT.mono, 500, 1.6);

    for (let i = 0; i < 3; i++) {
      const boxX = px + i * 164;
      round(boxX, 216, 146, 120, 10, '#0b1314', i === 0 ? alpha(C.amber, 0.3) : '#23312e');
      tracked(String(i + 1).padStart(2, '0'), boxX + 12, 236, 8, '#4f5c57', FONT.mono, 400, 1.2);
      const type = pieceQueue[i] !== undefined ? pieceQueue[i] : 0;
      drawPreview(type, boxX + 73, 286, i === 0 ? 15 : 12, i === 0 ? C.amber : alpha(C.amber, 0.55));
    }

    rect(px, 360, 474, 1, 'rgba(150, 180, 168, 0.12)');

    const stats = [
      ['LINES', String(lines).padStart(2, '0'), C.amber],
      ['LEVEL', String(1 + Math.floor(lines / 10)).padStart(2, '0'), C.text],
      ['BEST', bestOf('tetris') ? formatScore(bestOf('tetris')) : '—', '#8b9993']
    ];
    stats.forEach((stat, i) => {
      const sx = px + i * 164;
      tracked(stat[0], sx, 388, 8.5, '#64726c', FONT.mono, 500, 1.6);
      text(stat[1], sx - 2, 438, 36, stat[2], FONT.display, 700);
    });

    const toNext = 10 - (lines % 10);
    tracked(`NEXT LEVEL IN ${toNext} LINE${toNext === 1 ? '' : 'S'}`, px, 476, 8, '#5f6d67', FONT.mono, 400, 1.1);
    rect(px, 486, 474, 4, 'rgba(255, 196, 107, 0.12)');
    rect(px, 486, 474 * ((lines % 10) / 10), 4, C.amber);

    tracked('↑  ROTATE     ← →  MOVE     ↓  DROP', px, 526, 8.5, '#7b8983', FONT.mono, 500, 1.1);
    tracked('ESC  LIBRARY', px, 556, 8.5, '#46534e', FONT.mono, 400, 1.2);
  }

  function drawBreakout(dt) {
    const B = BREAKOUT;
    const brick = { x: B.x + 54, y: B.y + 46, dx: 111, dy: 30, w: 94, h: 16 };
    const remaining = bricks.flat().filter(Boolean).length;

    round(B.x, B.y, B.w, B.h, 14, '#0b1314', '#2c3d39');

    ctx.save();
    roundPath(B.x, B.y, B.w, B.h, 14);
    ctx.clip();

    const fieldGlow = ctx.createRadialGradient(B.x + B.w / 2, B.y + B.h * 0.66, 0, B.x + B.w / 2, B.y + B.h * 0.66, B.w * 0.44);
    fieldGlow.addColorStop(0, alpha(C.violet, 0.08));
    fieldGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fieldGlow;
    ctx.fillRect(B.x, B.y, B.w, B.h);

    for (let i = 1; i < 8; i++) {
      rect(B.x + (B.w / 8) * i, B.y + 30, 1, B.h - 60, 'rgba(160, 190, 176, 0.03)');
    }
    for (let i = 1; i < 5; i++) {
      rect(B.x + 30, B.y + (B.h / 5) * i, B.w - 60, 1, 'rgba(160, 190, 176, 0.03)');
    }

    bricks.forEach((row, r) => row.forEach((alive, c) => {
      if (!alive) return;
      const color = [C.violet, '#9c8ce0', C.cyan, C.lime, C.amber][r % 5];
      round(brick.x + c * brick.dx, brick.y + r * brick.dy, brick.w, brick.h, 5, color, 'rgba(255,255,255,0.16)');
      rect(brick.x + c * brick.dx + 6, brick.y + r * brick.dy + 4, brick.w - 12, 2, 'rgba(255,255,255,0.18)');
    }));

    if (!launched) {
      ball.x = paddleX;
      ball.y = B.y + B.h - 50;
    } else if (!paused && !over) {
      ball.x += ball.vx * dt / 16;
      ball.y += ball.vy * dt / 16;
      if (ball.x < B.x + 15 || ball.x > B.x + B.w - 15) ball.vx *= -1;
      if (ball.y < B.y + 20) ball.vy = Math.abs(ball.vy);

      const py = B.y + B.h - 34;
      if (ball.y >= py - 10 && ball.y < py + 4 && ball.x > paddleX - 70 && ball.x < paddleX + 70) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx += (ball.x - paddleX) * 0.045;
      }

      const c = Math.floor((ball.x - brick.x) / brick.dx);
      const r = Math.floor((ball.y - brick.y) / brick.dy);
      if (r >= 0 && r < 5 && c >= 0 && c < 8 && bricks[r][c]) {
        bricks[r][c] = 0;
        ball.vy *= -1;
        score += 10;
      }
      if (ball.y > B.y + B.h) over = true;
      if (bricks.every(row => row.every(v => !v))) over = true;
    }

    const px = paddleX;

    ctx.save();
    ctx.shadowColor = alpha(C.violet, 0.55);
    ctx.shadowBlur = 20;
    round(px - 62, B.y + B.h - 34, 124, 14, 7, C.violet, 'rgba(238, 226, 255, 0.6)');
    ctx.restore();
    rect(px - 26, B.y + B.h - 30, 52, 2, 'rgba(255,255,255,0.35)');

    ctx.save();
    ctx.shadowColor = alpha(C.violet, 0.8);
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#f7f8f2';
    ctx.fill();
    ctx.restore();

    ctx.restore();

    round(B.x + 20, B.y + 14, 122, 30, 8, 'rgba(7, 12, 13, 0.72)', 'rgba(192, 163, 255, 0.18)');
    tracked(`BRICKS ${String(remaining).padStart(2, '0')}`, B.x + 34, B.y + 33, 8.5, C.violet, FONT.mono, 500, 1.3);
    tracked('CLEAR THE WALL', B.x + B.w - 20, B.y + 33, 8.5, '#64726c', FONT.mono, 500, 1.3, 'right');

    if (!launched) {
      round(B.x + B.w / 2 - 128, B.y + B.h - 102, 256, 38, 19, 'rgba(12, 20, 21, 0.92)', alpha(C.violet, 0.3));
      tracked('PRESS ENTER  ·  LAUNCH BALL', B.x + B.w / 2, B.y + B.h - 78, 9, C.violet, FONT.mono, 500, 1.2, 'center');
    }
  }

  function drawSnake() {
    const S = SNAKE;
    const bw = S.n * S.cell;

    round(S.x - 10, S.y - 10, bw + 20, bw + 20, 16, '#0b1314', '#2c3d39');

    ctx.save();
    roundPath(S.x - 10, S.y - 10, bw + 20, bw + 20, 16);
    ctx.clip();

    const boardGlow = ctx.createRadialGradient(S.x + bw / 2, S.y + bw / 2, 0, S.x + bw / 2, S.y + bw / 2, bw * 0.65);
    boardGlow.addColorStop(0, alpha(C.coral, 0.06));
    boardGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = boardGlow;
    ctx.fillRect(S.x - 10, S.y - 10, bw + 20, bw + 20);

    for (let i = 0; i <= S.n; i++) {
      rect(S.x + i * S.cell, S.y, 1, bw, 'rgba(160, 190, 176, 0.045)');
      rect(S.x, S.y + i * S.cell, bw, 1, 'rgba(160, 190, 176, 0.045)');
    }

    ctx.save();
    ctx.shadowColor = alpha(C.coral, 0.75);
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(S.x + food.x * S.cell + S.cell / 2, S.y + food.y * S.cell + S.cell / 2, S.cell * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = C.coral;
    ctx.fill();
    ctx.restore();
    round(S.x + food.x * S.cell + S.cell * 0.44, S.y + food.y * S.cell + S.cell * 0.18, S.cell * 0.2, S.cell * 0.12, 2, '#b6e46a');

    snake.forEach((p, i) => {
      const t = i / Math.max(1, snake.length - 1);
      const color = i === 0 ? C.lime : `rgba(${Math.round(137 - t * 42)}, ${Math.round(209 - t * 52)}, ${Math.round(88 - t * 18)}, 1)`;
      const pad = i === 0 ? 2 : 3;
      round(S.x + p.x * S.cell + pad, S.y + p.y * S.cell + pad, S.cell - pad * 2, S.cell - pad * 2, 6, color);
      if (i === 0) {
        const ex = snakeDir.x * 4;
        const ey = snakeDir.y * 4;
        ctx.beginPath();
        ctx.arc(S.x + p.x * S.cell + S.cell / 2 + ex - 4, S.y + p.y * S.cell + S.cell / 2 + ey, 2.2, 0, Math.PI * 2);
        ctx.arc(S.x + p.x * S.cell + S.cell / 2 + ex + 4, S.y + p.y * S.cell + S.cell / 2 + ey, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a2420';
        ctx.fill();
      }
    });

    ctx.restore();

    const sx = 1368;
    tracked('RUN LENGTH', sx, 208, 9, '#64726c', FONT.mono, 500, 1.6);
    text(String(snake.length).padStart(2, '0'), sx - 3, 282, 70, C.text, FONT.display, 700);

    if (bestOf('snake')) {
      tracked('BEST', sx, 318, 8.5, '#64726c', FONT.mono, 500, 1.5);
      text(formatScore(bestOf('snake')), sx, 348, 22, C.coral, FONT.display, 600);
    }

    rect(sx, 376, 430, 1, 'rgba(150, 180, 168, 0.12)');

    tracked('HEADING', sx, 410, 8.5, '#64726c', FONT.mono, 500, 1.5);
    const dirLabel = snakeDir.x === 1 ? 'RIGHT' : snakeDir.x === -1 ? 'LEFT' : snakeDir.y === -1 ? 'UP' : 'DOWN';
    text(dirLabel, sx - 2, 450, 34, C.coral, FONT.display, 700);

    tracked('ARROWS / WASD  ·  TURN', sx, 500, 9, '#8b9993', FONT.mono, 500, 1.2);
    tracked('ENTER  ·  PAUSE', sx, 526, 9, '#5f6d67', FONT.mono, 500, 1.2);

    ctx.save();
    ctx.globalAlpha = 0.08;
    drawGameIcon('snake', sx + 340, 540, 150, C.coral);
    ctx.restore();
  }

  // ── Game logic ────────────────────────────────────────────

  function resetGame(index) {
    selected = index;
    screen = 'game';
    score = 0;
    elapsed = 0;
    paused = false;
    over = false;
    recorded = false;
    newBest = false;

    lane = 1;
    turbo = 0;
    traffic = [
      { x: GAME.content.x + GAME.content.w - 340, lane: 0, color: C.cyan },
      { x: GAME.content.x + GAME.content.w - 130, lane: 2, color: C.coral }
    ];
    raceSpawnTimer = 0;

    aim = { x: 2, y: 1 };
    targets = [];
    targetTimer = 0;
    misses = 0;

    board = Array.from({ length: 20 }, () => Array(10).fill(0));
    pieceType = 0;
    pieceRot = 0;
    pieceX = 3;
    pieceY = 0;
    gravity = 0;
    lines = 0;
    pieceQueue = [];

    paddleX = BREAKOUT.x + BREAKOUT.w / 2;
    launched = false;
    ball = { x: paddleX, y: BREAKOUT.y + BREAKOUT.h - 50, vx: 4.2, vy: -5.2 };
    bricks = Array.from({ length: 5 }, () => Array(8).fill(1));

    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    snakeDir = { x: 1, y: 0 };
    nextSnakeDir = { x: 1, y: 0 };
    food = { x: 14, y: 8 };
    snakeClock = 0;

    if (index === 2) spawnPiece();
    last = performance.now();
  }

  function goHome() {
    screen = 'home';
    paused = false;
    over = false;
    overlayPrimary = null;
    overlaySecondary = null;
  }

  function fireTarget() {
    const i = targets.findIndex(t => t.x === aim.x && t.y === aim.y);
    if (i >= 0) {
      targets.splice(i, 1);
      score += 100;
    } else {
      misses++;
      if (misses >= 3) over = true;
    }
  }

  function movePiece(key) {
    if (key === 'ArrowLeft' && !collides(pieceX - 1, pieceY)) pieceX--;
    if (key === 'ArrowRight' && !collides(pieceX + 1, pieceY)) pieceX++;
    if (key === 'ArrowUp') {
      pieceRot = (pieceRot + 1) % 4;
      if (collides(pieceX, pieceY)) pieceRot = (pieceRot + 3) % 4;
    }
    if (key === 'ArrowDown') {
      while (!collides(pieceX, pieceY + 1)) pieceY++;
      lockPiece();
    }
  }

  function tickTetris(dt) {
    gravity += dt;
    if (gravity > Math.max(180, 650 - lines * 28)) {
      gravity = 0;
      if (!collides(pieceX, pieceY + 1)) pieceY++;
      else lockPiece();
    }
  }

  function snakeTurn(dx, dy) {
    if (dx !== -snakeDir.x || dy !== -snakeDir.y) nextSnakeDir = { x: dx, y: dy };
  }

  function tickSnake() {
    snakeDir = nextSnakeDir;
    const head = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
    if (head.x < 0 || head.x >= SNAKE.n || head.y < 0 || head.y >= SNAKE.n || snake.some(p => p.x === head.x && p.y === head.y)) {
      over = true;
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      let nx, ny;
      do {
        nx = Math.floor(Math.random() * SNAKE.n);
        ny = Math.floor(Math.random() * SNAKE.n);
      } while (snake.some(p => p.x === nx && p.y === ny));
      food = { x: nx, y: ny };
    } else {
      snake.pop();
    }
  }

  function input(key) {
    if (screen === 'home') {
      if (key === 'ArrowLeft' || key === 'a') selected = (selected + games.length - 1) % games.length;
      else if (key === 'ArrowRight' || key === 'd') selected = (selected + 1) % games.length;
      else if (key === 'Enter' || key === ' ' || key === 'A') resetGame(selected);
      return;
    }

    if (paused || over) {
      if (key === 'Escape' || key === 'Backspace') goHome();
      else if (key === 'Enter' || key === ' ' || key === 'A') {
        if (over) resetGame(selected);
        else paused = false;
      } else if (key === 'r' || key === 'R') resetGame(selected);
      return;
    }

    if (key === 'Escape' || key === 'Backspace') {
      goHome();
      return;
    }

    if (key === 'p' || key === 'P') {
      paused = true;
      return;
    }

    if (selected === 0) {
      if (key === 'ArrowLeft' || key === 'a') lane = Math.max(0, lane - 1);
      if (key === 'ArrowRight' || key === 'd') lane = Math.min(2, lane + 1);
      if (key === 'ArrowUp' || key === 'w') turbo = Math.min(100, turbo + 25);
      if (key === ' ' || key === 'Enter' || key === 'A') paused = true;
      return;
    }

    if (selected === 1) {
      if (key === 'ArrowLeft' || key === 'a') aim.x = Math.max(0, aim.x - 1);
      if (key === 'ArrowRight' || key === 'd') aim.x = Math.min(TARGET.cols - 1, aim.x + 1);
      if (key === 'ArrowUp' || key === 'w') aim.y = Math.max(0, aim.y - 1);
      if (key === 'ArrowDown' || key === 's') aim.y = Math.min(TARGET.rows - 1, aim.y + 1);
      if (key === 'Enter' || key === ' ' || key === 'A') fireTarget();
      return;
    }

    if (selected === 2) {
      if (key === 'ArrowLeft' || key === 'a') movePiece('ArrowLeft');
      if (key === 'ArrowRight' || key === 'd') movePiece('ArrowRight');
      if (key === 'ArrowUp' || key === 'w') movePiece('ArrowUp');
      if (key === 'ArrowDown' || key === 's') movePiece('ArrowDown');
      if (key === ' ' || key === 'Enter' || key === 'A') paused = true;
      return;
    }

    if (selected === 3) {
      if (key === 'ArrowLeft' || key === 'a' || key === 'ArrowUp' || key === 'w') paddleX = Math.max(BREAKOUT.x + 70, paddleX - 65);
      if (key === 'ArrowRight' || key === 'd' || key === 'ArrowDown' || key === 's') paddleX = Math.min(BREAKOUT.x + BREAKOUT.w - 70, paddleX + 65);
      if ((key === 'Enter' || key === ' ' || key === 'A') && !launched) {
        launched = true;
        ball.vx = (Math.random() < 0.5 ? -1 : 1) * 4.2;
        ball.vy = -5.2;
      } else if (key === 'Enter' || key === ' ' || key === 'A') {
        paused = true;
      }
      return;
    }

    if (selected === 4) {
      if (key === 'ArrowLeft' || key === 'a') snakeTurn(-1, 0);
      if (key === 'ArrowRight' || key === 'd') snakeTurn(1, 0);
      if (key === 'ArrowUp' || key === 'w') snakeTurn(0, -1);
      if (key === 'ArrowDown' || key === 's') snakeTurn(0, 1);
      if (key === 'Enter' || key === ' ' || key === 'A') paused = true;
    }
  }

  // ── Input devices ────────────────────────────────────────

  function cardAt(x, y) {
    if (y < HOME.rail.y || y > HOME.rail.y + HOME.rail.h) return -1;
    const cardW = (W - 144 - HOME.rail.gap * (games.length - 1)) / games.length;
    for (let i = 0; i < games.length; i++) {
      const cx = HOME.rail.x + i * (cardW + HOME.rail.gap);
      if (x >= cx && x <= cx + cardW) return i;
    }
    return -1;
  }

  function targetCellAt(x, y) {
    if (x < TARGET.x || x >= TARGET.x + TARGET.cols * TARGET.cw) return null;
    if (y < TARGET.y || y >= TARGET.y + TARGET.rows * TARGET.ch) return null;
    return {
      x: Math.floor((x - TARGET.x) / TARGET.cw),
      y: Math.floor((y - TARGET.y) / TARGET.ch)
    };
  }

  function localPoint(event) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - r.left) * W / r.width,
      y: (event.clientY - r.top) * H / r.height
    };
  }

  canvas.addEventListener('pointermove', event => {
    const p = localPoint(event);
    let cursor = 'default';
    hoverCard = -1;
    hoverCta = false;

    if (screen === 'home') {
      if (inside(p.x, p.y, HOME.cta)) {
        hoverCta = true;
        cursor = 'pointer';
      }
      const card = cardAt(p.x, p.y);
      if (card >= 0) {
        hoverCard = card;
        cursor = 'pointer';
      }
    } else if (paused || over) {
      if ((overlayPrimary && inside(p.x, p.y, overlayPrimary)) || (overlaySecondary && inside(p.x, p.y, overlaySecondary))) {
        cursor = 'pointer';
      }
    } else if (inside(p.x, p.y, PAUSE_HIT)) {
      cursor = 'pointer';
    } else if (selected === 1 && targetCellAt(p.x, p.y)) {
      cursor = 'crosshair';
    }

    canvas.style.cursor = cursor;
  });

  canvas.addEventListener('pointerleave', () => {
    hoverCard = -1;
    hoverCta = false;
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('pointerdown', event => {
    const p = localPoint(event);

    if (screen === 'home') {
      if (inside(p.x, p.y, HOME.cta)) {
        resetGame(selected);
        return;
      }
      const card = cardAt(p.x, p.y);
      if (card >= 0) {
        if (card === selected) resetGame(card);
        else selected = card;
      }
      return;
    }

    if (paused || over) {
      if (overlayPrimary && inside(p.x, p.y, overlayPrimary)) {
        if (over) resetGame(selected);
        else paused = false;
        return;
      }
      if (overlaySecondary && inside(p.x, p.y, overlaySecondary)) {
        goHome();
      }
      return;
    }

    if (inside(p.x, p.y, PAUSE_HIT)) {
      paused = true;
      return;
    }

    if (selected === 1) {
      const cell = targetCellAt(p.x, p.y);
      if (cell) {
        aim = cell;
        fireTarget();
      }
      return;
    }

    if (selected === 4) {
      const centreX = SNAKE.x + (SNAKE.n * SNAKE.cell) / 2;
      const centreY = SNAKE.y + (SNAKE.n * SNAKE.cell) / 2;
      const dx = p.x - centreX;
      const dy = p.y - centreY;
      if (p.x >= SNAKE.x && p.x <= SNAKE.x + SNAKE.n * SNAKE.cell && p.y >= SNAKE.y && p.y <= SNAKE.y + SNAKE.n * SNAKE.cell) {
        if (Math.abs(dx) > Math.abs(dy)) input(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        else input(dy > 0 ? 'ArrowDown' : 'ArrowUp');
      }
      return;
    }

    if (p.x < GAME.x || p.y < GAME.y || p.y > GAME.y + GAME.h) return;

    if (p.x > W / 2) input('ArrowRight');
    else input('ArrowLeft');
  });

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    if (screen === 'home') input(event.deltaY < 0 ? 'ArrowLeft' : 'ArrowRight');
    else if (selected === 2) input('ArrowUp');
    else if (selected === 3) input(event.deltaY < 0 ? 'ArrowUp' : 'ArrowDown');
    else input(event.deltaY < 0 ? 'ArrowLeft' : 'ArrowRight');
  }, { passive: false });

  window.addEventListener('keydown', event => {
    const focusTag = document.activeElement && document.activeElement.tagName;
    if ((focusTag === 'BUTTON' || focusTag === 'A') && (event.key === 'Enter' || event.key === ' ')) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault();
    if (!event.repeat) input(event.key);
  });

  let prevButtons = [];
  let prevAxisX = 0;
  let prevAxisY = 0;

  function setPadState(active, label) {
    const el = document.querySelector('#input-state');
    const textEl = document.querySelector('#input-state-label');
    if (!el || !textEl) return;
    el.classList.toggle('is-active', active);
    textEl.textContent = label;
  }

  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = p.buttons.map(v => v.pressed);
      const press = i => b[i] && !prevButtons[i];
      const ax = p.axes[0] || 0;
      const ay = p.axes[1] || 0;

      if (press(0)) input('A');
      if (press(1)) input('Escape');
      if (press(9)) input(paused || over ? 'Enter' : 'p');
      if (press(12) || (ay < -0.6 && prevAxisY >= -0.6)) input('ArrowUp');
      if (press(13) || (ay > 0.6 && prevAxisY <= 0.6)) input('ArrowDown');
      if (press(14) || (ax < -0.6 && prevAxisX >= -0.6)) input('ArrowLeft');
      if (press(15) || (ax > 0.6 && prevAxisX <= 0.6)) input('ArrowRight');

      prevButtons = b;
      prevAxisX = ax;
      prevAxisY = ay;

      if (connectedPad !== p.id) {
        connectedPad = p.id;
        setPadState(true, `GAMEPAD · ${p.id.slice(0, 22).toUpperCase()}`);
      }
      return;
    }

    prevButtons = [];
    prevAxisX = 0;
    prevAxisY = 0;
    if (connectedPad) {
      connectedPad = null;
      setPadState(false, 'KEYBOARD · TOUCH · GAMEPAD');
    }
  }

  // ── Main loop ────────────────────────────────────────────

  function frame(now) {
    const dt = Math.min(40, now - last);
    last = now;
    ambientT += dt / 1000;
    syncAccent();

    if (screen === 'home') {
      home();
    } else {
      if (!paused && !over) {
        elapsed += dt;
        if (selected === 0) {
          if (turbo > 0) turbo = Math.max(0, turbo - dt * 0.045);
          score += dt * (turbo > 0 ? 0.045 : 0.018);
        }
        if (selected === 2) tickTetris(dt);
        if (selected === 4) {
          snakeClock += dt;
          if (snakeClock > 175) {
            snakeClock = 0;
            tickSnake();
          }
        }
      }
      if (over && !recorded) recordScore();
      panel(dt);
    }

    pollGamepad();
    requestAnimationFrame(frame);
  }

  let accentKey = '';

  function syncAccent() {
    const color = games[selected].color;
    if (color === accentKey) return;
    accentKey = color;
    const n = parseInt(color.slice(1), 16);
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-rgb', `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`);
  }

  const fullscreenBtn = document.querySelector('#fullscreen');
  const exitFullscreenBtn = document.querySelector('#exit-fullscreen');
  const device = document.querySelector('.device');

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    device.requestFullscreen?.();
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  exitFullscreenBtn.addEventListener('click', () => document.exitFullscreen?.());
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    fullscreenBtn.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
    fullscreenBtn.title = active ? 'Exit full screen' : 'Full screen';
    canvas.focus?.({ preventScroll: true });
    last = performance.now();
  });

  function start() {
    if (started) return;
    started = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start);
    setTimeout(start, 1200);
  } else {
    start();
  }
})();
