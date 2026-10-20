import { useTheme } from "@/core/settings/theme/ThemeProvider";
import type { ListActionFragment } from "@/rekuest/api/graphql";
import { Editor, Monaco, OnMount } from "@monaco-editor/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { aliasFor } from "./manifest";
import { callSnippet, parseStubs, ParsedStubs } from "./stubs";

type CodeEditor = Parameters<OnMount>[0];
type Disposable = { dispose: () => void };

export type SourceDiagnostic = { message: string; line?: number | null };

/** A line marked from outside: a call's state during a run. */
export type LineMark = { line: number; tone: "running" | "done" | "failed" | "idle"; hover: string };

const MARKER_OWNER = "fluss-monty";

const TONE_CLASS: Record<LineMark["tone"], string> = {
  running: "border-l-4 border-blue-500",
  done: "border-l-4 border-green-500",
  failed: "border-l-4 border-red-500",
  idle: "border-l-4 border-muted-foreground/40",
};

/** `error[missing-argument] No argument…` → the code and the sentence. */
const splitCode = (message: string): { code?: string; text: string } => {
  const match = /^(?:error|warning)\[([^\]]+)\]\s*(.*)$/s.exec(message);
  return match ? { code: match[1], text: match[2] } : { text: message };
};

/** The call the cursor is inside: the name before the last unclosed `(`, and which argument. */
const callAt = (text: string): { name: string; argument: number } | null => {
  let depth = 0;
  let argument = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    const char = text[i];
    if (char === ")" || char === "]" || char === "}") depth++;
    else if (char === "[" || char === "{") depth--;
    else if (char === "(") {
      if (depth === 0) {
        const name = /([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(text.slice(0, i));
        return name ? { name: name[1], argument } : null;
      }
      depth--;
    } else if (char === "," && depth === 0) argument++;
  }
  return null;
};

export type PythonSourceEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  diagnostics?: readonly SourceDiagnostic[];
  /** The stubs of the last check: completion, signature help and hover read them. */
  stubs?: string | null;
  /** Hashes already in the manifest: not offered again. */
  manifestHashes?: ReadonlySet<string>;
  /** Aliases already taken, so an offered action gets a free one. */
  takenAliases?: ReadonlySet<string>;
  /** Offer rekuest actions matching the typed word; accepting one adds it. */
  searchActions?: (text: string) => Promise<readonly ListActionFragment[]>;
  onAddAction?: (action: ListActionFragment, alias: string) => void;
  lineMarks?: readonly LineMark[];
};

/**
 * A Python flow's source in Monaco. The server is the type checker: its
 * diagnostics become markers, and its stubs drive completion, signature
 * help and hover. Providers are registered once per editor and read the
 * latest props through refs; each answers only for its own model.
 */
