import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import {
  MikroArrayDataset,
  MikroLens,
  MikroMeshCollection,
  MikroSparseDataset,
  MikroTableDataset,
} from "@/core/linkers";
import { Skeleton } from "@/core/ui/skeleton";
import { useGetAnnotationInfoQuery, type GetAnnotationInfoQuery } from "@/mikro/api/graphql";

type Info = GetAnnotationInfoQuery["annotation"];
type Resident = Info["derivedResidents"][number];

/**
 * What the annotation card (`AnnotationHoverCard`) says about one shape below
 * its header (which names the author): where it sits, and what was MADE from it — the lenses cut to it and the data
 * computed from it (a crop written out, an image straightened along it).
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
  const residents = info.derivedResidents.filter(isNamed);

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
              <MikroLens.DetailLink object={lens} className="min-w-0 truncate">
                {lens.label}
              </MikroLens.DetailLink>
              <span className="shrink-0 tabular-nums text-muted-foreground">{lens.shape.join(" × ")}</span>
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
            </li>
          ))}
        </Made>
      )}
      {lenses.length === 0 && residents.length === 0 && (
        <p className="text-muted-foreground">Nothing has been cut or computed from this shape yet.</p>
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

/** The containers a derivation can leave from; a lens or a level is a part of one and is never listed. */
type NamedResident = Extract<Resident, { id: string }>;

const isNamed = (resident: Resident): resident is NamedResident => "id" in resident;

const RESIDENT_NOUN: Record<NamedResident["__typename"], string> = {
  ArrayDataset: "Dataset",
  TableDataset: "Table",
  SparseDataset: "Sparse dataset",
  MeshCollection: "Meshes",
  NetworkCollection: "Network",
  AnnotationCollection: "Annotations",
};

const ResidentLink = ({ resident }: { resident: NamedResident }) => {
  const className = "min-w-0 truncate";
  switch (resident.__typename) {
    case "ArrayDataset":
      return (
        <MikroArrayDataset.DetailLink object={resident} className={className}>
          {resident.name}
        </MikroArrayDataset.DetailLink>
      );
    case "TableDataset":
      return (
        <MikroTableDataset.DetailLink object={resident} className={className}>
          {resident.name}
        </MikroTableDataset.DetailLink>
      );
    case "SparseDataset":
      return (
        <MikroSparseDataset.DetailLink object={resident} className={className}>
          {resident.name}
        </MikroSparseDataset.DetailLink>
      );
    case "MeshCollection":
      return (
        <MikroMeshCollection.DetailLink object={resident} className={className}>
          {resident.label}
        </MikroMeshCollection.DetailLink>
      );
    // No page of their own to open.
    case "NetworkCollection":
      return <span className={className}>{resident.label}</span>;
    case "AnnotationCollection":
      return <span className={className}>{resident.name}</span>;
  }
};
