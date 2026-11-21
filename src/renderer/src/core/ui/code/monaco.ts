import { loader, type Monaco } from "@monaco-editor/react";
import { createElement, useEffect, useState, type ReactNode } from "react";

import { copyText } from "@/core/tabs/sharing/universalLink";

/**
 * What every Monaco editor in the app shares, set up once per Monaco
 * instance (it is a singleton, and so are its themes and its commands):
 *
 * - **The app's colours.** Monaco knows two themes by name here, `vs` and
 *   `vs-dark` (what the editors ask for by the light/dark setting). Both are
 *   redefined from the app's CSS tokens — surface, text, selection, the brand
 *   hue for tags — and again whenever those change (light/dark, brand colour),
 *   so an editor never sits in VS Code's grey beside the app's own surfaces.
 * - **Copy, cut and paste on the keyboard**, through the app's clipboard
 *   (`navigator.clipboard`, which the main process grants) rather than
 *   Monaco's own `execCommand` path, which does nothing in this window.
 *
 * - **The bundled Monaco.** `@monaco-editor/react` fetches Monaco from a CDN
 *   unless it is handed one; here it is handed the installed `monaco-editor`
 *   (so the editor works offline, sends no request, and is the version in the
 *   lockfile), with its workers built by Vite. It is a chunk of its own,
 *   loaded when the first editor is shown, and an editor must not mount before
 *   it is: `<MonacoGate>` (or `useAppMonaco()`'s answer) holds it back.
 */

type CodeEditor = Parameters<Monaco["editor"]["onDidCreateEditor"]>[0] extends (editor: infer E) => unknown ? E : never;

