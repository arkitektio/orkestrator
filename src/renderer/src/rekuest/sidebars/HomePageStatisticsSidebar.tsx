
import {
  Activity,
  Images
} from "lucide-react";
import { useHomePageStatsQuery } from "../api/graphql";

export const HomePageStatisticsSidebar = () => {
    const { data, error, loading } = useHomePageStatsQuery();

    // Calculate additional metrics from available data
    const totalActions = data?.actionStats?.count || 0;
    const totalTasks = data?.taskStats?.count || 0;

    // Same palette as every other statistics sidebar (see mikro's
    // `StatisticsSidebar`): the brand colour first, then the chart offsets,
    // each icon on a tint of ITS OWN colour.
    const statsCards = [
        {
            title: "Total Actions",
            value: loading ? "..." : totalActions,
            description: "Total number of actions in your collection",
            icon: Images,
            color: "text-primary",
            bgColor: "bg-primary/10",
        },
        {
            title: "Recent Activity",
            value: loading ? "..." : totalTasks,
            description: "Tasks created since you joined",
            icon: Activity,
            color: "text-chart-1",
            bgColor: "bg-chart-1/10",
        }
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
                    className="p-4 rounded-lg border border-border flex items-center gap-4 transition-colors hover:bg-muted/30"
                >
                    <div
                        className={`p-3 rounded-lg ${card.bgColor} ${card.color}`}
                    >
                        <card.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};
