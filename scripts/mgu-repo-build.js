'use strict';

// MGU Store runs this on the head unit after fetching the selected GitHub
// branch. The OAP archive is built by the release pipeline and committed
// without BMW's SDK; the Store links the SDK from the vehicle's donor app.
var fs = require('fs');
var path = require('path');

var id = process.argv[2];
var version = process.argv[3];
var outputDir = process.env.MGU_OUT;

if (id !== 'roi_game_hub' || version !== '0.1.0') {
    throw new Error('Unsupported ROI Game Hub build: ' + id + '@' + version);
}
if (!outputDir) {
    throw new Error('MGU_OUT is not set by MGU Store');
}

var root = process.cwd();
var input = path.join(root, 'publish', 'mgu-repo', 'roi-game-hub', id + '@' + version + '.tgz');
var output = path.join(outputDir, id + '@' + version + '.tgz');

if (!fs.existsSync(input)) {
    throw new Error('Published OAP package is missing: ' + input);
}
fs.copyFileSync(input, output);
