
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
