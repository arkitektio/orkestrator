import { useTheme } from "@/core/settings/theme/ThemeProvider";
import { Editor, Monaco, OnMount } from "@monaco-editor/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  completeBsx,
  hoverBsx,
  signatureBsx,
  type BsxCompletionKind,
  type BsxEnvironment,
  type BsxMarker,
} from "../bsx";

type CodeEditor = Parameters<OnMount>[0];
type Disposable = { dispose: () => void };

export const BSX_LANGUAGE = "bsx";
const MARKER_OWNER = "bsx";

/** The `bsx` language is registered once per Monaco instance; its providers per editor. */
const registered = new WeakSet<Monaco>();

const registerLanguage = (monaco: Monaco) => {
  if (registered.has(monaco)) return;
  registered.add(monaco);
  monaco.languages.register({ id: BSX_LANGUAGE, extensions: [".bsx"], aliases: ["BSX", "bsx"] });
  monaco.languages.setLanguageConfiguration(BSX_LANGUAGE, {
    comments: { blockComment: ["<!--", "-->"] },
    brackets: [
      ["<", ">"],
      ["(", ")"],
      ["[", "]"],
      ["{", "}"],
    ],
    autoClosingPairs: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: "<!--", close: " -->" },
    ],
    surroundingPairs: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "<", close: ">" },
    ],
    wordPattern: /[A-Za-z_][\w\-]*/,
  });
  // Tags and attributes as in XML; inside an `@…` / `$…` value the expression
  // is coloured as code: names, calls, literals.
  const expression = (quote: string, other: string) => [
    [new RegExp(quote), { token: "attribute.value", next: "@pop" }],
    [new RegExp(`${other}[^${other}]*${other}`), "string"],
    [/[@$]/, "keyword"],
    [/\b(True|False)\b/, "keyword"],
    [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
    [/[A-Za-z_]\w*(?=\s*\()/, "type.identifier"],
    [/[A-Za-z_]\w*/, "variable"],
    [new RegExp(`[^${quote}${other}A-Za-z_0-9@$]+`), "delimiter"],
  ];
  monaco.languages.setMonarchTokensProvider(BSX_LANGUAGE, {
    tokenizer: {
      root: [
        [/<!--/, { token: "comment", next: "@comment" }],
        [/(<\/?)([A-Za-z_][\w:.\-]*)/, ["delimiter", { token: "tag", next: "@tag" }]],
        [/[^<]+/, ""],
      ],
      comment: [
        [/-->/, { token: "comment", next: "@pop" }],
        [/[^-]+/, "comment"],
        [/./, "comment"],
      ],
      tag: [
        [/\s+/, ""],
        [/[A-Za-z_][\w:.\-]*/, "attribute.name"],
        [/=/, "delimiter"],
        [/"(?=\s*[@$])/, { token: "attribute.value", next: "@expressionDouble" }],
        [/'(?=\s*[@$])/, { token: "attribute.value", next: "@expressionSingle" }],
        [/"[^"]*"/, "attribute.value"],
        [/'[^']*'/, "attribute.value"],
        [/\/?>/, { token: "delimiter", next: "@pop" }],
      ],
      expressionDouble: expression('"', "'"),
      expressionSingle: expression("'", '"'),
    },
  } as Parameters<Monaco["languages"]["setMonarchTokensProvider"]>[1]);
};

export type BsxEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  /** What completion offers: the catalog, the blok's context, its dependencies and args. */
  environment: BsxEnvironment;
  markers?: readonly BsxMarker[];
  readOnly?: boolean;
};

/**
 * A blok's BSX in Monaco. Completion, hover and signature help come from the
 * language core (`core/blok/bsx`), told what the catalog holds and what the
 * blok declares; markers come from outside (the page analyses the text and
 * adds what the server refused). Providers are registered once per editor,
 * read the latest props through a ref, and answer only for their own model.
 */
export const BsxEditor = (props: BsxEditorProps) => {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<CodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const disposables = useRef<Disposable[]>([]);
  const latest = useRef(props);
  useLayoutEffect(() => {
    latest.current = props;
  });

  useEffect(() => () => disposables.current.forEach((disposable) => disposable.dispose()), []);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    const own = (model: unknown) => model === editor.getModel();
    const kinds: Record<BsxCompletionKind, number> = {
      component: monaco.languages.CompletionItemKind.Class,
      prop: monaco.languages.CompletionItemKind.Property,
      value: monaco.languages.CompletionItemKind.EnumMember,
      dependency: monaco.languages.CompletionItemKind.Module,
      path: monaco.languages.CompletionItemKind.Field,
      function: monaco.languages.CompletionItemKind.Function,
      action: monaco.languages.CompletionItemKind.Method,
      keyword: monaco.languages.CompletionItemKind.Keyword,
      close: monaco.languages.CompletionItemKind.Snippet,
    };

    disposables.current.push(
      monaco.languages.registerCompletionItemProvider(BSX_LANGUAGE, {
        triggerCharacters: ["<", " ", '"', "'", "@", "$", ".", "(", ",", "/"],
        provideCompletionItems: (model, position) => {
          if (!own(model)) return { suggestions: [] };
          const offset = model.getOffsetAt(position);
          const suggestions = completeBsx(model.getValue(), offset, latest.current.environment).map((item) => {
            const start = model.getPositionAt(item.from);
            return {
              label: item.label,
              kind: kinds[item.kind],
              detail: item.detail,
              documentation: item.documentation ? { value: item.documentation } : undefined,
              insertText: item.insertText,
              insertTextRules: item.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
              sortText: item.sortText,
              range: {
                startLineNumber: start.lineNumber,
                startColumn: start.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
            };
          });
          return { suggestions };
        },
      }),
      monaco.languages.registerHoverProvider(BSX_LANGUAGE, {
        provideHover: (model, position) => {
          if (!own(model)) return null;
          const hover = hoverBsx(model.getValue(), model.getOffsetAt(position), latest.current.environment);
          if (!hover) return null;
          const start = model.getPositionAt(hover.range.start);
          const end = model.getPositionAt(hover.range.end);
          return {
            contents: [{ value: hover.contents }],
            range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column },
          };
        },
      }),
      monaco.languages.registerSignatureHelpProvider(BSX_LANGUAGE, {
        signatureHelpTriggerCharacters: ["(", ","],
        provideSignatureHelp: (model, position) => {
          if (!own(model)) return null;
          const signature = signatureBsx(model.getValue(), model.getOffsetAt(position), latest.current.environment);
          if (!signature) return null;
          return {
            value: {
              signatures: [
                {
                  label: signature.label,
                  documentation: signature.documentation,
                  parameters: signature.parameters.map((parameter) => ({
                    label: parameter.label,
                    documentation: parameter.documentation ? { value: parameter.documentation } : undefined,
                  })),
                },
              ],
              activeSignature: 0,
              activeParameter: signature.activeParameter,
            },
            dispose: () => {},
          };
        },
      }),
    );
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;
    monaco.editor.setModelMarkers(
      model,
      MARKER_OWNER,
      (props.markers ?? []).map((marker) => {
        const start = model.getPositionAt(marker.range.start);
        const end = model.getPositionAt(Math.max(marker.range.end, marker.range.start + 1));
        return {
          severity: marker.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
          message: marker.message,
          source: "bsx",
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        };
      }),
    );
  }, [props.markers, props.value]);

  return (
    <Editor
      language={BSX_LANGUAGE}
      value={props.value}
      onChange={(value) => props.onChange?.(value ?? "")}
      beforeMount={registerLanguage}
      onMount={onMount}
      theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
      options={{
        readOnly: props.readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        lineDecorationsWidth: 8,
        renderValidationDecorations: "on",
        quickSuggestions: { other: true, strings: true, comments: false },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: "off",
      }}
    />
  );
};
