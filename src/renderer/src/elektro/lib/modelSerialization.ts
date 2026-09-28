import {
  CellInput,
  CompartmentInput,
  ConnectionInput,
  ConnectionKind,
  CoordInput,
  DetailNeuronModelFragment,
  IonInput,
  MechanismGlobalParamInput,
  ModelConfigInput,
  NetConnectionInput,
  NetStimulatorInput,
  NetSynapseInput,
  SectionInput,
  SectionParamMapInput,
  SynapseKind,
} from "../api/graphql";
import { toBase } from "@/core/util/quantities";

// The editor works on the `config` object read via `DetailNeuronModelFragment`.
// These aliases pin the exact runtime shapes so the serializer can map them to
// the GraphQL `*Input` types without leaking Apollo's `__typename` fields (which
// the server rejects on input variables).
export type EditableConfig = DetailNeuronModelFragment["config"];
export type EditableCells = EditableConfig["cells"];
export type EditableCell = EditableCells[number];
export type EditableSection = EditableCell["topology"]["sections"][number];
export type EditableCompartment = EditableCell["biophysics"]["compartments"][number];
export type EditableIon = EditableCompartment["ions"][number];
export type EditableMechanismGlobal = EditableConfig["mechanismGlobals"][number];
export type EditableNetSynapse = NonNullable<EditableConfig["netSynapses"]>[number];
export type EditableNetStimulator = NonNullable<
  EditableConfig["netStimulators"]
>[number];
export type EditableNetConnection = NonNullable<
  EditableConfig["netConnections"]
>[number];

/**
 * What `NeuronEditor.onSave` hands back: the (possibly edited) config. `cells`
 * is always present; the model-wide scalars/lists are carried through the editor
 * state so an edited model round-trips faithfully.
 */
export type EditableModelConfig = Pick<EditableConfig, "cells"> &
  Partial<EditableModelWide>;

/**
 * The model-wide (non-`cells`) portion of the config the editor keeps as state:
 * scalars + the model-level ion / mechanism-global lists.
 */
export type EditableModelWide = Pick<
  EditableConfig,
  | "temperature"
  | "vInit"
  | "label"
  | "ra"
  | "cm"
  | "ions"
  | "mechanismGlobals"
  | "netSynapses"
  | "netStimulators"
  | "netConnections"
>;

// --- Serialization -------------------------------------------------------

const serializeCoord = (c: { x: string; y: string; z: string }): CoordInput => ({
  x: c.x,
  y: c.y,
  z: c.z,
});

const serializeConnection = (
  c: NonNullable<EditableSection["parent"]>,
): ConnectionInput => ({
  parent: c.parent,
  parentLocation: c.parentLocation,
  childEnd: c.childEnd,
});

const serializeSection = (section: EditableSection): SectionInput => {
  const input: SectionInput = {
    id: section.id,
    diam: section.diam,
    category: section.category,
    ...(section.parent ? { parent: serializeConnection(section.parent) } : {}),
  };
  // `length` is required by the server unless explicit coords are supplied.
  if (section.length != null) input.length = section.length;
  if (section.nseg != null) input.nseg = section.nseg;
  if (section.ra != null) input.ra = section.ra;
  if (section.cm != null) input.cm = section.cm;
  if (section.dLambda != null) input.dLambda = section.dLambda;
  if (section.coords && section.coords.length > 0) {
    input.coords = section.coords.map(serializeCoord);
  }
  return input;
};

const serializeIon = (ion: EditableIon): IonInput => ({
  ion: ion.ion,
  style: ion.style,
  ...(ion.reversalPotential != null ? { reversalPotential: ion.reversalPotential } : {}),
  ...(ion.internalConcentration != null
    ? { internalConcentration: ion.internalConcentration }
    : {}),
  ...(ion.externalConcentration != null
    ? { externalConcentration: ion.externalConcentration }
    : {}),
});

const serializeMechanismGlobal = (
  p: EditableMechanismGlobal,
): MechanismGlobalParamInput => ({
  mechanism: p.mechanism,
  param: p.param,
  value: p.value,
  ...(p.description != null ? { description: p.description } : {}),
});

