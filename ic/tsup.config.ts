import { defineConfig } from "tsup";
import esbuildPluginAliasPath from 'esbuild-plugin-alias-path';
import * as path from 'path';

export default defineConfig({
    entry: ["index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    external: [
        "dotenv",
        "fs",
        "path",
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "safe-buffer",
        "@ai16z/eliza",
        "child_process",
        "stream",
        "module",
        "wasmedge_quickjs",
        "@anush008/tokenizers",
        "onnxruntime-node",
        "fastembed"
    ],
    esbuildPlugins: [
        esbuildPluginAliasPath({
            alias: {
                "@ai16z/eliza": "../core",
                "node:path": path.resolve(__dirname, './polyfills/path.js'),
                "@anush008/tokenizers": path.resolve(__dirname, './polyfills/tokenizers.js'),
                "onnxruntime-node": path.resolve(__dirname, './polyfills/onnxruntime.js'),
            }
        }),
        {
            name: 'ignore-node-files',
            setup(build) {
                build.onResolve({ filter: /\.node$/ }, () => ({
                    path: path.resolve(__dirname, './polyfills/empty.js'),
                    external: false,
                }));
            }
        }
    ],
    esbuildOptions: (options) => {
        options.conditions = ['import', 'node'];
        options.platform = 'node';
        options.mainFields = ['module', 'main'];
        options.define = {
            'process.env.NODE_ENV': '"production"',
            'global': 'globalThis'
        };
    }
});