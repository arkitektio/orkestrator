
import {
  Images
} from "lucide-react";
import { ErrorNote } from "@/core/ui/error-note";
import { useHomePageStatsQuery } from "../api/graphql";

export const HomePageStatisticsSidebar = () => {
  const { data, error, loading } = useHomePageStatsQuery();

  // Calculate additional metrics from available data
  const totalGraphs = data?.githubRepoStats?.count || 0;

  const statsCards = [
    {
      title: "Total Repos",
      value: loading ? "..." : totalGraphs,
      description: "Total number of repos in your collection",
      icon: Images,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Statistics</h2>
        <ErrorNote error={error} title="Couldn't load the statistics" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Kabinet Overview</h2>
        <p className="text-sm text-muted-foreground">
          Overview of the app Store
          Overview of the app Store
          Overview of the app Store
          Overview of the app Store
        </p>
      </div>
      {statsCards.map((card) => (
        <div
          key={card.title}
          className="p-4 rounded-lg border dark:border-border flex items-center gap-4"
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
