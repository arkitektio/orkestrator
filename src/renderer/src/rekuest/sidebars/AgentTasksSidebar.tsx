
import { useListTasksQuery } from "../api/graphql";
import ListTaskCard from "../components/cards/ListTaskCard";

export const AgentTasksSidebar = (props: { agent: string }) => {
  // cache-and-network so a remount shows fresh rows. New tasks are not pushed
  // live into this sidebar (only status updates flow in via the normalized
  // cache when an updater is running elsewhere).
  const { data, error } = useListTasksQuery({
    variables: {
      filter: { agent: props.agent },
      pagination: { limit: 10, offset: 0 },
    },
    fetchPolicy: "cache-and-network",
  });

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Runs</h2>
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/10">
          <p className="text-sm text-destructive">
            Error loading runs: {error.message}
          </p>
        </div>
      </div>
    );
  }



  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Tasks Overview</h2>
        <p className="text-sm text-muted-foreground">
          The last 10 Tasks that have been executed on this agent.
        </p>
      </div>
      {data?.tasks.map((card) => (
        <ListTaskCard key={card.id} item={card} />
      ))}
    </div>
  );
};
