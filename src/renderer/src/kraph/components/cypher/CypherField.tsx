import { FieldProps } from "@/components/fields/types";
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Editor, Monaco } from "@monaco-editor/react";
import { useCallback } from "react";
import { useFormContext } from "react-hook-form";
import OneDarkPro from "./theme.json";

export type CypherNodeSchema = {
  label: string;
  description: string;
  type: string;
  properties: {
    [field: string]: {
      description: string;
    };
  };
};

export type CypherRelationshipSchema = {
  [type: string]: {
    label: string;
    description: string;
    type: string;
    properties: {
      [field: string]: {
        description: string;
      };
    };
  };
};

export type CypherSchema = {
  nodes: Record<string, CypherNodeSchema>;
  relationships: CypherRelationshipSchema;
};

// `monaco-editor`'s own namespace type isn't resolvable as a bare `monaco.*`
// type reference in this project's dependency tree (only the `Monaco`
// namespace-object type re-exported by `@monaco-editor/react` is available),
// so the completion-item shape is derived from it via indexed access instead
// of writing `monaco.languages.CompletionItem[]` directly.
type CypherCompletionItemKind =
  Monaco["languages"]["CompletionItemKind"][keyof Monaco["languages"]["CompletionItemKind"]];

type CypherCompletionItem = {
  label: string;
  kind: CypherCompletionItemKind;
  insertText: string;
  detail?: string;
  documentation?: string;
};

export const CypherField = ({
  name,
  validate,
  description,
  schema,
  label,
}: FieldProps & { schema: CypherSchema }) => {
  const form = useFormContext();

  const handleEditorDidMount = useCallback(
    (monaco: Monaco) => {
      monaco.editor.defineTheme("OneDarkPro", OneDarkPro);
      monaco.languages.register({ id: "cypher" });

      monaco.languages.registerCompletionItemProvider("cypher", {
        triggerCharacters: [".", ":", "(", "[", "-", " "], // ensure trigger after `[r:`, `[:`
        provideCompletionItems: (model, position) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const suggestions: CypherCompletionItem[] = [];

          // 🟨 Node label suggestions after (n:
          const nodeLabelMatch = /\([a-zA-Z_][a-zA-Z0-9_]*:\s*([a-zA-Z_]*)$/.exec(textUntilPosition);
          if (nodeLabelMatch) {
            const prefix = nodeLabelMatch[1] || "";
            for (const [nodeKey, node] of Object.entries(schema.nodes)) {
              if (nodeKey.startsWith(prefix)) {
                suggestions.push({
                  label: nodeKey,
                  kind: monaco.languages.CompletionItemKind.Class,
                  insertText: nodeKey,
                  detail: `${node.label} (${node.type})`,
                  documentation: node.description,
                });
              }
            }
            return { suggestions };
          }

          // 🟩 Property suggestions for n. and r.
          const propAccessMatch = /([a-zA-Z_][a-zA-Z0-9_]*)\.\w*$/.exec(textUntilPosition);
          if (propAccessMatch) {
            const variable = propAccessMatch[1];

            // Try to match as node variable
            const nodePattern = new RegExp(`\\(${variable}\\s*:\\s*([a-zA-Z_][a-zA-Z0-9_]*)`, "gi");
            let nodeKey: string | undefined;
            let match;
            while ((match = nodePattern.exec(textUntilPosition)) !== null) {
              nodeKey = match[1];
            }

            const node = nodeKey && schema.nodes[nodeKey];
            if (node) {
              for (const [field, info] of Object.entries(node.properties)) {
                suggestions.push({
                  label: field,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: field,
                  detail: `Property of ${nodeKey}`,
                  documentation: info.description,
                });
              }
              return { suggestions };
            }

            // Try to match as relationship variable
            const relPattern = new RegExp(`\\[${variable}\\s*:\\s*([a-zA-Z_][a-zA-Z0-9_]*)`, "gi");
            let relKey: string | undefined;
            while ((match = relPattern.exec(textUntilPosition)) !== null) {
              relKey = match[1];
            }

            const rel = relKey && schema.relationships[relKey];
            if (rel) {
              for (const [field, info] of Object.entries(rel.properties)) {
                suggestions.push({
                  label: field,
                  kind: monaco.languages.CompletionItemKind.Field,
                  insertText: field,
                  detail: `Property of ${relKey}`,
                  documentation: info.description,
                });
              }
              return { suggestions };
            }

            return { suggestions: [] };
          }

          // 🟣 Relationship type suggestions after [r: or [:
          const relTypeMatch =
            /\[[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*([a-zA-Z_]*)$/.exec(textUntilPosition) ||
            /\[\s*:?\s*([a-zA-Z_]*)$/.exec(textUntilPosition);

          if (relTypeMatch) {
            const prefix = relTypeMatch[1] || "";
            for (const [relKey, rel] of Object.entries(schema.relationships)) {
              if (relKey.startsWith(prefix)) {
                suggestions.push({
                  label: relKey,
                  kind: monaco.languages.CompletionItemKind.Interface,
                  insertText: relKey,
                  detail: `${rel.label} (${rel.type})`,
                  documentation: rel.description,
                });
              }
            }
            return { suggestions };
          }

          return { suggestions: [] };
        },
      });
    },
    [schema]
  );

  return (
    <FormField
      control={form.control}
      name={name}
      rules={{ validate }}
      render={({ field }) => (
        <FormItem className="flex flex-col text-foreground">
          {label && <FormLabel>{label}</FormLabel>}
          <Editor
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
            }}
            defaultLanguage="cypher"
            value={field.value}
            onChange={field.onChange}
            theme="OneDarkPro"
            beforeMount={handleEditorDidMount}
            className="w-full h-96 rounded-lg border-2 border-border dark:bg-card overflow-hidden"
          />
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
