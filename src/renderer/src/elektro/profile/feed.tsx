import { FlaskConical, Layers, LayoutDashboard, Network } from "lucide-react";

import type { ProfileFeedQuery, ProfileFeedSource } from "@/core/connection/profile/feed";
import { CARD_FRAME_SIZE, CARD_TONES, CardFrame, type CardTone } from "@/core/ui/card-frame";
import { Name } from "@/core/ui/name";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { ElektroExperiment, ElektroModelCollection, ElektroModelWorkspace, ElektroNeuronModel } from "@/core/linkers";
import {
  ListExperimentFragment,
  Ordering,
  ProfileFeedModelCollectionsQuery,
  ProfileFeedNeuronModelsQuery,
  ProfileFeedWorkspacesQuery,
  useListExperimentsQuery,
  useProfileFeedModelCollectionsQuery,
  useProfileFeedNeuronModelsQuery,
  useProfileFeedWorkspacesQuery,
} from "../api/graphql";

type Workspace = ProfileFeedWorkspacesQuery["modelWorkspaces"][number];
type NeuronModel = ProfileFeedNeuronModelsQuery["neuronModels"][number];
type ModelCollection = ProfileFeedModelCollectionsQuery["modelCollections"][number];

const EMPTY: readonly never[] = [];

/**
 * An elektro object as a square card in the shared frame: its kind's glyph,
 * its name, when it was made, and the glyph again, large and faint, where a
 * picture would be.
 */
const FeedCard = ({
  tone,
  icon: Icon,
  kind,
  title,
  createdAt,
  description,
}: {
  tone: CardTone;
  icon: typeof FlaskConical;
  kind: string;
  title: React.ReactNode;
  createdAt?: string | null;
  description?: string | null;
}) => (
  <CardFrame
    tone={tone}
    icon={Icon}
    iconLabel={kind}
    title={title}
    facts={[kind, ...(createdAt ? [<Timestamp key="created" date={createdAt} relative />] : [])]}
    menu
  >
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl bg-background/40 p-2">
      <Icon className={cn("h-10 w-10 opacity-25", CARD_TONES[tone].icon)} />
      {description && <p className="line-clamp-2 text-center text-xs text-muted-foreground">{description}</p>}
    </div>
  </CardFrame>
);

/** The experiments they started, newest first. */
const useExperiments = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useListExperimentsQuery({
    variables: {
      filters: { createdBy: sub, ...(search ? { search } : {}) },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit },
    },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.experiments ?? EMPTY, loading, error };
};

const ExperimentCard = ({ item }: { item: ListExperimentFragment }) => (
  <ElektroExperiment.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <FeedCard
      tone="app"
      icon={FlaskConical}
      kind="Experiment"
      createdAt={item.createdAt}
      description={item.description}
      title={
        <ElektroExperiment.DetailLink object={item} className="block min-w-0 hover:underline">
          <Name>{item.name}</Name>
        </ElektroExperiment.DetailLink>
      }
    />
  </ElektroExperiment.Smart>
);

/** The model workspaces they made, newest first. */
const useWorkspaces = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedWorkspacesQuery({
    variables: {
      filters: { createdBy: sub, ...(search ? { search } : {}) },
      pagination: { limit },
    },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.modelWorkspaces ?? EMPTY, loading, error };
};

const WorkspaceCard = ({ item }: { item: Workspace }) => (
  <ElektroModelWorkspace.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <FeedCard
      tone="interface"
      icon={LayoutDashboard}
      kind="Model workspace"
      createdAt={item.createdAt}
      title={
        <ElektroModelWorkspace.DetailLink object={item} className="block min-w-0 hover:underline">
          <Name>{item.name}</Name>
        </ElektroModelWorkspace.DetailLink>
      }
    />
  </ElektroModelWorkspace.Smart>
);

/** The neuron models they made, newest first. */
const useNeuronModels = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedNeuronModelsQuery({
    variables: {
      filters: { createdBy: sub, ...(search ? { search } : {}) },
      pagination: { limit },
    },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.neuronModels ?? EMPTY, loading, error };
};

const NeuronModelCard = ({ item }: { item: NeuronModel }) => (
  <ElektroNeuronModel.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <FeedCard
      tone="geometry"
      icon={Network}
      kind="Neuron model"
      createdAt={item.createdAt}
      title={
        <ElektroNeuronModel.DetailLink object={item} className="block min-w-0 hover:underline">
          <Name>{item.name}</Name>
        </ElektroNeuronModel.DetailLink>
      }
    />
  </ElektroNeuronModel.Smart>
);

/** The model collections they made, newest first. */
const useModelCollections = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedModelCollectionsQuery({
    variables: {
      filters: { createdBy: sub, ...(search ? { search } : {}) },
      pagination: { limit },
    },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.modelCollections ?? EMPTY, loading, error };
};

const ModelCollectionCard = ({ item }: { item: ModelCollection }) => (
  <ElektroModelCollection.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <FeedCard
      tone="plain"
      icon={Layers}
      kind="Model collection"
      createdAt={item.createdAt}
      title={
        <ElektroModelCollection.DetailLink object={item} className="block min-w-0 hover:underline">
          <Name>{item.name}</Name>
        </ElektroModelCollection.DetailLink>
      }
    />
  </ElektroModelCollection.Smart>
);

export const ELEKTRO_PROFILE_FEED: ProfileFeedSource[] = [
  {
    id: "elektro.experiments",
    kinds: [{ id: "elektro.experiments", label: "Experiments", icon: FlaskConical }],
    useItems: useExperiments,
    itemKey: (item: ListExperimentFragment) => item.id,
    createdAt: (item: ListExperimentFragment) => item.createdAt,
    Card: ExperimentCard,
  } satisfies ProfileFeedSource<ListExperimentFragment>,
  {
    id: "elektro.workspaces",
    kinds: [{ id: "elektro.workspaces", label: "Workspaces", icon: LayoutDashboard }],
    useItems: useWorkspaces,
    itemKey: (item: Workspace) => item.id,
    createdAt: (item: Workspace) => item.createdAt,
    Card: WorkspaceCard,
  } satisfies ProfileFeedSource<Workspace>,
  {
    id: "elektro.models",
    kinds: [{ id: "elektro.models", label: "Neuron models", icon: Network }],
    useItems: useNeuronModels,
    itemKey: (item: NeuronModel) => item.id,
    createdAt: (item: NeuronModel) => item.createdAt,
    Card: NeuronModelCard,
  } satisfies ProfileFeedSource<NeuronModel>,
  {
    id: "elektro.collections",
    kinds: [{ id: "elektro.collections", label: "Model collections", icon: Layers }],
    useItems: useModelCollections,
    itemKey: (item: ModelCollection) => item.id,
    createdAt: (item: ModelCollection) => item.createdAt,
    Card: ModelCollectionCard,
  } satisfies ProfileFeedSource<ModelCollection>,
];
