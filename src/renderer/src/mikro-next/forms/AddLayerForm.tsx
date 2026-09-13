import { Guard } from "@/app/Arkitekt";
import { useGraphQLDialog } from "@/app/hooks/useGraphQLDialog";
import { ChoicesField } from "@/components/fields/ChoicesField";
import { FloatField } from "@/components/fields/FloatField";
import { SwitchField } from "@/components/fields/SwitchField";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { modifierSpecsOf, spatialSpecOf } from "@/mikro-next/specs";
import {
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Shapes,
  Share2,
  Spline,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Blending,
  ColorMap,
  ColumnRole,
  PhasorColorMode,
  ProjectionMode,
  useAddLayerLensCapabilitiesQuery,
  useAddLayerLineageQuery,
  useAddLayerReachableQuery,
  useAddLayerWorldGraphQuery,
  useCreateAnnotationLayerMutation,
  useCreateIntensityLayerMutation,
  useCreateLabelLayerMutation,
  useCreateMeshLayerMutation,
  useCreateNetworkLayerMutation,
  useCreatePhasorLayerMutation,
  useCreatePointLayerMutation,
  useCreateRgbLayerMutation,
  useCreateTrackLayerMutation,
  useCreateVectorLayerMutation,
  useCreateVolumeLayerMutation,
  useGetLensPhasorQuery,
} from "../api/graphql";
import {
  AnnotationEntry,
  Capabilities,
  DatasetEntry,
  Entry,
  LAYER_KIND_INFO,
  LayerKind,
  MeshEntry,
  NetworkEntry,
  Section,
  Source,
  SpaceRef,
  TABLE_KIND_INFO,
  TableEntry,
  TableKind,
  buildSections,
} from "./addLayer/candidates";
import {
  stagedFromLayers,
  suggestLensKinds,
  suggestTableKinds,
  type Evidence,
  type LensSuggestion,
  type Relation,
} from "./addLayer/engine";
import {
  graphFromComponent,
  graphFromLineage,
  mergeGraphs,
  type DerivationGraph,
} from "./addLayer/spaceGraph";

// The mutation options every layer creation submits with: the scene view
// reinitializes its stores when the GetScene result changes, so the new layer
// appears without any store plumbing.
const REFETCH_SCENE = {
  refetchQueries: ["GetScene"],
  awaitRefetchQueries: true,
};

const DIALOG_OPTIONS = {
  successMessage: "Layer added",
  errorPrefix: "Could not add layer",
};

const kindButton = (active: boolean) =>
  `rounded border px-3 py-1 text-sm transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-input hover:bg-accent"
  }`;

/** Where an entry lives — a caption, since the picker no longer groups by it. */
const SpaceCaption = (props: { space: SpaceRef }) =>
  props.space.isWorld ? (
    <span>{"in this scene's world"}</span>
  ) : (
    <span>in {props.space.name}</span>
  );

/**
 * Why the engine chose what it chose: one line per piece of evidence for the
 * chosen kind, then what it saw but could not act on — a lineage that says
 * "mask" where the server will not draw one, or a parent it has not reached
 * yet. Muted, because it is a justification and not a control.
 */
const EvidenceList = (props: {
  evidence: readonly Evidence[];
  notes: readonly Evidence[];
  loading?: boolean;
}) => {
  if (!props.evidence.length && !props.notes.length && !props.loading) return null;
  return (
    <ul className="flex flex-col gap-0.5 border-t border-input pt-2 text-xs text-muted-foreground">
      {props.evidence.map((item, index) => (
        <li key={`${item.rule}-${index}`} className="flex gap-1.5">
          <span aria-hidden className="text-primary/70">·</span>
          <span>{item.summary}</span>
        </li>
      ))}
      {props.notes.map((item, index) => (
        <li key={`note-${item.rule}-${index}`} className="flex gap-1.5 italic">
          <span aria-hidden>·</span>
          <span>
            {item.summary}
            {item.kind && item.kind in LAYER_KIND_INFO
              ? ` — but it cannot be drawn as ${LAYER_KIND_INFO[item.kind as LayerKind].title.toLowerCase()} here`
              : ""}
          </span>
        </li>
      ))}
      {props.loading && (
        <li className="flex gap-1.5 italic">
          <span aria-hidden>·</span>
          <span>looking further up its lineage…</span>
        </li>
      )}
    </ul>
  );
};

