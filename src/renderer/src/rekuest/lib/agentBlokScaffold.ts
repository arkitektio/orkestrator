import { parseBsx, printBsx } from "@arkitektio/bsx/bsx/index";
import type {
  AgentDependencyInput,
  BlokDemoInput,
  PortMatchInput,
  ProtocolAgentFragment,
} from "@/rekuest/api/graphql";

/**
 * "Create blok from agent": a custom blok written from what one agent offers,
 * to be changed in the editor. A panel with a readout per state and a button
 * per action that needs nothing passed, all read off ONE dependency the blok
 * declares and the action then binds to that agent.
 *
 * What the BSX names after `agents.<key>.` is the agent's own interface (the
 * runtime reads a state and sends a call by interface), so every slot of the
 * dependency is keyed by it. Pure: only type imports from the generated api.
 */

/** `agents.<key>.<these>` are the agent's own fields, never a state or an action. */
const RESERVED = new Set(["tasks", "assets", "id", "name", "connected"]);
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** A blok is a starting point, not a dump: what is left out is added by hand. */
const MAX_STATES = 8;
const MAX_PORTS = 8;
const MAX_ACTIONS = 12;

/** The port kinds a `<Text>` shows as they are. */
const SCALAR = new Set(["STRING", "INT", "FLOAT", "BOOL", "DATE", "ENUM"]);

export const nameable = (name: string) => IDENTIFIER.test(name) && !RESERVED.has(name);