/** Any CSS colour (`oklch(...)`, a token's value) as `#rrggbb` / `#rrggbbaa`, the only form Monaco reads. */
const toHex = (() => {
  let context: CanvasRenderingContext2D | null | undefined;
  return (color: string): string | null => {
    if (context === undefined) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      context = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!context || !color) return null;
    context.clearRect(0, 0, 1, 1);
    // An unparsable colour leaves the previous fill: start from one that reads as "none".
    context.fillStyle = "rgba(0,0,0,0)";
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    const hex = (value: number) => value.toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ""}`;
  };
})();

/** The app's tokens as they are now, resolved on a probe so `var()` and `color-mix()` are computed. */
const readTokens = (names: readonly string[]): Record<string, string | null> => {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const tokens: Record<string, string | null> = {};
  for (const name of names) {
    probe.style.color = "";
    probe.style.color = `var(--color-${name})`;
    tokens[name] = probe.style.color ? toHex(getComputedStyle(probe).color) : null;
  }
  probe.remove();
  return tokens;
};

const TOKENS = [
  "background",
  "foreground",
  "muted",
  "muted-foreground",
  "border",
  "primary",
  "accent",
  "popover",
  "popover-foreground",
  "destructive",
  "warning",
  "success",
  "spectrum-blue",
  "spectrum-green",
  "spectrum-orange",
  "spectrum-violet",
  "spectrum-cyan",
] as const;

/** `#rrggbb` with an alpha: a selection or a line highlight over the surface. */
const alpha = (hex: string | null, opacity: number): string | undefined =>
  hex ? `${hex.slice(0, 7)}${Math.round(opacity * 255).toString(16).padStart(2, "0")}` : undefined;

const defined = <T extends Record<string, string | undefined | null>>(record: T): Record<string, string> =>
  Object.fromEntries(Object.entries(record).filter((entry): entry is [string, string] => !!entry[1]));

/** Redefine `vs` and `vs-dark` from the app's tokens; whichever is in use repaints. */
const applyAppTheme = (monaco: Monaco) => {
  const t = readTokens(TOKENS);
  const bare = (hex: string | null) => hex?.slice(1, 7);
  const rule = (token: string, hex: string | null, fontStyle?: string) =>
    hex ? [{ token, foreground: bare(hex)!, ...(fontStyle ? { fontStyle } : {}) }] : [];
  const rules = [
    ...rule("", t.foreground),
    ...rule("comment", t["muted-foreground"], "italic"),
    ...rule("delimiter", t["muted-foreground"]),
    ...rule("delimiter.bracket", t["muted-foreground"]),
    ...rule("tag", t.primary),
    ...rule("attribute.name", t["spectrum-cyan"] ?? t.foreground),
    ...rule("attribute.value", t["spectrum-green"] ?? t.success),
    ...rule("string", t["spectrum-green"] ?? t.success),
    ...rule("number", t["spectrum-orange"] ?? t.warning),
    ...rule("keyword", t["spectrum-violet"] ?? t.primary),
    ...rule("type.identifier", t["spectrum-blue"] ?? t.primary),
    ...rule("variable", t.foreground),
  ];
  const colors = defined({
    "editor.background": t.background,
    "editor.foreground": t.foreground,
    "editorLineNumber.foreground": alpha(t["muted-foreground"], 0.6),
    "editorLineNumber.activeForeground": t.foreground,
    "editorCursor.foreground": t.primary,
    "editor.selectionBackground": alpha(t.primary, 0.28),
    "editor.inactiveSelectionBackground": alpha(t.primary, 0.14),
    "editor.selectionHighlightBackground": alpha(t.primary, 0.12),
    "editor.wordHighlightBackground": alpha(t.primary, 0.12),
    "editor.lineHighlightBackground": alpha(t.muted, 0.5),
    "editor.lineHighlightBorder": "#00000000",
    "editorIndentGuide.background1": alpha(t.border, 0.6),
    "editorIndentGuide.activeBackground1": t.border,
    "editorBracketMatch.background": alpha(t.primary, 0.18),
    "editorBracketMatch.border": "#00000000",
    "editorGutter.background": t.background,
    "editorWidget.background": t.popover,
    "editorWidget.foreground": t["popover-foreground"],
    "editorWidget.border": t.border,
    "editorHoverWidget.background": t.popover,
    "editorHoverWidget.foreground": t["popover-foreground"],
    "editorHoverWidget.border": t.border,
    "editorSuggestWidget.background": t.popover,
    "editorSuggestWidget.foreground": t["popover-foreground"],
    "editorSuggestWidget.border": t.border,
    "editorSuggestWidget.selectedBackground": t.accent,
    "editorSuggestWidget.highlightForeground": t.primary,
    "editorError.foreground": t.destructive,
    "editorWarning.foreground": t.warning,
    "scrollbarSlider.background": alpha(t["muted-foreground"], 0.2),
    "scrollbarSlider.hoverBackground": alpha(t["muted-foreground"], 0.35),
    "scrollbarSlider.activeBackground": alpha(t["muted-foreground"], 0.5),
    "scrollbar.shadow": "#00000000",
    focusBorder: "#00000000",
    "input.background": t.background,
    "input.border": t.border,
    "list.hoverBackground": t.muted,
    "list.activeSelectionBackground": t.accent,
    "list.highlightForeground": t.primary,
  });
  // Both names carry the colours of NOW: the app's tokens already are the
  // light or the dark ones, whichever name an editor asks for.
  monaco.editor.defineTheme("vs", { base: "vs", inherit: true, rules, colors });
  monaco.editor.defineTheme("vs-dark", { base: "vs-dark", inherit: true, rules, colors });
};

const END_OF_LINE = "\n";

/**
 * Copy, cut and paste on ⌘/Ctrl C, X, V, through the app's clipboard. Bound
 * as actions on the editor, they run in place of Monaco's own commands for
 * those keys; a multi-cursor selection copies one line per cursor, and an
 * empty selection takes its whole line, as an editor does.
 */
const installClipboard = (monaco: Monaco, editor: CodeEditor) => {
  const { KeyMod, KeyCode } = monaco;
  const taken = () => {
    const model = editor.getModel();
    const selections = editor.getSelections() ?? [];
    if (!model || selections.length === 0) return null;
    const ranges = selections.map((selection) =>
      selection.isEmpty()
        ? new monaco.Range(selection.startLineNumber, 1, Math.min(selection.startLineNumber + 1, model.getLineCount() + 1), 1)
        : selection,
    );
    const wholeLines = selections.every((selection) => selection.isEmpty());
    const text = ranges
      .map((range, index) =>
        selections[index].isEmpty() ? model.getLineContent(selections[index].startLineNumber) + END_OF_LINE : model.getValueInRange(range),
      )
      .join(wholeLines ? "" : END_OF_LINE);
    return { ranges, text };
  };
  const readOnly = () => editor.getOption(monaco.editor.EditorOption.readOnly);

  editor.addAction({
    id: "app.clipboard.copy",
    label: "Copy",
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyC],
    run: async () => {
      const found = taken();
      if (found) await copyText(found.text);
    },
  });
  editor.addAction({
    id: "app.clipboard.cut",
    label: "Cut",
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyX],
    run: async () => {
      const found = taken();
      if (!found) return;
      await copyText(found.text);
      if (readOnly()) return;
      editor.pushUndoStop();
      editor.executeEdits(
        "app.clipboard.cut",
        found.ranges.map((range) => ({ range, text: "" })),
      );
      editor.pushUndoStop();
    },
  });
  editor.addAction({
    id: "app.clipboard.paste",
    label: "Paste",
    keybindings: [KeyMod.CtrlCmd | KeyCode.KeyV],
    run: async () => {
      if (readOnly()) return;
      const text = await navigator.clipboard.readText();
      // The editor's own paste, given the text: multi-cursor, undo and indentation as typed.
      if (text) editor.trigger("keyboard", "paste", { text });
    },
  });
};

