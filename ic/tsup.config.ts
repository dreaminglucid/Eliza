import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    noExternal: [/@ai16z\/eliza/],
    external: [
        // Externalize everything that's not compatible with IC
        "dotenv",
        "fs",
        "path",
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "safe-buffer",
        "child_process",
        "stream",
        "module",
        "wasmedge_quickjs",
        "onnxruntime-node",
        "@anush008/tokenizers",
        // Explicitly exclude all node: prefixed imports
        /^node:/
    ],
    esbuildOptions: (options) => {
        options.platform = 'neutral'; // Don't assume any platform
        options.conditions = ['import'];
        options.mainFields = ['module', 'main'];
        options.supported = {
            'dynamic-import': false,
            'import-meta': false,
        };
        // Replace node: imports with empty objects
        options.define = {
            'process.env.NODE_ENV': '"production"',
            'global': 'globalThis'
        };
    },
    // Handle platform-specific modules
    esbuildPlugins: [{
        name: 'ic-compatibility',
        setup(build) {
            // Replace node:path imports with empty implementations
            build.onResolve({ filter: /^node:/ }, () => ({
                path: 'empty-module',
                namespace: 'empty-ns'
            }));

            build.onLoad({ filter: /.*/, namespace: 'empty-ns' }, () => ({
                contents: 'export default {};',
                loader: 'js'
            }));

            // Handle .node files
            build.onResolve({ filter: /\.node$/ }, () => ({
                path: 'empty-module',
                namespace: 'empty-ns'
            }));

            // Rewrite @ai16z/eliza imports
            build.onResolve({ filter: /@ai16z\/eliza/ }, () => ({
                path: '../core',
                external: false
            }));
        }
    }]
});