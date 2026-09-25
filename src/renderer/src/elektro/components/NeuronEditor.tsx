import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, GitBranch, HelpCircle, Pencil, Save, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { useDialog } from "@/app/dialog";
import { toBase } from "@/lib/quantities";
import { DetailNeuronModelFragment, SectionFragment } from "../api/graphql";
import {
  EditableCompartment,
  EditableModelConfig,
  EditableModelWide,
  EditableNetConnection,
  EditableNetStimulator,
  EditableNetSynapse,
} from "../lib/modelSerialization";
import { CompartmentEditor } from "./editor/CompartmentEditor";
import { MechanismCatalogProvider } from "./editor/MechanismCatalog";
import { ModelConfigPanel } from "./editor/ModelConfigPanel";
import { NetworkEditor } from "./editor/NetworkEditor";
import { MorphologyModeControls } from "./morphology/chrome/MorphologyModeControls";
import { MorphologyScaleBar } from "./morphology/chrome/MorphologyScaleBar";
import {
  MORPHOLOGY_SHORTCUTS,
  MorphologyShortcuts,
  type ShortcutGroups,
} from "./morphology/chrome/MorphologyShortcuts";
import { EditorHandles, type HoverFeed } from "./morphology/gpu/EditorHandles";
import { MorphologyCanvas } from "./morphology/gpu/MorphologyCanvas";
import { NetworkMarks } from "./morphology/gpu/NetworkMarks";
import { SectionTubes } from "./morphology/gpu/SectionTubes";
import { MorphologyLayerCard, NetworkLayerCard } from "./morphology/layers/MorphologyLayerCards";
import { buildMorphology, locationOf } from "./morphology/model/buildMorphology";
import { compartmentColors, sectionColor, sectionColors } from "./morphology/model/colouring";
import { buildNetworkLayout } from "./morphology/model/networkLayout";
import { createMorphologyStore, MorphologyStoreContext } from "./morphology/stores/morphologyStore";
import { useWebGPUGate } from "./morphology/useWebGPUGate";
import { QuantityInput } from "@/components/fields/QuantityInput";

const getParentInfo = (section: SectionFragment) => {
  if (!section.parent) return null;
  const conn = section.parent;
  return { id: conn.parent, location: conn.parentLocation ?? 1 };
};

/**
 * The editor's `?` sheet: the viewer's navigation, minus the section panels
 * (the editor selects instead), plus the editing gestures.
 */
const EDITOR_SHORTCUTS: ShortcutGroups = {
  "3D view": MORPHOLOGY_SHORTCUTS["3D view"].filter(
    (s) => !s.action.toLowerCase().includes("panel"),
  ),
  Editing: [
    { keys: ["Click section"], action: "Select it (or pick it as the new parent while rebranching)" },
    { keys: ["Shift", "Click selected"], action: "Add a child where you clicked" },
    { keys: ["+"], action: "Add a child at the selected section's end" },
    { keys: ["Click empty space"], action: "Deselect" },
  ],
  General: [
    { keys: ["F"], action: "Frame the whole model" },
    { keys: ["?"], action: "Show these shortcuts" },
  ],
};

const NO_HIGHLIGHT: readonly string[] = [];

