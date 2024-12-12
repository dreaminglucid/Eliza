// scripts/preinstall.js
const fs = require('fs');
const path = require('path');

const MODULES_TO_PATCH = [
  '@anush008/tokenizers',
  'onnxruntime-node',
  'fastembed'
];

const createShim = (moduleName) => `
module.exports = new Proxy({}, {
  get: () => () => {
    console.warn('IC Shim: ${moduleName} operation requested');
    return {};
  }
});
`;

function patchModule(moduleName) {
  const modulePath = path.join(process.cwd(), 'node_modules', moduleName);
  if (fs.existsSync(modulePath)) {
    const mainFile = path.join(modulePath, 'index.js');
    fs.writeFileSync(mainFile, createShim(moduleName));
    console.log(`Patched ${moduleName}`);
  }
}

MODULES_TO_PATCH.forEach(patchModule);