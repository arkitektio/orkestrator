import React, { useEffect, useState } from "react";
import {
  ChoiceReturnWidgetFragment,
  ImageReturnWidgetFragment,
  ReturnWidgetFragment,
} from "../../../api/graphql";
import { ReturnWidgetProps } from "../../types";

export const ChoiceReturnWidget: React.FC<
  ReturnWidgetProps<ChoiceReturnWidgetFragment & ReturnWidgetFragment>
> = ({ port, widget, value }) => {
  return (
    <div className="w-full h-full grid place-items-center">
      <div className="flex flex-col items-center">
        {widget?.choices?.map((choice) => (
          <div
            key={choice?.value}
            className={
              choice?.value != value
                ? "text-sm text-slate-900"
                : "text-xl text-gray-200"
            }
          >
            {choice?.label}
          </div>
        ))}
      </div>
    </div>
  );
};
