import { analyzeBsx, type BlokCheckScope } from "@arkitektio/bsx/bsx/index";
import type { SpecCatalogJson, SpecComponentJson } from "@arkitektio/bsx/renderer/runtime/describe";
import type { DependencyDraft } from "./blokDependencies";
import { parsePort, portSummary } from "@arkitektio/bsx/spec/ports";

/**
 * What an assistant needs to write a blok, as text it can read: how BSX is
 * written, which components there are, what a draft declares of its agents,
 * and what is wrong with a source it proposes. Pure, so the same words are
 * tested here and handed out by the app's agent (`rekuest/agentTools.ts`).
 */

export const BSX_GUIDE = `A blok is ONE element, written in BSX (JSX-like markup, no JavaScript):

<Blok kind="custom" context="panel">
  <Column gap="1rem" padding="1rem">
    <Heading text="Stage" />
    <Text text={agents.stage.position.x} />
    <Button label="Home" onClick={agents.stage.home()} />
  </Column>
</Blok>

Rules:
- The root is always <Blok kind="custom" context="panel"> (or context="scene" for a 3D scene).
- A prop in quotes is a literal: label="Go". A prop in braces is an expression: text={agents.stage.position.x}.
- Read an agent's state as agents.<key>.<state>.<field>. Its own fields are agents.<key>.name and agents.<key>.connected.
- Call an agent's action ONLY in a callback prop, with named arguments: onClick={agents.<key>.<action>(x: 1, y: 2)}.
  Add "into <name>" to keep its task: onClick={agents.stage.move(x: 1) into move}, then read move.running, move.returns.
- <key>, <state> and <action> must be ones the blok declares (see "Agents" below). Do not invent them.
- Expressions may use ?: and comparisons, and call functions such as str.upper(x) or fmt.duration(x). No arrow functions, no statements.
- Form state is a <local name="x" default={3} /> as the first child of the element it belongs to; a control binds it with bind={x}.
- Text between tags fills the component's text prop where it has one: <Button>Go</Button>.
- Layout: Column, Row, Flex and Grid take gap, padding, justify, align and wrap, NOT className. Card, div and most others take className (Tailwind).
- Only components of the catalog exist. Ask for a component's props before using one you have not used.`;

const oneLine = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

/** Every component a blok of `context` may use, one per line, with what it is. */
export const componentIndex = (catalog: SpecCatalogJson, context: "PANEL" | "SCENE" = "PANEL"): string =>
  catalog.components
    .filter((component) => component.context === context && /^[A-Z]/.test(component.name))
    .map((component) => {
      const description = oneLine(component.description);
      return description ? `${component.name}: ${description}` : component.name;
    })
    .join("\n");

const propLine = (prop: SpecComponentJson["props"][number]) =>
  [
    `  ${prop.key}${prop.required ? " (required)" : ""}: ${portSummary(parsePort(prop.port, prop.key))}`,
    oneLine(prop.description) ? ` — ${oneLine(prop.description)}` : "",
  ].join("");

/** The props of the named components; a name the catalog does not have is said so, with the nearest ones. */
export const componentReference = (catalog: SpecCatalogJson, names: readonly string[]): string =>
  names
    .map((raw) => {
      const name = raw.trim();
      const component = catalog.components.find((candidate) => candidate.name === name);
      if (!component) {
        const near = catalog.components
          .filter((candidate) => candidate.name.toLowerCase().includes(name.toLowerCase()))
          .slice(0, 6)
          .map((candidate) => candidate.name);
        return `<${name}> does not exist.${near.length ? ` Did you mean: ${near.join(", ")}?` : ""}`;
      }
      return [
        `<${component.name}>${oneLine(component.description) ? ` — ${oneLine(component.description)}` : ""}`,
        component.text_prop ? `  text between its tags fills "${component.text_prop}"` : "",
        component.downstream_of.length ? `  only inside: ${component.downstream_of.join(" or ")}` : "",
        component.accepts_children ? "  takes children" : "  takes no children",
        ...component.props.filter((prop) => prop.key !== "children").map(propLine),
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

/** What a draft declares of its agents, as the BSX may name them. */
export const describeAgents = (dependencies: readonly DependencyDraft[]): string =>
  dependencies.length === 0
    ? "This blok declares no agents: it cannot read a state or call an action."
    : dependencies
        .map((dependency) =>
          [
            `agents.${dependency.key}${dependency.app ? ` (app ${dependency.app})` : ""}${dependency.description ? ` — ${dependency.description}` : ""}`,
            dependency.actions.length
              ? `  actions: ${dependency.actions
                  .map((action) => {
                    const args = action.demand?.argMatches?.map((match) => match.key).filter(Boolean) ?? [];
                    return `${action.key}(${args.join(", ")})`;
                  })
                  .join(", ")}`
              : "  actions: any name is accepted (none declared)",
            dependency.states.length
              ? `  states: ${dependency.states
                  .map((state) => {
                    const fields = state.demand?.matches?.map((match) => match.key).filter(Boolean) ?? [];
                    return fields.length ? `${state.key}{${fields.join(", ")}}` : state.key;
                  })
                  .join(", ")}`
              : "  states: any name is accepted (none declared)",
          ].join("\n"),
        )
        .join("\n");

const lineOf = (source: string, offset: number) => {
  const before = source.slice(0, Math.max(0, offset));
  const line = before.split("\n").length;
  return { line, column: before.length - before.lastIndexOf("\n") };
};

/** Why a proposed source would not save, one per line with where; empty when it would. */
export const sourceProblems = (source: string, scope: BlokCheckScope): string[] =>
  analyzeBsx(source, { scope })
    .markers.filter((marker) => marker.severity === "error")
    .map((marker) => {
      const { line, column } = lineOf(source, marker.range.start);
      return `line ${line}, column ${column}: ${marker.message}`;
    });
