import React, { useState } from "react";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { SectionTitle } from "../../layout/SectionTitle";
import { withMikro } from "../MikroContext";
import {
  ColumnFragment,
  CommentableModels,
  DetailTableQuery,
  DetailTableQueryVariables,
  useDetailTableQuery,
} from "../api/graphql";

import { ApolloQueryResult } from "@apollo/client";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Form, Formik } from "formik";
import { CSVLink } from "react-csv";
import { TbCsv } from "react-icons/tb";
import { NumberInputField } from "../../components/forms/fields/number_input";
import { TextInputField } from "../../components/forms/fields/text_input";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";

type TableData = { [key: string]: any };

export type ISampleProps = {
  id: string;
};

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

export const defaults: Partial<DetailTableQueryVariables> = {
  limit: 100,
  offset: 0,
};

export const FilterSidebar = ({
  refetch,
}: {
  refetch: (
    args: Partial<DetailTableQueryVariables>
  ) => Promise<ApolloQueryResult<DetailTableQuery>>;
}) => {
  return (
    <div>
      <div className="flex flex-col text-slate-200  text-xl">Filters</div>
      <Formik<Partial<DetailTableQueryVariables>>
        initialValues={defaults}
        onSubmit={(values, { setSubmitting }) => {
          setSubmitting(true);
          refetch(values)
            .then(() => setSubmitting(false))
            .catch(() => setSubmitting(false));
        }}
      >
        {(props) => (
          <Form>
            <div className="border-gray-300 pt-2 text-slate-200">
              <TextInputField
                name="query"
                label="Query"
                description="Use Pandas style query syntax to filter your data"
              />

              <NumberInputField
                name="limit"
                label="Limit"
                description="How many items do you want to display"
              />
              <NumberInputField
                name="offset"
                label="Offset"
                description="Where do you want to start"
              />
              <button
                type="submit"
                className="border border-primary-200 rounded w-fit p-1 bg-primary-300 font-bold text-white focus:border-primary-300"
                autoFocus={true}
              >
                {props.isSubmitting ? "Loading..." : "Update"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

const Table: React.FC<ISampleProps> = ({ id }) => {
  const {
    data: tabledata,
    refetch,
    error,
  } = withMikro(useDetailTableQuery)({
    variables: { id: id, ...defaults },
  });

  const [dataToDownload, setDataToDownload] = useState<any[]>([]);

  const table = useReactTable({
    data: tabledata?.table?.query || [],
    columns:
      tabledata?.table?.columns?.filter(notEmpty).map(column_to_def) || [],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <PageLayout
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.BordTable} />
          ),
          key: "comments",
        },
        {
          label: "Filter",
          content: <FilterSidebar refetch={refetch} />,
          key: "filter",
        },
      ]}
    >
      <SectionTitle
        right={
          <>
            {tabledata?.table?.query && (
              <CSVLink
                data={tabledata?.table?.query}
                filename="data.csv"
                className="p-3"
                target="_blank"
              >
                <TbCsv />
              </CSVLink>
            )}
          </>
        }
      >
        {tabledata?.table?.name}
      </SectionTitle>
      {tabledata?.table?.repOrigins &&
        tabledata?.table?.repOrigins.length > 0 && (
          <div className="flex-shrink mt-4 text-black font-light bg-white p-4 rounded border-gray-200 rounded-md">
            <div className="font-light my-2">From Image</div>
            <ResponsiveGrid>
              {tabledata?.table?.repOrigins?.filter(notEmpty).map((rep) => (
                <Representation.Smart
                  object={rep.id}
                  dragClassName={(options) =>
                    "border border-gray-800 rounded p-5 cursor-pointer text-white bg-gray-900 break-word hover:shadow"
                  }
                >
                  <Representation.DetailLink object={rep.id}>
                    {rep.name}
                  </Representation.DetailLink>
                </Representation.Smart>
              ))}
            </ResponsiveGrid>
          </div>
        )}

      <table className="flex-grow table-auto text-white rounded rounded-md">
        <thead className="text-xl mb-3 bg-slate-800 p-3 mb-2 rounded-md rounded rounded-md  ">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className="font-light px-2 text-primary-400 "
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
    </PageLayout>
  );
};

export { Table };
