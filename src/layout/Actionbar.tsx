import React, { useState, useEffect } from "react";
import { AiOutlineArrowDown, AiOutlineArrowUp } from "react-icons/ai";
import { Icons } from "react-toastify";

export interface ActionbarProps {
  children: React.ReactNode;
}

export const Actionbar: React.FC<ActionbarProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-0 right-0 mr-4 mb-4  gap-1 max-w-[70vw]">
      <div className="sm:flex flex-row  sm:gap-2 hidden">{children}</div>
      <div className="sm:hidden gap-2 flex-col flex">
        {isOpen && children}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-row gap-2 bg-primary-300 hover:bg-primary-400 p-3 rounded-md"
        >
          {isOpen ? <AiOutlineArrowDown /> : <AiOutlineArrowUp />}
        </button>
      </div>
    </div>
  );
};
