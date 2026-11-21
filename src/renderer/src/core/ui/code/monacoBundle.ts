/**
 * The Monaco the app ships, as ONE lazy chunk (`core/ui/code/monaco.ts` loads
 * it): the editor's API, every editor feature (find, hover, suggest, folding,
 * multi-cursor), and only the languages the app's editors use — JSON with its
 * language service (the blok editor's Demo tab) and Python's grammar (fluss).
 * BSX brings its own grammar (`@arkitektio/bsx/editor`).
 *
 * Deliberately NOT `import "monaco-editor"`: that entry also registers the
 * TypeScript, CSS and HTML language services, whose workers alone are 15 MB.
 * A language added to an editor here is added to this list.
 */
import "monaco-editor/features/register.all";
import "monaco-editor/languages/features/json/register";
import "monaco-editor/languages/definitions/python/register";

export * from "monaco-editor/editor/editor.api";
