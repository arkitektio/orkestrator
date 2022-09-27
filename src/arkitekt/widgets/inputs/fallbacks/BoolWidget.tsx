import { Field } from "formik";
import React from "react";
import { BoolWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

const BoolWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return (
    <div>
      <label className="font-light">{port.label || port.key}</label>
      <div className="w-full mt-2 mb-2 relative">
        <Field type="checkbox" name={port.key} />
      </div>
      {port.description && (
        <div
          id={`${port.key}-help`}
          className="text-xs text-gray-600 mb-4 font-light"
        >
          {port.description}
        </div>
      )}
    </div>
  );
};

export { BoolWidget };
