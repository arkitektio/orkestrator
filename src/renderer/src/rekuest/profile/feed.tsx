import { Bot, Play } from "lucide-react";

import type { ProfileFeedQuery, ProfileFeedSource } from "@/core/connection/profile/feed";
import {
  ListTaskFragment,
  Ordering,
  ProfileFeedAgentsQuery,
  useListTasksQuery,
  useProfileFeedAgentsQuery,
} from "../api/graphql";
import AgentCard from "../components/cards/AgentCard";
import TaskCard from "../components/cards/TaskCard";

type FeedAgent = ProfileFeedAgentsQuery["agents"][number];

const EMPTY: readonly never[] = [];

/** The agents they installed, newest first. */
const useAgents = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useProfileFeedAgentsQuery({
    variables: {
      filters: { user: sub, ...(search ? { search } : {}) },
      pagination: { limit },
    },
    fetchPolicy: "cache-and-network",
  });
  return { items: data?.agents ?? EMPTY, loading, error };
};

/**
 * The runs they started (root tasks only: a run's children are part of it),
 * newest first. Tasks cannot be searched on the server, so a search finds none.
 */
const useTasks = ({ sub, search, limit }: ProfileFeedQuery) => {
  const { data, loading, error } = useListTasksQuery({
    variables: {
      filter: { user: sub, rootIsnull: true },
      ordering: [{ createdAt: Ordering.Desc }],
      pagination: { limit },
    },
    skip: Boolean(search),
    fetchPolicy: "cache-and-network",
  });
  return { items: search ? EMPTY : (data?.tasks ?? EMPTY), loading: !search && loading, error };
};

export const REKUEST_PROFILE_FEED: ProfileFeedSource[] = [
  {
    id: "rekuest.agents",
    kinds: [{ id: "rekuest.agents", label: "Agents", icon: Bot }],
    useItems: useAgents,
    itemKey: (item: FeedAgent) => item.id,
    createdAt: (item: FeedAgent) => item.installedAt,
    Card: ({ item }: { item: FeedAgent }) => <AgentCard item={item} />,
  } satisfies ProfileFeedSource<FeedAgent>,
  {
    id: "rekuest.tasks",
    kinds: [{ id: "rekuest.tasks", label: "Runs", icon: Play }],
    useItems: useTasks,
    itemKey: (item: ListTaskFragment) => item.id,
    createdAt: (item: ListTaskFragment) => item.createdAt,
    Card: ({ item }: { item: ListTaskFragment }) => <TaskCard item={item} />,
  } satisfies ProfileFeedSource<ListTaskFragment>,
];
