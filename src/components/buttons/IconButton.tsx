import React, { ReactNode } from "react";

export type IconButtonProps = {
  icon: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  children,
  ...props
}) => {
  return (
    <>
      <button
        {...props}
        className="bg-white dark:bg-gray-800 dark:text-primary-200 dark:border-primary-200 dark:shadow-primary-200/10 hover:border-primary-400 hover:bg-primary-100 text-gray-800 cursor-pointer font-semibold py-1 px-1 border border-gray-400 rounded shadow-xl mt-2"
      >
        <div className="flex grid grid-cols-1">
          <div className="cols-span-1 mx-auto p-1 cursor-pointer">{icon}</div>
          <div className="cols-span-1 hidden xl:visible">{children}</div>
        </div>
      </button>
    </>
  );
};
