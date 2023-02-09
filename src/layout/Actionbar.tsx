import React, { useState, useEffect } from "react";
import { AiOutlineArrowDown, AiOutlineArrowUp } from "react-icons/ai";
import { Icons } from "react-toastify";

export interface ActionbarProps {
  children: React.ReactNode;
}

export const Actionbar: React.FC<ActionbarProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-0 right-0 mr-4 gap-1 max-w-[70%] flex flex-row mb-2">
      {children}
    </div>
  );
};
