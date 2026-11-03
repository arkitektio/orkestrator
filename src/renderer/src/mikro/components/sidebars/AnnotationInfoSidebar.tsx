import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Badge } from "@/core/ui/badge";
import { MikroAnnotation, MikroCoordinateSystem, MikroScene } from "@/core/linkers";

import { GetAnnotationQuery, LineageNodeKind } from "../../api/graphql";
import { AnnotationGlyph } from "../annotations/AnnotationGlyph";
import { residentLabel } from "../coordinates/residents";
import { LineageLink } from "../lineage/LineageLink";

type PageAnnotation = GetAnnotationQuery["annotation"];

/**
 * Everything about one drawn shape that is not the shape on screen: what it
 * is, where it was drawn, which slices it is pinned to, and whether the
 * placement the viewport is showing it at is still the one it was drawn under.
 *
 * The staleness line is the reason this rail exists rather than a caption. An
 * annotation stores raw vectors in its collection's space and the transform
 * version they were drawn under; re-registering that space moves every shape in
 * it without touching a single vector. A shape whose `createdWithTransforms`
 * lags is drawn somewhere its author never put it, and nothing else on the page
 * can say so.
 */
export const AnnotationInfoSidebar = ({
  annotation,
}: {
  annotation: PageAnnotation;
}) => {
  const system = annotation.coordinateSystem;
  const stale =
    system != null && annotation.createdWithTransforms < system.transformVersion;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-row items-start gap-3">
        <div className="h-12 w-12 shrink-0">
          <AnnotationGlyph annotation={annotation} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <MikroAnnotation.DetailLink
            object={annotation}
            className="break-all text-lg font-semibold"
          >
            {annotation.name}
          </MikroAnnotation.DetailLink>
          <Badge variant="outline" className="w-fit text-[0.625rem]">
            {annotation.kind}
          </Badge>
          {annotation.description && (
            <p className="text-sm text-muted-foreground">
              {annotation.description}
            </p>
          )}
        </div>
      </div>

      {/* Absent rather than "unknown": the FK is SET_NULL, so a shape whose
          author is gone (or that a client created without one) has no name
          to show. */}
      {annotation.creator && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Drawn by</div>
          <StructureDisplay identifier="@lok/user" id={annotation.creator.sub} />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Collection</div>
        <span className="break-all text-sm">{annotation.collection.name}</span>
        {annotation.collection.description && (
          <p className="text-xs text-muted-foreground">
            {annotation.collection.description}
          </p>
        )}
        {annotation.collection.scene ? (
          <MikroScene.DetailLink
            object={annotation.collection.scene}
            className="text-xs text-muted-foreground hover:text-primary"
          >
            drawn on {annotation.collection.scene.name}
          </MikroScene.DetailLink>
        ) : (
          // Not an error: a collection minted over a dataset rather than for a
          // scene has nowhere to open, and the page says so instead of a
          // viewport.
          <span className="text-xs text-muted-foreground">
            Freestanding collection — no scene to open it in.
          </span>
        )}
      </div>

      {/* The pins. An axis the shape does not pin, it SPANS — so the absence of
          a row is a fact about the shape, not a missing value. */}
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Pinned to</div>
        {annotation.coordinates.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Nothing — it spans every axis of its space.
          </span>
        ) : (
          <div className="flex flex-row flex-wrap gap-1">
            {annotation.coordinates.map((coordinate) => (
              <Badge
                key={coordinate.name}
                variant="secondary"
                className="px-1 py-0 font-mono text-[0.625rem] font-normal"
              >
                {coordinate.name}={coordinate.value}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {annotation.intrinsicBbox && (
        <div className="flex flex-col gap-1">
          {/* The box in the nearest INTRINSIC space the collection's chain
              reaches — pixels of the thing drawn over, not the scene's µm. */}
          <div className="text-xs font-semibold">Intrinsic bounds</div>
          <div className="font-mono text-[0.625rem] text-muted-foreground">
            min [{annotation.intrinsicBbox.min.join(", ")}]
          </div>
          <div className="font-mono text-[0.625rem] text-muted-foreground">
            max [{annotation.intrinsicBbox.max.join(", ")}]
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Drawing space</div>
        {system ? (
          <>
            <MikroCoordinateSystem.DetailLink
              object={system}
              className="ellipsis break-all font-mono text-2xs text-muted-foreground"
            >
              {system.name}
            </MikroCoordinateSystem.DetailLink>
            <div className="font-mono text-[0.625rem] text-muted-foreground">
              {system.axes.map((axis) => axis.name).join(" × ") || "no axes"}
            </div>
            <div className="flex flex-row flex-wrap gap-1">
              <Badge variant="outline" className="text-[0.625rem]">
                {residentLabel(system)}
              </Badge>
              {stale ? (
                <Badge variant="destructive" className="text-[0.625rem]">
                  drawn at v{annotation.createdWithTransforms} · space at v
                  {system.transformVersion}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[0.625rem]">
                  placement current
                </Badge>
              )}
            </div>
            {stale && (
              <p className="text-xs text-muted-foreground">
                The registrations of this space changed after the shape was
                drawn, so where you see it now is not where it was put.
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            This annotation names no coordinate system.
          </span>
        )}
      </div>

      <ShapeLineage annotation={annotation} />
    </div>
  );
};

/**
 * The shapes this one was made from, and the shapes made from it: one hop each
 * way, with the graph a click away. A record of the act (`AnnotationDerivation`),
 * not of geometry: both shapes are placed by their own collections.
 */
const ShapeLineage = ({ annotation }: { annotation: PageAnnotation }) => {
  const sources = annotation.derivedFrom;
  const made = annotation.derivedAnnotations;
  if (sources.length === 0 && made.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-semibold">Lineage</div>
      {sources.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Made from</span>
          {sources.map((link) => (
            <div key={link.id} className="flex min-w-0 flex-row items-baseline gap-2 text-sm">
              <Badge variant="outline" className="shrink-0 text-[0.625rem]">
                {link.relation.toLowerCase()}
              </Badge>
              <MikroAnnotation.DetailLink object={link.source} className="min-w-0 truncate">
                {link.source.name}
              </MikroAnnotation.DetailLink>
              {link.reason && <span className="min-w-0 truncate text-xs text-muted-foreground">{link.reason}</span>}
            </div>
          ))}
        </div>
      )}
      {made.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Made into</span>
          {made.map((child) => (
            <MikroAnnotation.DetailLink key={child.id} object={child} className="min-w-0 truncate text-sm">
              {child.name}
            </MikroAnnotation.DetailLink>
          ))}
        </div>
      )}
      <LineageLink kind={LineageNodeKind.Annotation} id={annotation.id} />
    </div>
  );
};
