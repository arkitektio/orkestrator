import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every registry dialog says what it is: a `DialogTitle` (or `SheetTitle`) in
 * a `DialogHeader`. Radix needs the title for the dialog's accessible name,
 * and a dialog without one is the odd one out next to the rest.
 *
 * Static, like the module-boundary test: each `<module>/dialogRegistry.ts`
 * import is resolved to its file, and the file must name a title. A dialog
 * whose title lives in a child component's file is listed here with that
 * file; this list only shrinks.
 */
const TITLE_ELSEWHERE: Record<string, string> = {
  "rekuest/dialogs/AutomationDialog.tsx": "rekuest/components/automation/builder/AutomationBuilder.tsx",
  "rekuest/dialogs/OpenBlokDialog.tsx": "rekuest/components/BlokArgsForm.tsx",
  "rekuest/dialogs/ReplyerAssignForm.tsx": "rekuest/forms/assign/AssignForm.tsx",
};

const SRC = resolve(__dirname, "../..");

const registries = readdirSync(SRC)
  .map((dir) => join(SRC, dir, "dialogRegistry.ts"))
  .filter((path) => existsSync(path));

const resolveImport = (from: string, spec: string): string | null => {
  const base = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
};

/** The component files a registry imports (host helpers like `needsServices` excluded). */
const dialogFiles = (registry: string): string[] => {
  const source = readFileSync(registry, "utf8");
  const files = new Set<string>();
  for (const match of source.matchAll(/import\s+(?!type\b)[^;]*?from\s+"([^"]+)"/g)) {
    const file = resolveImport(registry, match[1]);
    // Components only: a `.ts` import is a helper (role constants, …).
    if (file && file.endsWith(".tsx") && !relative(SRC, file).startsWith("core/")) files.add(file);
  }
  return [...files];
};

const TITLE = /\b(DialogTitle|SheetTitle)\b/;

describe("registry dialogs", () => {
  it("finds the registries and their dialogs", () => {
    expect(registries.length).toBeGreaterThan(5);
    // Guards the scan itself: an import style the regex misses would leave
    // nothing to check, and the title test green for nothing.
    expect(registries.flatMap(dialogFiles).length).toBeGreaterThan(90);
  });

  it("each names a DialogTitle", () => {
    const missing: string[] = [];
    for (const registry of registries) {
      for (const file of dialogFiles(registry)) {
        const path = relative(SRC, file);
        const source = readFileSync(join(SRC, TITLE_ELSEWHERE[path] ?? path), "utf8");
        if (!TITLE.test(source)) missing.push(path);
      }
    }
    expect(missing.sort()).toEqual([]);
  });
});
