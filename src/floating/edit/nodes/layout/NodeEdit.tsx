import { ConnState } from "../../../types";
import "./styles.css";

export const additional = {
  pink: "border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10",
  blue: "border-blue-500 shadow-blue-500/50 dark:border-blue-200 dark:shadow-blue-200/10",
  green:
    "border-green-500 shadow-green-500/50 dark:border-green-200 dark:shadow-green-200/10",
  red: "border-red-500 shadow-red-500/50 dark:border-red-200 dark:shadow-red-200/10",
  gray: "border-gray-500 shadow-gray-500/50 dark:border-gray-200 dark:shadow-gray-200/10 opacity-80",
};

type NodeProps = {
  children: React.ReactNode;
  color?: keyof typeof additional;
  id: string;
  connState?: ConnState;
};

export const additionalForState: { [x: string]: string } = {
  ERROR:
    "border-red-900 dark:border-red-900 dark:shadow--200/10 animate-pulse dark:bg-red-800",
  NEXT: "border-blue-900 dark:border-blue-900 dark:shadow-blue-200/10",
  COMPLETE:
    "border-green-900 dark:border-green-900 dark:shadow-green-200/10 dark:bg-slate-800 ",
};

export const ErrorOverlay = (props: any) => {
  return <> </>;
};

export const NodeEditLayout: React.FC<NodeProps> = ({
  children,
  id,
  color = "pink",
  connState = { isConnectable: true, isConnecting: false },
}) => {
  return (
    <div
      className={`px-2 py-2 z-50 shadow-xl bg-white rounded-md dark:bg-gray-800 dark:text-white text-black border w-full h-full relative ${
        +connState.isConnecting
          ? connState.isConnectable
            ? additional[color] + " animate-wiggle "
            : additional["gray"]
          : additional[color]
      }`}
    >
      {connState.isConnecting && !connState.isConnectable && (
        <div className="absolute top-[-20px] bg-gray-900 text-white bg-gray-800 p-1 border-gray-800 border-1 border">
          {connState.error}
        </div>
      )}
      {children}
    </div>
  );
};
