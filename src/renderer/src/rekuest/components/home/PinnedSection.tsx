import { HomeSection } from "@/core/layout/ModuleHome";
import { Pin } from "lucide-react";
import { usePinnedQuery } from "@/rekuest/api/graphql";
import AgentCard from "../cards/AgentCard";
import MaterializedBlokCard from "../cards/MaterializedBlokCard";

/** Everything you pinned: bloks and agents. Nothing pinned draws nothing. */
export const PinnedSection = () => {
  const { data } = usePinnedQuery();
  const materialized = data?.materializedBloks ?? [];
  const agents = data?.agents ?? [];
  if (materialized.length + agents.length === 0) return null;

  return (
    <HomeSection
      title={
        <span className="flex items-center gap-1.5">
          <Pin className="h-3 w-3" />
          Pinned
        </span>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">
        {materialized.map((item) => (
          <MaterializedBlokCard key={item.id} item={item} />
        ))}
        {agents.map((item) => (
          <AgentCard key={item.id} item={item} />
        ))}
      </div>
    </HomeSection>
  );
};
