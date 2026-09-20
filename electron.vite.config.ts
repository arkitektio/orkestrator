import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/main/index.ts"),
          // The voice engine runs in its own utilityProcess; this is its entry.
          "voice-worker": resolve(__dirname, "src/main/voice/worker.ts"),
        },
        // sherpa-onnx's native addon is loaded only by the voice worker and
        // must stay a runtime `require`: a .node file cannot be bundled, and
        // `asarUnpack` in electron-builder.yml keeps it on disk.
        external: ["sherpa-onnx-node", /^sherpa-onnx-/],
      },
    },
  },
  preload: {},
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": resolve(__dirname, 'src/renderer/src')
      },
    },
    assetsInclude: ['**/*.js?worker_file*'],
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      }
    },
    worker: {
      // Required for many modern codec workers to function in an Electron/Vite env
      format: 'es',
    }

  },
});
