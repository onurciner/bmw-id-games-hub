'use strict';
// Desktop-only smoke test using the upstream head-unit stub and real PNG renderer.
// This file is never copied into the car app. No bypass is added to the speed gate.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const kit = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3]);
const { headUnit } = require(path.join(kit, 'kit/tools/hu-stub'));
const speedInterface = 'de.bmw.infotainment.vehicle.Vehicle2';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const labels = {}, logs = [], captures = [];
let capture = null;
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
const hu = headUnit(path.join(kit, 'dist/roi_game_hub'), {
    live: true, fresh: true, dataDir: path.join(out, 'data'), sets: { demo: 'off' },
    log: {
        info: text => logs.push(String(text)), warn: text => logs.push('WARN ' + text),
        error: (...args) => { throw new Error(args.join(' ')); }, debug() {},
    },
    image: (name, cv) => {
        if (!capture) return;
        const file = path.join(out, capture + '.png');
        fs.writeFileSync(file, Buffer.isBuffer(cv) ? cv : cv.png());
        captures.push(file);
        capture = null;
    },
});
const text = hu.ui.text;
hu.ui.text = (name, value) => { labels[name] = value; return text(name, value); };
const click = async name => { hu.ui.comp(name).emit('action', {}); await wait(150); };
const speed = raw => hu.feed(speedInterface, 'statusCarSpeed2', { speedVehicleCentreOfGravity: raw });
async function shot(name) {
    capture = name;
    const deadline = Date.now() + 3000;
    while (capture && Date.now() < deadline) await wait(40);
    assert.equal(capture, null, 'No frame captured: ' + name);
}

(async () => {
    hu.start(); await wait(150);
    await click('BTN_PLAY');
    assert(hu.ui.isVisible('MAIN'), 'Missing speed must stay locked');
    speed(0); await click('BTN_PLAY');
    assert(hu.ui.isVisible('GAME'), 'Stationary speed should allow GAME');
    await wait(650); await shot('01-running');
    await click('BTN_LEFT'); await shot('02-left-lane');
    await click('BTN_PAUSE');
    assert(hu.ui.isVisible('MAIN'), 'Pause returns to menu');
    assert.equal(labels.BTN_PLAY, 'Devam et');
    speed(0); await click('BTN_PLAY'); await shot('03-resumed');
    speed(64);
    assert(hu.ui.isVisible('MAIN'), 'Moving speed must close GAME immediately');
    assert.match(labels.MENU_INFO, /park et/);
    speed(0); await click('BTN_PLAY');
    await hu.ui.close('GAME');
    assert.equal(labels.BTN_PLAY, 'Devam et');
    // Reopen without clicking Continue: the paused overlay must be drawn, not resumed.
    await hu.ui.open('GAME'); await shot('04-paused');
    await hu.ui.close('GAME');
    const report = {
        app: 'roi_game_hub', runtime: 'upstream head-unit stub + software PNG renderer',
        sdk: false, carTested: false,
        checks: ['missing speed lock', 'stationary start', 'lane input', 'pause and resume', 'moving speed lock', 'BACK pause'],
        captures: captures.map(f => path.basename(f)), logs,
    };
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log('Önizleme başarılı: ' + out + '\n6 runtime kontrolü, 4 PNG. Gerçek MGU/SDK testi değildir.');
    process.exit(0);
})().catch(error => { console.error(error); process.exit(1); });
