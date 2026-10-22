import { GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { LineageNodeKind } from "../../api/graphql";
import { KIND_LABEL, lineageLink } from "../lineage/lineageGraph";
import { KIND_ICON, SMART_BY_KIND } from "../lineage/LineageNodes";
import type { ResultNode, SeriesResults } from "./fileResults";

/** Chips a big tile shows before the rest become "+N". */
const MAX_CHIPS = 3;

const CHIP_SHAPE = "relative z-10 flex h-5 min-w-0 max-w-full items-center gap-1 rounded-full px-1.5 text-[10px] transition-colors";
/** On a picture's scrim. */
const CHIP = `${CHIP_SHAPE} bg-black/55 text-white backdrop-blur hover:bg-black/80`;
/** On a plain card (a table's). */
const PLAIN_CHIP = `${CHIP_SHAPE} bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground`;

/**
 * One thing made from an image, on the image's tile: its kind's icon and its
 * name, opening its page (its lineage, for a kind without one). A link, not a
 * smart object: the tile already is one, and a click inside a nested one
 * reaches both. Above the tile's stretched link (`z-10`).
 */
const ResultChip = ({ node }: { node: ResultNode }) => {
  const Icon = KIND_ICON[node.kind];
  const Smart = SMART_BY_KIND[node.kind];
  const inner = (
    <>
      <Icon className="h-3 w-3 shrink-0" aria-label={KIND_LABEL[node.kind]} />
      <span className="truncate">{node.name}</span>
    </>
  );

  if (!Smart) {
    return (
      <Link to={lineageLink(node.kind, node.id)} className={CHIP} title={node.name}>
        {inner}
      </Link>
    );
  }
  return (
    <Smart.DetailLink object={{ id: node.id }} className={CHIP} title={node.name}>
      {inner}
    </Smart.DetailLink>
  );
};

type RootProps = {
  /** What the tile is, and its id: where "+N" and the count lead (its lineage). */
  kind: LineageNodeKind;
  id: string;
  results: SeriesResults;
};

/** The results along the bottom of a big tile: a few chips, then "+N". */
export const ResultChips = ({ kind, id, results }: RootProps) => {
  const shown = results.results.slice(0, MAX_CHIPS);
  const rest = results.results.length - shown.length;
  if (shown.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {shown.map((node) => (
        <ResultChip key={node.key} node={node} />
      ))}
      {(rest > 0 || results.more) && (
        <Link to={lineageLink(kind, id)} className={CHIP}>
          {rest > 0 ? `+${rest}${results.more ? "+" : ""}` : "more"}
        </Link>
      )}
    </div>
  );
};

/** On a tile too small for chips: how many results, opening the lineage. */
export const ResultCount = ({ kind, id, results, plain }: RootProps & { plain?: boolean }) => {
  const count = results.results.length;
  if (count === 0) return null;
  return (
    <Link
      to={lineageLink(kind, id)}
      className={plain ? PLAIN_CHIP : CHIP}
      title={`${count}${results.more ? "+" : ""} made from this`}
    >
      <GitBranch className="h-3 w-3 shrink-0" />
      {count}
      {results.more ? "+" : ""}
    </Link>
  );
};