export const PythonSourceEditor = (props: PythonSourceEditorProps) => {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<CodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const disposables = useRef<Disposable[]>([]);
  const decorations = useRef<ReturnType<CodeEditor["createDecorationsCollection"]> | null>(null);
  const parsed = useRef<ParsedStubs>(parseStubs(props.stubs));
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    parsed.current = parseStubs(props.stubs);
  }, [props.stubs]);

  useEffect(() => () => disposables.current.forEach((d) => d.dispose()), []);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    decorations.current = editor.createDecorationsCollection([]);
    const own = (model: unknown) => model === editor.getModel();

    // A completion item's command runs here: the accepted action joins the manifest.
    const addCommand = editor.addCommand(0, (_accessor: unknown, action: ListActionFragment, alias: string) =>
      latest.current.onAddAction?.(action, alias),
    );

    disposables.current.push(
      monaco.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: async (model, position) => {
          if (!own(model)) return { suggestions: [] };
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
          const awaited = /\bawait\s+$/.test(before);
          const { functions, classes } = parsed.current;

          const suggestions = [
            ...functions.map((fn) => ({
              label: fn.name,
              kind: monaco.languages.CompletionItemKind.Function,
              detail: `(${fn.signature}) -> ${fn.returns}`,
              documentation: "An action in this flow's manifest",
              insertText: awaited ? callSnippet(fn).replace(/^await /, "") : callSnippet(fn),
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range,
              sortText: `0${fn.name}`,
            })),
            ...classes.map((cls) => ({
              label: cls.name,
              kind: monaco.languages.CompletionItemKind.Class,
              detail: `class ${cls.name}(${cls.base})`,
              documentation: cls.doc,
              insertText: cls.name,
              range,
              sortText: `1${cls.name}`,
            })),
          ];

          const { searchActions, onAddAction, manifestHashes, takenAliases } = latest.current;
          if (searchActions && onAddAction && word.word.length >= 2) {
            const known = new Set(functions.map((fn) => fn.name));
            const taken = new Set([...(takenAliases ?? []), ...known]);
            for (const action of await searchActions(word.word)) {
              if (manifestHashes?.has(action.hash)) continue;
              const alias = aliasFor(action.name, taken);
              taken.add(alias);
              suggestions.push({
                label: action.name,
                kind: monaco.languages.CompletionItemKind.Module,
                detail: `Add as ${alias}`,
                documentation: action.description ?? "A rekuest action, added to the manifest when accepted",
                insertText: `${awaited ? "" : "await "}${alias}($0)`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
                sortText: `2${action.name}`,
                ...(addCommand ? { command: { id: addCommand, title: "Add to manifest", arguments: [action, alias] } } : {}),
              } as (typeof suggestions)[number]);
            }
          }
          return { suggestions };
        },
      }),
      monaco.languages.registerSignatureHelpProvider("python", {
        signatureHelpTriggerCharacters: ["(", ","],
        provideSignatureHelp: (model, position) => {
          if (!own(model)) return null;
          const text = model.getValueInRange({
            startLineNumber: Math.max(1, position.lineNumber - 20),
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });
          const call = callAt(text);
          const fn = call && parsed.current.functions.find((f) => f.name === call.name);
          if (!call || !fn) return null;
          return {
            value: {
              signatures: [
                {
                  label: `${fn.name}(${fn.signature}) -> ${fn.returns}`,
                  parameters: fn.params.map((param) => ({ label: `${param.name}: ${param.annotation}` })),
                },
              ],
              activeSignature: 0,
              activeParameter: Math.min(call.argument, Math.max(0, fn.params.length - 1)),
            },
            dispose: () => {},
          };
        },
      }),
      monaco.languages.registerHoverProvider("python", {
        provideHover: (model, position) => {
          if (!own(model)) return null;
          const word = model.getWordAtPosition(position);
          if (!word) return null;
          const fn = parsed.current.functions.find((f) => f.name === word.word);
          if (fn) {
            return { contents: [{ value: "```python\nasync def " + `${fn.name}(${fn.signature}) -> ${fn.returns}` + "\n```" }] };
          }
          const cls = parsed.current.classes.find((c) => c.name === word.word);
          if (cls) return { contents: [{ value: `**${cls.name}**: ${cls.doc}` }] };
          return null;
        },
      }),
    );
  };

  // The server's diagnostics as markers.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;
    const lines = model.getLineCount();
    monaco.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      (props.diagnostics ?? []).map((diagnostic) => {
        const line = Math.min(Math.max(diagnostic.line ?? 1, 1), lines);
        const { code, text } = splitCode(diagnostic.message);
        return {
          severity: monaco.MarkerSeverity.Error,
          message: text,
          code,
          source: "monty",
          startLineNumber: line,
          startColumn: model.getLineFirstNonWhitespaceColumn(line) || 1,
          endLineNumber: line,
          endColumn: model.getLineMaxColumn(line),
        };
      }),
    );
  }, [props.diagnostics, props.value]);

  // Marks from outside (a run's calls).
  useEffect(() => {
    const editor = editorRef.current;
    const lines = editor?.getModel()?.getLineCount() ?? 0;
    decorations.current?.set(
      (props.lineMarks ?? [])
        .filter((mark) => mark.line >= 1 && mark.line <= lines)
        .map((mark) => ({
          range: { startLineNumber: mark.line, startColumn: 1, endLineNumber: mark.line, endColumn: 1 },
          options: { isWholeLine: true, linesDecorationsClassName: TONE_CLASS[mark.tone], hoverMessage: { value: mark.hover } },
        })),
    );
  }, [props.lineMarks, props.value]);

  return (
    <Editor
      language="python"
      value={props.value}
      onChange={(value) => props.onChange?.(value ?? "")}
      onMount={onMount}
      theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
      options={{
        readOnly: props.readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        lineDecorationsWidth: 8,
        renderValidationDecorations: "on",
      }}
    />
  );
};
