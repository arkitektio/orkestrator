import { ReactNode } from "react";

export const Tree = (props: { children: ReactNode }) => {
  return (
    <div className="flex-1 flex-col">
      <nav className="grid items-start px-1 text-xs font-medium lg:px-2">
        {props.children}
      </nav>
    </div>
  );
};
