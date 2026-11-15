'use strict';

// Use raw SOME/IP readings, never the kit's demo data or its cached parked state.
// The getter is polled because a stationary car need not notify an unchanged speed.
const MAX_KMH = 0.5;
const STALE_MS = 5000;
const POLL_MS = 2000;
const INTERFACE = 'de.bmw.infotainment.vehicle.Vehicle2';

function watch(ctx, onChange) {
    const now = () => process.uptime() * 1000; // monotonic, unaffected by clock corrections
    let speed = null;
    let receivedAt = null;
    let subscription = null;
    let failed = false;
    const changed = () => { if (onChange) onChange(); };

    function state() {
        if (failed || !subscription || subscription.error || subscription.available !== true) return 'unavailable';
        if (speed === null || receivedAt === null) return 'unavailable';
        if (now() - receivedAt >= STALE_MS) return 'stale';
        return speed <= MAX_KMH ? 'parked' : 'moving';
    }

    const ready = Promise.resolve().then(() => ctx.signals.watch(INTERFACE, '1', {
        statusCarSpeed2(value) {
            const raw = value && value.speedVehicleCentreOfGravity;
            // 0xffff is invalid; reject malformed, negative and out-of-range readings too.
            const valid = Number.isInteger(raw) && raw >= 0 && raw < 65535;
            speed = valid ? raw / 64 : null;
            receivedAt = valid ? now() : null;
            changed();
        },
    }, ctx.log, { pollMs: POLL_MS })).then((result) => {
        subscription = result;
        if (!result || result.error) ctx.log.warn('speed gate: ' + (result && result.error || 'subscription unavailable'));
        changed();
    }).catch((error) => {
        failed = true;
        ctx.log.warn('speed gate: ' + (error.message || error));
        changed();
    });

    return { ready, state, allowed: () => state() === 'parked' };
}

module.exports = { watch, MAX_KMH, STALE_MS, POLL_MS };
