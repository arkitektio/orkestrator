import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlpakaCollection } from "@/linkers";
import { Library } from "lucide-react";
import { ListChromaCollectionFragment } from "../../api/graphql";

interface Props {
  item: ListChromaCollectionFragment;
}

const TheCard = ({ item }: Props) => {
  return (
    <AlpakaCollection.Smart object={item}>
      <Card className="h-full border-border/60 bg-card shadow-sm">
        <CardHeader className="gap-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-muted/60">
              <Library className="h-6 w-6 text-muted-foreground" />
            </div>
            {/* `count` is null when the vector database cannot be reached. */}
            {item.count != null ? (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {item.count} {item.count === 1 ? "document" : "documents"}
              </Badge>
            ) : null}
          </div>

          <CardTitle className="text-base font-semibold leading-tight">
            <AlpakaCollection.DetailLink
              object={item}
              className="line-clamp-2 transition-colors hover:text-foreground/80"
            >
              {item.name}
            </AlpakaCollection.DetailLink>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {item.description?.trim() ||
              "Search this collection for semantically similar documents."}
          </p>
        </CardContent>
      </Card>
    </AlpakaCollection.Smart>
  );
};

export default React.memo(TheCard);