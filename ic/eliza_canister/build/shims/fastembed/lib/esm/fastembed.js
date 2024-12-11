
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
