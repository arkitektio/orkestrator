import React from "react";

export type IPrependProps = {
  children?: React.ReactNode;
};

const Prepend: React.FC<IPrependProps> = ({ children }) => {
  return (
    <div className="flex -mr-px">
      <span className="flex items-center leading-normal bg-grey-lighter rounded rounded-r-none border border-r-0 border-grey-light px-3 whitespace-no-wrap text-grey-dark text-sm">
        {children}
      </span>
    </div>
  );
};

export { Prepend };
