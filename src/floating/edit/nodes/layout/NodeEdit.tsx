import {
  NodeLayoutContext,
  NodeLayoutProvider,
  useNodeLayout,
} from "../../../base/node/layout";
import { useEditRiver } from "../../context";

import { Resizable, ResizeCallbackData } from "react-resizable";
import { useState } from "react";
import "./styles.css";
import { useViewport } from "react-flow-renderer";

const additional = {
  pink: "border-pink-500 shadow-pink-500/5 dark:border-pink-200 dark:shadow-pink-200/10",
  blue: "border-blue-500 shadow-blue-500/50 dark:border-blue-200 dark:shadow-blue-200/10",
  green:
    "border-green-500 shadow-green-500/50 dark:border-green-200 dark:shadow-green-200/10",
  red: "border-red-500 shadow-red-500/50 dark:border-red-200 dark:shadow-red-200/10",
};

type NodeProps = {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  color?: keyof typeof additional;
  id: string;
};

export const additionalForState: { [x: string]: string } = {
  ERROR:
    "border-red-900 dark:border-red-900 dark:shadow--200/10 animate-pulse dark:bg-red-800",
  NEXT: "border-blue-900 dark:border-blue-900 dark:shadow-blue-200/10",
  COMPLETE:
    "border-green-900 dark:border-green-900 dark:shadow-green-200/10 dark:bg-slate-800 opacity-0.8",
};

export const NodeEditLayout: React.FC<NodeProps> = ({
  children,
  id,
  sidebar,
  color = "pink",
}) => {
  const { setSidebar } = useEditRiver();

  return (
    <div
      className={
        `px-2 py-2 z-50 shadow-xl bg-white rounded-md dark:bg-gray-800 dark:text-white text-black border w-full h-full` +
        additional[color]
      }
      onClick={() => setSidebar(sidebar || <></>)}
    >
      {children}
    </div>
  );
};
