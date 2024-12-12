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

// Mock mappings for handling native modules and shims
const MOCK_MAPPINGS = {
    'default': `
        export class FastEmbedClient {
            constructor() {
                console.warn('Using default FastEmbedClient shim');
            }
            async embed(texts) { return []; }
            async close() {}
        }
        export class EmbeddingModel {}
        export class ExecutionProvider {}
        export class FlagEmbedding {}
        export default { FastEmbedClient, EmbeddingModel, ExecutionProvider, FlagEmbedding };
    `
};

// Function to find all instances of a module within node_modules
function findAllModulePaths(moduleName, startPath) {
    const results = [];
    function search(dir) {
        const moduleDir = path.join(dir, 'node_modules', moduleName);
        if (fs.existsSync(moduleDir)) {
            results.push(moduleDir);
        }
        const subdirs = fs.readdirSync(dir).filter(sub => sub === 'node_modules');
        subdirs.forEach(subdir => {
            search(path.join(dir, subdir));
        });
    }
    search(startPath);
    return results;
}

// Function to patch a single module
function patchModule(moduleInfo, modulePath) {
    const { name, paths } = moduleInfo;

    if (!fs.existsSync(modulePath)) {
        console.log(`Module "${name}" not found at "${modulePath}" - skipping.`);
        return;
    }

    Object.entries(paths).forEach(([filePath, content]) => {
        const fullPath = path.join(modulePath, filePath);
        const dirName = path.dirname(fullPath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
            console.log(`Created directory: ${dirName}`);
        }
        fs.writeFileSync(fullPath, content);
        console.log(`Patched "${name}" at "${filePath}" in "${modulePath}".`);
    });

    // Handle any .node files by removing or replacing them
    removeNodeFiles(modulePath);
}

// Function to remove .node files within a directory
function removeNodeFiles(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            removeNodeFiles(fullPath);
        } else if (file.endsWith('.node')) {
            fs.writeFileSync(fullPath, '// IC-compatible empty module');
            console.log(`Removed or replaced .node file: ${fullPath}`);
        }
    });
}

// Function to update package.json to mark certain modules as browser-compatible
function updatePackageJson(name, modulePath) {
    const pkgPath = path.join(modulePath, 'package.json');
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
        console.log(`Updated package.json for "${name}" at "${modulePath}" to mark modules as browser-compatible.`);
    }
}

// Apply patches to all specified modules, including nested instances
function applyPatches() {
    console.log('Starting module patching...');

    const startPath = process.cwd();
    MODULES_TO_PATCH.forEach(module => {
        const modulePaths = findAllModulePaths(module.name, startPath);
        if (modulePaths.length === 0) {
            console.log(`Module "${module.name}" not found in any node_modules - skipping.`);
            return;
        }
        modulePaths.forEach(modulePath => {
            patchModule(module, modulePath);
            updatePackageJson(module.name, modulePath);
        });
    });

    console.log('Module patching complete.');
}

// Execute the patching process
applyPatches();
