import { JustUsername } from "@/lok/components/UserAvatar";
import { usePeerHomePageStatsQuery } from "@/mikro/api/graphql";
import {
  Activity,
  Calendar,
  Boxes,
  TrendingUp
} from "lucide-react";

export const PeerStatisticsSidebar = (props: { sub: string }) => {
    const { data, error, loading } = usePeerHomePageStatsQuery({
        variables: { id: props.sub }
    });

    // Calculate additional metrics from available data
    const totalDatasets = data?.arrayDatasetsStats?.count || 0;
    const recentActivity = data?.arrayDatasetsStats?.series?.reduce((sum, bucket) => sum + bucket.count, 0) || 0;
    const averageDaily = recentActivity > 0 ? Math.round(recentActivity / 7) : 0; // Assuming 7 days of data

    const statsCards = [
        {
            title: "Total Datasets",
            value: loading ? "..." : totalDatasets,
            description: "Total number of array datasets in your collection",
            icon: Boxes,
            color: "text-primary",
            bgColor: "bg-chart-1/10",
        },
        {
            title: "Recent Activity",
            value: loading ? "..." : recentActivity,
            description: "Datasets created in the past week",
            icon: Activity,
            color: "text-chart-1",
            bgColor: "bg-chart-2/10",
        },
        {
            title: "Daily Average",
            value: loading ? "..." : averageDaily,
            description: "Average images created per day",
            icon: TrendingUp,
            color: "text-chart-3",
            bgColor: "bg-chart-3/10",
        },
        {
            title: "This Week",
            value: loading ? "..." : recentActivity,
            description: "Total new images added this week",
            icon: Calendar,
            color: "text-chart-4",
            bgColor: "bg-chart-4/10",
        },
    ];

    if (error) {
        return (
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Statistics for <JustUsername sub={props.sub} /></h2>
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
                <h2 className="text-lg font-semibold mb-2">Image Statistics for <JustUsername sub={props.sub} /></h2>
                <p className="text-sm text-muted-foreground">
                    Microscopy and scientific images stored in your Mikro repository.
                    These include raw data, processed images, and analysis results from your experiments.
                </p>
            </div>
            {statsCards.map((card) => (
                <div
                    key={card.title}
                    className="p-4 rounded-lg border  border-border  flex items-center gap-4"
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
