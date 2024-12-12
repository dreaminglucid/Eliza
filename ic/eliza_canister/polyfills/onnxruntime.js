// ic/eliza_canister/polyfills/onnxruntime.js

class InferenceSession {
    constructor() {
      console.warn('Using onnx polyfill');
    }
  
    async run() {
      return {
        output: new Float32Array(0)
      };
    }
  }
  
  module.exports = { InferenceSession };