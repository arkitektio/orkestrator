import React from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { MikroFile } from "@/linkers";
import { cn } from "@/lib/utils";
import { ListFileFragment } from "../../api/graphql";

interface Props {
  item: ListFileFragment;
  className?: string;
}

// Source - https://stackoverflow.com/q/10420352
// Posted by Hristo, modified by community. See post 'Timeline' for change history
// Retrieved 2026-04-15, License - CC BY-SA 4.0

function getReadableFileSizeString(fileSizeInBytes) {
  let i = -1;
  const byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
  do {
    fileSizeInBytes /= 1024;
    i++;
  } while (fileSizeInBytes > 1024);

  return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
}

const TheCard = ({ item, className }: Props) => {
  return (
    <MikroFile.Smart object={item} key={item.id} hover>
      <Card
        className={cn(
          "px-2 py-2  max-h-40 min-h-10 justify-left flex items-center ",
          className,
        )}
      >
        <CardTitle className="line-clamp-2 break-words flex-wrap">
          <MikroFile.DetailLink object={item}>
            {item.name}
          </MikroFile.DetailLink>
        </CardTitle>
        <CardContent className="text-sm text-muted-foreground">
          <div className="flex flex-row gap-2">
            <div className="font-light">Size:</div>
            <div>{getReadableFileSizeString(item.size)}</div>
          </div>
        </CardContent>
      </Card>
    </MikroFile.Smart>
  );
};

export default React.memo(TheCard);