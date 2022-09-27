import React, { useState } from "react";
import { ThreeDots } from "react-loader-spinner";
import {
  BaseAction,
  useAction,
} from "../components/command/GeneralMenuContext";

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
      let x = await onAction({ action });
      setDoing((doing) => false);
    },
  });

  const onclick = async (event: React.MouseEvent) => {
    setDoing((doing) => true);
    await onAction({ event });
    setDoing((doing) => false);
  };

  return (
    <button
      className={
        className ||
        "flex text-white shadow-md shadow-primary-300/30 hover:shadow-primary-400/60 disabled:shadow-none font-semibold items-center cursor-pointer z-50 border border-primary-300 bg-primary-300 p-3 rounded-xl disabled:bg-gray-800 disabled:border-gray-800 truncate hover:bg-primary-400 disabled:cursor-not-allowed"
      }
      disabled={inactive || doing}
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
