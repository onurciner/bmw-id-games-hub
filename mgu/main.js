'use strict';

const mgu = require('./kit/mgu');
const Parked = require('./parked-gate');

const W = 1600;
const H = 520;
const C = {
    bg: '#101216', panel: '#191d23', panel2: '#20262e', line: '#303842',
    text: '#f4f6f8', muted: '#9ba6b2', accent: '#9bea45', red: '#ff6572', blue: '#71b7ff',
};
const GAMES = [
    { id: 'race', title: 'LANE RACER', desc: 'DODGE TRAFFIC', color: '#9bea45' },
    { id: 'target', title: 'TARGET HUNT', desc: 'AIM & SHOOT', color: '#ffb45b' },
    { id: 'tetris', title: 'TETRIS', desc: 'STACK THE GRID', color: '#71b7ff' },
    { id: 'breakout', title: 'PONG / BREAKOUT', desc: 'BOUNCE & BREAK', color: '#d48cff' },
    { id: 'snake', title: 'SNAKE', desc: 'GROW YOUR TAIL', color: '#54d6bd' },
];

mgu.run({
    async start(ctx) {
        const { ui, log } = ctx;
        let gate;
        let selected = 0;
        let active = null;
        let paused = false;
        let last = Date.now();
        let score = 0;
        let state = {};
        let lastAction = 0;
        let grabbed = false;
        let lastPush = false;
        let lastDeflection = 15;
        let lastKnob = null;
        let previousCcuTime = -Infinity;

        const parked = () => !!gate && gate.allowed();
        gate = Parked.watch(ctx, () => sync());
        function resetGame(id) {
            score = 0; paused = false; last = Date.now();
            state = { x: 1, y: 4, tick: 0, boost: 0, ballX: 7, ballY: 8, dx: 0.006, dy: -0.008, launched: false,
                lives: 3, bricks: Array.from({ length: 3 }, () => Array(14).fill(true)),
                board: Array.from({ length: 10 }, () => Array(10).fill(false)),
                snake: [{ x: 7, y: 6 }, { x: 6, y: 6 }, { x: 5, y: 6 }], dir: { x: 1, y: 0 }, food: { x: 11, y: 5 },
                targetX: 7, targetY: 5, cooldown: 0, traffic: [], spawnIn: 450 };
            if (id === 'tetris') spawnPiece();
        }
        function spawnPiece() {
            const forms = [ [[0,0],[1,0],[0,1],[1,1]], [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[1,1]], [[1,0],[2,0],[0,1],[1,1]] ];
            state.piece = forms[Math.floor(Math.random() * forms.length)];
            state.px = 4; state.py = 0;
            if (!canPiece(state.px, state.py, state.piece)) state.gameover = true;
        }
        function canPiece(px, py, piece) {
            return piece.every(([x,y]) => px+x >= 0 && px+x < 10 && py+y >= 0 && py+y < 10 && !state.board[py+y][px+x]);
        }
        function lockPiece() {
            state.piece.forEach(([x,y]) => { if (state.py+y >= 0 && state.py+y < 10) state.board[state.py+y][state.px+x] = true; });
            const full = state.board.filter((row) => row.every(Boolean)).length;
            if (full) {
                state.board = state.board.filter((row) => !row.every(Boolean));
                while (state.board.length < 10) state.board.unshift(Array(10).fill(false));
                score += full * full * 100;
            }
            spawnPiece();
        }
        function dropPiece() {
            if (!active || active !== 'tetris' || paused || !parked() || state.gameover) return;
            while (canPiece(state.px, state.py + 1, state.piece)) state.py++;
            lockPiece();
        }
        function begin(id) { if (!parked()) return; active = id; resetGame(id); }
        function endGame() { active = null; paused = false; }
        function move(dx, dy) {
            if (!active || paused || state.gameover || !parked()) return;
            const now = Date.now();
            if (now - lastAction < 100) return;
            lastAction = now;
            if (active === 'race') {
                if (dx) state.x = Math.max(0, Math.min(2, state.x + dx));
                if (dy < 0) state.boost = 45;
            } else if (active === 'target') {
                state.x = Math.max(0, Math.min(14, state.x + dx));
                state.y = Math.max(0, Math.min(8, state.y + dy));
            } else if (active === 'tetris') {
                if (dx && canPiece(state.px + dx, state.py, state.piece)) state.px += dx;
                if (dy < 0) {
                    const rotated = state.piece.map(([x,y]) => [y, -x]);
                    const minX = Math.min(...rotated.map(([x]) => x));
                    const minY = Math.min(...rotated.map(([,y]) => y));
                    const normalized = rotated.map(([x,y]) => [x-minX, y-minY]);
                    if (canPiece(state.px, state.py, normalized)) state.piece = normalized;
                }
                if (dy > 0) dropPiece();
            } else if (active === 'breakout') {
                state.paddle = Math.max(1, Math.min(13, (state.paddle || 7) + dx * 2));
                if (dy) state.paddle = Math.max(1, Math.min(13, (state.paddle || 7) + dy));
            } else if (active === 'snake') {
                if (dx && dx !== -state.dir.x) state.dir = { x: dx, y: 0 };
                if (dy && dy !== -state.dir.y) state.dir = { x: 0, y: dy };
            }
        }
        function action() {
            if (!parked()) return;
            if (!active) { begin(GAMES[selected].id); return; }
            if (active === 'breakout' && !state.launched && !paused) { state.launched = true; return; }
            if (active === 'target' && !paused) {
                if (state.x === state.targetX && state.y === state.targetY) {
                    score += 10;
                    state.targetX = Math.floor(Math.random() * 15);
                    state.targetY = Math.floor(Math.random() * 9);
                }
            } else if (active === 'target' && paused) paused = false;
            else if (state.gameover) { resetGame(active); }
            else paused = !paused;
        }
        function input(event) {
            const tilt = Number(event.frontRotaryEncoderDeflection);
            const op = Number(event.frontRotaryEncoderOperation);
            const push = Number(event.frontRotaryEncoderPushButton);
            if (!active && Number.isInteger(op) && op >= 0 && op <= 65535) {
                if (lastKnob !== null) {
                    const delta = ((op - lastKnob + 32768) & 0xffff) - 32768;
                    if (Math.abs(delta) <= 32 && delta) selected = (selected + (delta > 0 ? 1 : -1) + GAMES.length) % GAMES.length;
                }
                lastKnob = op;
            } else if (!Number.isInteger(op)) lastKnob = null;
            let dx = 0, dy = 0;
            if (tilt === 4 || tilt === 5) dx = 1;
            else if (tilt === 10 || tilt === 11) dx = -1;
            else if (tilt === 1 || tilt === 2) dy = -1;
            else if (tilt === 7 || tilt === 8) dy = 1;
            if (tilt !== lastDeflection) {
                if (!active && dx) selected = (selected + dx + GAMES.length) % GAMES.length;
                else if (active) move(dx, dy);
                lastDeflection = tilt;
            }
            const pressed = push === 1 || push === 2;
            if (pressed && !lastPush) {
                if (push === 2 && active) endGame();
                else action();
            }
            if (!pressed && lastPush) lastDeflection = 15;
            lastPush = pressed;
            if (Number.isFinite(tilt) && tilt === 15) {
                // The iDrive knob returned to neutral: the next deflection is a new action.
                lastDeflection = 15;
            }
        }
        if (ctx.controller && ctx.controller.onInput) {
            ctx.controller.onInput((event) => { previousCcuTime = process.uptime() * 1000; input(event); });
        }
        ctx.signals.watch('de.bmw.infotainment.controlelements.FrontCCU', '1', {
            statusRotaryEncoderState(event) {
                if (process.uptime() * 1000 - previousCcuTime > 1000) input(event);
            },
        }, log).then((result) => {
            if (result && result.error) log.warn('controller signal unavailable: ' + result.error);
        }).catch((error) => log.warn('controller signal unavailable: ' + (error.message || error)));
        ctx.onTap((x, y) => {
            if (!parked()) return;
            if (!active) {
                if (y > 130 && y < 440) {
                    selected = Math.max(0, Math.min(GAMES.length - 1, Math.floor((x - 48) / 302)));
                    begin(GAMES[selected].id);
                }
            } else if (x < 130 && y < 90) endGame();
            else if (y > 440) action();
            else if (active === 'target') { state.x = Math.max(0, Math.min(14, Math.floor((x - 270) / 68))); state.y = Math.max(0, Math.min(8, Math.floor((y - 185) / 30))); action(); }
            else if (active === 'race' || active === 'breakout') move(x < 800 ? -1 : 1, 0);
        });

        function text(cv, s, x, y, size, color, opts) { cv.text(s, x, y, size, color, Object.assign({ literal: true }, opts)); }
        function box(cv, x, y, w, h, color, r) { cv.roundRect(x, y, w, h, r || 18, color); }
        function drawHeader(cv, title, right) {
            text(cv, 'ROI', 54, 55, 24, C.accent, { font: 'bold', spacing: 2 });
            text(cv, title, 54, 94, 30, C.text, { font: 'bold', spacing: 1 });
            text(cv, right || 'ID7  /  ID8', 1544, 62, 18, C.muted, { align: 'right' });
            cv.line(48, 112, 1552, 112, 1, C.line);
        }
        function drawHome(cv, contentH) {
            drawHeader(cv, 'GAME HUB', '5 GAMES  /  CONTROLLER READY');
            text(cv, 'PICK A GAME', 54, 150, 16, C.muted, { font: 'bold', spacing: 2 });
            GAMES.forEach((g, i) => {
                const x = 48 + i * 302, y = 174, w = 284, h = 232;
                box(cv, x, y, w, h, i === selected ? C.panel2 : C.panel, 18);
                if (i === selected) cv.strokeRoundRect(x, y, w, h, 18, 2, g.color);
                drawIcon(cv, g.id, x + w / 2, y + 68, g.color);
                text(cv, g.title, x + 18, y + 156, 19, C.text, { font: 'bold', align: 'center' });
                text(cv, g.desc, x + 18, y + 186, 13, C.muted, { font: 'bold', align: 'center', spacing: 1 });
            });
            box(cv, 48, contentH - 66, 1504, 44, C.panel, 14);
            if (!parked()) {
                const gateState = gate ? gate.state() : 'unavailable';
                const message = gateState === 'moving' ? 'GAMES LOCKED  /  VEHICLE MUST BE PARKED' : gateState === 'stale' ? 'GAMES LOCKED  /  SPEED DATA IS STALE' : 'CHECKING VEHICLE SPEED  /  GAMES LOCKED';
                text(cv, message, 800, contentH - 38, 18, C.red, { align: 'center', font: 'bold', spacing: 1 });
            } else {
                text(cv, 'ROTATE / TILT TO BROWSE', 78, contentH - 38, 16, C.muted, { font: 'bold' });
                text(cv, 'PRESS TO START', 800, contentH - 38, 18, C.accent, { align: 'center', font: 'bold', spacing: 1 });
                text(cv, 'LONG PRESS: BACK', 1520, contentH - 38, 15, C.muted, { align: 'right', font: 'bold' });
            }
        }
        function drawIcon(cv, id, x, y, color) {
            if (id === 'race') {
                cv.fillRect(x - 53, y - 29, 106, 58, C.panel);
                cv.line(x, y - 28, x, y + 27, 2, C.line);
                car(cv, x - 27, y + 4, color, 0.58); car(cv, x + 20, y - 18, C.red, 0.58);
            } else if (id === 'target') {
                [30, 19, 8].forEach((r, i) => cv.circle(x, y, r, i === 1 ? color : C.panel));
                cv.circle(x, y, 4, C.text);
            } else if (id === 'tetris') {
                [[-22,-18],[0,-18],[0,4],[22,4]].forEach(([dx,dy]) => box(cv, x+dx, y+dy, 19, 19, color, 3));
            } else if (id === 'breakout') {
                for (let i=0;i<4;i++) cv.fillRect(x-42+i*23,y-25,18,12,i%2?C.blue:color);
                cv.circle(x + 7, y + 5, 7, C.text); cv.roundRect(x-25,y+27,50,7,3,color);
            } else {
                [[-18,0],[0,0],[18,0],[18,-18]].forEach(([dx,dy],i)=>box(cv,x+dx,y+dy,17,17,i?color:C.text,4));
            }
        }
        function car(cv, x, y, color, scale) {
            const w = 48 * scale, h = 68 * scale;
            box(cv, x - w/2, y - h/2, w, h, color, 10*scale);
            box(cv, x - w*.31, y - h*.23, w*.62, h*.27, '#26313a', 6*scale);
            cv.fillRect(x-w*.4,y+h*.28,w*.8,h*.1,'#26313a');
        }
        function drawGame(cv, dt, contentH) {
            const game = GAMES.find((g) => g.id === active);
            drawHeader(cv, game.title, 'LONG PRESS TO RETURN TO HUB');
            box(cv, 48, 130, 1504, contentH - 150, C.panel, 18);
            if (!paused && !state.gameover && parked()) update(dt);
            // Enlarge the game scene into the wide, low ID7 display while keeping its center fixed.
            cv.xf(1.12, -96, -20);
            if (active === 'race') drawRace(cv);
            else if (active === 'target') drawTarget(cv);
            else if (active === 'tetris') drawTetris(cv);
            else if (active === 'breakout') drawBreakout(cv);
            else drawSnake(cv);
            cv.xf(0, 0, 0);
            text(cv, 'SCORE  ' + score, 1498, 165, 17, C.accent, { font: 'bold', align: 'right' });
            if (paused || state.gameover) {
                box(cv, 620, 246, 360, 76, '#20262eee', 16);
                text(cv, state.gameover ? 'GAME OVER  /  PRESS TO RESTART' : 'PAUSED', 800, 293, 23, C.text, { font: 'bold', align: 'center', spacing: 1 });
            }
            if (!parked()) {
                box(cv, 510, 232, 580, 92, '#331f25ee', 18);
                text(cv, 'GAME PAUSED  /  VEHICLE MOVING', 800, 285, 21, C.red, { font: 'bold', align: 'center' });
            }
            box(cv, 48, contentH - 66, 1504, 44, C.panel2, 14);
            const hints = {
                race: 'LEFT / RIGHT CHANGE LANES  ·  UP TURBO  ·  PRESS PAUSE',
                target: 'TURN / TILT TO MOVE  ·  PRESS TO TAG THE TARGET',
                tetris: 'LEFT / RIGHT MOVE  ·  UP ROTATE  ·  DOWN DROP',
                breakout: state.launched ? 'LEFT / RIGHT MOVE THE PADDLE  ·  PRESS PAUSE' : 'LEFT / RIGHT POSITION  ·  PRESS TO LAUNCH',
                snake: 'FOUR DIRECTIONS MOVE  ·  PRESS TO PAUSE',
            };
            text(cv, hints[active], 800, contentH - 38, 16, C.muted, { align: 'center', font: 'bold', spacing: 1 });
        }
        function update(dt) {
            const s = state; s.tick += dt;
            if (active === 'race') {
                const speed = s.boost > 0 ? 0.34 : 0.22;
                s.spawnIn -= dt;
                if (s.spawnIn <= 0) {
                    s.traffic.push({ lane: Math.floor(Math.random()*3), x: 1370, color: ['#ff6572','#71b7ff','#ffb45b'][Math.floor(Math.random()*3)] });
                    s.spawnIn = Math.max(300, 850 - score * 3) + Math.random()*280;
                }
                s.traffic.forEach((car) => { car.x -= dt * speed; });
                if (s.traffic.some((car) => car.lane === s.x && car.x > 740 && car.x < 850)) s.gameover = true;
                const before = s.traffic.length;
                s.traffic = s.traffic.filter((car) => car.x > 180);
                score += Math.max(0, before - s.traffic.length) * 10;
                s.boost = Math.max(0, s.boost - dt * 0.025);
            } else if (active === 'tetris') {
                s.fall = (s.fall || 0) + dt * (s.fast ? 3 : 1);
                if (s.fall > 620) {
                    s.fall = 0;
                    if (canPiece(s.px, s.py + 1, s.piece)) s.py++;
                    else lockPiece();
                }
            } else if (active === 'breakout' && s.launched) {
                s.ballX += s.dx * dt; s.ballY += s.dy * dt;
                if (s.ballX < 0.5 || s.ballX > 13.5) s.dx *= -1;
                if (s.ballY < 0.5) s.dy = Math.abs(s.dy);
                const col = Math.max(0, Math.min(13, Math.floor(s.ballX)));
                const row = Math.floor(s.ballY - 1);
                if (row >= 0 && row < s.bricks.length && s.bricks[row][col]) {
                    s.bricks[row][col] = false; s.dy = Math.abs(s.dy); score += 10;
                    if (s.bricks.every((line) => line.every((brick) => !brick))) s.gameover = true;
                }
                if (s.ballY > 8.7 && s.ballY < 9.2 && Math.abs(s.ballX - (s.paddle || 7)) < 1.5) s.dy = -Math.abs(s.dy);
                if (s.ballY > 10) {
                    s.lives -= 1;
                    if (!s.lives) s.gameover = true;
                    else { s.ballX = s.paddle || 7; s.ballY = 8; s.dy = -Math.abs(s.dy); s.launched = false; }
                }
            } else if (active === 'snake') {
                s.step = (s.step || 0) + dt;
                if (s.step > 400) {
                    s.step = 0;
                    const h = { x: (s.snake[0].x+s.dir.x+16)%16, y:(s.snake[0].y+s.dir.y+10)%10 };
                    if (s.snake.some((p) => p.x === h.x && p.y === h.y)) { s.gameover = true; return; }
                    s.snake.unshift(h);
                    if (h.x === s.food.x && h.y === s.food.y) {
                        score += 10;
                        s.food = { x: Math.floor(Math.random()*16), y: Math.floor(Math.random()*10) };
                    } else s.snake.pop();
                }
            }
        }
        function drawRace(cv) {
            const x0=270, y0=154, roadW=1060, roadH=286, laneH=roadH/3;
            cv.fillRect(95,y0,145,roadH,'#17251d');
            cv.fillRect(x0,y0,roadW,roadH,'#26323b');
            cv.fillRect(x0,y0,5,roadH,'#dce7df'); cv.fillRect(x0+roadW-5,y0,5,roadH,'#dce7df');
            for(let i=1;i<3;i++) {
                const yy=y0+i*laneH;
                for(let x=x0+((state.tick*0.22)%78);x<x0+roadW;x+=78) cv.fillRect(x,yy-2,42,4,'#d5dfdd');
            }
            state.traffic.forEach((other) => sideCar(cv, other.x, y0+laneH*(other.lane+.5), other.color));
            sideCar(cv,800,y0+laneH*(state.x+.5),C.accent);
        }
        function sideCar(cv,x,y,color) {
            cv.roundRect(x-38,y-26,76,52,15,'#090d10');
            cv.roundRect(x-34,y-22,68,44,13,color);
            cv.roundRect(x-7,y-17,25,34,8,'#26313a');
            cv.roundRect(x-27,y-18,13,36,5,'#dce6e8');
            cv.fillRect(x+24,y-15,8,9,'#fff4bd'); cv.fillRect(x+24,y+6,8,9,'#fff4bd');
            cv.circle(x-20,y-25,5,'#101216'); cv.circle(x+20,y-25,5,'#101216');
            cv.circle(x-20,y+25,5,'#101216'); cv.circle(x+20,y+25,5,'#101216');
        }
        function drawTarget(cv) {
            const x0=270,y0=185,cell=68;
            for(let y=0;y<9;y++) for(let x=0;x<15;x++) {
                const px=x0+x*cell, py=y0+y*30;
                if(x===state.targetX&&y===state.targetY) cv.circle(px+25,py,9,C.red);
                if(x===state.x&&y===state.y) cv.strokeRoundRect(px+14,py-11,23,23,8,2,C.accent);
            }
        }
        function drawTetris(cv) {
            const x0=650,y0=158,cell=30;
            for(let y=0;y<10;y++) for(let x=0;x<10;x++) {
                cv.strokeRoundRect(x0+x*cell,y0+y*cell,cell-2,cell-2,3,'#343d47',1);
                if(state.board[y][x]) box(cv,x0+x*cell+2,y0+y*cell+2,cell-6,cell-6,C.accent,4);
            }
            (state.piece||[]).forEach(([x,y])=>box(cv,x0+(state.px+x)*cell,y0+(state.py+y)*cell,cell-3,cell-3,C.blue,4));
        }
        function drawBreakout(cv) {
            for(let y=0;y<3;y++) for(let x=0;x<14;x++) if(state.bricks[y][x]) box(cv,430+x*51,168+y*26,45,17,y===0?C.blue:y===1?'#d48cff':'#ffb45b',5);
            cv.circle(430+state.ballX*51,142+state.ballY*28,8,C.text);
            cv.roundRect(430+(state.paddle||7)*51-42,412,84,10,5,C.accent);
            text(cv,'LIVES  '+state.lives,1170,240,18,C.text,{font:'bold'});
        }
        function drawSnake(cv) {
            const x0=580,y0=160,cell=28;
            for(let y=0;y<10;y++) for(let x=0;x<16;x++) cv.strokeRoundRect(x0+x*cell,y0+y*cell,cell-2,cell-2,3,'#303842',1);
            state.snake.forEach((p,i)=>box(cv,x0+p.x*cell,y0+p.y*cell,cell-3,cell-3,i? '#54d6bd':C.text,5));
            cv.circle(x0+state.food.x*cell+13,y0+state.food.y*cell+13,7,C.red);
        }
        async function render() {
            const now = Date.now(), dt = Math.min(80, now - last); last = now;
            const cv = ctx.canvas(W,H).clear(C.bg);
            const placement = ctx.display && ctx.display.place;
            const extension = placement && placement.full ? (placement.extra || 0) : (cv.extra || 0);
            const contentH = H + extension;
            cv.fillRect(0, 0, W, contentH, C.bg);
            if (!active) drawHome(cv, contentH); else drawGame(cv,dt,contentH);
            await ui.image('MAIN_GFX',cv);
        }
        function sync() {
            if (active && !parked()) paused = true;
            const visible = ui.isVisible('MAIN') && (!ui.hasFocus || ui.hasFocus('MAIN'));
            // Once a game has started while parked, keep the controller routed here even if fresh
            // speed data briefly goes stale. The game pauses on a stale/moving car; it must not
            // hand the knob back to the HMI in the middle of that game.
            const shouldGrab = visible && (parked() || !!active);
            if (shouldGrab !== grabbed) {
                grabbed = shouldGrab;
                if (ctx.controller) ctx.controller.grab(grabbed);
                log.info('controller ' + (grabbed ? 'grabbed by ROI Game Hub' : 'released to HMI'));
            }
        }
        setInterval(sync, 100);
        if (ui.onFocus) ui.onFocus(sync);
        if (ui.onVisible) ui.onVisible(sync);
        process.on('exit', () => { if (ctx.controller) ctx.controller.grab(false); });
        ctx.loop('MAIN', 8, render);
        render().catch((error) => log.warn('first render: ' + error));
    },
});
