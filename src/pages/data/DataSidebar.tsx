import * as React from "react";
import { Experiment, Representation, Sample, Table } from "../../linker";
import {
  GlobalSearchQueryVariables,
  useGlobalSearchLazyQuery,
} from "../../mikro/api/graphql";
import { useMikro, withMikro } from "../../mikro/mikro-types";
import { DataSearch } from "./DataSearch";

interface IDataSidebarProps {}

export const RepresentationItem = ({ re }: any) => {
  const { s3resolve } = useMikro();

  return (
    <Representation.Smart
      showSelfMates={true}
      placement="bottom"
      object={re.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-center bg-cover ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      dragStyle={() =>
        re?.latestThumbnail
          ? {
              backgroundImage: `url(${
                s3resolve && s3resolve(re?.latestThumbnail.image)
              }), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
              backgroundRepeat: "no-repeat",
              backgroundBlendMode: "multiply",
            }
          : {
              background: "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95))",
            }
      }
    >
      <div className="px-6 py-4 truncate">
        <Representation.DetailLink
          className={({ isActive } /*  */) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={re.id}
        >
          <span className="truncate">{re?.name}</span>
        </Representation.DetailLink>
        <p className="text-white-700 text-base group-hover:block hidden">
          {re?.sample?.name}
        </p>
      </div>
    </Representation.Smart>
  );
};

export const SampleItem = ({ sa }: any) => {
  const { s3resolve } = useMikro();

  return (
    <Sample.Smart
      showSelfMates={true}
      placement="bottom"
      object={sa.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="px-6 py-4 truncate">
        <Sample.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={sa.id}
        >
          <span className="truncate">{sa?.name}</span>
        </Sample.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Sample.Smart>
  );
};

export const ExperimentItem = ({ experiment }: any) => {
  const { s3resolve } = useMikro();

  return (
    <Experiment.Smart
      showSelfMates={true}
      placement="bottom"
      object={experiment.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="px-6 py-4 truncate">
        <Experiment.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={experiment.id}
        >
          <span className="truncate">{experiment?.name}</span>
        </Experiment.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Experiment.Smart>
  );
};

export const TableItem = ({ table }: any) => {
  const { s3resolve } = useMikro();

  return (
    <Table.Smart
      showSelfMates={true}
      placement="bottom"
      object={table.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="px-6 py-4">
        <Table.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={table.id}
        >
          <span className="truncate">{table?.name}</span>
        </Table.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Table.Smart>
  );
};

const DataSidebar: React.FunctionComponent<IDataSidebarProps> = (props) => {
  const [fetch, { data }] = withMikro(useGlobalSearchLazyQuery)();
  const [filter, setFilter] = React.useState<GlobalSearchQueryVariables>({
    search: "",
  });

  React.useEffect(() => {
    fetch({ variables: filter });
  }, [filter, fetch]);

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex-none p-5 dark:text-slate-50">
          <DataSearch
            onFilterChanged={(v) => setFilter(v)}
            className="w-full p-3 rounded-md shadow-lg dark:bg-slate-200 dark:text-slate-800"
          />
        </div>
        <div className="flex-grow flex flex-col gap-2 p-5  overflow-y-scroll direct">
          {data?.experiments && data?.experiments.length > 0 && (
            <div className="font-semibold text-center text-xs dark:text-slate-50 mt-2">
              Experiments
            </div>
          )}
          {data?.experiments?.map((experiment, index) => (
            <ExperimentItem key={index} experiment={experiment} />
          ))}
          {data?.samples && data?.samples.length > 0 && (
            <div className="font-semibold text-center text-xs dark:text-slate-50 mt-2">
              Samples
            </div>
          )}
          {data?.samples?.map((sa, index) => (
            <SampleItem key={index} sa={sa} />
          ))}
          {data?.tables && data?.tables.length > 0 && (
            <div className="font-semibold text-center text-xs dark:text-slate-50 mt-2">
              Tables
            </div>
          )}
          {data?.tables?.map((ta, index) => (
            <TableItem table={ta} key={index} />
          ))}
          {data?.representations && data?.representations.length > 0 && (
            <div className="font-semibold text-center text-xs dark:text-slate-50 mt-2">
              Images
            </div>
          )}
          {data?.representations?.map((re, index) => (
            <RepresentationItem key={index} re={re} />
          ))}
        </div>
      </div>
    </>
  );
};

export default DataSidebar;
