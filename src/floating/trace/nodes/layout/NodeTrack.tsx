import { useNodeLayout } from "../../../base/node/layout";
import { useTraceRiver } from "../../context";

const additional = {
  pink: "border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10",
  blue: "border-blue-500 shadow-blue-500/50 dark:border-blue-200 dark:shadow-blue-200/10",
  green:
    "border-green-500 shadow-green-500/50 dark:border-green-200 dark:shadow-green-200/10",
  red: "border-red-500 shadow-red-500/50 dark:border-red-200 dark:shadow-red-200/10",
};

type NodeProps = {
  children: React.ReactNode;
  color?: keyof typeof additional;
  id: string;
  type?: "filter" | "map";
};

export const additionalForState: { [x: string]: string } = {
  INACTIVE:
    "border-red-900 dark:border-red-900 dark:shadow--200/10 animate-pulse dark:bg-red-800",
  ACTIVE:
    "border-green-900 dark:border-green-900 dark:shadow-green-200/10 dark:bg-slate-800 opacity-0.8",
};

export const NodeTraceLayout: React.FC<NodeProps> = ({
  children,
  id,
  color = "pink",
  type = "map",
}) => {
  const { conditionState } = useTraceRiver();
  const { isExpanded } = useNodeLayout();

  let latestEvent = conditionState?.events?.find((i) => i?.source === id);
  let classNames = latestEvent?.state
    ? additionalForState[latestEvent?.state]
    : "";
  return (
    <>
      <div
        className={
          `px-2 py-2 z-50 shadow-xl bg-white rounded-md dark:bg-gray-800 dark:text-white text-black border border-1 flex-grow flex flex-col h-full w-full transition-colors ease-in-out delay-150 ` +
          classNames
        }
      >
        {children}
        {type == "filter" && (
        <div className="absolute top-[-20px] bg-gray-900 text-white bg-gray-800 p-1 border-gray-800 border-1 border my-auto">
          Filter
        </div>
      )}
      </div>
    </>
  );
};
