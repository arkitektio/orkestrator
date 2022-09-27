import React from "react";
import { Outlet, useParams } from "react-router-dom";
import { useAlert } from "../../../components/alerter/alerter-context";
import { useFluss } from "../../../fluss/fluss-context";
import { ModuleLayout } from "../../../layout/ModuleLayout";
import FlowDiagramSidebar from "./FlowDiagramSidebar";

interface Props {}

export const FlowDiagram: React.FC<Props> = (props) => {
  let { diagram } = useParams<{ diagram: string }>();
  const { client } = useFluss();
  const { alert } = useAlert();

  if (!diagram) return <></>;

  return (
    <ModuleLayout sidebar={<FlowDiagramSidebar diagram={diagram} />}>
      <Outlet />
    </ModuleLayout>
  );
};
