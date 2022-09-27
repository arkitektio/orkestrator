import React from "react";

export type IInputGroupProps = {
  children?: React.ReactNode;
};

const InputGroup: React.FC<IInputGroupProps> = ({ children }) => {
  return (
    <div className="flex flex-wrap items-stretch w-full mb-4 relative">
      {children}
    </div>
  );
};

export { InputGroup };
