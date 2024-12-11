// ic/eliza_canister/azle.config.js

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const { MOCK_MAPPINGS, createModuleShim } = require('./build/handlers');

const nodeBinaryPlugin = {
  name: 'node-binary-resolver',
  setup(build) {
    // Intercept all .node file requests
    build.onResolve({ filter: /\.node$/ }, args => {
      return {
        path: args.path,
        namespace: 'node-binary'
      };
    });

    // Handle binary files by returning shims
    build.onLoad({ filter: /.*/, namespace: 'node-binary' }, args => {
      const mockContent = MOCK_MAPPINGS[path.basename(args.path)] || MOCK_MAPPINGS['default'];
      return {
        contents: mockContent,
        loader: 'js'
      };
    });

    // Handle native module imports
    build.onResolve({ filter: /^@anush008\/tokenizers$|^onnxruntime-node$/ }, args => ({
      path: args.path,
      namespace: 'native-modules'
    }));

    build.onLoad({ filter: /.*/, namespace: 'native-modules' }, args => ({
      contents: MOCK_MAPPINGS[args.path] || createModuleShim('default'),
      loader: 'js'
    }));

    // Handle dynamic imports for fastembed
    build.onResolve({ filter: /^fastembed$/ }, () => ({
      path: 'fastembed-shim',
      namespace: 'shims'
    }));

    build.onLoad({ filter: /.*/, namespace: 'shims' }, () => ({
      contents: `
        export class FastEmbedClient {
          constructor() { console.warn('Using shimmed FastEmbed'); }
          async embed(texts) {
            return new Array(texts.length).fill(new Float32Array(384));
          }
          async close() {}
        }

        export class EmbeddingModel {}
        export class ExecutionProvider {}
        export class FlagEmbedding {}

        export default { FastEmbedClient, EmbeddingModel, ExecutionProvider, FlagEmbedding };
      `,
      loader: 'js'
    }));
  }
};

const externalsPlugin = {
  name: 'externals',
  setup(build) {
    const externals = [
      'azle',
      'azle/experimental',
      'express',
      'node:http',
      'node:https',
      'node:fs',
      'node:path',
      'node:crypto',
      'node:buffer',
      'node:stream',
      'node:util',
      'node:events'
    ];

    build.onResolve({ filter: new RegExp(`^(${externals.join('|')})`) }, args => ({
      path: args.path,
      external: true
    }));
  }
};

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['ic/eliza_canister/src/index.ts'],
      outfile: 'ic/eliza_canister/output/index.js',
      bundle: true,
      format: 'esm',
      platform: 'node',
      target: 'node16',
      sourcemap: true,
      plugins: [nodeBinaryPlugin, externalsPlugin],
      define: {
        'process.env.NODE_ENV': '"production"',
        'global': 'globalThis',
      },
      minify: false,
      metafile: true,
      logLevel: 'info',
      resolveExtensions: ['.ts', '.js', '.json', '.node'],
      mainFields: ['module', 'main'],
      conditions: ['import', 'node'],
      treeShaking: true
    });

    console.log('Build completed successfully');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
