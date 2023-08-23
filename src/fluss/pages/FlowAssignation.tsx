import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useDetailRunQuery } from "../../fluss/api/graphql";
import { Run } from "../../fluss/components/Run";
import { withFluss } from "../../fluss/fluss";

export interface FlowAssignationProps {}

export const FlowAssignation: React.FC<FlowAssignationProps> = (props) => {
  const { id } = useParams<{ id: string }>();

  const { data } = withFluss(useDetailRunQuery)({
    variables: { assignation: id },
  });

  return data?.run?.id ? <Run id={data.run.id} /> : <>Loading</>;
};
