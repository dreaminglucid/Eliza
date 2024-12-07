// polyfills/path.js
export const join = (...paths) => paths.join('/').replace(/\/+/g, '/');
export const resolve = (...paths) => join(...paths);
export const dirname = (path) => {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
};
export const basename = (path) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
};
export default { join, resolve, dirname, basename };

// polyfills/tokenizers.js
export class Tokenizer {
    constructor() {
        console.warn('Tokenizer stub implementation');
    }
    encode() { return { ids: [] }; }
    decode() { return ''; }
}
export default { Tokenizer };

// polyfills/onnxruntime.js
export const InferenceSession = class {
    constructor() {
        console.warn('ONNX Runtime stub implementation');
    }
    async run() {
        return {};
    }
};
export default { InferenceSession };

// polyfills/empty.js
export default {};