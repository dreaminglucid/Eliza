import { defineConfig } from "tsup";
import esbuildPluginAliasPath from 'esbuild-plugin-alias-path';

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
        // Node.js built-ins that might cause issues
        "node:path",
        "node:stream",
        "node:process",
        "wasmedge_quickjs",
        "onnxruntime-node",
    ],
    esbuildPlugins: [
        esbuildPluginAliasPath({
            alias: {
                "@ai16z/eliza": "../core",
                // Add any other aliases you need here
            }
        })
    ],
    esbuildOptions: (options) => {
        options.conditions = ['import', 'node'];
        options.platform = 'node';
        // Handle native addons and problematic imports
        options.mainFields = ['module', 'main'];
        options.banner = {
            js: `
                import { createRequire } from 'module';
                const require = createRequire(import.meta.url);
            `.trim()
        };
    }
});