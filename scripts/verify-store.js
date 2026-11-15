'use strict';
// Exercise the real Store parser/linker. Synthetic SDK data exists only in a
// temporary test copy; it is never written into the shipped package or build kit.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const Module = require('node:module');
const [storeArg, artifactArg, reportArg, repoArg] = process.argv.slice(2);
const store = path.resolve(storeArg), artifact = path.resolve(artifactArg), reportFile = path.resolve(reportArg);
const link = require(path.join(store, 'tools/oap_link'));
const sources = require(path.join(store, 'native/mgu-updater/js/sources'));
const catalogLib = require(path.join(store, 'native/mgu-updater/js/catalog'));
const donor = require(path.join(store, 'tools/test/synthetic_donor'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const checks = [];
const ok = name => { checks.push(name); console.log('OK ' + name); };
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'roigamehub-store-verify-'));

async function main() {
    const bytes = fs.readFileSync(artifact);
    const members = link.untar(bytes);
    const entry = sources.packageEntry(members, bytes, {}, 'tgz');
    const appId = path.basename(artifact).split('@')[0];
    assert.equal(entry.id, appId);
    assert.equal(entry.title, 'ROI Game Hub');
    assert(entry.mguHmi.includes('ID7') && entry.mguHmi.includes('ID8'));
    ok('Store recognizes the OAP archive, title, version and ID7/ID8 targets');
    assert(!members.some(m => /(^|\/)(oap-sdk|synthetic_donor|best\.json|settings\.json|\.git|\.local)(\/|$)/.test(m.name)));
    const pkgDir = path.join(temporary, 'package');
    for (const member of members) {
        assert(member.name.startsWith('package/') && !member.name.split('/').includes('..'));
        const target = path.join(temporary, member.name);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, member.data);
        if (member.name.endsWith('.js')) new vm.Script(Module.wrap(member.data.toString()), { filename: member.name });
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json')));
    assert(fs.existsSync(path.join(pkgDir, pkg.main)));
    for (const name of ['manifest.json', 'permissions.json', 'npm-shrinkwrap.json', 'config/base.json',
        'rhmiData/application.json', 'rhmiData/uiDescriptions/ID7/application.xml',
        'rhmiData/uiDescriptions/ID7/uiDescription.json', 'rhmiData/variantGroups/Common/texts/tr_TR.json',
        'javascript/parked-gate.js', 'licenses/idrive7-apps-MIT.txt']) assert(fs.existsSync(path.join(pkgDir, name)), name);
    assert.equal(link.needsSdk(pkgDir), true);
    ok('Complete runtime, RHMI, Turkish resources and licenses; no SDK or user data shipped');
    const output = path.join(temporary, 'linked-test-only.tgz');
    assert.throws(() => link.preparePackage(pkgDir, output, { donors: [] }), error => error.noDonor === true);
    assert(!fs.existsSync(output));
    assert.equal(link.needsSdk(pkgDir), true);
    ok('Actual Store linker refuses installation preparation when no donor exists');
    const fakeDonor = donor.tgz(path.join(temporary, 'synthetic-test-only.tgz'));
    const result = link.preparePackage(pkgDir, output, { donors: [fakeDonor] });
    assert(result.sdk && result.sdk.api.includes('OnlineApp') && result.sdk.api.includes('someipBuilders'));
    assert.equal(link.needsSdk(pkgDir), false);
    const linked = link.untar(fs.readFileSync(output));
    assert(linked.some(m => m.name === 'node_modules/oap-sdk/index.js'));
    assert.equal(hash(fs.readFileSync(artifact)), hash(bytes));
    ok('Actual Store linker completes SDK from a synthetic donor in a disposable copy');

    if (repoArg) {
        const repo = path.resolve(repoArg);
        const reader = sources.reader({ type: 'usb', root: repo }, {});
        assert.equal(reader.network, false);
        const catalog = await reader.catalog();
        const byId = new Map(catalog.components.map(c => [c.id, c]));
        assert(byId.has(appId));
        for (const component of catalog.components) {
            const data = await reader.artifact(component);
            assert.equal(data.length, component.artifact.size);
            assert.equal(hash(data), component.artifact.sha256);
            for (const [id, version] of Object.entries(component.requires || {})) {
                assert(byId.has(id), 'Missing offline dependency: ' + id);
                assert(catalogLib.compareVersions(byId.get(id).version, version) >= 0);
            }
            if (component.kind === 'tool') {
                const content = new Map(link.untar(data).map(m => [m.name, m.data]));
                const meta = JSON.parse(content.get('component.json'));
                assert.equal(meta.id, component.id);
                assert.equal(meta.version, component.version);
                for (const file of meta.files) assert.equal(hash(content.get('files/' + file.path)), file.sha256);
                for (const unit of meta.units) assert(content.has('units/' + unit.name));
                for (const drop of meta.dropins || []) assert(content.has('dropins/' + drop.unit + '.d/' + drop.name));
            }
        }
        const icon = await reader.icon(byId.get(appId));
        assert(icon && icon.length > 0);
        ok('Actual USB catalog reader loads all four packages and verifies every archive hash');
        ok('Deploy tool, renderer and controller gate dependencies are complete on USB');
        ok('Native tool files, service units, drop-ins and per-file hashes are complete');
    }
    fs.writeFileSync(reportFile, JSON.stringify({
        app: entry.id, version: entry.version, artifact: path.basename(artifact), sha256: hash(bytes),
        format: 'complete OAP package; SDK supplied by MGU Store on the head unit',
        carTested: false, realSdkTested: false, syntheticSdkTestOnly: true,
        checks,
    }, null, 2) + '\n');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    fs.rmSync(temporary, { recursive: true, force: true });
});
