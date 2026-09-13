import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KraphLink } from "@/linkers";
import Timestamp from "@/components/ui/timestamp";
import { useGetDetailLinkQuery } from "../api/graphql";
import { StandingsPanel } from "../components/StandingsPanel";

/**
 * A claim relating two things.
 *
 * `Link` replaced `MaterializedEdge` and its three proxies: one row with a
 * `kind`, of which there are eight — RELATION, SAME_AS, CLASSIFIES, INFORMS,
 * MEASUREMENT, STRUCTURE_RELATION and the two PARTICIPATES_AS_*. Only RELATION
 * and the participations are ever drawn as graph edges; the rest are read from
 * the log directly, so a link with no drawing is ordinary rather than broken.
 *
 * Either end may be an instance, a structure, another link, or a term — a link
 * about a link is a legitimate claim, which is why `source` and `target` are a
 * union rather than a node reference.
 */
const endpointLabel = (
  endpoint:
    | {
        __typename?: string;
        instanceTerm?: { key: string } | null;
        linkTerm?: { key: string } | null;
        object?: string;
        key?: string;
      }
    | null
    | undefined,
) => {
  if (!endpoint) return "unknown";
  return (
    endpoint.instanceTerm?.key ??
    endpoint.linkTerm?.key ??
    endpoint.object ??
    endpoint.key ??
    endpoint.__typename ??
    "unknown"
  );
};

const Page = asDetailQueryRoute(useGetDetailLinkQuery, ({ data }) => {
  const link = data.link;

  return (
    <KraphLink.ModelPage
      object={{ id: link.id }}
      title={link.term?.label ?? link.term?.key ?? link.kind}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Evidence">
            <StandingsPanel standings={link.standings} />
          </Sidebars.Tab>
        </Sidebars>
      }
      pageActions={<KraphLink.ObjectButton object={{ id: link.id }} />}
    >
      <div className="p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{link.kind}</Badge>
          {link.role && <Badge variant="secondary">{link.role}</Badge>}
        </div>

        <div className="text-sm text-muted-foreground">
          Claimed <Timestamp date={link.createdAt} relative /> by{" "}
          {link.assertion.subject}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Card className="p-3 flex flex-col gap-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Source
            </div>
            <div className="font-medium">{endpointLabel(link.source)}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {link.sourceRef}
            </div>
          </Card>
          <Card className="p-3 flex flex-col gap-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Target
            </div>
            <div className="font-medium">{endpointLabel(link.target)}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {link.targetRef}
            </div>
          </Card>
        </div>
      </div>
    </KraphLink.ModelPage>
  );
});

export default Page;
