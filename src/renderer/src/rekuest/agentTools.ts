import { mountedBlokScope, printBsx } from "@arkitektio/bsx/bsx/index";
import type { BlokComponentNode } from "@arkitektio/bsx/renderer/runtime/types";
import type { ApolloClient } from "@apollo/client";
import { globalRegistry } from "@/core/agent/registry";
import { orkestratorCatalogSpec } from "@/core/blok/catalog";
import {
  ActionKind,
  BlokEditorDocument,
  type BlokEditorQuery,
  type BlokEditorQueryVariables,
  PortKind,
} from "@/rekuest/api/graphql";
import { BSX_GUIDE, componentIndex, componentReference, describeAgents, sourceProblems } from "./components/editor/blokAssist";
import { dependencyDraft, scopeDependency } from "./components/editor/blokDependencies";
import { openBlokEditor } from "./components/editor/openBlokEditors";

/**
 * What this app offers an assistant that helps design a blok (a replyer in
 * the chat beside the blok editor, which finds these among its callers by
 * their ports): read the blok as BSX with everything needed to write one,
 * look up a component's props, and put a new source into the open editor.
 *
 * Writing goes into the EDITOR, never to the server: the person sees it in
 * the preview at once and saves it themselves, or undoes it. A source that
 * would not save is refused with where and why, so the assistant can fix it.
 */

const BLOK = "@rekuest/blok";

type Reading = { name: string; source: string; agents: string; scope: ReturnType<typeof mountedBlokScope>; open: boolean };

const readBlok = async (app: { connection?: { serviceMap?: Record<string, { client?: unknown } | undefined> } | null }, id: string): Promise<Reading> => {
  const editor = openBlokEditor(id);
  if (editor) return { ...editor.read(), open: true };
  const client = app.connection?.serviceMap?.rekuest?.client as ApolloClient<unknown> | undefined;
  if (!client) throw new Error("Rekuest is not available.");
  const { data } = await client.query<BlokEditorQuery, BlokEditorQueryVariables>({
    query: BlokEditorDocument,
    variables: { id },
    fetchPolicy: "network-only",
  });
  const roots = (data.blok.componentTree ?? []) as BlokComponentNode[];
  if (roots.length !== 1) throw new Error("This blok cannot be written as BSX.");
  const drafts = data.blok.dependencies.map(dependencyDraft);
  return {
    name: data.blok.name,
    source: printBsx(roots[0]),
    agents: describeAgents(drafts),
    scope: mountedBlokScope(
      ["custom"],
      drafts.map(scopeDependency),
      data.blok.args.map((arg) => arg.key),
    ),
    open: false,
  };
};

globalRegistry.register(
  "read_blok",
  async (context) => {
    const { blok } = context.args as { blok: string };
    try {
      const reading = await readBlok(context.app, blok);
      context.return({
        source: reading.source,
        agents: reading.agents,
        guide: `${BSX_GUIDE}\n\nComponents (ask describe_blok_components for a component's props):\n${componentIndex(orkestratorCatalogSpec())}`,
      });
    } catch (error) {
      context.error(error instanceof Error ? error.message : String(error));
    }
  },
  {
    key: "read_blok",
    version: "1",
    name: "Read a blok",
    description:
      "Reads a blok as BSX source, as it stands in the editor (unsaved changes included). Also returns the agents it may read and call, and a guide to writing BSX with the list of components. Call this before changing a blok.",
    kind: ActionKind.Function,
    args: [{ key: "blok", kind: PortKind.Structure, identifier: BLOK, nullable: false }],
    returns: [
      { key: "source", kind: PortKind.String, nullable: false, description: "The blok's BSX" },
      { key: "agents", kind: PortKind.String, nullable: false, description: "The agents it declares, with their actions and states" },
      { key: "guide", kind: PortKind.String, nullable: false, description: "How BSX is written, and the components there are" },
    ],
  },
);

globalRegistry.register(
  "describe_blok_components",
  async (context) => {
    const { components } = context.args as { components: string };
    const names = components.split(/[\s,]+/).filter(Boolean);
    context.return({ reference: componentReference(orkestratorCatalogSpec(), names) });
  },
  {
    key: "describe_blok_components",
    version: "1",
    name: "Describe blok components",
    description:
      "Returns the props of blok components (what each takes, the values a prop allows, what a callback's event carries). Call it before using a component.",
    kind: ActionKind.Function,
    args: [{ key: "components", kind: PortKind.String, nullable: false, description: 'Component names, separated by commas: "Card, Button, Slider"' }],
    returns: [{ key: "reference", kind: PortKind.String, nullable: false }],
  },
);

globalRegistry.register(
  "write_blok",
  async (context) => {
    const { blok, source } = context.args as { blok: string; source: string };
    try {
      const editor = openBlokEditor(blok);
      if (!editor) {
        context.error("This blok is not open in the editor. Ask the person to open it there (Edit Blok); a change is shown to them before it is saved.");
        return;
      }
      const problems = sourceProblems(source, editor.read().scope);
      if (problems.length > 0) {
        context.error(`This source would not save. Fix these and write it again:\n${problems.join("\n")}`);
        return;
      }
      editor.write(source);
      context.return({ result: "Written into the editor. The person sees it in the preview and saves it when they like it." });
    } catch (error) {
      context.error(error instanceof Error ? error.message : String(error));
    }
  },
  {
    key: "write_blok",
    version: "1",
    name: "Write a blok",
    description:
      "Replaces the BSX source of a blok open in the editor. The source is checked first: one that would not save is refused with the line and the reason. Nothing is saved; the person reviews it in the preview and saves it themselves. Always send the whole source.",
    kind: ActionKind.Function,
    args: [
      { key: "blok", kind: PortKind.Structure, identifier: BLOK, nullable: false },
      { key: "source", kind: PortKind.String, nullable: false, description: 'The whole blok as BSX, starting with <Blok kind="custom" context="panel">' },
    ],
    returns: [{ key: "result", kind: PortKind.String, nullable: false }],
  },
);
