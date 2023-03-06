import React from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { RoiCanvas } from "../../components/RoiCanvas";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";
import { CommentableModels, useDetailRoiQuery } from "../api/graphql";
import { withMikro } from "../MikroContext";
import { RepresentationCard } from "./cards/RepresentationCard";

export type ISampleProps = {
  id: string;
};

const Roi: React.FC<ISampleProps> = ({ id }) => {
  const { data } = withMikro(useDetailRoiQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/roi"} object={id} />}
      sidebars={[
        {
          label: "Comments",
          content: (
            <MikroKomments id={id} model={CommentableModels.GrunnlagRoi} />
          ),
          key: "comments",
        },
      ]}
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.roi?.representation?.id && (
            <Representation.DetailLink object={data?.roi?.representation?.id}>
              {data?.roi?.label ||
                `Roi Marked on ${data?.roi?.representation?.name}`}
            </Representation.DetailLink>
          )}
        </div>
        <div className="flex flex-row ">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded  @container">
            <div className="flex flex-col">
              <div className="">Type </div>
              <div className="text-md mt-2 font-bold">{data?.roi?.type}</div>
            </div>

            <div className="mt-2">Derived images </div>
            <ResponsiveContainerGrid>
              {data?.roi?.derivedRepresentations
                ?.filter(notEmpty)
                .map((rep, index) => (
                  <RepresentationCard key={index} rep={rep} />
                ))}
            </ResponsiveContainerGrid>
          </div>
          <div className="ml-2 flex-1  shadow mt-2 rounded rounded-lg overflow-hidden">
            {data?.roi && <RoiCanvas roi={data.roi} height={500} width={500} />}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Roi };