/** Text between quotes in an attribute: nothing that would end it or open an expression. */
const literal = (text: string) =>
  text
    .replace(/["{}<>\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** `live.arkitekt.stage-controller` → `stage_controller`: what the blok calls the agent. */
export const dependencyKeyFor = (agent: Pick<ProtocolAgentFragment, "name" | "app">): string => {
  const candidates = [agent.app?.identifier?.split(/[./:]/).filter(Boolean).pop(), agent.name];
  for (const candidate of candidates) {
    const slug = (candidate ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^(\d)/, "_$1");
    // `self` is an agent blok's own agent, not a key a custom blok binds.
    if (slug && slug !== "self" && IDENTIFIER.test(slug)) return slug;
  }
  return "agent";
};

/** `name`, or `name 2`, `name 3`…: creating a blok under a taken name would change that blok. */
export const uniqueName = (name: string, taken: readonly string[]): string => {
  const used = new Set(taken.map((entry) => entry.trim().toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  for (let index = 2; ; index += 1) {
    const candidate = `${name} ${index}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
};

export type Port = { key: string; kind: string; label?: string | null; nullable?: boolean | null; identifier?: string | null };

export const match = (port: Port): PortMatchInput => ({
  key: port.key,
  kind: port.kind as PortMatchInput["kind"],
  ...(port.identifier ? { identifier: port.identifier } : {}),
});

const placeholder = (port: Port): unknown => {
  switch (port.kind) {
    case "INT":
      return 0;
    case "FLOAT":
      return 0.5;
    case "BOOL":
      return true;
    default:
      return port.label ?? port.key;
  }
};

export type AgentBlokScaffold = {
  name: string;
  description: string;
  /** The key the blok reads each agent by, per agent id: what it is bound under. */
  bindings: { agent: string; key: string }[];
  source: string;
  demo: BlokDemoInput;
  dependencies: AgentDependencyInput[];
  /** What the agents offer that the scaffold could not write, by name: said to the user, never dropped silently. */
  skipped: string[];
};

/** One agent's part of the blok: its heading, a card per state, its buttons; and what the blok declares of it. */
const agentSection = (agent: ProtocolAgentFragment, key: string) => {
  const agentName = literal(agent.name || agent.app?.identifier || "Agent") || "Agent";
  const skipped: string[] = [];

  const states = agent.states
    .filter((state) => {
      if (nameable(state.interface)) return true;
      skipped.push(state.interface);
      return false;
    })
    .slice(0, MAX_STATES)
    .map((state) => ({
      interface: state.interface,
      title: literal(state.definition.name || state.interface) || state.interface,
      ports: (state.definition.ports as Port[]).filter((port) => IDENTIFIER.test(port.key)),
    }));

  // One button per interface, for what runs with nothing passed.
  const seen = new Set<string>(states.map((state) => state.interface));
  const actions = agent.implementations
    .filter((implementation) => {
      if (seen.has(implementation.interface)) return false;
      seen.add(implementation.interface);
      const args = implementation.action.args as Port[];
      if (nameable(implementation.interface) && args.every((arg) => arg.nullable)) return true;
      skipped.push(implementation.action.name || implementation.interface);
      return false;
    })
    .slice(0, MAX_ACTIONS);

  const lines: string[] = [
    '<Column gap="1rem">',
    '<Row align="center" justify="between" gap="0.75rem">',
    `<Heading text="${agentName}" />`,
    `<Badge text={agents.${key}.connected ? "Online" : "Offline"} />`,
    "</Row>",
  ];
  for (const state of states) {
    const shown = state.ports.filter((port) => SCALAR.has(port.kind)).slice(0, MAX_PORTS);
    lines.push("<Card>", "<CardHeader>", `<CardTitle text="${state.title}" />`, "</CardHeader>", "<CardContent>");
    lines.push('<Column gap="0.25rem">');
    for (const port of shown) {
      lines.push(
        '<Row align="baseline" justify="between" gap="0.75rem">',
        `<Label text="${literal(port.label || port.key) || port.key}" />`,
        `<Text text={agents.${key}.${state.interface}.${port.key}} />`,
        "</Row>",
      );
    }
    if (shown.length === 0) lines.push(`<Text text="Read its fields as agents.${key}.${state.interface}.field" />`);
    lines.push("</Column>", "</CardContent>", "</Card>");
  }
  if (actions.length > 0) {
    lines.push('<Row wrap gap="0.5rem">');
    for (const implementation of actions) {
      const label = literal(implementation.action.name || implementation.interface) || implementation.interface;
      lines.push(`<Button label="${label}" onClick={agents.${key}.${implementation.interface}()} />`);
    }
    lines.push("</Row>");
  }
  lines.push("</Column>");

  const dependency: AgentDependencyInput = {
    key,
    app: agent.app?.identifier ?? null,
    name: agent.name || null,
    description: `The agent this blok was made from (${agentName}).`,
    optional: false,
    autoResolvable: false,
    // None declared: any name is accepted, which is not what an empty list says.
    actionDependencies: actions.length
      ? actions.map((implementation) => ({
          key: implementation.interface,
          description: implementation.action.description || null,
          optional: false,
          demand: { argMatches: (implementation.action.args as Port[]).map(match) },
        }))
      : null,
    stateDependencies: states.length
      ? states.map((state) => ({
          key: state.interface,
          optional: false,
          demand: { matches: state.ports.map(match) },
        }))
      : null,
  };

  const demo = {
    name: agentName,
    connected: true,
    ...Object.fromEntries(
      states.map((state) => [
        state.interface,
        Object.fromEntries(state.ports.filter((port) => SCALAR.has(port.kind)).map((port) => [port.key, placeholder(port)])),
      ]),
    ),
  };

  return { agentName, lines, dependency, demo, skipped };
};

/** "A", "A + B", "A + 2 more": what a blok made from these agents is called. */
const joinedName = (names: readonly string[]): string =>
  names.length <= 2 ? names.join(" + ") : `${names[0]} + ${names.length - 1} more`;

/**
 * One blok from one or several agents: each its own part, side by side where
 * there is room, each read through a dependency of its own. Two agents of one
 * app get two keys (`stage`, `stage_2`): they are bound separately.
 */
export const scaffoldAgentsBlok = (
  agents: readonly ProtocolAgentFragment[],
  takenNames: readonly string[] = [],
): AgentBlokScaffold => {
  if (agents.length === 0) throw new Error("A blok is made from at least one agent");
  const keys = new Set<string>();
  const sections = agents.map((agent) => {
    const base = dependencyKeyFor(agent);
    let key = base;
    for (let index = 2; keys.has(key); index += 1) key = `${base}_${index}`;
    keys.add(key);
    return { agent: agent.id, key, ...agentSection(agent, key) };
  });

  const several = sections.length > 1;
  const lines = [
    '<Blok kind="custom" context="panel">',
    several ? '<Grid minColumnWidth="20rem" gap="1.5rem" padding="1rem">' : '<Column padding="1rem">',
    ...sections.flatMap((section) => section.lines),
    several ? "</Grid>" : "</Column>",
    "</Blok>",
  ];

  // Through the library's own parser and printer: what is saved is BSX as the
  // editor would write it, and a scaffold that does not parse never leaves here.
  const source = printBsx(parseBsx(lines.join("\n")).tree);
  const names = sections.map((section) => section.agentName);

  return {
    name: uniqueName(`${joinedName(names)} panel`, takenNames),
    description: `Made from ${names.join(", ")}: ${several ? "their" : "its"} states and what ${several ? "they" : "it"} can do.`,
    bindings: sections.map((section) => ({ agent: section.agent, key: section.key })),
    source,
    demo: { deps: Object.fromEntries(sections.map((section) => [section.key, section.demo])) },
    dependencies: sections.map((section) => section.dependency),
    skipped: sections.flatMap((section) => section.skipped),
  };
};

/** The blok of one agent. */
export const scaffoldAgentBlok = (agent: ProtocolAgentFragment, takenNames: readonly string[] = []): AgentBlokScaffold =>
  scaffoldAgentsBlok([agent], takenNames);
