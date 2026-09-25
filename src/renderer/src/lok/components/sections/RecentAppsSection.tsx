import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppsQuery } from "@/lok/api/graphql";
import { Clock, Shield } from "lucide-react";
import AppCard from "../cards/AppCard";

export const RecentAppsSection = () => {
  const { data, loading } = useAppsQuery({
    variables: {
      pagination: { limit: 6 },
    },
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Apps</CardTitle>
          </div>
          <CardDescription>Apps you&apos;ve recently verified or interacted with</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.apps || data.apps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Apps</CardTitle>
          </div>
          <CardDescription>Apps you&apos;ve recently verified or interacted with</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4 text-muted-foreground">
            <p>No recent apps found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Recent Apps</CardTitle>
        </div>
        <CardDescription>Apps you&apos;ve recently verified or interacted with</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.apps.map((app, index) => (
            <div key={app.id} className="relative">
              <AppCard item={app} />
              {index === 0 && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Latest
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
