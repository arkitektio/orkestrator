
import {
  Images
} from "lucide-react";
import { useImplementationStatsQuery } from "../api/graphql";

export const ImplementationStatsSidebar = (props: { implementation: string }) => {
  const { data, error, loading } = useImplementationStatsQuery({
    variables: { id: props.implementation }
  });

  // Calculate additional metrics from available data
  const totalTasks = data?.taskStats?.count || 0;

  const statsCards = [
    {
      title: "Total Tasks",
      value: loading ? "..." : totalTasks,
      description: "Total number of task assigned to this implementation",
      icon: Images,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Statistics</h2>
        <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10">
          <p className="text-sm text-destructive">
            Error loading statistics: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Rekuest Overview</h2>
        <p className="text-sm text-muted-foreground">
          Overview of actions and tasks in your Rekuest instance.
        </p>
      </div>
      {statsCards.map((card) => (
        <div
          key={card.title}
          className="p-4 rounded-lg border dark:border-gray-700 flex items-center gap-4"
        >
          <div
            className={`p-3 rounded-lg ${card.bgColor} ${card.color}`}
          >
            <card.icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
