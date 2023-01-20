import React from "react";
import { Link } from "react-router-dom";
import { isVoidExpression } from "typescript";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { RoiCanvas } from "../../components/RoiCanvas";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { Stage, Representation } from "../../linker";
import {
  CommentableModels,
  useDetailInstrumentQuery,
  useDetailMetricQuery,
  useDetailPositionQuery,
  useDetailRoiQuery,
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import CommentSection from "./comments/CommentSection";
import { DiscussionSidebar } from "./comments/DiscussionSidebar";

export type MetricProps = {
  id: string;
};

const Metric: React.FC<MetricProps> = ({ id }) => {
  const { data } = withMikro(useDetailMetricQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/metric"} object={id} />}
      sidebar={
        <div className="p-5">
          <CommentSection id={id} model={CommentableModels.GrunnlagMetric} />
        </div>
      }
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">{data?.metric?.key}</div>
        <div className="flex flex-row">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="">Value</div>
            {data?.metric?.value}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Metric };
