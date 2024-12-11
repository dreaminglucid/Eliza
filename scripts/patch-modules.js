// scripts/patch-modules.js

const fs = require('fs');
const path = require('path');

// Define separate shims for ESM and CJS for fastembed
const FASTEMBED_ESM_SHIM = `
export class FastEmbedClient {
    constructor(options = {}) {
        console.warn('Using IC-compatible FastEmbed ESM shim');
        this.options = options;
    }

    async embed(texts) {
        if (!Array.isArray(texts)) {
            texts = [texts];
        }
        return texts.map(() => new Float32Array(384).fill(0));
    }

    async close() {
        return Promise.resolve();
    }
}

export class EmbeddingModel {
    constructor() {
        console.warn('Using IC-compatible EmbeddingModel ESM shim');
    }
}

export class ExecutionProvider {
    constructor() {
        console.warn('Using IC-compatible ExecutionProvider ESM shim');
    }
}

export class FlagEmbedding {
    constructor() {
        console.warn('Using IC-compatible FlagEmbedding ESM shim');
    }
}

export default { FastEmbedClient, EmbeddingModel, ExecutionProvider, FlagEmbedding };
`;

const FASTEMBED_CJS_SHIM = `
"use strict";
class FastEmbedClient {
    constructor(options = {}) {
        console.warn('Using IC-compatible FastEmbed CJS shim');
        this.options = options;
    }

    async embed(texts) {
        if (!Array.isArray(texts)) {
            texts = [texts];
        }
        return texts.map(() => new Float32Array(384).fill(0));
    }

    async close() {
        return Promise.resolve();
    }
}

class EmbeddingModel {
    constructor() {
        console.warn('Using IC-compatible EmbeddingModel CJS shim');
    }
}

class ExecutionProvider {
    constructor() {
        console.warn('Using IC-compatible ExecutionProvider CJS shim');
    }
}

class FlagEmbedding {
    constructor() {
        console.warn('Using IC-compatible FlagEmbedding CJS shim');
    }
}

module.exports = { FastEmbedClient, EmbeddingModel, ExecutionProvider, FlagEmbedding };
module.exports.default = { FastEmbedClient, EmbeddingModel, ExecutionProvider, FlagEmbedding };
`;

// Shims for other modules
const TOKENIZERS_SHIM = `
class Tokenizer {
    constructor() {
        console.warn('Using IC-compatible tokenizer shim');
    }
    encode(text) {
        return {
            ids: Array(text.length).fill(0),
            tokens: text.split(' '),
            attentionMask: Array(text.length).fill(1)
        };
    }
    decode() { return ''; }
}
module.exports = { Tokenizer };
`;

const ONNX_SHIM = `
class InferenceSession {
    constructor() {
        console.warn('Using IC-compatible ONNX runtime shim');
    }
    async run() {
        return { output: new Float32Array(0) };
    }
}
module.exports = { InferenceSession };
`;

// Modules to patch with their respective paths and content
const MODULES_TO_PATCH = [
    {
        name: 'fastembed',
        paths: {
            'lib/esm/fastembed.js': FASTEMBED_ESM_SHIM,
            'lib/cjs/fastembed.js': FASTEMBED_CJS_SHIM,
            'lib/esm/index.js': `
                export * from './fastembed.js';
            `,
            'lib/cjs/index.js': `
                module.exports = require('./fastembed.js');
            `
        }
    },
    {
        name: '@anush008/tokenizers',
        paths: {
            'index.js': TOKENIZERS_SHIM,
        }
    },
    {
        name: 'onnxruntime-node',
        paths: {
            'dist/binding.js': ONNX_SHIM,
        }
    }
];

// Define the shims directory inside ic/eliza_canister/build/shims
const SHIMS_DIR = path.join(process.cwd(), 'ic', 'eliza_canister', 'build', 'shims');

if (!fs.existsSync(SHIMS_DIR)) {
    fs.mkdirSync(SHIMS_DIR, { recursive: true });
    console.log(`Created shims directory at "${SHIMS_DIR}".`);
}

// Function to patch a single module by writing shims into SHIMS_DIR
function patchModule(moduleInfo) {
    const { name, paths } = moduleInfo;
    const shimsModuleDir = path.join(SHIMS_DIR, name);
    
    Object.entries(paths).forEach(([filePath, content]) => {
        const fullPath = path.join(shimsModuleDir, filePath);
        const dirName = path.dirname(fullPath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
            console.log(`Created directory: ${dirName}`);
        }
        fs.writeFileSync(fullPath, content);
        console.log(`Created shim for "${name}" at "${fullPath}".`);
    });
}

// Function to remove .node files within node_modules is no longer needed
// So, remove the call to removeNodeFiles
// Function to update package.json is likely not needed anymore, but kept if necessary

// Alternatively, may need to adjust `azle.config.js` to use shims from SHIMS_DIR

// Function to update package.json to mark certain modules as browser-compatible if needed
function updatePackageJson(name) {
    // Potentially no longer needed, as shims are not in node_modules
    // So, may skip or keep for other modules
    const pkgPath = path.join(process.cwd(), 'node_modules', name, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.browser = {
            'https': false,
            'http': false,
            'crypto': false,
            'fs': false,
            'path': false,
            'url': false
        };
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        console.log(`Updated package.json for "${name}" to mark modules as browser-compatible.`);
    }
}

// Apply patches to all specified modules
function applyPatches() {
    console.log('Starting module patching...');
    MODULES_TO_PATCH.forEach(module => {
        patchModule(module);
        // updatePackageJson(module.name); // Possibly skip, as shims are now in shims directory
    });
    console.log('Module patching complete.');
}

// Execute the patching process
applyPatches();
