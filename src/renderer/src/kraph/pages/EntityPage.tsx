import { asGraphDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KraphEntity, KraphEntityCategory } from "@/linkers";
import { ActivityLogIcon } from "@radix-ui/react-icons";
import { Database } from "lucide-react";
import { useGetEntityQuery } from "../api/graphql";
import { InformingStructures } from "../components/InformingStructures";
import { EntityStandings } from "../components/EntityStandings";
import { PropertyEditor } from "../components/PropertyEditor";
import { PropertyRenderer } from "../components/PropertyRenderer";

/**
 * How a connection's kind reads. `Edge` is one graph's drawing of a `Link`, and
 * only some link kinds are ever drawn — RELATION and the two PARTICIPATES_AS_*.
 * The rest are read from the log, so this list is shorter than `LinkKind`.
 */
const connectionKindLabel = (typename?: string) => {
  switch (typename) {
    case "Measurement":
      return "measured by";
    case "Relation":
      return "relation";
    case "StructureRelation":
      return "structure relation";
    case "InputParticipation":
      return "input to";
    case "OutputParticipation":
      return "output of";
    case "Sameness":
      return "same as";
    default:
      return typename ?? "link";
  }
};

export const calculateDuration = (start?: string, end?: string) => {
  if (!start) return null;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const durationMs = endDate.getTime() - startDate.getTime();

  const seconds = Math.floor((durationMs / 1000) % 60);
  const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
  const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));

  let durationStr = "";
  if (days > 0) durationStr += `${days}d `;
  if (hours > 0) durationStr += `${hours}h `;
  if (minutes > 0) durationStr += `${minutes}m `;
  if (seconds > 0 || durationStr === "") durationStr += `${seconds}s`;

  return durationStr.trim();
};

const Page = asGraphDetailQueryRoute(useGetEntityQuery, ({ data }) => {
  // A view draws a node under *every* category that admits it (RFC 0019), so
  // there is no single category any more. The property definitions a reading
  // has are the union over those categories, deduped by key — which is the same
  // set `richProperties` is folded from.
  const categories = data.entity.categories;
  const categoryTitle =
    categories.map((c) => c.label).join(" · ") || data.entity.label;
  const propertyDefinitions = Array.from(
    new Map(
      categories
        .flatMap((c) => c.propertyDefinitions ?? [])
        .map((def) => [def.key, def]),
    ).values(),
  );

  return (
    <KraphEntity.ModelPage
      variant="black"
      object={{ id: data.entity.id }}
      title={<>
        <div className="flex flex-row">
          {categoryTitle} <div className="ml-2 text-md font-light">{data.entity.label}</div>
        </div>
      </>}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <KraphEntity.Knowledge object={{ id: data.entity.id }} />
          </Sidebars.Tab>
          <Sidebars.Tab label="Evidence">
            {/*
              Two halves. Structures are what the claim is evidence *from*;
              standings are the positions taken on the claim itself — retraction
              and attestation both write one, and the current answer is the fold.
            */}
            <InformingStructures entityId={data.entity.id} />
            <EntityStandings id={data.entity.id} />
          </Sidebars.Tab>
        </Sidebars>
      }
      pageActions={
        <div className="flex flex-row gap-2">

          <KraphEntity.ObjectButton
            object={{ id: data.entity.id }}
            className="w-full"
          />
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row h-full min-h-[80vh]">
        {/* Left Column: Info */}
        <div className="w-full lg:w-[450px] xl:w-[500px] flex-shrink-0 flex flex-col gap-8 p-4 lg:p-8 lg:overflow-y-auto lg:h-full lg:border-r bg-black z-20">
          {/* Metadata */}


          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl flex flex-row truncate ellipsis">
            {categoryTitle} <div className="ml-2 text-md font-light">{data.entity.label}</div>
          </h1>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" /> Metadata
            </h3>
            <div className="grid gap-4 pl-2">
              {categories.length > 0 && (
                <div className="grid gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {categories.length === 1 ? "Category" : "Categories"}
                  </span>
                  {categories.map((category) => (
                    <KraphEntityCategory.DetailLink
                      key={category.id}
                      object={{ id: category.id }}
                      className="text-sm font-medium hover:underline"
                    >
                      {category.label}
                    </KraphEntityCategory.DetailLink>
                  ))}
                </div>
              )}
            </div>
          </div>

          {propertyDefinitions.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Properties</h3>
                <div className="grid gap-2 pl-2">
                  {propertyDefinitions.map((def) => {
                    const prop = data.entity.richProperties.find(
                      (p) => p.key === def.key,
                    );
                    return (
                      <div
                        key={def.key}
                        className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0 group"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-muted-foreground">
                            {def.label || def.key}
                          </span>
                          {def.description && (
                            <span className="text-xs text-muted-foreground/50">
                              {def.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <PropertyRenderer
                            value={prop?.value}
                            definition={def}
                          />
                          <PropertyEditor
                            entityId={data.entity.id}
                            definition={def}
                            value={prop?.value}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            data.entity.richProperties.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Properties</h3>
                  <div className="grid gap-2 pl-2">
                    {data.entity.richProperties.map((property) => (
                      <div
                        key={property.key}
                        className="flex justify-between items-center border-b last:border-0 pb-2 last:pb-0"
                      >
                        <span className="text-sm font-medium text-muted-foreground">
                          {property.key}
                        </span>
                        <span className="text-sm">{property.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          )}

          {/* Connections */}
          {data.entity.connections.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ActivityLogIcon className="h-4 w-4" /> Connections
                </h3>
                {/*
                  One section, not three. `measuredBy`, `participatedIn` and
                  `resultedOut` were separate traversals for three of the eight
                  link kinds; `connections` is every link touching this node, and
                  the kind is what distinguishes them.
                */}
                <div className="grid gap-2 pl-2">
                  {data.entity.connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="outline">
                          {connectionKindLabel(connection.__typename)}
                        </Badge>
                        <span className="font-medium truncate">
                          {"category" in connection
                            ? (connection.category?.label ?? connection.label)
                            : connection.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 font-mono">
                        {connection.sourceId === data.entity.id
                          ? "outgoing"
                          : "incoming"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Node View */}
        <div className="flex-1 relative min-h-[500px] lg:min-h-auto">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none hidden lg:block" />
          <div className="absolute inset-0 overflow-hidden">
            Currently not implemented
          </div>
        </div>
      </div>
    </KraphEntity.ModelPage>
  );
});


export default Page;
