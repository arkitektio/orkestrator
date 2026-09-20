import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Search, Settings } from "lucide-react";
import React, { useState } from "react";

// Component to display fakts data in a structured way
export const FaktsViewer: React.FC<{ fakts: unknown }> = ({ fakts }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null) return <span className="text-muted-foreground">None</span>;
    if (value === undefined)
      return <span className="text-muted-foreground">Undefined</span>;
    if (typeof value === "boolean")
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value.toString()}
        </Badge>
      );
    if (typeof value === "string") {
      if (value.startsWith("http")) {
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline flex items-center gap-1"
          >
            <Globe className="w-3 h-3" />
            {value}
          </a>
        );
      }
      return <span className="text-green-400">&quot;{value}&quot;</span>;
    }
    if (typeof value === "number")
      return <span className="text-orange-400">{value}</span>;
    if (Array.isArray(value)) {
      return (
        <div className="ml-4">
          {value.map((item, index) => (
            <div key={index} className="border-l border-border pl-2 my-1">
              [{index}]: {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }
    if (typeof value === "object") {
      return (
        <div className="ml-4">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <div key={k} className="border-l border-border pl-2 my-1">
              <span className="text-blue-300 font-medium">{k}:</span>{" "}
              {renderValue(v)}
            </div>
          ))}
        </div>
      );
    }
    return <span>{String(value)}</span>;
  };

  const filterData = (data: unknown, search: string): unknown => {
    if (!search) return data;

    const searchLower = search.toLowerCase();

    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(
        data as Record<string, unknown>,
      )) {
        if (key.toLowerCase().includes(searchLower)) {
          filtered[key] = value;
        } else if (
          typeof value === "string" &&
          value.toLowerCase().includes(searchLower)
        ) {
          filtered[key] = value;
        } else if (typeof value === "object") {
          const filteredChild = filterData(value, search);
          if (
            filteredChild &&
            typeof filteredChild === "object" &&
            Object.keys(filteredChild as Record<string, unknown>).length > 0
          ) {
            filtered[key] = filteredChild;
          }
        }
      }
      return Object.keys(filtered).length > 0 ? filtered : null;
    }

    return data;
  };

  const filteredFakts = filterData(fakts, searchTerm);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search configuration..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="space-y-3">
          {filteredFakts && typeof filteredFakts === "object"
            ? Object.entries(filteredFakts as Record<string, unknown>).map(
              ([key, value]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      {key}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>{renderValue(value)}</CardContent>
                </Card>
              ),
            )
            : null}
        </div>
      </ScrollArea>
    </div>
  );
};