export const NeuronEditor = ({
  initialModel,
  onSave
}: {
  initialModel: DetailNeuronModelFragment,
  onSave: (config: EditableModelConfig) => void
}) => {
  // Flatten all sections from all cells for editing
  // We assume single cell for simplicity or merge them?
  // The fragment has `config.cells`.

  const { openSheet } = useDialog();
  // The editor hosts its own morphology viewer: one store for the HUD, the
  // layer settings and the hover, shared with the canvas below.
  const [viewStore] = useState(() => createMorphologyStore({ displayMode: "3D" }));
  const gate = useWebGPUGate();
  const colorBy = useStore(viewStore, (s) => s.morphology.colorBy);
  const uniformColor = useStore(viewStore, (s) => s.morphology.uniformColor);
  const hoverFeed = useRef<HoverFeed["current"]>(null);
  const [cells, setCells] = useState(initialModel.config.cells);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [rebranchingId, setRebranchingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Model-wide config lives in its own state (the editor mutates only `cells`
  // for topology/biophysics; these scalars + lists round-trip via the Model tab).
  const [modelWide, setModelWide] = useState<EditableModelWide>(() => ({
    temperature: initialModel.config.temperature,
    vInit: initialModel.config.vInit,
    label: initialModel.config.label,
    ra: initialModel.config.ra,
    cm: initialModel.config.cm,
    ions: initialModel.config.ions ?? [],
    mechanismGlobals: initialModel.config.mechanismGlobals ?? [],
    netSynapses: initialModel.config.netSynapses ?? [],
    netStimulators: initialModel.config.netStimulators ?? [],
    netConnections: initialModel.config.netConnections ?? [],
  }));
  const patchModelWide = (update: Partial<EditableModelWide>) =>
    setModelWide(prev => ({ ...prev, ...update }));

  // We need a way to update a specific section in the deep structure
  // Or we just flatten them into a list and reconstruct?
  // The layout hook expects a flat list of sections.

  // Let's maintain a flat list of sections for the active cell (assuming 1 cell for now)
  // If multiple cells, we might need to select a cell first.

  const activeCellId = cells[0]?.id;
  const activeCell = cells.find(c => c.id === activeCellId);
  const compartments = activeCell?.biophysics.compartments || [];

  const sections = useMemo(() => {
    return cells.find(c => c.id === activeCellId)?.topology.sections || [];
  }, [cells, activeCellId]);

  const updateSection = (id: string, update: Partial<SectionFragment>) => {
    setCells(prev => prev.map(cell => {
      if (cell.id !== activeCellId) return cell;
      return {
        ...cell,
        topology: {
          ...cell.topology,
          sections: cell.topology.sections.map(s => s.id === id ? { ...s, ...update } : s)
        }
      };
    }));
  };

  const updateCompartment = (compartmentId: string, update: Partial<EditableCompartment>) => {
    setCells(prev => prev.map(cell => {
      if (cell.id !== activeCellId) return cell;
      return {
        ...cell,
        biophysics: {
          ...cell.biophysics,
          compartments: cell.biophysics.compartments.map(c =>
            c.id === compartmentId ? { ...c, ...update } : c
          )
        }
      };
    }));
  };

  const addSection = (parentId: string, location: number = 1) => {
    const newId = uuidv4();
    const newSection: SectionFragment = {
      id: newId,
      diam: "1 µm",
      nseg: 10,
      length: "10 µm",
      category: "dendrite", // Default
      coords: [],
      parent: { parent: parentId, parentLocation: location, childEnd: 0 }
    };

    setCells(prev => prev.map(cell => {
      if (cell.id !== activeCellId) return cell;
      return {
        ...cell,
        topology: {
          ...cell.topology,
          sections: [...cell.topology.sections, newSection]
        }
      };
    }));
    setSelectedSectionId(newId);
  };

  const duplicateSection = (id: string) => {
    const original = sections.find(s => s.id === id);
    if (!original) return;

    // Roots have no parent connection; a duplicate would be a second free-floating
    // root rather than a copy in place, so disallow it.
    if (!getParentInfo(original)) {
      toast.error("Root sections cannot be duplicated");
      return;
    }

    const newId = uuidv4();
    // Copy every parameter verbatim, including the parent connection, so the
    // duplicate sits exactly where the original does. Deep-copy the nested
    // arrays so the two sections don't share mutable references.
    const newSection: SectionFragment = {
      ...original,
      id: newId,
      coords: original.coords ? original.coords.map(c => ({ ...c })) : [],
      parent: original.parent ? { ...original.parent } : null,
    };

    setCells(prev => prev.map(cell => {
      if (cell.id !== activeCellId) return cell;
      return {
        ...cell,
        topology: {
          ...cell.topology,
          sections: [...cell.topology.sections, newSection]
        }
      };
    }));
    setSelectedSectionId(newId);
    toast.success("Section duplicated");
  };

  const renameSection = (oldId: string, newId: string) => {
    setCells(prev => prev.map(cell => {
      if (cell.id !== activeCellId) return cell;
      return {
        ...cell,
        topology: {
          ...cell.topology,
          sections: cell.topology.sections.map(s => {
            if (s.id === oldId) return { ...s, id: newId };
            // Re-point any child that referenced the old id as its parent.
            if (s.parent?.parent === oldId) {
              return { ...s, parent: { ...s.parent, parent: newId } };
            }
            return s;
          })
        }
      };
    }));
    if (selectedSectionId === oldId) setSelectedSectionId(newId);
  };

  const commitRename = (oldId: string) => {
    const next = renameValue.trim();
    if (!next) {
      toast.error("Name cannot be empty");
      return;
    }
    if (next === oldId) {
      setRenamingId(null);
      return;
    }
    if (sections.some(s => s.id === next)) {
      toast.error("A section with that name already exists");
      return;
    }
    renameSection(oldId, next);
    setRenamingId(null);
    toast.success("Section renamed");
  };

  const deleteSection = (id: string) => {
    const sectionToDelete = sections.find(s => s.id === id);
    if (!sectionToDelete) return;

    const parentConnection = sectionToDelete.parent;

    setCells(prev => prev.map(cell => {
      if (cell.id !== activeCellId) return cell;

      const newSections = cell.topology.sections
        .filter(s => s.id !== id)
        .map(s => {
          if (s.parent?.parent === id) {
            // This is a child of the deleted section
            if (parentConnection) {
              // Glue to grandparent
              return {
                ...s,
                parent: {
                  parent: parentConnection.parent,
                  parentLocation: parentConnection.parentLocation,
                  childEnd: parentConnection.childEnd,
                }
              };
            } else {
              // Becomes a root
              return { ...s, parent: null };
            }
          }
          return s;
        });

      return {
        ...cell,
        topology: {
          ...cell.topology,
          sections: newSections
        }
      };
    }));

    if (selectedSectionId === id) setSelectedSectionId(null);
    toast.success("Section deleted");
  };

  const handleRebranch = (childId: string, newParentId: string) => {
    if (childId === newParentId) {
      toast.error("Cannot rebranch to itself");
      return;
    }

    // Check if newParentId is a descendant of childId
    let current = sections.find(s => s.id === newParentId);
    let isCycle = false;
    while (current) {
      const parentId = current.parent?.parent;
      if (!parentId) break;
      if (parentId === childId) {
        isCycle = true;
        break;
      }
      current = sections.find(s => s.id === parentId);
    }

    if (isCycle) {
      toast.error("Cannot rebranch to a descendant (cycle detected)");
      return;
    }

    updateSection(childId, {
      parent: { parent: newParentId, parentLocation: 1, childEnd: 0 }
    });
    setRebranchingId(null);
    toast.success("Section rebranched");
  };

  const handleSegmentSelect = (id: string) => {
    if (rebranchingId) {
      handleRebranch(rebranchingId, id);
    } else {
      setSelectedSectionId(id);
    }
  };

  // --- Network layer CRUD (model-config level; round-trips via modelWide) ---

  const synapses = modelWide.netSynapses ?? [];
  const stimulators = modelWide.netStimulators ?? [];
  const connections = modelWide.netConnections ?? [];

  const addSynapse = () => {
    const newSynapse: EditableNetSynapse = {
      __typename: "Exp2Synapse",
      id: uuidv4(),
      cell: activeCellId ?? "",
      location: sections[0]?.id ?? "",
      position: 0.5,
      e: "0 mV",
      tau1: "0.5 ms",
      tau2: "2 ms",
      delay: null,
    };
    patchModelWide({ netSynapses: [...synapses, newSynapse] });
  };
  const updateSynapse = (id: string, update: Partial<EditableNetSynapse>) =>
    patchModelWide({
      netSynapses: synapses.map((s) => (s.id === id ? { ...s, ...update } : s)),
    });
  const removeSynapse = (id: string) => {
    patchModelWide({
      netSynapses: synapses.filter((s) => s.id !== id),
      // Drop connections that referenced the removed synapse.
      netConnections: connections.filter((c) => c.synapse !== id),
    });
  };

  const addStimulator = () => {
    const newStimulator: EditableNetStimulator = {
      __typename: "NetStimulator",
      id: uuidv4(),
      start: "100 ms",
      number: 1,
      interval: null,
    };
    patchModelWide({ netStimulators: [...stimulators, newStimulator] });
  };
  const updateStimulator = (
    id: string,
    update: Partial<EditableNetStimulator>,
  ) =>
    patchModelWide({
      netStimulators: stimulators.map((s) =>
        s.id === id ? { ...s, ...update } : s,
      ),
    });
  const removeStimulator = (id: string) => {
    patchModelWide({
      netStimulators: stimulators.filter((s) => s.id !== id),
      netConnections: connections.filter((c) => c.netStimulator !== id),
    });
  };

  const addConnection = () => {
    if (stimulators.length === 0 || synapses.length === 0) {
      toast.error("Add a stimulator and a synapse first");
      return;
    }
    const newConnection: EditableNetConnection = {
      __typename: "SynapticConnection",
      id: uuidv4(),
      netStimulator: stimulators[0].id,
      synapse: synapses[0].id,
      weight: "0.001 µS",
      delay: null,
      threshold: null,
    };
    patchModelWide({ netConnections: [...connections, newConnection] });
  };
  const updateConnection = (
    id: string,
    update: Partial<EditableNetConnection>,
  ) =>
    patchModelWide({
      netConnections: connections.map((c) =>
        c.id === id ? { ...c, ...update } : c,
      ),
    });
  const removeConnection = (id: string) =>
    patchModelWide({
      netConnections: connections.filter((c) => c.id !== id),
    });

  // Compartment id → CSS color, so the live 3D view (and the section swatches)
  // reflect compartment colors as they're edited.
  const categoryColor = useMemo(
    () => compartmentColors([{ biophysics: { compartments } }]),
    [compartments],
  );

  // The shared morphology — real coords where the section has them, the
  // synthetic layout for the rest (every section added here starts coords-less).
  const morphology = useMemo(
    () => buildMorphology([{ id: activeCellId ?? "cell", topology: { sections } }]),
    [sections, activeCellId],
  );
  const baseColors = useMemo(
    () =>
      sectionColors(morphology, {
        colorBy,
        compartments: categoryColor,
        importance: null,
        uniform: uniformColor,
      }),
    [morphology, colorBy, categoryColor, uniformColor],
  );
  // Swatches in the section list always show the compartment tint.
  const colorMap = useMemo(
    () =>
      new Map(
        morphology.sections.map((s) => [
          s.id,
          sectionColor(s, {
            colorBy: "compartment",
            compartments: categoryColor,
            importance: null,
            uniform: uniformColor,
          }),
        ]),
      ),
    [morphology, categoryColor, uniformColor],
  );
  const selectedSection = selectedSectionId ? morphology.byId.get(selectedSectionId) ?? null : null;
  const highlight = useMemo(
    () => (selectedSectionId ? [selectedSectionId] : NO_HIGHLIGHT),
    [selectedSectionId],
  );

  // Network layer (synapses / stimulators / connections) — placed against the
  // live morphology so it tracks edits, from the net data being edited here.
  const network = useMemo(
    () => buildNetworkLayout(modelWide, morphology),
    [modelWide, morphology],
  );

  return (
    <MorphologyStoreContext.Provider value={viewStore}>
    <MechanismCatalogProvider>
    <div className="w-full h-full relative overflow-hidden bg-black">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 w-80 max-h-[calc(100vh-2rem)]">
        <Card className="p-4 flex flex-col gap-4 h-full bg-card/95 backdrop-blur-sm">
          <div className="flex-none space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold leading-tight">Neuron Editor</h3>
                <p className="text-xs text-muted-foreground truncate">{initialModel.name}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-none text-muted-foreground"
                title="How does this work?"
                onClick={() => openSheet("neuroneditorhelp", {})}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {sections.length} section{sections.length === 1 ? "" : "s"}
            </p>

            {rebranchingId && (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded text-xs flex justify-between items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3 flex-none" />
                  Select the new parent in the view…
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-none" onClick={() => setRebranchingId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => onSave({ cells, ...modelWide })}
            >
              <Save className="w-4 h-4 mr-2" />
              Save as new model
            </Button>
          </div>

          <Tabs defaultValue="topology" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-4 flex-none">
              <TabsTrigger value="topology" className="text-xs">Topology</TabsTrigger>
              <TabsTrigger value="biophysics" className="text-xs">Biophysics</TabsTrigger>
              <TabsTrigger value="network" className="text-xs">Network</TabsTrigger>
              <TabsTrigger value="model" className="text-xs">Model</TabsTrigger>
            </TabsList>

            <TabsContent value="topology" className="flex-1 overflow-y-auto pr-2 -mr-2 mt-2">
            {sections.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-8 px-2">
                No sections yet. Add one in the 3D view to start building.
              </div>
            ) : (
            <Accordion
              type="single"
              collapsible
              value={selectedSectionId || ""}
              onValueChange={(val) => {
                // While rebranching, clicking another section in the pane picks it
                // as the new parent — mirroring the click-in-3D-view behaviour.
                if (rebranchingId && val && val !== rebranchingId) {
                  handleRebranch(rebranchingId, val);
                } else {
                  setSelectedSectionId(val);
                }
              }}
            >
              {sections.map(section => {
                const isRootSection = !getParentInfo(section);
                return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-none ring-1 ring-black/10"
                        style={{ background: colorMap.get(section.id) ?? "#888" }}
                      />
                      <span className="font-mono truncate">{section.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground text-xs truncate">({section.category || "dendrite"})</span>
                      {isRootSection && (
                        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5 flex-none">
                          root
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-4 pt-2 px-1">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        {renamingId === section.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              value={renameValue}
                              className="h-7 font-mono"
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename(section.id);
                                if (e.key === "Escape") setRenamingId(null);
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 flex-none"
                              title="Confirm rename"
                              onClick={() => commitRename(section.id)}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 flex-none"
                              title="Cancel"
                              onClick={() => setRenamingId(null)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-mono truncate flex-1">{section.id}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 flex-none"
                              title="Rename section"
                              onClick={() => {
                                setRenamingId(section.id);
                                setRenameValue(section.id);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Length</Label>
                        <QuantityInput
                          dimension="length"
                          value={section.length}
                          onChange={(val) => updateSection(section.id, { length: val })}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Diameter</Label>
                        <QuantityInput
                          dimension="length"
                          value={section.diam}
                          onChange={(val) => updateSection(section.id, { diam: val })}
                        />
                      </div>

                      {(() => {
                        const parentInfo = getParentInfo(section);
                        if (!parentInfo) return null;
                        const conn = section.parent!;
                        // Absolute distance of the connection point from the parent's
                        // start, in µm — location is a 0–1 fraction of the parent length.
                        const parentLength = toBase(
                          sections.find(s => s.id === parentInfo.id)?.length,
                          "length",
                          0,
                        );
                        const absoluteUm = parentInfo.location * parentLength;
                        return (
                          <div className="space-y-1">
                            <Label className="text-xs">Location on parent (0–1)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0} max={1} step={0.01}
                                className="w-20 flex-none"
                                value={parentInfo.location}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (isNaN(val)) return;
                                  const clamped = Math.max(0, Math.min(1, val));
                                  updateSection(section.id, {
                                    parent: { ...conn, parent: parentInfo.id, parentLocation: clamped }
                                  });
                                }}
                              />
                              <div className="relative flex-1 pt-5">
                                <div
                                  className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
                                  style={{ left: `${parentInfo.location * 100}%` }}
                                  title="Distance from the parent's start"
                                >
                                  {absoluteUm.toFixed(1)} µm
                                </div>
                                <Slider
                                  value={[parentInfo.location]}
                                  min={0} max={1} step={0.01}
                                  onValueChange={([val]) =>
                                    updateSection(section.id, {
                                      parent: { ...conn, parent: parentInfo.id, parentLocation: val }
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="space-y-2">
                        <Label className="text-xs">Compartment</Label>
                        <Select
                          value={section.category || "dendrite"}
                          onValueChange={(val) => updateSection(section.id, { category: val })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {compartments.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.id}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant={rebranchingId === section.id ? "secondary" : "outline"}
                          className="flex-1"
                          onClick={() => setRebranchingId(rebranchingId === section.id ? null : section.id)}
                        >
                          <GitBranch className="w-3 h-3 mr-2" />
                          {rebranchingId === section.id ? "Cancel" : "Rebranch"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-none px-2"
                          disabled={isRootSection}
                          title={isRootSection ? "Root sections cannot be duplicated" : "Duplicate section"}
                          onClick={() => duplicateSection(section.id)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-none px-2"
                          title="Delete section"
                          onClick={() => deleteSection(section.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                );
              })}
            </Accordion>
            )}
            </TabsContent>

            <TabsContent value="biophysics" className="flex-1 overflow-y-auto pr-2 -mr-2 mt-2">
              {compartments.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8 px-2">
                  No compartments defined for this cell.
                </div>
              ) : (
                <Accordion type="single" collapsible>
                  {compartments.map(compartment => (
                    <AccordionItem key={compartment.id} value={compartment.id}>
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono truncate">{compartment.id}</span>
                          <span className="text-muted-foreground text-xs truncate">
                            ({compartment.mechanisms.length} mech, {compartment.ions.length} ion{compartment.ions.length === 1 ? "" : "s"})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <CompartmentEditor
                          compartment={compartment}
                          onChange={(update) => updateCompartment(compartment.id, update)}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>

            <TabsContent value="network" className="flex-1 overflow-y-auto pr-2 -mr-2 mt-2">
              <NetworkEditor
                synapses={synapses}
                stimulators={stimulators}
                connections={connections}
                sectionIds={sections.map((s) => s.id)}
                onAddSynapse={addSynapse}
                onUpdateSynapse={updateSynapse}
                onRemoveSynapse={removeSynapse}
                onAddStimulator={addStimulator}
                onUpdateStimulator={updateStimulator}
                onRemoveStimulator={removeStimulator}
                onAddConnection={addConnection}
                onUpdateConnection={updateConnection}
                onRemoveConnection={removeConnection}
              />
            </TabsContent>

            <TabsContent value="model" className="flex-1 overflow-y-auto pr-2 -mr-2 mt-2">
              <ModelConfigPanel value={modelWide} patch={patchModelWide} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {gate.phase === "ready" ? (
        <MorphologyCanvas
          morphology={morphology}
          onPointerMissed={() => setSelectedSectionId(null)}
        >
          <SectionTubes
            morphology={morphology}
            baseColors={baseColors}
            highlight={highlight}
            onSectionClick={(hit, e) => {
              if (hit.section.id === selectedSectionId && e.shiftKey) {
                addSection(hit.section.id, locationOf(hit.section, hit.segment, hit.point));
              } else {
                handleSegmentSelect(hit.section.id);
              }
            }}
            onSectionMove={(hit) => hoverFeed.current?.(hit)}
          />
          <NetworkMarks network={network} />
          <EditorHandles
            hoverFeed={hoverFeed}
            selected={selectedSection}
            onAddChild={(parentId) => addSection(parentId)}
          />
        </MorphologyCanvas>
      ) : gate.phase === "unsupported" ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-xs text-white/60">
          {gate.message}
        </div>
      ) : null}

      {/* The viewer's layer cards, floating: the editor has no sidebar. */}
      <div className="pointer-events-auto absolute right-2 top-2 z-10 flex w-64 flex-col gap-1.5">
        <MorphologyLayerCard morphology={morphology} importance={null} />
        <NetworkLayerCard network={network} />
      </div>

      <MorphologyScaleBar />
      {gate.phase === "ready" && <MorphologyModeControls showDisplaySwitch={false} />}
      <MorphologyShortcuts groups={EDITOR_SHORTCUTS} />
    </div>
    </MechanismCatalogProvider>
    </MorphologyStoreContext.Provider>
  );
};
