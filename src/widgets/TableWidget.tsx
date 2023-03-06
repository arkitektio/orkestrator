import ParentSize from "@visx/responsive/lib/components/ParentSizeModern";
import { PositionCanvas } from "../components/PositionCanvas";
import { RoiCanvas } from "../components/RoiCanvas";
import { TwoDOffcanvas } from "../experimental/render/TwoDOffcanvas";
import {
  ColumnFragment,
  useDetailPositionQuery,
  useDetailRepresentationQuery,
  useDetailRoiQuery,
  useDetailTableQuery,
} from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";
import { off } from "process";
import useScrollPercentage from "react-scroll-percentage-hook";
import { StructureDisplayProps } from "../rekuest/widgets/returns/fallbacks/StructureReturnWidget";

type TableData = { [key: string]: any };

export const column_to_def = (column: ColumnFragment): ColumnDef<TableData> => {
  return {
    header: column.name || column.fieldName,
    footer: column.name || column.fieldName,
    accessorKey: column.fieldName,
  };
};

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  const testDummy: TValue = value;
  return true;
}

export const limit = 10;
export const TableWidget: React.FC<StructureDisplayProps> = ({ value }) => {
  const { data, fetchMore, loading } = withMikro(useDetailTableQuery)({
    variables: { id: value, limit: limit, offset: 0 },
  });

  const [offset, setOffset] = useState(0);
  const [fetching, setFetching] = useState(false);

  const { ref, percentage } = useScrollPercentage();

  const fetchi = useCallback(() => {
    console.log("fetching more", offset, limit);
    return fetchMore({
      variables: {
        id: value,
        offset: offset + limit,
        limit: limit,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          table: {
            ...prev.table,
            query: [...prev.table.query, ...fetchMoreResult.table.query],
          },
        };
      },
    }).then(() => setOffset(offset + limit));
  }, [offset, limit]);

  useEffect(() => {
    if (percentage.vertical > 90 && !loading) {
      setFetching(true);
      fetchi();
    }
  }, [percentage, loading]);

  const table = useReactTable({
    data: data?.table?.query || [],
    columns: data?.table?.columns?.filter(notEmpty).map(column_to_def) || [],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className="flex-grow bg-white-800 flex flex-col overflow-y-auto"
      ref={ref}
    >
      {loading && <div>Loading...</div>}
      <table className="flex-grow table-auto text-white">
        <thead className="text-xl bg-slate-800 p-1 text-black  border-b-1 border-gray-700 border">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className="font-light px-2 text-primary-400 p-1"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="flex-grow">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="text-center">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="flex-initial">
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((header) => (
                <th key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.footer,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
    </div>
  );
};
