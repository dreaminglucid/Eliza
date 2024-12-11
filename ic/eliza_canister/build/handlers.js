// ic/eliza_canister/build/handlers.js 

const path = require('path');

const createModuleShim = (exportName) => `
module.exports = new Proxy({}, {
  get: (target, prop) => {
    if (prop === '${exportName}') {
      return function(...args) {
        console.warn('Using shimmed ${exportName}');
        return {};
      };
    }
    return {};
  }
});`;

// Shims for tokenizers and onnxruntime-node
const TOKENIZERS_SHIM = `
class Tokenizer {
  constructor() {
    console.warn('Using shimmed tokenizer');
  }
  
  encode(text) {
    return {
      ids: new Array(text.length).fill(0),
      tokens: text.split(' '),
      attentionMask: new Array(text.length).fill(1)
    };
  }
  
  decode() {
    return '';
  }
}

module.exports = { Tokenizer };`;


const ONNX_SHIM = `
class InferenceSession {
  constructor() {
    console.warn('Using shimmed ONNX runtime');
  }
  
  async run() {
    return { output: new Float32Array(0) };
  }
}

module.exports = { InferenceSession };`;

// Mock mappings pointing to the shims directory
const SHIMS_DIR = path.join(__dirname, 'shims');

const MOCK_MAPPINGS = {
  'fastembed': path.join(SHIMS_DIR, 'fastembed', 'lib', 'esm', 'fastembed.js'),
  '@anush008/tokenizers': path.join(SHIMS_DIR, '@anush008', 'tokenizers', 'index.js'),
  'onnxruntime-node': path.join(SHIMS_DIR, 'onnxruntime-node', 'dist', 'binding.js')
};

module.exports = { MOCK_MAPPINGS, createModuleShim };
