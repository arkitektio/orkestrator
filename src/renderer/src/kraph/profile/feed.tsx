import { Share2 } from "lucide-react";

import type { ProfileFeedQuery, ProfileFeedSource } from "@/core/connection/profile/feed";
import { KraphGraph } from "@/core/linkers";
import { CARD_FRAME_SIZE, CARD_TONES, CardFrame } from "@/core/ui/card-frame";
import { Name } from "@/core/ui/name";
import Timestamp from "@/core/ui/timestamp";
import { cn } from "@/core/util/utils";
import { ProfileFeedGraphsQuery, useProfileFeedGraphsQuery } from "../api/graphql";

type Graph = ProfileFeedGraphsQuery["graphs"][number];

const EMPTY: readonly never[] = [];

/** The knowledge graphs they made, newest first (`GraphFilter.creator`). */
const useGraphs = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedGraphsQuery({
    variables: {
      filters: { creator: sub, ...(search ? { search } : {}) },
      pagination: { limit },
    },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.graphs ?? EMPTY, loading, error };
};

const GraphCard = ({ item }: { item: Graph }) => (
  <KraphGraph.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
    <CardFrame
      tone="brand"
      icon={Share2}
      iconLabel="Graph"
      title={
        <KraphGraph.DetailLink object={item} className="block min-w-0 hover:underline">
          <Name>{item.name}</Name>
        </KraphGraph.DetailLink>
      }
      facts={["Graph", ...(item.createdAt ? [<Timestamp key="created" date={item.createdAt} relative />] : [])]}
      menu
    >
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl bg-background/40 p-2">
        <Share2 className={cn("h-10 w-10 opacity-25", CARD_TONES.brand.icon)} />
        {item.description && <p className="line-clamp-2 text-center text-xs text-muted-foreground">{item.description}</p>}
      </div>
    </CardFrame>
  </KraphGraph.Smart>
);

export const KRAPH_PROFILE_FEED: ProfileFeedSource[] = [
  {
    id: "kraph.graphs",
    kinds: [{ id: "kraph.graphs", label: "Graphs", icon: Share2 }],
    useItems: useGraphs,
    itemKey: (item: Graph) => item.id,
    createdAt: (item: Graph) => item.createdAt,
    Card: GraphCard,
  } satisfies ProfileFeedSource<Graph>,
];
