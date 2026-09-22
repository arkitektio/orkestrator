/**
 * Emits the blok catalog as JSON into `dist/catalog/`, for the release job to
 * attach to the GitHub release (see `.releaserc.json`).
 *
 * `catalog.tsx` reaches into `.tsx` component modules and through them into
 * CommonJS packages (Apollo, react, react-lazy-load-image-component), so plain
 * node cannot import it and Vite's dev SSR loader trips over the CJS named
 * exports. We therefore bundle the export module for node first — rollup
 * handles the interop — and then import the bundle. The alias and react plugin
 * mirror `vitest.config.ts`, which is the proven config for this graph.
 */
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import react from '@vitejs/plugin-react';
import {JSDOM} from 'jsdom';
import {build} from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'dist/catalog');
const bundleDir = resolve(root, 'dist/catalog-bundle');

/**
 * Component modules touch `window` at import time (`constants.tsx` reads
 * `window.electron`), which is why `bloks/catalog.test.ts` opts into jsdom.
 * Give this script the same footing before the catalog graph is loaded.
 */
const installDom = () => {
  const {window} = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
  });
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis) continue;
    try {
      globalThis[key] = window[key];
    } catch {
      // A few window properties refuse to be copied; none of them matter here.
    }
  }
  globalThis.window = window;
  globalThis.document = window.document;
};

await build({
  root,
  configFile: false,
  logLevel: 'error',
  plugins: [react()],
  resolve: {alias: {'@': resolve(root, 'src/renderer/src')}},
  // Bundle the dependencies too, so node never has to interop with their CJS.
  ssr: {noExternal: true},
  build: {
    ssr: resolve(root, 'src/renderer/src/blok/renderer/catalogExport.ts'),
    outDir: bundleDir,
    emptyOutDir: true,
    minify: false,
    target: 'node22',
    rollupOptions: {output: {format: 'es', entryFileNames: 'catalogExport.mjs'}},
  },
});

installDom();

try {
  const {buildCatalogExport} = await import(
    pathToFileURL(resolve(bundleDir, 'catalogExport.mjs')).href
  );
  const {catalog, manifest} = buildCatalogExport();

  if (!catalog.components.length || !catalog.operations.length) {
    throw new Error(
      `Refusing to publish an empty catalog (${catalog.components.length} components, ${catalog.operations.length} operations).`,
    );
  }

  await mkdir(outDir, {recursive: true});
  await writeFile(resolve(outDir, 'blok-catalog.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  await writeFile(
    resolve(outDir, 'blok-catalog.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  console.info(
    `[blok-catalog] wrote dist/catalog/ — "${catalog.name}": ${catalog.components.length} components, ${catalog.operations.length} operations.`,
  );
} finally {
  await rm(bundleDir, {recursive: true, force: true});
}
