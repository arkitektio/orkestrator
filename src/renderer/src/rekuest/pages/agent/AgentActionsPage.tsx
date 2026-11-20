import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { RekuestAgent } from "@/core/linkers";
import { useMemo, useState } from "react";
import { useAgentQuery } from "@/rekuest/api/graphql";
import AgentImplementationCard from "@/rekuest/components/cards/AgentImplementationCard";
import { REKUEST_HELP } from "../../help";

/**
 * Every action one agent provides, as the agent page lists them, with a
 * search over their names. Reached from the agent page's "Actions" heading
 * and its Info rail.
 */
export const AgentActionsPage = asDetailQueryRoute(useAgentQuery, ({ data }) => {
  const [search, setSearch] = useState("");
  const implementations = data.agent.implementations;
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return implementations;
    return implementations.filter((implementation) =>
      `${implementation.action.name} ${implementation.action.description ?? ""} ${implementation.interface}`
        .toLowerCase()
        .includes(term),
    );
  }, [implementations, search]);

  return (
    <RekuestAgent.ModelPage
      title={`${data.agent.name} — Actions`}
      help={REKUEST_HELP.agentActions}
      object={data.agent}
      // The breadcrumb reads the agent's name, not its number.
      crumbs={{ [data.agent.id]: data.agent.name }}
      pageActions={
        <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search actions…" />
      }
    >
      <div className="flex flex-col gap-2 p-3">
        {shown.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {implementations.length === 0 ? "This agent provides no actions." : "No action matches."}
          </p>
        ) : (
          shown.map((implementation) => <AgentImplementationCard key={implementation.id} item={implementation} />)
        )}
      </div>
    </RekuestAgent.ModelPage>
  );
});

export default AgentActionsPage;
