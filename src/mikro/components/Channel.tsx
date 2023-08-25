import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { PageLayout } from "../../layout/PageLayout";
import { MikroChannel } from "../../linker";
import { withMikro } from "../MikroContext";
import { useGetChannelQuery } from "../api/graphql";
export type MetricProps = {
  id: string;
};

const Channel: React.FC<MetricProps> = ({ id }) => {
  const { data } = withMikro(useGetChannelQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/channel"} object={id} />}
      sidebars={[
        {
          label: "Comments",
          content: <MikroChannel.Komments object={id} />,
          key: "comments",
        },
      ]}
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.channel?.name}
        </div>
        <div className="flex flex-col">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="">EmissionWavelength</div>
            {data?.channel?.emissionWavelength}
          </div>
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="">ExcitationWavelength</div>
            {data?.channel?.emissionWavelength}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Channel };