const serializeCompartment = (compartment: EditableCompartment): CompartmentInput => ({
  id: compartment.id,
  ...(compartment.color != null ? { color: [...compartment.color] } : {}),
  mechanisms: [...compartment.mechanisms],
  ions: compartment.ions.map(serializeIon),
  sectionParams: compartment.sectionParams.map(
    (p): SectionParamMapInput => ({
      mechanism: p.mechanism,
      param: p.param,
      // The fragment reads only the uniform `value`; the server defaults the
      // distribution `kind` to UNIFORM when omitted.
      distribution: { value: p.distribution.value },
      ...(p.description != null ? { description: p.description } : {}),
    }),
  ),
});

// The synapse input carries `kind` (not read back on the Exp2Synapse type) and,
// unlike the fragment, has no `delay` — so it's dropped on the way out.
const serializeNetSynapse = (s: EditableNetSynapse): NetSynapseInput => ({
  id: s.id,
  cell: s.cell,
  location: s.location,
  position: s.position,
  e: s.e,
  tau1: s.tau1,
  tau2: s.tau2,
  kind: SynapseKind.Exp2Syn,
});

const serializeNetStimulator = (
  st: EditableNetStimulator,
): NetStimulatorInput => ({
  id: st.id,
  number: st.number,
  start: st.start,
  ...(st.interval != null ? { interval: st.interval } : {}),
});

const serializeNetConnection = (
  c: EditableNetConnection,
): NetConnectionInput => ({
  id: c.id,
  netStimulator: c.netStimulator,
  synapse: c.synapse,
  kind: ConnectionKind.Synapse,
  ...(c.weight != null ? { weight: c.weight } : {}),
  ...(c.delay != null ? { delay: c.delay } : {}),
  ...(c.threshold != null ? { threshold: c.threshold } : {}),
});

const serializeCell = (cell: EditableCell): CellInput => ({
  id: cell.id,
  topology: {
    sections: cell.topology.sections.map(serializeSection),
  },
  biophysics: {
    compartments: cell.biophysics.compartments.map(serializeCompartment),
  },
});

/**
 * Convert the editor's working model config into the `ModelConfigInput` the
 * server expects. Strips all `__typename` fields and forwards biophysics and
 * config scalars unchanged so an edited model round-trips faithfully.
 */
export const serializeModelConfig = (config: EditableModelConfig): ModelConfigInput => {
  const input: ModelConfigInput = {
    cells: config.cells.map(serializeCell),
  };
  if (config.temperature != null) input.temperature = config.temperature;
  if (config.vInit != null) input.vInit = config.vInit;
  if (config.label != null) input.label = config.label;
  if (config.ra != null) input.ra = config.ra;
  if (config.cm != null) input.cm = config.cm;
  if (config.ions != null) input.ions = config.ions.map(serializeIon);
  if (config.mechanismGlobals != null) {
    input.mechanismGlobals = config.mechanismGlobals.map(serializeMechanismGlobal);
  }
  if (config.netSynapses != null) {
    input.netSynapses = config.netSynapses.map(serializeNetSynapse);
  }
  if (config.netStimulators != null) {
    input.netStimulators = config.netStimulators.map(serializeNetStimulator);
  }
  if (config.netConnections != null) {
    input.netConnections = config.netConnections.map(serializeNetConnection);
  }
  return input;
};

// --- Validation ----------------------------------------------------------

export interface ValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  cellId?: string;
  sectionId?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const isRoot = (section: EditableSection) => !section.parent;

