import tailwindTheme from "tailwindcss/theme.css?raw";
import tailwindUtilities from "tailwindcss/utilities.css?raw";

import appTheme from "@/theme.css?raw";

/**
 * Tailwind for the classes bloks bring at run time.
 *
 * The app's own classes are compiled at build time from its sources. A blok's
 * arrive with the blok (`className="grid-cols-[3fr_1fr] bg-muted/40"`), so the
 * build never sees them. They are compiled here instead, with the same
 * compiler the build and `@tailwindcss/browser` use, and the app's own tokens,
 * variants and utilities (`theme.css`, which `index.css` imports too), so
 * `bg-muted`, `dark:` and `glass:` mean in a blok what they mean in the app.
 *
 * Unlike `@tailwindcss/browser` it never looks at the page: it compiles the
 * classes it is handed (`useBlokTailwind` hands it a blok's), each once, and
 * adds no second preflight, since base styles come from the build. Classes of
 * `tw-animate-css` (`animate-in`) and shadcn's variants (`data-open:`) are not
 * known here; the app's own components get them from the build.
 */

/** The theme and utilities layers only: no preflight, which the build already applied. */
const ENTRY = `@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
${appTheme}`;

const STYLESHEETS: Record<string, string> = {
  "tailwindcss/theme.css": tailwindTheme,
  "tailwindcss/utilities.css": tailwindUtilities,
};

type Compiler = { build: (candidates: string[]) => string };

let compiler: Promise<Compiler> | null = null;
let style: HTMLStyleElement | null = null;
const seen = new Set<string>();
// Builds run one after another: each writes the stylesheet the next extends.
let chain: Promise<void> = Promise.resolve();

const compilerOf = (): Promise<Compiler> => {
  if (!compiler) {
    // Lazily: the catalog export and an app that never shows a blok never load it.
    compiler = import("tailwindcss").then(({ compile }) =>
      compile(ENTRY, {
        base: "/",
        loadStylesheet: async (id: string, base: string) => {
          const content = STYLESHEETS[id];
          if (content === undefined) throw new Error(`No stylesheet ${id} for bloks`);
          return { path: id, base, content };
        },
      }),
    );
  }
  return compiler;
};

const styleElement = (): HTMLStyleElement => {
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("data-blok-tailwind", "");
    document.head.appendChild(style);
  }
  return style;
};

/** Every class `value` names: what a `className` holds, split as Tailwind would. */
export const classCandidates = (value: string): string[] => value.split(/\s+/).filter(Boolean);

/**
 * Compile these classes, those not compiled yet, into the bloks' stylesheet.
 * Settles once they apply. Never rejects: a class Tailwind does not know is
 * no utility, and a compiler that cannot start is reported once and leaves
 * bloks as the build styles them.
 */
export const ensureBlokClasses = (candidates: Iterable<string>): Promise<void> => {
  const fresh = [...new Set(candidates)].filter((candidate) => !seen.has(candidate));
  if (fresh.length === 0) return chain;
  fresh.forEach((candidate) => seen.add(candidate));
  chain = chain
    .then(async () => {
      const built = await compilerOf();
      // `build` accumulates: it answers with the CSS of every class it was ever given.
      styleElement().textContent = built.build(fresh);
    })
    .catch((error: unknown) => {
      console.error("Could not compile the Tailwind classes of a blok", error);
    });
  return chain;
};

/** For tests: forget what was compiled and remove the stylesheet. */
export const resetBlokTailwind = () => {
  compiler = null;
  style?.remove();
  style = null;
  seen.clear();
  chain = Promise.resolve();
};
