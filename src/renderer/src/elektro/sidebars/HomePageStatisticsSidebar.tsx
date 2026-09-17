
import {
  Users
} from "lucide-react";
import { useHomePageStatsQuery } from "../api/graphql";

export const HomePageStatisticsSidebar = () => {
  const { data, error, loading } = useHomePageStatsQuery();

  // Calculate additional metrics from available data
  const totalImages = data?.blockStats?.count || 0;

  const statsCards = [
    {
      title: "Total Blocks",
      value: loading ? "..." : totalImages,
      description: "Total number of ephys recording session in your organization",
      icon: Users,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Statistics</h2>
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            Error loading statistics: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Elektro Overview</h2>
        <p className="text-sm text-muted-foreground">
          Overview over your ephys and modelling data
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
