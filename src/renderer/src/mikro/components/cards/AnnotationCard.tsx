import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { MikroAnnotation, MikroScene } from "@/linkers";
import { Clapperboard } from "lucide-react";

import { ListAnnotationFragment } from "../../api/graphql";

interface Props {
  /** Named `item` because createList passes items in under that name. */
  item: ListAnnotationFragment;
}

/** `RECTANGLE` → `Rectangle`. Mirrors the annotations panel's own formatter. */
const formatAnnotationKind = (kind: string) =>
  kind.charAt(0) + kind.slice(1).toLowerCase().replaceAll("_", " ");

/**
 * The KIND leads, because an annotation's name does not: the labels are
 * machine-minted (`AnnotationsPanel` refuses to show them at all, and numbers
 * its rows instead). So the card is the three facts that place a shape without
 * its geometry — what kind it is, which slices it is pinned to, and where it
 * was drawn.
 *
 * The path itself is deliberately absent, and unqueried: a point list per card
 * is pages of numbers for one grid, and a list page has no scene, hence no path
 * to world and no honest scale to draw one at. It is the detail page's job.
 */
const TheCard = ({ item: annotation }: Props) => {
  const scene = annotation.collection.scene;

  return (
    <MikroAnnotation.Smart object={annotation}>
      {/* Wider than tall, like the other text-only cards: with no picture
          to carry, a square would be mostly empty. */}
      <Card className="aspect-[5/3] overflow-hidden p-0">
        <div className="flex h-full flex-col justify-between gap-2 px-3 py-2">
          <div className="flex min-w-0 flex-row items-start justify-between gap-2">
            <CardTitle className="min-w-0 break-words text-sm leading-tight">
              <MikroAnnotation.DetailLink object={annotation}>
                {formatAnnotationKind(annotation.kind)}
              </MikroAnnotation.DetailLink>
            </CardTitle>

            {/* Where to see it. Absent for a collection that was never minted
                for a scene — the same annotations whose detail page has no
                viewport to show either. */}
            {scene && (
              <MikroScene.DetailLink
                object={scene}
                className="shrink-0"
                title={scene.name}
              >
                <Badge
                  variant="outline"
                  className="max-w-24 gap-1 px-1 py-0 text-[10px] font-normal"
                >
                  <Clapperboard className="h-3 w-3 shrink-0" />
                  <span className="truncate">{scene.name}</span>
                </Badge>
              </MikroScene.DetailLink>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {/* The pins — `t=3, c=0` — are what tells two identical shapes in
                one collection apart. An axis it does not pin, it spans. */}
            {annotation.coordinates.length > 0 && (
              <div className="flex flex-row flex-wrap items-center gap-1">
                {annotation.coordinates.map((coordinate) => (
                  <Badge
                    key={coordinate.name}
                    variant="secondary"
                    className="px-1 py-0 font-mono text-[10px] font-normal"
                  >
                    {coordinate.name}={coordinate.value}
                  </Badge>
                ))}
              </div>
            )}
            <span className="truncate text-xs text-muted-foreground">
              {annotation.collection.name}
            </span>
          </div>
        </div>
      </Card>
    </MikroAnnotation.Smart>
  );
};

export default React.memo(TheCard);