import React from "react";
import { Clock, Columns3, HardDrive, Table2 } from "lucide-react";
import { MikroTableDataset } from "@/core/linkers";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Name } from "@/core/ui/name";
import Timestamp from "@/core/ui/timestamp";
import { BrowseTableDatasetFragment, ColumnRole } from "../../api/graphql";
import { formatBytes, TDATASET_SPECS } from "../../specs";
import { CARD_FRAME_SIZE, CardFrame, type CardFact } from "@/core/ui/card-frame";
import { ColumnAxisGlyph } from "../tables/ColumnInfoPopover";

interface Props {
  item: BrowseTableDatasetFragment;
}

/** Columns the schema peek lists at most; the card's height clips the rest. */
const PEEK = 8;

/**
 * A table on the table list, in the Mikro home's card frame and table tint:
 * its shape's icon and name; a line of facts (shape, columns, size); a peek
 * at its schema, coordinate columns first, where an image card has its
 * picture; and who made it, when, with the modifiers its spec declares.
 * Nothing here reads the parquet: it is all schema.
 */
const TheCard = ({ item }: Props) => {
  const shape = TDATASET_SPECS.find((entry) => entry.kind === "shape" && item.spec.includes(entry.spec));
  const modifiers = TDATASET_SPECS.filter((entry) => entry.kind === "modifier" && item.spec.includes(entry.spec));
  // Coordinates first (they place the rows), then the declared order.
  const columns = [...item.columns].sort(
    (a, b) =>
      Number(b.role === ColumnRole.Coordinate) - Number(a.role === ColumnRole.Coordinate) || a.order - b.order,
  );
  const peek = columns.slice(0, PEEK);
  const created = item.createdThrough?.createdAt;
  // What kind of table, in words: its shape, then what the schema adds.
  const kind = [
    shape?.short ?? (item.axisNames.length ? item.axisNames.join(" × ") : "measurement table"),
    ...modifiers.map((entry) => entry.short),
  ].join(" · ");
  const facts: CardFact[] = [
    { icon: shape?.icon ?? Table2, content: kind, title: "Kind" },
    { icon: Columns3, content: `${item.columns.length} ${item.columns.length === 1 ? "column" : "columns"}` },
    ...(item.store.sizeBytes != null ? [{ icon: HardDrive, content: formatBytes(item.store.sizeBytes), title: "Size" }] : []),
    ...(item.createdThroughBy || created
      ? [
          {
            icon: Clock,
            title: "Made",
            at: "end" as const,
            content: (
              <span className="flex min-w-0 items-center gap-1.5">
                {item.createdThroughBy && (
                  <StructureDisplay identifier="@lok/user" id={item.createdThroughBy.sub} variant="avatar" className="h-4 w-4" />
                )}
                {created && <Timestamp date={created} relative />}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <MikroTableDataset.Smart object={item} menuButton="top" className={`${CARD_FRAME_SIZE} [container-type:normal]!`}>
      <CardFrame
        tone="table"
        icon={shape?.icon ?? Table2}
        iconLabel={shape?.label}
        title={
          <MikroTableDataset.DetailLink object={item} className="block min-w-0 hover:underline">
            <Name>{item.name}</Name>
          </MikroTableDataset.DetailLink>
        }
        facts={facts}
        stacked
        menu
      >
        {/* The schema, as the table's picture: as many columns as the card
            holds, fading out where it is cut. */}
        <ul className="flex h-full min-h-0 flex-col divide-y divide-border/50 overflow-hidden rounded-xl bg-background/40 px-2 py-0.5 text-xs [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
          {peek.map((column) => (
            <li key={column.id} className="flex min-w-0 items-center gap-1.5 py-1">
              <ColumnAxisGlyph column={column} />
              <span className="min-w-0 flex-1 truncate font-mono" title={column.longName ?? column.name}>
                {column.name}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{column.dtype}</span>
            </li>
          ))}
          {columns.length === 0 && <li className="py-1 text-muted-foreground">No columns declared</li>}
        </ul>
      </CardFrame>
    </MikroTableDataset.Smart>
  );
};

export default React.memo(TheCard);
