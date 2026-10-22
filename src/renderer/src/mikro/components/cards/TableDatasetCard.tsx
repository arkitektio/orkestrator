import React from "react";
import { Card, CardTitle } from "@/core/ui/card";
import { MikroTableDataset } from "@/core/linkers";
import { LineageNodeKind, ListTableDatasetFragment } from "../../api/graphql";
import { useHomeResult } from "../home/homeResults";
import { ResultCount } from "../home/ResultChips";

interface Props {
  item: ListTableDatasetFragment;
}

const TheCard = ({ item }: Props) => {
  // On the home page: what was computed from the table (nothing elsewhere).
  const results = useHomeResult(LineageNodeKind.TableDataset, item.id);
  return (
    <MikroTableDataset.Smart object={item} menuButton>
      <Card className="px-2 py-2 aspect-[5/3] flex flex-col justify-between">
        <CardTitle className="line-clamp-2 break-words">
          <MikroTableDataset.DetailLink object={item}>
            {item.name}
          </MikroTableDataset.DetailLink>
        </CardTitle>
        <div className="flex flex-row flex-wrap gap-1 items-center">
          <span className="text-xs text-muted-foreground font-mono">
            {item.axisNames.length
              ? item.axisNames.join(" × ")
              : "measurement table"}
          </span>
          {results && (
            <span className="ml-auto">
              <ResultCount kind={LineageNodeKind.TableDataset} id={item.id} results={results} plain />
            </span>
          )}
        </div>
      </Card>
    </MikroTableDataset.Smart>
  );
};

export default React.memo(TheCard);