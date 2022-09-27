import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SmartModel } from "../../../../arkitekt/selection/SmartModel";
import { SelfActions } from "../../../../components/SelfActions";
import { get_identifier_for_type } from "../../plot/helpers";
import { buildSmartModel } from "../../plot/Tree";

export interface SmartProps {
  type: string;
  object: string;
  value: string;
  datakey: string;
}

export const Smart: React.FC<SmartProps> = ({
  type,
  object,
  value,
  datakey,
}: SmartProps) => {
  const identifer = get_identifier_for_type(type);

  return (
    <div className="bg-slate-800 rounded p-3 flex-col">
      <div className="flex-initial flex flex-row gap-2">
        <div className="flex-initial ">
          <div className="truncate ">{datakey}</div>
          <div className="text-xs">{type}</div>
        </div>
        <div className="flex-grow"></div>
        <div className="text-xl my-auto">{value}</div>
      </div>
      <div className="flex-inital flex flex-wrap mt-2 gap-1">
        {/* <Link
          to={Model.link()}
          replace={false}
          className="bg-primary-300 rounded text-white p-1"
        >
          Open
        </Link> */}
        {identifer && object && (
          <SelfActions
            type={identifer}
            object={object}
            buttonClassName={
              "bg-primary-300 rounded p-1 shadow-md shadow-primary-300/30 text-white p-1 disabled:bg-slate-500 hover:bg-primary-500 disabled:shadow-none disabled:text-black "
            }
          />
        )}
      </div>
    </div>
  );
};
