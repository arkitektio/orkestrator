import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { CARD_FRAME_GRID } from "@/core/ui/card-frame";
import { FilterClear, FilterSearchField, FilterToggle } from "@/core/ui/filter-bar";
import { RekuestAgent } from "@/core/linkers";
import { parseAsBoolean, parseAsString, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { AppWindow, Database } from "lucide-react";
import { useMemo } from "react";
import { useAgentQuery } from "@/rekuest/api/graphql";
import AgentActionCard from "@/rekuest/components/cards/AgentActionCard";
import { AgentSubpageHeader } from "@/rekuest/components/agent/AgentSubpageHeader";
import { REKUEST_HELP } from "../../help";

/**
 * Every action one agent provides, as cards in the shared frame, under the
 * list pages' header. The filter row (a search over their names and two
 * filters, kept in the link) sits under the title, over the grid it narrows. Reached from the agent page's
 * "Actions" heading and its Info rail.
 */
export const AgentActionsPage = asDetailQueryRoute(useAgentQuery, ({ data }) => {
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [stateful, setStateful] = useQueryState("stateful", parseAsBoolean.withDefault(false));
  const [custom, setCustom] = useQueryState("custom", parseAsBoolean.withDefault(false));
  const implementations = data.agent.implementations;

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return implementations.filter(
      (implementation) =>
        (!stateful || implementation.action.stateful) &&
        (!custom || implementation.action.assignBloks.length > 0) &&
        (!term ||
          `${implementation.action.name} ${implementation.action.description ?? ""} ${implementation.interface}`
            .toLowerCase()
            .includes(term)),
    );
  }, [implementations, search, stateful, custom]);

  const filtered = Boolean(search.trim()) || stateful || custom;
  const clear = () => {
    setSearch("");
    setStateful(false);
    setCustom(false);
  };

  return (
    <RekuestAgent.ModelPage
      title={`${data.agent.name} — Actions`}
      help={REKUEST_HELP.agentActions}
      object={data.agent}
      // The breadcrumb reads the agent's name, not its number.
      crumbs={{ [data.agent.id]: data.agent.name }}
    >
      <div className="flex flex-col gap-6 p-3">
        <AgentSubpageHeader
          agent={data.agent}
          title={`Actions of ${data.agent.name}`}
          description="Everything this app can do for you. Click an action to open it; run it from its card."
        />
        {/* The filter row belongs to the grid it narrows: under the title, over the cards. */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearchField value={search} onChange={setSearch} placeholder="Search actions…" />
          <FilterToggle pressed={stateful} onPressedChange={setStateful} icon={Database}>
            Stateful
          </FilterToggle>
          <FilterToggle pressed={custom} onPressedChange={setCustom} icon={AppWindow}>
            Own interface
          </FilterToggle>
          {filtered && <FilterClear onClear={clear} />}
        </div>
        {shown.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            {implementations.length === 0 ? "This agent provides no actions." : "No action matches."}
          </p>
        ) : (
          <div className={CARD_FRAME_GRID}>
            {shown.map((implementation) => (
              <AgentActionCard key={implementation.id} item={implementation} />
            ))}
          </div>
        )}
      </div>
    </RekuestAgent.ModelPage>
  );
});

export default AgentActionsPage;
