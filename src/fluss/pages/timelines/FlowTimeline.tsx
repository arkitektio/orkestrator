import React from "react";
import { Outlet, useParams } from "react-router-dom";
import { useAlert } from "../../../components/alerter/alerter-context";
import { Timeline } from "../../../dashboard/Timeline";
import { useFluss } from "../../../fluss/fluss-context";
import { PageLayout } from "../../../layout/PageLayout";

interface Props {}

export const FlowTimeline: React.FC<Props> = (props) => {
  let { id } = useParams<{ id: string }>();

  if (!id) return <></>;

  return (
    <PageLayout>
      <Timeline id={id} />
    </PageLayout>
  );
};
