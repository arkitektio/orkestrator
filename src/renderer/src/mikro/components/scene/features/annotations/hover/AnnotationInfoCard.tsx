import { useContext, type ContextType, type ReactNode } from "react";
import { useStore } from "zustand";
import { CropIcon, SplineIcon, TriangleAlert } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { MikroAnnotation, MikroArrayLens } from "@/core/linkers";
import { Skeleton } from "@/core/ui/skeleton";
import { useGetAnnotationInfoQuery, type GetAnnotationInfoQuery } from "@/mikro/api/graphql";

import { DerivedGroup, DerivedItem, type RenderLink } from "../../staging/DerivedItem";
import { RoiSelectionStoreContext } from "../roiSelectionStore";
import { ResidentItem, isNamedResident } from "../../staging/DerivedResidents";

type Info = GetAnnotationInfoQuery["annotation"];

/**
 * What the annotation card (`AnnotationHoverCard`) says about one shape below
 * its header (which names the author): where it sits, and what was MADE from it — the lenses cut to it and the data
 * computed from it (a crop written out, an image straightened along it). In
 * the scene's float each can be staged as a layer for now (`DerivedItem`).
 *
 * Mounted only while the card is open, so the query (`GetAnnotationInfo`)
 * runs when it unfolds and not on every shape the pointer crosses;
 * `cache-and-network`, because the
 * usual reason to open it twice is that something was just made from the
 * shape. Both lists are the server's record of the act (`LensCut`, the
 * ANNOTATION source of `derivedFrom`), not a question about where things are
 * now: a shape moved afterwards still lists what was made from it.
 *
 * The float shows it as two panes (`AnnotationDerived`, `AnnotationDetails`)
 * of its menu; `AnnotationInfoCard` is both, stacked, for anywhere else.
 */
export const useAnnotationInfo = (id: string) =>
  useGetAnnotationInfoQuery({ variables: { id }, fetchPolicy: "cache-and-network" });

export type AnnotationInfo = Info;

/** How many things were made from the shape: what the float's "Derived" row counts. */
export const derivedCount = (info: Info): number =>
  info.derivedLenses.length + info.derivedResidents.filter(isNamedResident).length + info.derivedAnnotations.length;

/** Whether the shape says anything about itself beyond what was made from it. */
export const hasDetails = (info: Info): boolean =>
  !!info.description || info.coordinates.length > 0 || info.derivedFrom.length > 0;

/** The question's loading and failure, the way every pane of the card shows them. */
export const InfoPending = ({ error, onRetry }: { error?: unknown; onRetry: () => void }) =>
  error ? (
    <StatusPage
      variant="compact"
      icon={TriangleAlert}
      tone="warning"
      title="Could not read this annotation"
      description={classifyError(error as Error).message}
      actions={<RetryButton onRetry={onRetry} />}
    />
  ) : (
    <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1" aria-busy>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-44" />
      <Skeleton className="h-3 w-24" />
    </div>
  );

export const AnnotationInfoCard = ({ id }: { id: string }) => {
  const { data, error, refetch } = useAnnotationInfo(id);
  const info = data?.annotation;
  if (!info) return <InfoPending error={error} onRetry={() => refetch()} />;
  return (
    <>
      <AnnotationDetails info={info} />
      <AnnotationDerived info={info} />
    </>
  );
};

/**
 * What was MADE from the shape, as buttons (`DerivedItem`): the lenses cut to
 * it, the data computed from it, the shapes refined from it. In the scene's
 * float a lens or a drawable container shows itself in the scene on a click.
 */
export const AnnotationDerived = ({ info }: { info: Info }) => {
  const lenses = info.derivedLenses;
  const residents = info.derivedResidents.filter(isNamedResident);
  const shapes = info.derivedAnnotations;
  if (lenses.length === 0 && residents.length === 0 && shapes.length === 0) {
    return <p className="px-3 py-3 text-xs text-muted-foreground">Nothing made from this shape yet.</p>;
  }
  return (
    <div className="flex flex-col px-1.5 pb-2">
      {lenses.length > 0 && (
        <DerivedGroup caption="Cut">
          {lenses.map((lens) => (
            <DerivedItem
              key={lens.id}
              icon={CropIcon}
              label={lens.label}
              source={{ kind: "array", lens: lens.id, label: lens.label }}
              renderLink={(props) => <MikroArrayLens.DetailLink object={lens} {...props} />}
            />
          ))}
        </DerivedGroup>
      )}
      {residents.length > 0 && (
        <DerivedGroup caption="Computed">
          {residents.map((resident) => (
            <ResidentItem key={`${resident.__typename}:${resident.id}`} resident={resident} />
          ))}
        </DerivedGroup>
      )}
      {shapes.length > 0 && (
        <DerivedGroup caption="Refined">
          {shapes.map((shape) => (
            <RefinedItem key={shape.id} shape={shape} />
          ))}
        </DerivedGroup>
      )}
    </div>
  );
};

/**
 * A shape refined from this one. In the scene it is drawn over its source
 * only once turned on here (`roiSelectionStore.cardShown`) — never just
 * because the card is open. Outside a scene it only opens its page.
 */
const RefinedItem = ({ shape }: { shape: Info["derivedAnnotations"][number] }) => {
  const selectionApi = useContext(RoiSelectionStoreContext);
  const renderLink: RenderLink = (props) => <MikroAnnotation.DetailLink object={shape} {...props} />;
  if (!selectionApi) return <DerivedItem icon={SplineIcon} label={shape.name} renderLink={renderLink} />;
  return <ShownRefinedItem shape={shape} selectionApi={selectionApi} renderLink={renderLink} />;
};

const ShownRefinedItem = ({
  shape,
  selectionApi,
  renderLink,
}: {
  shape: Info["derivedAnnotations"][number];
  selectionApi: NonNullable<ContextType<typeof RoiSelectionStoreContext>>;
  renderLink: RenderLink;
}) => {
  const on = useStore(selectionApi, (state) => state.cardShown.includes(shape.id));
  return (
    <DerivedItem
      icon={SplineIcon}
      label={shape.name}
      shown={{ on, onToggle: () => selectionApi.getState().toggleCardShown(shape.id) }}
      renderLink={renderLink}
    />
  );
};

/** What the shape says about itself: its description, where it is pinned, what it was made from. */
export const AnnotationDetails = ({ info }: { info: Info }) => {
  if (!hasDetails(info)) return null;
  const sources = info.derivedFrom;
  return (
    <div className="flex flex-col gap-2.5 px-3 pb-3 pt-1.5 text-xs">
      {info.description && <p className="whitespace-pre-wrap break-words">{info.description}</p>}
      {info.coordinates.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
          <Fact term="Pinned to">
            {info.coordinates.map((coordinate) => `${coordinate.name} ${coordinate.value}`).join(" · ")}
          </Fact>
        </dl>
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
  <section className="flex flex-col gap-1 [&+&]:border-t [&+&]:border-border/60 [&+&]:pt-2">
    <h4 className="font-medium">{heading}</h4>
    {/* A shape cut to a hundred times still fits the viewport. */}
    <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto">{children}</ul>
  </section>
);
