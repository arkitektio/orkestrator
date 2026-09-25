import React from "react";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardTitle } from "@/core/components/ui/card";
import { MikroSparseDataset } from "@/core/linkers";
import { ListSparseDatasetFragment } from "../../api/graphql";
import { describeShape, sparseDatasetTitle } from "../sparse/sparseFacts";

interface Props {
  item: ListSparseDatasetFragment;
}

/**
 * Same card as a table dataset's: the name, then the one line that says what
 * the thing structurally is. For a table that is its axes; for a matrix it is
 * its axes WITH their extents, since `obs 2638 × var 1838` is the whole story
 * of a sparse dataset in five tokens. The badge names the axes it can answer
 * about in one read — the property a picker will select on.
 *
 * The WHOLE card is the link, not just the name. A matrix converted without a
 * name came out as a card with a blank title, and a card whose only link is
 * its title is then a card nothing opens; the title also falls back to a
 * placeholder so the name is never blank, but the click target should not
 * depend on it either way.
 */
const TheCard = ({ item }: Props) => {
  return (
    <MikroSparseDataset.Smart object={item}>
      <Card className="aspect-[5/3]">
        <MikroSparseDataset.DetailLink
          object={item}
          className="flex h-full w-full flex-col justify-between px-2 py-2"
        >
          <CardTitle className="line-clamp-2 break-words">
            {sparseDatasetTitle(item.name)}
          </CardTitle>
          <div className="flex flex-row flex-wrap gap-1 items-center">
            <span className="text-xs text-muted-foreground font-mono">
              {describeShape(item.axisNames, item.shape)}
            </span>
            {item.indexableAxes.length > 0 && (
              <Badge variant="outline" className="text-[0.625rem]">
                indexed on {item.indexableAxes.join(", ")}
              </Badge>
            )}
          </div>
        </MikroSparseDataset.DetailLink>
      </Card>
    </MikroSparseDataset.Smart>
  );
};

export default React.memo(TheCard);
