
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
