import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { PageLayout } from "../../layout/PageLayout";
import { MikroMetric } from "../../linker";
import { withMikro } from "../MikroContext";
import { useDetailMetricQuery } from "../api/graphql";

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
      sidebars={[
        {
          label: "Comments",
          content: <MikroMetric.Komments object={id} />,
          key: "comments",
        },
      ]}
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
