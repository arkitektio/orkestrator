import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(resolve(__dirname, "package.json"), "utf8")) as { version: string };


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
        // webbluetooth (BLE for device provisioning) is a napi-rs addon with
        // one optional package per platform; same rule.
        external: ["sherpa-onnx-node", /^sherpa-onnx-/, /^webbluetooth(\/|$)/, /^@webbluetooth\//],
      },
    },
  },
  preload: {},
  renderer: {
    // The app's own version, for the manifest it registers with (core/constants).
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
