import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceRuntimeState } from "@/lib/arkitekt/types";
import { CheckCircle, Search, Server, XCircle } from "lucide-react";
import React from "react";

// Component to display services in a nice card layout
export const ServiceCard: React.FC<{
  service: ServiceRuntimeState;
}> = ({ service }) => {
  const isUnresolved = service.status === "invalid";
  return (
    <Card
      className={
        isUnresolved ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            {service.key}
          </div>
          <Badge variant={isUnresolved ? "destructive" : service.status === "checking" ? "secondary" : "default"}>
            {isUnresolved ? (
              <XCircle className="w-3 h-3 mr-1" />
            ) : service.status === "checking" ? (
              <Search className="w-3 h-3 mr-1" />
            ) : (
              <CheckCircle className="w-3 h-3 mr-1" />
            )}
            {isUnresolved ? "Invalid" : service.status === "checking" ? "Checking" : "Active"}
          </Badge>
        </CardTitle>
        {typeof service.definition.description === "string" ? (
          <CardDescription>{service.definition.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {service.instance?.identifier || "No instance available"}
        </div>

        {service.errors.length > 0 && (
          <div className="mt-3 space-y-1">
            {service.errors.map((error) => (
              <div key={error} className="rounded border border-destructive/30 bg-destructive/10 p-2 text-xs">
                {error}
              </div>
            ))}
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            View Raw Configuration
          </summary>
          <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto">
            {JSON.stringify(service.instance, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};
