import React, { useState, type ComponentType } from "react";

/**
 * A component in its own chunk that the app loads at startup, before the
 * window's first render, instead of on first use.
 *
 * In a built Electron app every chunk is on local disk: splitting saves no
 * download, it only moves the chunk's compile to the moment someone opens it,
 * and `React.lazy` suspends that first render even when the import takes a
 * millisecond (the page flashes to its loading fallback). So the window calls
 * `preloadAll()` before it renders, and a preloaded component renders straight
 * away. The import stays dynamic where it is declared: a file that declares
 * one imports nothing of it, so the offline blok-catalog export (plain node,
 * no three.js or WebGPU) and the tests load what they did before, and an
 * import cycle stays broken.
 *
 * Not preloaded (a test, the quick bar, a module that arrived at runtime), it
 * is `React.lazy`: it suspends once and needs a Suspense boundary above it.
 */
export type Preloadable<P extends object> = ComponentType<P> & {
  /** Load it now; resolves to the component. Shared by every caller. */
  preload: () => Promise<ComponentType<P>>;
};

const preloaders = new Set<() => Promise<unknown>>();

export function preloadable<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): Preloadable<P> {
  let resolved: ComponentType<P> | undefined;
  let pending: Promise<ComponentType<P>> | undefined;
  const preload = () =>
    (pending ??= load().then(
      (module) => (resolved = module.default),
      (error: unknown) => {
        pending = undefined;
        throw error;
      },
    ));
  const Lazy = React.lazy(() => preload().then((component) => ({ default: component })));

  const Preloaded = (props: P) => {
    // Chosen once per instance: swapping Lazy for the loaded component under a
    // mounted instance would remount everything below it.
    const [Component] = useState<ComponentType<P>>(() => resolved ?? Lazy);
    return React.createElement(Component, props);
  };
  preloaders.add(preload);
  return Object.assign(Preloaded, { preload });
}

/**
 * Load every preloadable declared so far. A chunk that fails is left to its
 * `React.lazy` path (it retries on render and throws to the error boundary),
 * so this never rejects.
 */
export const preloadAll = async (): Promise<void> => {
  const results = await Promise.allSettled([...preloaders].map((preload) => preload()));
  for (const result of results) {
    if (result.status === "rejected") console.warn("[preload] a chunk failed to load:", result.reason);
  }
};