/**
 * What a thing becomes, stated rather than asked.
 *
 * The inferred kind is the answer; the alternatives exist for the case where the
 * inference is not what someone wanted, and stay folded away until then. A
 * source with only one possible kind shows a sentence and no control at all.
 * The evidence behind the answer sits under it, so a surprising default can be
 * read before it is overridden.
 */
const InferredKind = <K extends string>(props: {
  kinds: readonly K[];
  info: Record<K, { title: string; description: string }>;
  value: K;
  onChange: (kind: K) => void;
  evidence?: readonly Evidence[];
  notes?: readonly Evidence[];
  loading?: boolean;
  /** Kinds the evidence argued for but the server would refuse, with why. */
  blocked?: readonly { kind: K; reason: string }[];
}) => {
  const [open, setOpen] = useState(false);
  const chosen = props.info[props.value];

  return (
    <div className="flex flex-col gap-2 rounded border border-input p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium">{chosen.title}</div>
          <div className="text-xs text-muted-foreground">
            {chosen.description}
          </div>
        </div>
        {(props.kinds.length > 1 || !!props.blocked?.length) && (
          <button
            type="button"
            onClick={() => setOpen((was) => !was)}
            className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            {open ? "never mind" : "show it differently"}
          </button>
        )}
      </div>
      {open && (
        <div className="flex flex-wrap gap-2 border-t border-input pt-2">
          {props.kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className={kindButton(kind === props.value)}
              title={props.info[kind].description}
              onClick={() => {
                props.onChange(kind);
                setOpen(false);
              }}
            >
              {props.info[kind].title}
            </button>
          ))}
          {props.blocked?.map((item) => (
            <button
              key={`blocked-${item.kind}`}
              type="button"
              disabled
              className={`${kindButton(false)} cursor-not-allowed opacity-50`}
              title={item.reason}
            >
              {props.info[item.kind].title}
            </button>
          ))}
        </div>
      )}
      <EvidenceList
        evidence={props.evidence ?? []}
        notes={props.notes ?? []}
        loading={props.loading}
      />
    </div>
  );
};

/** How a row relates to what the scene already draws, as a caption. */
const RelationCaption = (props: { relation: Relation | null }) => {
  if (!props.relation) return null;
  const emphasised = props.relation.kind !== "staged";
  return (
    <span className={emphasised ? "text-primary/80" : ""}>
      {props.relation.summary}
    </span>
  );
};

/** What this row would become, in one word. */
const Badge = (props: { children: string }) => (
  <span className="shrink-0 rounded-full border border-input px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
    {props.children}
  </span>
);

