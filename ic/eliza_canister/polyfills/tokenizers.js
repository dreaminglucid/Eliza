// ic/eliza_canister/polyfills/tokenizers.js

class Tokenizer {
    constructor() {
      console.warn('Using tokenizers polyfill');
    }
  
    encode(text) {
      return {
        ids: [],
        tokens: text.split(' '),
        attentionMask: []
      };
    }
  
    decode() {
      return '';
    }
  }
  
  module.exports = { Tokenizer };