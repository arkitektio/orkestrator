import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { MikroAnnotation, MikroArrayLens } from "@/core/linkers";
import { Skeleton } from "@/core/ui/skeleton";
import { useGetAnnotationInfoQuery, type GetAnnotationInfoQuery } from "@/mikro/api/graphql";

import { ResidentLink, ResidentStageToggle, RESIDENT_NOUN, isNamedResident } from "../../staging/DerivedResidents";
import { StageToggle } from "../../staging/StageToggle";

type Info = GetAnnotationInfoQuery["annotation"];

/**
 * What the annotation card (`AnnotationHoverCard`) says about one shape below
 * its header (which names the author): where it sits, and what was MADE from it — the lenses cut to it and the data
 * computed from it (a crop written out, an image straightened along it). In
 * the scene's float each can be staged as a layer for now (`StageToggle`).
 *
 * Mounted only while the card is open, so the query (`GetAnnotationInfo`)
 * runs when it unfolds and not on every shape the pointer crosses;
 * `cache-and-network`, because the
 * usual reason to open it twice is that something was just made from the
 * shape. Both lists are the server's record of the act (`LensCut`, the
 * ANNOTATION source of `derivedFrom`), not a question about where things are
 * now: a shape moved afterwards still lists what was made from it.
 */
export const AnnotationInfoCard = ({ id }: { id: string }) => {
  const { data, error, refetch } = useGetAnnotationInfoQuery({
    variables: { id },
    fetchPolicy: "cache-and-network",
  });
  const info = data?.annotation;

  if (!info && error) {
    return (
      <StatusPage
        variant="compact"
        icon={TriangleAlert}
        tone="warning"
        title="Could not read this annotation"
        description={classifyError(error).message}
        actions={<RetryButton onRetry={() => refetch()} />}
      />
    );
  }
  if (!info) {
    return (
      <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1" aria-busy>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }
  return <Loaded info={info} />;
};

const Loaded = ({ info }: { info: Info }) => {
  const lenses = info.derivedLenses;
  const residents = info.derivedResidents.filter(isNamedResident);
  const sources = info.derivedFrom;
  const shapes = info.derivedAnnotations;

  return (
    <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1 text-xs">
      {info.description && <p className="whitespace-pre-wrap break-words">{info.description}</p>}
      {info.coordinates.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
          <Fact term="Pinned to">
            {info.coordinates.map((coordinate) => `${coordinate.name} ${coordinate.value}`).join(" · ")}
          </Fact>
        </dl>
      )}

      {lenses.length > 0 && (
        <Made heading="Cut to this shape">
          {lenses.map((lens) => (
            <li key={lens.id} className="flex min-w-0 items-baseline gap-2">
              <MikroArrayLens.DetailLink object={lens} className="min-w-0 truncate">
                {lens.label}
              </MikroArrayLens.DetailLink>
              <span className="shrink-0 tabular-nums text-muted-foreground">{lens.shape.join(" × ")}</span>
              <StageToggle source={{ kind: "array", lens: lens.id, label: lens.label }} />
            </li>
          ))}
        </Made>
      )}
      {residents.length > 0 && (
        <Made heading="Computed from this shape">
          {residents.map((resident) => (
            <li key={`${resident.__typename}:${resident.id}`} className="flex min-w-0 items-baseline gap-2">
              <ResidentLink resident={resident} />
              <span className="shrink-0 text-muted-foreground">{RESIDENT_NOUN[resident.__typename]}</span>
              <ResidentStageToggle resident={resident} />
            </li>
          ))}
        </Made>
      )}
      {shapes.length > 0 && (
        <Made heading="Shapes made from this one">
          {shapes.map((shape) => (
            <li key={shape.id} className="flex min-w-0 items-baseline gap-2">
              <MikroAnnotation.DetailLink object={shape} className="min-w-0 truncate">
                {shape.name}
              </MikroAnnotation.DetailLink>
            </li>
          ))}
        </Made>
      )}
      {lenses.length === 0 && residents.length === 0 && shapes.length === 0 && (
        <p className="text-muted-foreground">Nothing has been cut or computed from this shape yet.</p>
      )}
      {sources.length > 0 && (
        <Made heading="Made from">
          {sources.map((link) => (
            <li key={link.id} className="flex min-w-0 items-baseline gap-2">
              <MikroAnnotation.DetailLink object={link.source} className="min-w-0 truncate">
                {link.source.name}
              </MikroAnnotation.DetailLink>
              <span className="shrink-0 text-muted-foreground">{link.relation.toLowerCase()}</span>
            </li>
          ))}
        </Made>
      )}
    </div>
  );
};

const Fact = ({ term, children }: { term: string; children: ReactNode }) => (
  <>
    <dt className="text-muted-foreground">{term}</dt>
    <dd className="min-w-0">{children}</dd>
  </>
);

const Made = ({ heading, children }: { heading: string; children: ReactNode }) => (
  <section className="flex flex-col gap-1 border-t border-border/60 pt-2">
    <h4 className="font-medium">{heading}</h4>
    {/* A shape cut to a hundred times still fits the viewport. */}
    <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">{children}</ul>
  </section>
);
