import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { KraphGraph, KraphInstance, KraphNode, KraphTerm } from "@/linkers";
import Timestamp from "@/components/ui/timestamp";
import { useGetDetailInstanceQuery } from "../api/graphql";
import { StandingsPanel } from "../components/StandingsPanel";

/**
 * The claim, at organization grain.
 *
 * An `Instance` is what somebody recorded: a word, an act that recorded it, and
 * the positions taken on it since. It is not an `Entity` — that is one graph's
 * *drawing* of this claim, carrying a category and derived properties that exist
 * only inside that view and are rebuilt from here.
 *
 * This page is where a bare uuid lands when nothing supplies a graph — a drop
 * from another module, a rekuest return port, the command palette. `drawnIn` is
 * the way onward: it lists every view that draws the claim, and each links into
 * the nested view-grain route. An empty list is a real answer, not an error — it
 * means no graph declares a category for this word yet, and the claim stands
 * regardless.
 */
const Page = asDetailQueryRoute(useGetDetailInstanceQuery, ({ data }) => {
  const instance = data.instance;

  return (
    <KraphInstance.ModelPage
      object={{ id: instance.id }}
      title={instance.term.label ?? instance.term.key}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Evidence">
            <StandingsPanel standings={instance.standings} />
          </Sidebars.Tab>
        </Sidebars>
      }
      pageActions={<KraphInstance.ObjectButton object={{ id: instance.id }} />}
    >
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {/* The claim's own account of what it is — never read off a vertex label. */}
            <Badge variant="outline">{instance.kind}</Badge>
            <KraphTerm.DetailLink object={{ id: instance.term.id }}>
              <Badge variant="secondary">{instance.term.key}</Badge>
            </KraphTerm.DetailLink>
          </div>
          <div className="text-sm text-muted-foreground">
            Claimed <Timestamp date={instance.createdAt} relative /> by{" "}
            {instance.assertion.subject}
            {instance.assertion.actionName
              ? ` · ${instance.assertion.actionName}`
              : ""}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Drawn in</h3>
          {instance.drawnIn.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No view declares this word yet, so nothing draws it. The claim
              stands all the same.
            </div>
          ) : (
            <div className="grid gap-2">
              {instance.drawnIn.map((drawing) => (
                <Card
                  key={`${drawing.graph.id}-${drawing.category.id}`}
                  className="p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex flex-col min-w-0">
                    <KraphNode.DetailLink
                      object={{ id: instance.id }}
                      scope={drawing.graph.id}
                      className="font-medium truncate"
                    >
                      {drawing.category.label}
                    </KraphNode.DetailLink>
                    <span className="text-xs text-muted-foreground truncate">
                      in {drawing.graph.name}
                    </span>
                  </div>
                  <KraphGraph.DetailLink
                    object={{ id: drawing.graph.id }}
                    className="text-xs text-muted-foreground shrink-0"
                  >
                    Open graph
                  </KraphGraph.DetailLink>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </KraphInstance.ModelPage>
  );
});

export default Page;
