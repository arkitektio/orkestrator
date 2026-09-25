
import {
  Users
} from "lucide-react";

export const HomePageStatisticsSidebar = () => {

  const statsCards = [
    {
      title: "Total Images",
      value: "a bit fake values here",
      description: "Total number of users in your organization",
      icon: Users,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];


  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Omero Overview</h2>
        <p className="text-sm text-muted-foreground">
          Overview over your Organization omero.
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
