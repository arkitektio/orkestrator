import tailwindTheme from "tailwindcss/theme.css?raw";
import tailwindUtilities from "tailwindcss/utilities.css?raw";

import appTheme from "@/theme.css?raw";
import { loadVocabulary } from "../spec/vocabulary";

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
 * `tw-animate-css` (`animate-in`) are not known here; shadcn's custom variants
 * (`data-open:`, ...) are, written below as `shadcn/tailwind.css` writes them
 * for the build.
 */

/**
 * shadcn's custom variants, as `shadcn/tailwind.css` defines them (the build
 * imports that file in `index.css`). The blok language publishes the variants
 * a blok may use (vocabulary `theme.custom_variants`); those the app's theme
 * does not define itself are taken from here.
 */
const SHADCN_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  "data-open": ['&:where([data-state="open"])', '&:where([data-open]:not([data-open="false"]))'],
  "data-closed": ['&:where([data-state="closed"])', '&:where([data-closed]:not([data-closed="false"]))'],
  "data-checked": ['&:where([data-state="checked"])', '&:where([data-checked]:not([data-checked="false"]))'],
  "data-unchecked": ['&:where([data-state="unchecked"])', '&:where([data-unchecked]:not([data-unchecked="false"]))'],
  "data-selected": ['&:where([data-selected="true"])'],
  "data-disabled": ['&:where([data-disabled="true"])', '&:where([data-disabled]:not([data-disabled="false"]))'],
  "data-active": ['&:where([data-state="active"])', '&:where([data-active]:not([data-active="false"]))'],
  "data-horizontal": ['&:where([data-orientation="horizontal"])'],
  "data-vertical": ['&:where([data-orientation="vertical"])'],
};

const definedByTheme = (name: string): boolean => new RegExp(`@custom-variant\\s+${name}[\\s({]`).test(appTheme);

/** The vocabulary's custom variants the theme leaves to us, as `@custom-variant` rules. */
export const runtimeVariants = (): string => {
  const rules: string[] = [];
  for (const name of loadVocabulary().theme.customVariants) {
    if (definedByTheme(name)) continue;
    const selectors = SHADCN_VARIANTS[name];
    if (!selectors) throw new Error(`The blok vocabulary names the custom variant ${name}, which neither theme.css nor shadcn defines`);
    rules.push(`@custom-variant ${name} {\n${selectors.join(",\n")} {\n@slot;\n}\n}`);
  }
  return rules.join("\n");
};

/** The theme and utilities layers only: no preflight, which the build already applied. */
const entry = () => `@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);
${appTheme}
${runtimeVariants()}`;

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
      compile(entry(), {
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
