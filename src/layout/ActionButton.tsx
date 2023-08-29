import React, { useState } from "react";
import { ThreeDots } from "react-loader-spinner";
import { BaseAction, useAction } from "../providers/command/GeneralMenuContext";

export interface ActionButtonProps {
  children?: React.ReactNode;
  className?: string;
  label: string;
  description?: string;
  inactive?: boolean;
  onAction: (causer: {
    event?: React.MouseEvent;
    action?: BaseAction;
  }) => Promise<void> | Promise<boolean>;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  description,
  onAction,
  className,
  inactive,
  label,
}) => {
  const [doing, setDoing] = useState(false);

  useAction({
    key: label,
    description: description,
    label: label,
    custom: async (action: BaseAction) => {
      console.log("CALLLED");
      setDoing((doing) => true);
      try {
        let x = await onAction({ action });
        setDoing((doing) => false);
      } catch (e) {
        setDoing((doing) => false);
      }
    },
  });

  const onclick = async (event: React.MouseEvent) => {
    setDoing((doing) => true);
    try {
      await onAction({ event });
      setDoing((doing) => false);
    } catch (e) {
      setDoing((doing) => false);
    }
  };

  return (
    <button
      type="button"
      className={
        className ||
        "backdrop-blur-md text-white bg-opacity-20 shadow-md bg-back-500 disabled:shadow-none font-light items-center cursor-pointer z-50 border border-slate-300 p-2 rounded-md disabled:bg-gray-800 disabled:border-gray-700 truncate transition-all ease-in-out duration-300 disabled:cursor-not-allowed hover:bg-opacity-70"
      }
      disabled={doing || inactive}
      onClick={onclick}
    >
      {doing ? (
        <ThreeDots color="#FFFFFF" height={20} width={20} />
      ) : (
        children || label
      )}
    </button>
  );
};
