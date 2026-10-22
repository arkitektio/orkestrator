import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { FileIcon, Grid3x3, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { HomeSection } from "@/core/layout/ModuleHome";
import { MikroArrayDataset, MikroFile } from "@/core/linkers";
import { BentoGrid, BentoItem, type BentoSpan } from "@/core/ui/bento-grid";
import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { cn } from "@/core/util/utils";
import {
  HomeRootDetailsQuery,
  HomeRootsQuery,
  LineageNodeKind,
  ListArrayDatasetFragment,
  RootFilter,
  useHomeRootDetailsQuery,
  useHomeRootsQuery,
} from "../../api/graphql";
import SeriesMiniCard from "../cards/SeriesMiniCard";
import { KIND_LABEL, lineageLink } from "../lineage/lineageGraph";
import { KIND_ICON, SMART_BY_KIND } from "../lineage/LineageNodes";
import { describeShape } from "../sparse/sparseFacts";
import { formatAxes, formatBytes, spatialSpecOf, splitAxesBySpec } from "../../specs";
import { rootKey } from "./fileResults";
import { useHomeResult, useHomeResultMap } from "./homeResults";
import { ResultCount } from "./ResultChips";

type Root = HomeRootsQuery["roots"][number];
type HomeFile = NonNullable<HomeRootDetailsQuery["files"]>[number];
type Series = { id: string; dataset: ListArrayDatasetFragment; series?: string | null };

const PAGE = 12;
/** Images a card shows before it says "+N more". */
const MAX_SHOWN = 5;
/** The narrowest a grid column may get, and the grid's gap, in px. */
const COLUMN = 220;
const GAP = 12;
const PHI = 1.618;

/** How many `COLUMN`-wide columns fit across the element, as it resizes. */
const useColumnCount = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(4);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setCount(Math.max(1, Math.floor((entry.contentRect.width + GAP) / (COLUMN + GAP))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, count };
};

/**
 * How much of the grid a file claims, by how many images it holds: one image
 * is one cell, two or three a wide card, four and up a big square. A big card
 * may shrink a step to close a gap, so order holds without leaving holes; the
 * grid keeps it no wider than its columns.
 *
 * The more images, the more it resists shrinking: priority grows with the
 * count, logarithmically (1 → 1, 2 → 2, 4 → 3, 8 → 4, 40 → ~6.3), so a big
 * LIF keeps its square before a small file does, without drowning the rest.
 */
const spanOf = (images: number): { cols: BentoSpan; rows: BentoSpan; priority: number } => {
  const priority = 1 + Math.log2(Math.max(1, images));
  if (images >= 4) return { cols: { min: 1, ideal: 2 }, rows: { min: 1, ideal: 2 }, priority };
  if (images >= 2) return { cols: { min: 1, ideal: 2 }, rows: 1, priority };
  return { cols: 1, rows: 1, priority };
};

/** How many images were converted out of a file. */
const fileSeriesCount = (file: HomeFile) =>
  file.derivedContainers.filter((link) => link.container.__typename === "ArrayDataset").length;

/**
 * A multi-series file names every series after itself ("scan.lif - Series 3"),
 * so there the tile shows the series identifier instead when the name only
 * repeats the file's. A single image keeps its name.
 */
const seriesLabel = (file: HomeFile, item: Series, multi: boolean) =>
  multi && item.series && item.dataset.name.startsWith(file.name.replace(/\.[^.]+$/, ""))
    ? item.series
    : undefined;

/**
 * The images as a golden spiral: the first takes φ of the space, the rest
 * share what is left, split the other way, and so on — each one smaller than
 * the one before.
 */
const GoldenTiles = ({
  file,
  items,
  multi,
  vertical = false,
}: {
  file: HomeFile;
  items: Series[];
  multi: boolean;
  vertical?: boolean;
}) => {
  const [first, ...rest] = items;
  const tile = (
    <SeriesMiniCard
      item={first.dataset}
      label={seriesLabel(file, first, multi)}
      fill
    />
  );
  if (rest.length === 0) return <div className="h-full min-h-0 w-full min-w-0">{tile}</div>;

  return (
    <div className={cn("flex h-full min-h-0 w-full min-w-0 gap-1.5", vertical && "flex-col")}>
      <div className="min-h-0 min-w-0" style={{ flex: `${PHI} 1 0` }}>
        {tile}
      </div>
      <div className="min-h-0 min-w-0" style={{ flex: "1 1 0" }}>
        <GoldenTiles file={file} items={rest} multi={multi} vertical={!vertical} />
      </div>
    </div>
  );
};

/**
 * The one frame every recent-data card shares: rounded, lightly tinted, a
 * header with the kind's icon and the name, a muted line of facts, and the
 * card's content filling the rest. The tint is the card's identity, and every
 * tint is a brand-hue token (`primary`, `chart-N`), so the grid repaints with
 * the brand: the kinds differ by the token's lightness and strength, plus their
 * icon, never by a hue of their own. A mixed grid still reads by kind at a
 * glance, and every card lines up with its neighbours.
 */
const TONES = {
  file: { frame: "border-primary/15 bg-primary/5 hover:border-primary/30", icon: "text-primary/70" },
  image: { frame: "border-chart-3/25 bg-chart-3/10 hover:border-chart-3/45", icon: "text-chart-3" },
  table: { frame: "border-chart-5/25 bg-chart-5/10 hover:border-chart-5/45", icon: "text-chart-5" },
  geometry: { frame: "border-chart-1/30 bg-chart-1/10 hover:border-chart-1/50", icon: "text-chart-4" },
} as const;

type Tone = keyof typeof TONES;

const TONE_BY_KIND: Partial<Record<LineageNodeKind, Tone>> = {
  [LineageNodeKind.File]: "file",
  [LineageNodeKind.Dataset]: "image",
  [LineageNodeKind.TableDataset]: "table",
  [LineageNodeKind.SparseDataset]: "table",
  [LineageNodeKind.MeshCollection]: "geometry",
  [LineageNodeKind.NetworkCollection]: "geometry",
};

const CardFrame = ({
  tone,
  icon: Icon,
  iconLabel,
  title,
  facts,
  children,
}: {
  tone: Tone;
  icon: LucideIcon;
  iconLabel?: string;
  /** The name, as the link that opens it. */
  title: React.ReactNode;
  facts: (string | React.ReactNode)[];
  children?: React.ReactNode;
}) => (
  <div
    className={cn(
      "relative flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-2xl border p-2 transition-colors",
      TONES[tone].frame,
    )}
  >
    <div className="flex min-w-0 items-center gap-2 px-1 pt-0.5 text-sm font-medium">
      <Icon className={cn("h-4 w-4 shrink-0", TONES[tone].icon)} aria-label={iconLabel} />
      {title}
    </div>
    {facts.length > 0 && (
      <div className="flex min-w-0 items-center gap-1.5 px-1 text-xs tabular-nums text-muted-foreground">
        {facts.map((fact, index) => (
          <span key={index} className={cn("flex shrink-0 items-center gap-1.5", typeof fact === "string" && "min-w-0 truncate")}>
            {index > 0 && <span aria-hidden>·</span>}
            {fact}
          </span>
        ))}
      </div>
    )}
    {children && <div className="relative min-h-0 flex-1">{children}</div>}
  </div>
);

/**
 * One file as a card, tinted with the brand colour so a file reads apart from
 * the images inside it. Its images fill the card; what does not fit the first
 * five is a "+N more" link to the file's page, which lists every series. A
 * file nothing was converted out of shows only its name and facts.
 */
const FileCard = ({ file }: { file: HomeFile }) => {
  const series: Series[] = file.derivedContainers.flatMap((link) =>
    link.container.__typename === "ArrayDataset"
      ? [{ id: link.id, dataset: link.container, series: link.seriesIdentifier }]
      : [],
  );
  const others = file.derivedContainers.length - series.length;
  const shown = series.slice(0, MAX_SHOWN);
  const hidden = series.length - shown.length;
  // The tiles ask for their own results; the card sums the ones it shows.
  const results = useHomeResultMap();
  const resultCount = new Set(
    shown.flatMap(({ dataset }) =>
      (results?.get(rootKey(LineageNodeKind.Dataset, dataset.id))?.results ?? []).map((node) => node.key),
    ),
  ).size;
  const facts = [
    series.length > 0 && `${series.length} ${series.length === 1 ? "image" : "images"}`,
    resultCount > 0 && `${resultCount} ${resultCount === 1 ? "result" : "results"}`,
    others > 0 && `${others} other`,
    file.size != null && formatBytes(file.size),
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <CardFrame
      tone="file"
      icon={FileIcon}
      title={
        <MikroFile.Smart object={file} className="min-w-0 [container-type:normal]!">
          <MikroFile.DetailLink object={file} className="block truncate hover:underline">
            {file.name}
          </MikroFile.DetailLink>
        </MikroFile.Smart>
      }
      facts={facts}
    >
      {shown.length > 0 && <GoldenTiles file={file} items={shown} multi={series.length > 1} />}
      {hidden > 0 && (
        <MikroFile.DetailLink
          object={file}
          className="absolute bottom-1.5 right-1.5 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur hover:bg-black/80"
        >
          +{hidden} more
        </MikroFile.DetailLink>
      )}
    </CardFrame>
  );
};

/**
 * An image that came on its own (an app or an agent wrote it straight in): the
 * file card's frame, its own tint, the picture filling it. The name and shape
 * are in the header, so the tile inside carries no caption of its own.
 */
const ImageCard = ({ dataset }: { dataset: ListArrayDatasetFragment }) => {
  const spatial = spatialSpecOf(dataset.spec);
  const axes = splitAxesBySpec(dataset.axisNames, dataset.shape, dataset.spec);
  const shape = formatAxes([...axes.spatial, ...axes.acquisition]);

  return (
    <CardFrame
      tone="image"
      icon={spatial?.icon ?? Grid3x3}
      iconLabel={spatial?.label}
      title={
        <MikroArrayDataset.DetailLink object={dataset} className="block min-w-0 truncate hover:underline" title={dataset.name}>
          {dataset.name}
        </MikroArrayDataset.DetailLink>
      }
      facts={shape ? [shape] : []}
    >
      <SeriesMiniCard item={dataset} fill caption={false} />
    </CardFrame>
  );
};

/**
 * Parentless data that is neither a file nor an image: a table uploaded on its
 * own, a mesh, a sparse matrix, a network. Its kind, its name, the one line
 * that says what it is, and how much was made from it, in the shared frame
 * with its kind's tint.
 */
const RootCard = ({ root, detail }: { root: Root; detail?: string }) => {
  const Icon = KIND_ICON[root.kind];
  const Smart = SMART_BY_KIND[root.kind];
  const results = useHomeResult(root.kind, root.id);
  const name = root.name.trim() || `Unnamed ${KIND_LABEL[root.kind].toLowerCase()}`;

  const title = Smart ? (
    <Smart.DetailLink object={{ id: root.id }} className="min-w-0 truncate after:absolute after:inset-0">
      {name}
    </Smart.DetailLink>
  ) : (
    <Link to={lineageLink(root.kind, root.id)} className="min-w-0 truncate after:absolute after:inset-0">
      {name}
    </Link>
  );
  const body = (
    <CardFrame
      tone={TONE_BY_KIND[root.kind] ?? "table"}
      icon={Icon}
      iconLabel={KIND_LABEL[root.kind]}
      title={title}
      facts={[
        detail ?? KIND_LABEL[root.kind],
        ...(results ? [<ResultCount key="results" kind={root.kind} id={root.id} results={results} plain />] : []),
      ]}
    >
      {/* The kind, large and faint: what fills the card where an image card
          has its picture, so a row of mixed cards keeps one rhythm. */}
      <div className="flex h-full items-center justify-center rounded-xl bg-background/40">
        <Icon className={cn("h-10 w-10 opacity-25", TONES[TONE_BY_KIND[root.kind] ?? "table"].icon)} />
      </div>
    </CardFrame>
  );

  return Smart ? (
    <Smart.Smart object={{ id: root.id }} menuButton className="h-full [container-type:normal]!">
      {body}
    </Smart.Smart>
  ) : (
    body
  );
};

/** The ids of one page of roots, by the list each kind's tiles come from. */
const idsOf = (roots: Root[], kind: LineageNodeKind) =>
  roots.filter((root) => root.kind === kind).map((root) => root.id);

/**
 * mikro's recent data: the newest parentless data of every kind, in one bento
 * grid, newest first. A file (an upload) holds the images converted out of it;
 * an image or a table that came on its own is its own card. What was computed
 * from any of them is reached from its card, never listed here itself — a
 * mask or a converted series has a parent, so it is not a root.
 *
 * Two requests: `HomeRoots` decides what is a root (on the server, from the
 * lineage), `HomeRootDetails` fetches each kind's tiles from its own list.
 *
 * `filters` is the home page's filter row, applied on the server so "Show
 * more" pages through the matching roots only. While it narrows, the section
 * says so, and an empty result says that nothing matched rather than vanishing.
 */
export const RecentData = ({ filters, onClear }: { filters?: RootFilter; onClear?: () => void }) => {
  const [limit, setLimit] = useState(PAGE);
  const { ref, count } = useColumnCount();
  const filtered = !!filters && Object.keys(filters).length > 0;
  // A new filter starts again at the first page.
  const [shownFilters, setShownFilters] = useState(filters);
  if (shownFilters !== filters) {
    setShownFilters(filters);
    setLimit(PAGE);
  }
  // cache-and-network so coming back after a converter ran shows what it wrote.
  const rootsQuery = useHomeRootsQuery({
    variables: { pagination: { limit }, ...(filtered ? { filters } : {}) },
    fetchPolicy: "cache-and-network",
  });
  // While a new filter loads, the old grid stays rather than blinking out.
  const roots = useMemo(
    () => (rootsQuery.data ?? rootsQuery.previousData)?.roots ?? [],
    [rootsQuery.data, rootsQuery.previousData],
  );

  const ids = useMemo(
    () => ({
      files: idsOf(roots, LineageNodeKind.File),
      datasets: idsOf(roots, LineageNodeKind.Dataset),
      tables: idsOf(roots, LineageNodeKind.TableDataset),
      sparse: idsOf(roots, LineageNodeKind.SparseDataset),
    }),
    [roots],
  );
  const detailsQuery = useHomeRootDetailsQuery({
    variables: {
      ...ids,
      hasFiles: ids.files.length > 0,
      hasDatasets: ids.datasets.length > 0,
      hasTables: ids.tables.length > 0,
      hasSparse: ids.sparse.length > 0,
    },
    skip: roots.length === 0,
    fetchPolicy: "cache-and-network",
  });
  const details = detailsQuery.data ?? detailsQuery.previousData;

  const byKey = useMemo(() => {
    const map = new Map<string, { file?: HomeFile; dataset?: ListArrayDatasetFragment; detail?: string }>();
    for (const file of details?.files ?? []) map.set(rootKey(LineageNodeKind.File, file.id), { file });
    for (const dataset of details?.arrayDatasets ?? [])
      map.set(rootKey(LineageNodeKind.Dataset, dataset.id), { dataset });
    for (const table of details?.tableDatasets ?? [])
      map.set(rootKey(LineageNodeKind.TableDataset, table.id), {
        detail: table.axisNames.length ? table.axisNames.join(" × ") : "measurement table",
      });
    for (const sparse of details?.sparseDatasets ?? [])
      map.set(rootKey(LineageNodeKind.SparseDataset, sparse.id), {
        detail: describeShape(sparse.axisNames, sparse.shape),
      });
    return map;
  }, [details]);

  const error = rootsQuery.error ?? detailsQuery.error;
  if (error) {
    return (
      <HomeSection title={filtered ? "Matching data" : "Recent data"}>
        <div className="flex flex-col gap-2">
          <ErrorNote error={error} title="Couldn't load the recent data" />
          <button
            type="button"
            onClick={() => {
              void rootsQuery.refetch().catch(() => undefined);
              void detailsQuery.refetch().catch(() => undefined);
            }}
            className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Try again
          </button>
        </div>
      </HomeSection>
    );
  }

  // A root whose tile has not arrived (or another kind's list left it out) is
  // skipped rather than drawn as a hole. Meshes and networks need no tile
  // query: the root row says all their card says.
  const cards = roots.flatMap((root) => {
    const key = root.key;
    const entry = byKey.get(rootKey(root.kind, root.id));
    switch (root.kind) {
      case LineageNodeKind.File:
        return entry?.file
          ? [
              <BentoItem key={key} {...spanOf(fileSeriesCount(entry.file))}>
                <FileCard file={entry.file} />
              </BentoItem>,
            ]
          : [];
      case LineageNodeKind.Dataset:
        return entry?.dataset
          ? [
              <BentoItem key={key}>
                <ImageCard dataset={entry.dataset} />
              </BentoItem>,
            ]
          : [];
      case LineageNodeKind.TableDataset:
      case LineageNodeKind.SparseDataset:
        return entry
          ? [
              <BentoItem key={key}>
                <RootCard root={root} detail={entry.detail} />
              </BentoItem>,
            ]
          : [];
      default:
        return [
          <BentoItem key={key}>
            <RootCard root={root} />
          </BentoItem>,
        ];
    }
  });

  // The measuring div stays mounted while empty, so the column count is known
  // by the time the cards arrive.
  return (
    <div ref={ref} className="min-w-0">
      {filtered && cards.length === 0 && rootsQuery.data && (
        <HomeSection title="Matching data">
          <p className="text-sm text-muted-foreground">
            Nothing matches these filters.{" "}
            {onClear && (
              <button type="button" onClick={onClear} className="underline-offset-2 hover:underline">
                Clear filters
              </button>
            )}
          </p>
        </HomeSection>
      )}
      {cards.length > 0 && (
        <HomeSection title={filtered ? "Matching data" : "Recent data"}>
          <BentoGrid columns={count} rowHeight="11rem" style={{ gap: GAP }}>
            {cards}
          </BentoGrid>
          {roots.length === limit && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-muted-foreground"
              onClick={() => setLimit((current) => current + PAGE)}
            >
              Show more
            </Button>
          )}
        </HomeSection>
      )}
    </div>
  );
};
