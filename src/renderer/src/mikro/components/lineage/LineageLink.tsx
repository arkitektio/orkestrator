import { Button } from "@/core/ui/button";
import { LineageNodeKind } from "@/mikro/api/graphql";
import { GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { lineageLink } from "./lineageGraph";

/**
 * The way from a one-hop lineage section to the whole picture. The sections
 * answer "what is directly above and below this"; the graph steps on from there.
 */
export const LineageLink = ({ kind, id }: { kind: LineageNodeKind; id: string }) => (
  <Button asChild variant="outline" size="sm" className="self-start">
    <Link to={lineageLink(kind, id)}>
      <GitBranch className="mr-2 h-3.5 w-3.5" />
      Open lineage graph
    </Link>
  </Button>
);

export default LineageLink;
