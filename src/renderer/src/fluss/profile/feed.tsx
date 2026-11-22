import { Code2, Workflow } from "lucide-react";

import type { ProfileFeedQuery, ProfileFeedSource } from "@/core/connection/profile/feed";
import { FlussPythonFlow, FlussWorkspace } from "@/core/linkers";
import { CARD_FRAME_SIZE, CARD_TONES, CardFrame, type CardTone } from "@/core/ui/card-frame";
import { Name } from "@/core/ui/name";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import {
  ListPythonFlowFragment,
  ListWorkspaceFragment,
  useProfileFeedPythonFlowsQuery,
  useProfileFeedWorkspacesQuery,
} from "../api/graphql";

const EMPTY: readonly never[] = [];

/** A fluss object as a square card: its kind's glyph, its title, when it was made. */
const FeedCard = ({
  tone,
  icon: Icon,
  kind,
  title,
  createdAt,
  description,
}: {
  tone: CardTone;
  icon: typeof Workflow;
  kind: string;
  title: React.ReactNode;
  createdAt: string;
  description?: string | null;
}) => (
  <CardFrame
    tone={tone}
    icon={Icon}
    iconLabel={kind}
    title={title}
    facts={[kind, <Timestamp key="created" date={createdAt} relative />]}
    menu
  >
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl bg-background/40 p-2">
      <Icon className={cn("h-10 w-10 opacity-25", CARD_TONES[tone].icon)} />
      {description && <p className="line-clamp-2 text-center text-xs text-muted-foreground">{description}</p>}
    </div>
  </CardFrame>
);

/** The workspaces they made, newest first. */
const useWorkspaces = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedWorkspacesQuery({
    variables: { filters: { creator: sub, ...(search ? { search } : {}) }, pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.workspaces ?? EMPTY, loading, error };
};

const WorkspaceCard = ({ item }: { item: ListWorkspaceFragment }) => (
  <FlussWorkspace.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <FeedCard
      tone="app"
      icon={Workflow}
      kind="Workspace"
      createdAt={item.createdAt}
      description={item.description}
      title={
        <FlussWorkspace.DetailLink object={item} className="block min-w-0 hover:underline">
          <Name>{item.title}</Name>
        </FlussWorkspace.DetailLink>
      }
    />
  </FlussWorkspace.Smart>
);

/** The Python flows they made, one per flow (its newest version), newest first. */
const usePythonFlows = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedPythonFlowsQuery({
    variables: { filters: { creator: sub, latest: true, ...(search ? { search } : {}) }, pagination: { limit } },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.pythonFlows ?? EMPTY, loading, error };
};

const PythonFlowCard = ({ item }: { item: ListPythonFlowFragment }) => (
  <FlussPythonFlow.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <FeedCard
      tone="interface"
      icon={Code2}
      kind="Python flow"
      createdAt={item.createdAt}
      description={item.description}
      title={
        <FlussPythonFlow.DetailLink object={item} className="block min-w-0 hover:underline">
          <Name>{item.title}</Name>
        </FlussPythonFlow.DetailLink>
      }
    />
  </FlussPythonFlow.Smart>
);

export const FLUSS_PROFILE_FEED: ProfileFeedSource[] = [
  {
    id: "fluss.workspaces",
    kinds: [{ id: "fluss.workspaces", label: "Flow workspaces", icon: Workflow }],
    useItems: useWorkspaces,
    itemKey: (item: ListWorkspaceFragment) => item.id,
    createdAt: (item: ListWorkspaceFragment) => item.createdAt,
    Card: WorkspaceCard,
  } satisfies ProfileFeedSource<ListWorkspaceFragment>,
  {
    id: "fluss.pythonflows",
    kinds: [{ id: "fluss.pythonflows", label: "Python flows", icon: Code2 }],
    useItems: usePythonFlows,
    itemKey: (item: ListPythonFlowFragment) => item.id,
    createdAt: (item: ListPythonFlowFragment) => item.createdAt,
    Card: PythonFlowCard,
  } satisfies ProfileFeedSource<ListPythonFlowFragment>,
];