const validateCell = (cell: EditableCell): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const sections = cell.topology.sections;
  const push = (
    level: ValidationIssue["level"],
    code: string,
    message: string,
    sectionId?: string,
  ) => issues.push({ level, code, message, cellId: cell.id, sectionId });

  if (sections.length === 0) {
    push("error", "EMPTY_CELL", `Cell "${cell.id}" has no sections.`);
    return issues;
  }

  // Duplicate ids make the parent graph ambiguous.
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const s of sections) {
    if (seen.has(s.id)) dupes.add(s.id);
    seen.add(s.id);
  }
  dupes.forEach(id => push("error", "DUPLICATE_ID", `Duplicate section id "${id}".`, id));

  const byId = new Map(sections.map(s => [s.id, s] as const));
  const compartmentIds = new Set(cell.biophysics.compartments.map(c => c.id));

  // Per-section sanity + connection integrity.
  for (const s of sections) {
    if (s.length == null && (!s.coords || s.coords.length === 0)) {
      push("error", "NO_GEOMETRY", `Section "${s.id}" has neither length nor coords.`, s.id);
    }
    // `length`/`diam` are `Length` quantity strings ("10 µm"); compare in µm.
    const lengthUm = toBase(s.length, "length");
    if (s.length != null && !(lengthUm > 0)) {
      push("error", "BAD_LENGTH", `Section "${s.id}" has non-positive length (${s.length}).`, s.id);
    }
    if (!(toBase(s.diam, "length") > 0)) {
      push("error", "BAD_DIAM", `Section "${s.id}" has non-positive diameter (${s.diam}).`, s.id);
    }
    if (s.category && compartmentIds.size > 0 && !compartmentIds.has(s.category)) {
      push(
        "warning",
        "UNKNOWN_COMPARTMENT",
        `Section "${s.id}" references compartment "${s.category}" which is not defined in biophysics.`,
        s.id,
      );
    }

    // A section has at most one parent connection under the singular `parent`
    // shape, so multi-parent is no longer representable.
    const c = s.parent;
    if (c) {
      if (c.parent === s.id) {
        push("error", "SELF_PARENT", `Section "${s.id}" is connected to itself.`, s.id);
      } else if (!byId.has(c.parent)) {
        push(
          "error",
          "ORPHAN_BRANCH",
          `Section "${s.id}" connects to parent "${c.parent}", which does not exist (disconnected branch).`,
          s.id,
        );
      }
      if (c.parentLocation < 0 || c.parentLocation > 1) {
        push(
          "error",
          "BAD_LOCATION",
          `Section "${s.id}" has connection location ${c.parentLocation} outside [0, 1].`,
          s.id,
        );
      }
    }
  }

  // Roots / connectivity.
  const roots = sections.filter(isRoot);
  if (roots.length === 0) {
    push("error", "NO_ROOT", `Cell "${cell.id}" has no root section (every section has a parent — likely a cycle).`);
  } else if (roots.length > 1) {
    push(
      "warning",
      "MULTIPLE_ROOTS",
      `Cell "${cell.id}" has ${roots.length} disconnected root sections (${roots.map(r => r.id).join(", ")}).`,
    );
  }

  // Reachability from roots over valid parent links — finds cycles and any
  // branch stranded by a bad/missing parent.
  const childrenOf = new Map<string, EditableSection[]>();
  for (const s of sections) {
    if (isRoot(s)) continue;
    const parent = s.parent!.parent;
    if (!byId.has(parent) || parent === s.id) continue; // already reported above
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)!.push(s);
  }

  const reachable = new Set<string>();
  const stack = roots.map(r => r.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const child of childrenOf.get(id) ?? []) stack.push(child.id);
  }

  for (const s of sections) {
    if (reachable.has(s.id)) continue;
    // Orphan / self-parent already reported; flag the rest as cycle members.
    const parent = s.parent?.parent;
    if (parent && byId.has(parent) && parent !== s.id) {
      push(
        "error",
        "UNREACHABLE",
        `Section "${s.id}" is not reachable from any root (part of a cycle or detached subtree).`,
        s.id,
      );
    }
  }

  return issues;
};

/**
 * Validate the editor model for nonsensical structure before saving:
 * orphaned/disconnected branches, cycles, missing geometry, out-of-range
 * connection locations, duplicate ids, and unknown compartments.
 */
export const validateModelConfig = (config: EditableModelConfig): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!config.cells || config.cells.length === 0) {
    issues.push({ level: "error", code: "NO_CELLS", message: "Model has no cells." });
  } else {
    const cellIds = new Set<string>();
    for (const cell of config.cells) {
      if (cellIds.has(cell.id)) {
        issues.push({
          level: "error",
          code: "DUPLICATE_CELL_ID",
          message: `Duplicate cell id "${cell.id}".`,
          cellId: cell.id,
        });
      }
      cellIds.add(cell.id);
      issues.push(...validateCell(cell));
    }
  }

  const errors = issues.filter(i => i.level === "error");
  const warnings = issues.filter(i => i.level === "warning");
  return { ok: errors.length === 0, errors, warnings };
};