const prepared = new WeakSet<Monaco>();
let watching = false;

const prepare = (monaco: Monaco) => {
  if (!prepared.has(monaco)) {
    prepared.add(monaco);
    monaco.editor.onDidCreateEditor((editor) => installClipboard(monaco, editor as CodeEditor));
  }
  applyAppTheme(monaco);
  if (watching) return;
  watching = true;
  // Light/dark is a class on the root, the brand colour a style on it: either
  // moves the tokens, and the editors follow on the next frame.
  let frame = 0;
  new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => applyAppTheme(monaco));
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
};

type MonacoEnvironmentHolder = { MonacoEnvironment?: { getWorker: (workerId: string, label: string) => Worker } };

let loading: Promise<void> | null = null;
let ready = false;

/**
 * The installed Monaco, once (`./monacoBundle`: the editor, its features, JSON
 * and Python), and the two workers the app's editors use — the editor's own
 * (diffing, links, word completion) and JSON's (the Demo tab validates as it
 * is typed). No other language service is shipped.
 */
const loadMonaco = (): Promise<void> =>
  (loading ??= (async () => {
    const [monaco, editorWorker, jsonWorker] = await Promise.all([
      import("./monacoBundle"),
      import("monaco-editor/editor/editor.worker?worker"),
      import("monaco-editor/language/json/json.worker?worker"),
    ]);
    (globalThis as MonacoEnvironmentHolder).MonacoEnvironment = {
      getWorker: (_workerId, label) => (label === "json" ? new jsonWorker.default() : new editorWorker.default()),
    };
    // From here on `<Editor>` uses this instance and never asks the CDN.
    loader.config({ monaco });
    await loader.init();
    prepare(monaco as unknown as Monaco);
    ready = true;
  })().catch((error) => {
    // A failed chunk may load on the next try (a dev server restart, a flaky disk).
    loading = null;
    throw error;
  }));

/**
 * Call where a Monaco editor is shown. True once the bundled Monaco is in
 * place with the app's colours and clipboard keys: render the editor only
 * then, or it would fetch its own from the CDN.
 */
export const useAppMonaco = (): boolean => {
  const [isReady, setReady] = useState(ready);
  useEffect(() => {
    if (ready) {
      setReady(true);
      return;
    }
    let live = true;
    loadMonaco().then(
      () => live && setReady(true),
      (error) => console.error("The code editor could not be loaded", error),
    );
    return () => {
      live = false;
    };
  }, []);
  return isReady;
};

/** Holds an editor back until the bundled Monaco is in place; `fallback` (nothing by default) meanwhile. */
export const MonacoGate = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) =>
  createElement("div", { className: "h-full w-full" }, useAppMonaco() ? children : fallback);
