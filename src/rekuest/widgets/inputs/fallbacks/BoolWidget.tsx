import { Field } from "formik";
import React from "react";
import { BoolWidgetFragment } from "../../../api/graphql";
import { InputWidgetProps } from "../../types";

const BoolWidget: React.FC<InputWidgetProps> = ({ port, widget }) => {
  return <Field type="checkbox" name={port.key} />;
};

export { BoolWidget };
