import React from "react";

export type ICardProps = {
  children?: React.ReactNode;
};

const Card: React.FC<ICardProps> = ({ children }) => {
  return (
    <div className="rounded border-gray-200 shadow-md bg-white p-4">
      {children}
    </div>
  );
};

export { Card };
