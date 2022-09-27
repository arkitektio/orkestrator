import React from "react";

export type IGraphsSidebarProps = {};

const GraphsSidebar: React.FC<IGraphsSidebarProps> = ({}) => {
  return (
    <div className={" flex-col flex px-2 py-2 gap-2"}>
      <div className={"flex flex-row"}>
        <input className={"w-full"} type={"text"} placeholder={"Search"} />
      </div>
    </div>
  );
};

export { GraphsSidebar };
