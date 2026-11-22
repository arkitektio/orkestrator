import { useMemo } from "react";
import { Box, FileText, Grid3x3, Network, Shapes, Table2 } from "lucide-react";
import { Link } from "react-router-dom";

import type { ProfileFeedKind, ProfileFeedQuery, ProfileFeedSource } from "@/core/connection/profile/feed";
import { CARD_FRAME_SIZE, CARD_TONES, CardFrame, type CardTone } from "@/core/ui/card-frame";
import { Name } from "@/core/ui/name";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import {
  HomeRootDetailsQuery,
  LineageNodeKind,
  ListArrayDatasetFragment,
  ProfileFeedRootsQuery,
  useHomeRootDetailsQuery,
  useProfileFeedRootsQuery,
} from "../api/graphql";
import SeriesMiniCard from "../components/cards/SeriesMiniCard";
import { KIND_LABEL, lineageLink } from "../components/lineage/lineageGraph";
import { KIND_ICON, SMART_BY_KIND } from "../components/lineage/LineageNodes";

type Root = ProfileFeedRootsQuery["roots"][number];
type HomeFile = NonNullable<HomeRootDetailsQuery["files"]>[number];

/** A root with what its card shows inside: its picture, and how many images a file holds. */
export type MikroFeedItem = {
  root: Root;
  /** The image the card shows: the dataset itself, or a file's first converted series. */
  preview?: ListArrayDatasetFragment;
  /** A file's converted images. */
  images?: number;
};

/** The feed's toggles, one per kind of parentless data the mikro home lists too. */
const KINDS: (ProfileFeedKind & { kind: LineageNodeKind })[] = [
  { id: "mikro.files", label: "Files", icon: FileText, kind: LineageNodeKind.File },
  { id: "mikro.images", label: "Images", icon: Box, kind: LineageNodeKind.Dataset },
  { id: "mikro.tables", label: "Tables", icon: Table2, kind: LineageNodeKind.TableDataset },
  { id: "mikro.sparse", label: "Sparse data", icon: Grid3x3, kind: LineageNodeKind.SparseDataset },
  { id: "mikro.meshes", label: "Meshes", icon: Shapes, kind: LineageNodeKind.MeshCollection },
  { id: "mikro.networks", label: "Networks", icon: Network, kind: LineageNodeKind.NetworkCollection },
];
const KIND_BY_ID = new Map<string, LineageNodeKind>(KINDS.map((entry) => [entry.id, entry.kind]));

const TONE_BY_KIND: Partial<Record<LineageNodeKind, CardTone>> = {
  [LineageNodeKind.File]: "file",
  [LineageNodeKind.Dataset]: "image",
  [LineageNodeKind.TableDataset]: "table",
  [LineageNodeKind.SparseDataset]: "table",
  [LineageNodeKind.MeshCollection]: "geometry",
  [LineageNodeKind.NetworkCollection]: "geometry",
};

const EMPTY: readonly MikroFeedItem[] = [];

const firstSeries = (file: HomeFile): ListArrayDatasetFragment[] =>
  file.derivedContainers.flatMap((link) => (link.container.__typename === "ArrayDataset" ? [link.container] : []));

/**
 * Their newest parentless data of the kinds that are on — the mikro home's
 * `roots`, by owner — then one query for the pictures: each image's own, and
 * a file's first converted series.
 */
const useMikroFeed = ({ sub, search, kinds, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedRootsQuery({
    variables: {
      kinds: kinds.flatMap((id) => KIND_BY_ID.get(id) ?? []),
      filters: { owner: sub, ...(search ? { search } : {}) },
      pagination: { limit },
    },
    fetchPolicy: "cache-and-network",
  });
  const roots = data?.roots;

  const ids = useMemo(() => {
    const of = (kind: LineageNodeKind) => (roots ?? []).filter((root) => root.kind === kind).map((root) => root.id);
    return { files: of(LineageNodeKind.File), datasets: of(LineageNodeKind.Dataset) };
  }, [roots]);
  const { data: details } = useHomeRootDetailsQuery({
    variables: {
      files: ids.files,
      datasets: ids.datasets,
      tables: [],
      sparse: [],
      hasFiles: ids.files.length > 0,
      hasDatasets: ids.datasets.length > 0,
      hasTables: false,
      hasSparse: false,
    },
    skip: ids.files.length === 0 && ids.datasets.length === 0,
  });

  const items = useMemo(() => {
    if (!roots) return EMPTY;
    const files = new Map((details?.files ?? []).map((file) => [file.id, file]));
    const datasets = new Map((details?.arrayDatasets ?? []).map((dataset) => [dataset.id, dataset]));
    return roots.map((root): MikroFeedItem => {
      if (root.kind === LineageNodeKind.Dataset) return { root, preview: datasets.get(root.id) };
      const file = root.kind === LineageNodeKind.File ? files.get(root.id) : undefined;
      if (!file) return { root };
      const series = firstSeries(file);
      return { root, preview: series[0], images: series.length };
    });
  }, [roots, details]);

  return { items, loading, error };
};

/**
 * One root as a square card in the shared frame, tinted by its kind: its
 * picture where it has one (an image, a file's first image), its kind large
 * and faint where it does not, and when it came in.
 */
const MikroFeedCard = ({ item }: { item: MikroFeedItem }) => {
  const { root, preview, images } = item;
  const Icon = KIND_ICON[root.kind];
  const Smart = SMART_BY_KIND[root.kind];
  const tone = TONE_BY_KIND[root.kind] ?? "table";
  const name = root.name.trim() || `Unnamed ${KIND_LABEL[root.kind].toLowerCase()}`;

  const title = Smart ? (
    <Smart.DetailLink object={{ id: root.id }} className="block min-w-0 hover:underline">
      <Name>{name}</Name>
    </Smart.DetailLink>
  ) : (
    <Link to={lineageLink(root.kind, root.id)} className="block min-w-0 hover:underline">
      <Name>{name}</Name>
    </Link>
  );

  const facts = [
    images ? `${images} ${images === 1 ? "image" : "images"}` : KIND_LABEL[root.kind],
    ...(root.createdAt ? [<Timestamp key="created" date={root.createdAt} relative />] : []),
  ];

  const body = (
    <CardFrame tone={tone} icon={Icon} iconLabel={KIND_LABEL[root.kind]} title={title} facts={facts} menu={!!Smart}>
      {preview ? (
        <SeriesMiniCard item={preview} fill caption={false} />
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl bg-background/40">
          <Icon className={cn("h-10 w-10 opacity-25", CARD_TONES[tone].icon)} />
        </div>
      )}
    </CardFrame>
  );

  return Smart ? (
    <Smart.Smart object={{ id: root.id }} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      {body}
    </Smart.Smart>
  ) : (
    <div className={CARD_FRAME_SIZE}>{body}</div>
  );
};

export const MIKRO_PROFILE_FEED: ProfileFeedSource<MikroFeedItem>[] = [
  {
    id: "mikro.data",
    kinds: KINDS,
    useItems: useMikroFeed,
    itemKey: (item) => item.root.key,
    createdAt: (item) => item.root.createdAt,
    Card: MikroFeedCard,
  },
];