const EntryRow = (props: {
  icon: LucideIcon;
  title: string;
  subtitle?: React.ReactNode;
  badge?: string;
  /** How it relates to the scene — a second caption line, when there is one. */
  relation?: Relation | null;
  onClick: () => void;
  /** Rendered before the badge — the expander on a multi-lens dataset. */
  trailing?: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 rounded border border-input transition-colors hover:bg-accent">
    <button
      type="button"
      onClick={props.onClick}
      className="flex min-w-0 flex-1 items-center gap-2 p-2 text-left"
    >
      <props.icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{props.title}</div>
        {props.subtitle && (
          <div className="truncate text-xs text-muted-foreground">
            {props.subtitle}
          </div>
        )}
        {props.relation && (
          <div className="truncate text-xs text-muted-foreground">
            <RelationCaption relation={props.relation} />
          </div>
        )}
      </div>
      {props.relation?.kind === "staged" && <Badge>in scene</Badge>}
      {props.badge && <Badge>{props.badge}</Badge>}
    </button>
    {props.trailing}
  </div>
);

/**
 * A dataset, and — only when there is more than one — the lenses onto it.
 *
 * The entry itself adds the first lens, which sorting has made the unsliced one:
 * that is what someone means by "the dataset". A dataset with a single lens
 * renders no children at all, since a lone child row saying "full" is the
 * clutter this picker exists to be rid of.
 */
const DatasetEntryView = (props: {
  entry: DatasetEntry;
  onSelect: (source: Source) => void;
}) => {
  const { entry } = props;
  const [open, setOpen] = useState(false);
  const primary = entry.lenses[0];
  const spatial = spatialSpecOf(entry.specs);
  const modifiers = modifierSpecsOf(entry.specs);

  const subtitle = [
    ...(spatial ? [spatial.short] : []),
    ...modifiers.map((modifier) => modifier.short),
  ].join(" · ");

  return (
    <div className="flex flex-col gap-1">
      <EntryRow
        icon={spatial?.icon ?? ImageIcon}
        title={entry.name}
        subtitle={
          <>
            {subtitle && <span>{subtitle} · </span>}
            <SpaceCaption space={primary.space} />
          </>
        }
        badge={LAYER_KIND_INFO[primary.kinds[0]].title.toLowerCase()}
        relation={entry.relation}
        onClick={() =>
          props.onSelect({ kind: "lens", dataset: entry, option: primary })
        }
        trailing={
          entry.lenses.length > 1 && (
            <button
              type="button"
              onClick={() => setOpen((was) => !was)}
              className="flex shrink-0 items-center gap-1 self-stretch border-l border-input px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {open ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              {entry.lenses.length} lenses
            </button>
          )
        }
      />
      {open && entry.lenses.length > 1 && (
        <div className="flex flex-col gap-1 border-l border-input pl-3">
          {entry.lenses.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() =>
                props.onSelect({ kind: "lens", dataset: entry, option })
              }
              className="flex items-center gap-2 rounded border border-input/60 p-2 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs">{option.label}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  <SpaceCaption space={option.space} />
                </div>
              </div>
              <Badge>{LAYER_KIND_INFO[option.kinds[0]].title.toLowerCase()}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const EntryView = (props: {
  entry: Entry;
  onSelect: (source: Source) => void;
}) => {
  const { entry } = props;
  switch (entry.kind) {
    case "dataset":
      return <DatasetEntryView entry={entry} onSelect={props.onSelect} />;
    case "mesh":
      return (
        <EntryRow
          icon={Shapes}
          title={entry.name}
          subtitle={
            <>
              {entry.secondary ? `${entry.secondary} · ` : ""}
              <SpaceCaption space={entry.space} />
            </>
          }
          badge="mesh"
          relation={entry.relation}
          onClick={() => props.onSelect({ kind: "mesh", entry })}
        />
      );
    case "network":
      return (
        <EntryRow
          icon={Share2}
          title={entry.name}
          subtitle={
            <>
              {entry.secondary ? `${entry.secondary} · ` : ""}
              <SpaceCaption space={entry.space} />
            </>
          }
          badge="network"
          relation={entry.relation}
          onClick={() => props.onSelect({ kind: "network", entry })}
        />
      );
    case "table":
      return (
        <EntryRow
          icon={Table2}
          title={entry.name}
          subtitle={
            <>
              {entry.secondary ? `${entry.secondary} · ` : ""}
              <SpaceCaption space={entry.space} />
            </>
          }
          badge={TABLE_KIND_INFO[entry.kinds[0]].title.toLowerCase()}
          relation={entry.relation}
          onClick={() => props.onSelect({ kind: "table", entry })}
        />
      );
    case "annotation":
      return (
        <EntryRow
          icon={Spline}
          title={entry.name}
          subtitle={
            <>
              {entry.secondary ? `${entry.secondary} · ` : ""}
              <SpaceCaption space={entry.space} />
            </>
          }
          badge="annotations"
          relation={entry.relation}
          onClick={() => props.onSelect({ kind: "annotation", entry })}
        />
      );
  }
};

const SectionView = (props: {
  section: Section;
  onSelect: (source: Source) => void;
}) => (
  <div className="flex flex-col gap-1">
    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {props.section.title}
    </div>
    {props.section.entries.map((entry) => (
      <EntryView key={entry.key} entry={entry} onSelect={props.onSelect} />
    ))}
  </div>
);

/** The choices a phasor layer asks for up front. */
const PHASOR_MODES = [
  { value: PhasorColorMode.Phase, label: "Phase lifetime (τφ)" },
  { value: PhasorColorMode.Modulation, label: "Modulation lifetime (τm)" },
  { value: PhasorColorMode.Average, label: "Average of both" },
];

/**
 * Step 2a: a lens becomes an image layer.
 *
 * Which kind is not asked — the engine already answered, from the server's
 * capability sets, the lens's structure and its lineage — so this step states
 * the answer, shows the evidence, and asks only what the answer itself needs
 * (a projection mode for a volume, a harmonic for a phasor). The other kinds
 * live behind the disclosure. The deeper lineage arrives a moment after the
 * step opens; the stated kind follows it unless someone has already chosen
 * otherwise by hand.
 *
 * The first frame's styling is the engine's too: the next unstaged channel of
 * a multichannel source in the composite's next colour, or the look a staged
 * sibling over the same values already has.
 */
const LensLayerForm = (props: {
  scene: string;
  source: Extract<Source, { kind: "lens" }>;
  suggestion: LensSuggestion;
  lineageLoading: boolean;
  onBack: () => void;
}) => {
  const { option } = props.source;
  const { suggestion } = props;
  const [kind, setKind] = useState<LayerKind>(suggestion.kinds[0]);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched && suggestion.kinds[0]) setKind(suggestion.kinds[0]);
  }, [suggestion, touched]);

  const chosen = suggestion.suggestions.find((entry) => entry.kind === kind);
  const blocked = useMemo(() => {
    const seen = new Map<LayerKind, string>();
    for (const note of suggestion.notes) {
      if (note.kind && note.kind in LAYER_KIND_INFO && !seen.has(note.kind as LayerKind)) {
        seen.set(note.kind as LayerKind, `${note.summary} — the server will not draw it that way here`);
      }
    }
    return [...seen].map(([blockedKind, reason]) => ({ kind: blockedKind, reason }));
  }, [suggestion.notes]);
  const notes = suggestion.notes.filter((note) => !note.kind || !(note.kind in LAYER_KIND_INFO));

  const [createIntensity] = useCreateIntensityLayerMutation();
  const [createRgb] = useCreateRgbLayerMutation();
  const [createVolume] = useCreateVolumeLayerMutation();
  const [createLabel] = useCreateLabelLayerMutation();
  const [createVector] = useCreateVectorLayerMutation();
  const [createPhasor] = useCreatePhasorLayerMutation();

  const submitIntensity = useGraphQLDialog(createIntensity, DIALOG_OPTIONS);
  const submitRgb = useGraphQLDialog(createRgb, DIALOG_OPTIONS);
  const submitVolume = useGraphQLDialog(createVolume, DIALOG_OPTIONS);
  const submitLabel = useGraphQLDialog(createLabel, DIALOG_OPTIONS);
  const submitVector = useGraphQLDialog(createVector, DIALOG_OPTIONS);
  const submitPhasor = useGraphQLDialog(createPhasor, DIALOG_OPTIONS);

  const { defaults } = suggestion;
  const form = useForm({
    defaultValues: {
      mode: ProjectionMode.Mip as string,
      harmonic: String(defaults.phasor?.harmonic ?? 1),
      phasorMode: (defaults.phasor?.mode ?? PhasorColorMode.Phase) as string,
    },
  });
  const harmonic = Number.parseInt(form.watch("harmonic"), 10) || 1;

  // The phasor's own context — bin count, axis type, calibration — is per
  // (axis, harmonic) and lives on the lens; it is fetched here and not by the
  // picker, which would otherwise walk it for every reachable lens.
  const { data: phasorData } = useGetLensPhasorQuery({
    variables: { id: option.lens.id, axis: defaults.phasor?.phasorAxis, harmonic },
    skip: kind !== "PHASOR" || !defaults.phasor,
  });
  const phasorContext = phasorData?.lens.phasor;

  const intensityInput = () => {
    const intensity = defaults.intensity;
    if (!intensity) return {};
    return {
      intensityIndex: intensity.intensityIndex,
      colormap: intensity.colormap as ColorMap,
      blending: intensity.blending as Blending,
      climMin: intensity.climMin ?? undefined,
      climMax: intensity.climMax ?? undefined,
      gamma: intensity.gamma ?? undefined,
    };
  };

  const onSubmit = form.handleSubmit(async (data) => {
    const base = { lens: option.lens.id, scene: props.scene };
    switch (kind) {
      case "INTENSITY":
        return submitIntensity({
          variables: { input: { ...base, ...intensityInput() } },
          ...REFETCH_SCENE,
        });
      case "RGB":
        return submitRgb({
          variables: { input: { ...base, ...(defaults.rgb ?? {}) } },
          ...REFETCH_SCENE,
        });
      case "VOLUME":
        return submitVolume({
          variables: {
            input: { ...base, ...intensityInput(), mode: data.mode as ProjectionMode },
          },
          ...REFETCH_SCENE,
        });
      case "LABEL":
        return submitLabel({ variables: { input: base }, ...REFETCH_SCENE });
      case "VECTOR":
        // Which axis carries the components is not asked: the server derives it
        // from the lens' DISPLACEMENT axis, the way point coordinates come from
        // the table's declared roles.
        return submitVector({ variables: { input: base }, ...REFETCH_SCENE });
      case "PHASOR": {
        const phasor = defaults.phasor;
        if (!phasor) return;
        return submitPhasor({
          variables: {
            input: {
              ...base,
              phasorAxis: phasor.phasorAxis,
              harmonic,
              intensityAxis: phasor.intensityAxis ?? undefined,
              intensityIndex: phasor.intensityIndex,
              blending: phasor.blending as Blending,
              transfer: {
                colormap: phasor.colormap as ColorMap,
                mode: data.phasorMode as PhasorColorMode,
                weightByIntensity: phasor.weightByIntensity,
              },
            },
          },
          ...REFETCH_SCENE,
        });
      }
    }
  });

  const styling = defaults.intensity;
  const showsStyling = kind === "INTENSITY" || kind === "VOLUME";

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <InferredKind
          kinds={suggestion.kinds}
          info={LAYER_KIND_INFO}
          value={kind}
          onChange={(next) => {
            setTouched(true);
            setKind(next);
          }}
          evidence={chosen?.evidence ?? []}
          notes={notes}
          blocked={blocked}
          loading={props.lineageLoading && !suggestion.resolved}
        />

        {showsStyling && styling && (
          <div className="text-xs text-muted-foreground">
            Channel {styling.intensityIndex} through {styling.colormap.toLowerCase()},{" "}
            {styling.blending.toLowerCase()} blending
            {styling.inheritedFrom ? ` — the look of ${styling.inheritedFrom}` : ""}.
            Adjust it on the layer card once it is drawn.
          </div>
        )}

        {kind === "VOLUME" && (
          <ChoicesField
            name="mode"
            label="Projection mode"
            description="How the volume is projected through its z-axis"
            options={[
              { value: ProjectionMode.Mip, label: "Maximum intensity (MIP)" },
              { value: ProjectionMode.AttenuatedMip, label: "Attenuated MIP" },
              { value: ProjectionMode.Volume, label: "Alpha volume" },
              { value: ProjectionMode.Isosurface, label: "Isosurface" },
            ]}
          />
        )}

        {kind === "PHASOR" && defaults.phasor && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <ChoicesField
                name="harmonic"
                label="Harmonic"
                description="Which harmonic of the transform to take"
                options={[
                  { value: "1", label: "First" },
                  { value: "2", label: "Second" },
                  { value: "3", label: "Third" },
                ]}
              />
              <ChoicesField
                name="phasorMode"
                label="Colour by"
                description="Which phasor quantity each pixel's hue follows"
                options={PHASOR_MODES}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {phasorContext
                ? `${phasorContext.bins} bins along ${phasorContext.axis} (${phasorContext.axisType.toLowerCase()})${phasorContext.calibration ? ", calibrated" : ", uncalibrated"}`
                : `Along its ${defaults.phasor.phasorAxis} axis`}
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={props.onBack}>
            Back
          </Button>
          <Button type="submit">Add layer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Step 2b: a TableDataset becomes a point or track layer. The coordinate, time
 * and track-id columns are not chosen here: the server derives them from the
 * dataset's declared column schema. Only the styling columns — which have no
 * declared role to derive from — are picked.
 */
const TableLayerForm = (props: {
  scene: string;
  entry: TableEntry;
  graph: DerivationGraph;
  onBack: () => void;
}) => {
  const columns = props.entry.table.columns;
  const [kind, setKind] = useState<TableKind>(props.entry.kinds[0]);

  const [createPoint] = useCreatePointLayerMutation();
  const [createTrack] = useCreateTrackLayerMutation();
  const submitPoint = useGraphQLDialog(createPoint, DIALOG_OPTIONS);
  const submitTrack = useGraphQLDialog(createTrack, DIALOG_OPTIONS);

  const defaults = useMemo(
    () => ({
      colorColumn: columns.find((c) => c.role === ColumnRole.Color)?.name ?? "",
      sizeColumn: "",
      pointSize: undefined as number | undefined,
      lineWidth: undefined as number | undefined,
    }),
    [columns],
  );

  const form = useForm({ defaultValues: defaults });

  // The ramp follows the colour column's role: a measure gets a continuous
  // colormap, a category keeps the server's qualitative default.
  const colorColumn = form.watch("colorColumn");
  const suggestion = useMemo(
    () =>
      suggestTableKinds(
        props.graph,
        props.entry.table,
        columns.find((column) => column.name === colorColumn)?.role ?? null,
      ),
    [props.graph, props.entry.table, columns, colorColumn],
  );
  const colormap = suggestion.defaults.colormap as ColorMap | undefined;

  const columnOptions = [
    { value: "", label: "None" },
    ...columns.map((c) => ({
      value: c.name,
      label:
        c.role === ColumnRole.Attribute
          ? c.name
          : `${c.name} (${c.role.toLowerCase()})`,
    })),
  ];

  const onSubmit = form.handleSubmit(async (data) => {
    // "" means an unmapped optional column; the input omits it entirely.
    const orUndefined = (v: string) => v || undefined;
    const base = {
      scene: props.scene,
      tableDataset: props.entry.table.id,
    };
    if (kind === "POINT") {
      return submitPoint({
        variables: {
          input: {
            ...base,
            sizeColumn: orUndefined(data.sizeColumn),
            colorColumn: orUndefined(data.colorColumn),
            colormap,
            pointSize: data.pointSize ?? undefined,
          },
        },
        ...REFETCH_SCENE,
      });
    }
    return submitTrack({
      variables: {
        input: {
          ...base,
          colorByColumn: orUndefined(data.colorColumn),
          colormap,
          lineWidth: data.lineWidth ?? undefined,
        },
      },
      ...REFETCH_SCENE,
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <InferredKind
          kinds={props.entry.kinds}
          info={TABLE_KIND_INFO}
          value={kind}
          onChange={setKind}
          evidence={suggestion.evidence}
        />

        <div className="grid grid-cols-2 gap-2">
          {kind === "POINT" ? (
            <>
              <ChoicesField
                name="colorColumn"
                label="Color column"
                options={columnOptions}
              />
              <ChoicesField
                name="sizeColumn"
                label="Size column"
                options={columnOptions}
              />
              <FloatField
                name="pointSize"
                label="Point size"
                description="Leave empty for the default"
              />
            </>
          ) : (
            <>
              <ChoicesField
                name="colorColumn"
                label="Color by column"
                options={columnOptions}
              />
              <FloatField
                name="lineWidth"
                label="Line width"
                description="Leave empty for the default"
              />
            </>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={props.onBack}>
            Back
          </Button>
          <Button type="submit">Add layer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Step 2c: a MeshCollection becomes a mesh layer. Its own coordinate system is
 * the layer's space — the picker only offered it because that space already has
 * a path to the world — so there is nothing spatial left to ask.
 *
 * Only the two knobs that change what you see on the first frame are here;
 * material color and color-by stay on the layer card, where the meshes are
 * visible while they are tuned.
 */
const MeshLayerForm = (props: {
  scene: string;
  entry: MeshEntry;
  onBack: () => void;
}) => {
  const [createMesh] = useCreateMeshLayerMutation();
  const submitMesh = useGraphQLDialog(createMesh, DIALOG_OPTIONS);

  const form = useForm({
    defaultValues: {
      wireframe: false,
      opacity: undefined as number | undefined,
    },
  });

  const onSubmit = form.handleSubmit(async (data) =>
    submitMesh({
      variables: {
        input: {
          scene: props.scene,
          meshCollection: props.entry.mesh.id,
          wireframe: data.wireframe,
          opacity: data.opacity ?? undefined,
        },
      },
      ...REFETCH_SCENE,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <SwitchField
            name="wireframe"
            label="Wireframe"
            description="Draw the edges instead of the surfaces"
          />
          <FloatField
            name="opacity"
            label="Opacity"
            description="Leave empty for the default"
          />
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={props.onBack}>
            Back
          </Button>
          <Button type="submit">Add layer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Step 2c-bis: a NetworkCollection becomes a network layer.
 *
 * The same shape as the mesh form and the same placement rule: the collection's
 * own coordinate system is the layer's space, so it must already have a path to
 * the scene's world — which is exactly what the picker listed it from.
 *
 * Only the two settings worth deciding up front are offered. Width, direction,
 * detail and the level cap all live on the card, where you can see what they do
 * to the picture; `lineWidth` in particular is in SCENE units and is very hard
 * to guess before anything is drawn.
 */
const NetworkLayerForm = (props: {
  scene: string;
  entry: NetworkEntry;
  onBack: () => void;
}) => {
  const [createNetwork] = useCreateNetworkLayerMutation();
  const submitNetwork = useGraphQLDialog(createNetwork, DIALOG_OPTIONS);

  const form = useForm({
    defaultValues: {
      showNodes: false,
      opacity: undefined as number | undefined,
    },
  });

  const onSubmit = form.handleSubmit(async (data) =>
    submitNetwork({
      variables: {
        input: {
          scene: props.scene,
          networkCollection: props.entry.network.id,
          showNodes: data.showNodes,
          opacity: data.opacity ?? undefined,
        },
      },
      ...REFETCH_SCENE,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <SwitchField
            name="showNodes"
            label="Show nodes"
            description="Draw a glyph at each node as well as the segments"
          />
          <FloatField
            name="opacity"
            label="Opacity"
            description="Leave empty for the default"
          />
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={props.onBack}>
            Back
          </Button>
          <Button type="submit">Add layer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Step 2d: an AnnotationCollection becomes an annotation layer.
 *
 * This is the path for adopting an EXISTING collection into a scene. Drawing a
 * new ROI in the viewport does not come through here: `createAnnotation` with a
 * scene mints the collection, its registration and the layer server-side (see
 * `interactions/useCreateSceneAnnotation.ts`).
 */
const AnnotationLayerForm = (props: {
  scene: string;
  entry: AnnotationEntry;
  onBack: () => void;
}) => {
  const [createAnnotationLayer] = useCreateAnnotationLayerMutation();
  const submit = useGraphQLDialog(createAnnotationLayer, DIALOG_OPTIONS);

  const form = useForm({
    defaultValues: { opacity: undefined as number | undefined },
  });

  const onSubmit = form.handleSubmit(async (data) =>
    submit({
      variables: {
        input: {
          scene: props.scene,
          annotationCollection: props.entry.collection.id,
          opacity: data.opacity ?? undefined,
        },
      },
      ...REFETCH_SCENE,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <FloatField
          name="opacity"
          label="Opacity"
          description="Leave empty for the default"
        />

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={props.onBack}>
            Back
          </Button>
          <Button type="submit">Add layer</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

const stepDescription = (source: Source): string => {
  switch (source.kind) {
    case "lens":
      return `How "${source.dataset.name}" will be shown — ${source.option.label}.`;
    case "table":
      return `How the rows of "${source.entry.name}" will be drawn.`;
    case "mesh":
      return `Add ${source.entry.name} to this scene.`;
    case "network":
      return `Draw the nodes and edges of ${source.entry.name} in this scene.`;
    case "annotation":
      return `Draw the shapes of "${source.entry.name}" in this scene.`;
  }
};

const AddLayerFormInner = (props: { scene: string }) => {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<Source | null>(null);

  // The scene: its world, the server's own placeability answer (the set
  // `placeableIn` answers with, so the picker and the create mutations cannot
  // disagree about what is offerable), and what is already staged.
  const { data, loading } = useAddLayerReachableQuery({
    variables: { scene: props.scene },
  });
  const world = data?.scene.worldCoordinateSystem;

  // The world's component — every space it relates to, every edge between
  // them, who lives where — from which the picker walks the CHILDREN down
  // from the world: the grids registered into it, the derived datasets, crops
  // and levels landing in those, and so on. The structure every row and every
  // ranking is read off.
  const { data: componentData, loading: componentLoading } = useAddLayerWorldGraphQuery({
    variables: { world: world?.id ?? "", maxDepth: 6 },
    skip: !world,
  });
  const graph = useMemo(
    () => (componentData ? graphFromComponent(componentData.coordinateGraph) : undefined),
    [componentData],
  );
  const placeable = useMemo(
    () => new Set(world?.placedSystems.map((space) => space.id) ?? []),
    [world],
  );

  // Which of those lenses the server would draw, and which of them are labels.
  // Asked of the SPACE, not the scene: every scene over one world offers the
  // same candidates, so a scene-shaped argument would ask for more than the
  // answer depends on.
  const { data: capabilityData } = useAddLayerLensCapabilitiesQuery({
    variables: { space: world?.id ?? "" },
    skip: !world,
  });

  const capabilities: Capabilities = useMemo(
    () =>
      capabilityData
        ? {
            drawable: new Set(capabilityData.drawable.map((lens) => lens.id)),
            labels: new Set(capabilityData.labels.map((lens) => lens.id)),
          }
        : null,
    [capabilityData],
  );

  const staged = useMemo(
    () => stagedFromLayers(data?.scene.layers ?? []),
    [data?.scene.layers],
  );

  const sections = useMemo(
    () =>
      world && graph
        ? buildSections({
            world: { id: world.id, name: world.name },
            graph,
            placeable,
            capabilities,
            search,
            staged,
          })
        : [],
    [world, graph, placeable, staged, capabilities, search],
  );

  // Once a lens is chosen, its full provenance component: the ancestors the
  // reachable set could not see, and everything below. Merged into the
  // one-hop graph, so the same rules simply run again over more.
  const lens = source?.kind === "lens" ? source.option.lens : null;
  const rootSpace = lens?.dataset.intrinsicSystem?.id ?? lens?.lensSpace?.id;
  const { data: lineageData, loading: lineageLoading } = useAddLayerLineageQuery({
    variables: { coordinateSystem: rootSpace ?? "", maxDepth: 4 },
    skip: !rootSpace,
  });
  const merged = useMemo(() => {
    if (!graph) return undefined;
    return lineageData
      ? mergeGraphs(graph, graphFromLineage(lineageData.lineageGraph))
      : graph;
  }, [graph, lineageData]);
  const lensSuggestion = useMemo(
    () =>
      lens && merged
        ? suggestLensKinds(merged, lens, capabilities, staged)
        : null,
    [lens, merged, capabilities, staged],
  );

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Add layer</DialogTitle>
        <DialogDescription>
          {source
            ? stepDescription(source)
            : world
              ? `Everything "${data?.scene.name}" can reach from its world, "${world.name}".`
              : "Loading what this scene can reach…"}
        </DialogDescription>
      </DialogHeader>

      {source === null ? (
        <>
          <Input
            placeholder="Search datasets, meshes, measurements…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto">
            {sections.map((section) => (
              <SectionView
                key={section.id}
                section={section}
                onSelect={setSource}
              />
            ))}
            {!loading && !componentLoading && !sections.length && (
              <div className="text-xs text-muted-foreground">
                {search
                  ? "Nothing reachable matches that"
                  : "Nothing can reach this scene's world yet — register something into it first"}
              </div>
            )}
          </div>
        </>
      ) : source.kind === "lens" ? (
        <LensLayerForm
          scene={props.scene}
          source={source}
          suggestion={lensSuggestion ?? source.option.suggestion}
          lineageLoading={lineageLoading}
          onBack={() => setSource(null)}
        />
      ) : source.kind === "table" ? (
        <TableLayerForm
          scene={props.scene}
          entry={source.entry}
          graph={merged ?? graph!}
          onBack={() => setSource(null)}
        />
      ) : source.kind === "mesh" ? (
        <MeshLayerForm
          scene={props.scene}
          entry={source.entry}
          onBack={() => setSource(null)}
        />
      ) : source.kind === "network" ? (
        <NetworkLayerForm
          scene={props.scene}
          entry={source.entry}
          onBack={() => setSource(null)}
        />
      ) : (
        <AnnotationLayerForm
          scene={props.scene}
          entry={source.entry}
          onBack={() => setSource(null)}
        />
      )}
    </div>
  );
};

// The mikro guard must wrap from the outside: the inner component's queries
// fire on mount, before any JSX-level guard could stop them (CLAUDE.md §1).
export const AddLayerForm = (props: { scene: string }) => (
  <Guard.Mikro>
    <AddLayerFormInner {...props} />
  </Guard.Mikro>
);
