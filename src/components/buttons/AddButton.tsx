import React from "react";

export type IAddButtonProps = {
  children: React.ReactNode;
};

const AddButton: React.FC<IAddButtonProps> = ({ children }) => {
  return (
    <div className="mt-auto dark:text-white p-2 cursor-pointer ">
      {children}
    </div>
  );
};

export { AddButton };
