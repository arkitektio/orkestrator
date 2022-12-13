import React from "react";
import { Link } from "react-router-dom";
import { isVoidExpression } from "typescript";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { RoiCanvas } from "../../components/RoiCanvas";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";
import { CommentableModels, useDetailRoiQuery } from "../api/graphql";
import { withMikro } from "../MikroContext";
import CommentSection from "./comments/CommentSection";
import { DiscussionSidebar } from "./comments/DiscussionSidebar";

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
      sidebar={
        <div className="p-5">
          <CommentSection id={id} model={CommentableModels.GrunnlagRoi} />
        </div>
      }
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.roi?.representation?.id && (
            <Representation.DetailLink object={data?.roi?.representation?.id}>
              Roi Marked on {data?.roi?.representation?.name}
            </Representation.DetailLink>
          )}
        </div>
        <div className="flex flex-row">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="text-md mt-2">{data?.roi?.type}</div>
            <div className="">Derived images </div>
            <ResponsiveGrid>
              {data?.roi?.derivedRepresentations
                ?.filter(notEmpty)
                .map((rep, index) => (
                  <Representation.Smart
                    object={rep.id}
                    className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black"
                  >
                    <div className="flex">
                      <Representation.DetailLink
                        object={rep.id}
                        className="flex-grow cursor-pointer font-semibold"
                      >
                        {rep.name}
                      </Representation.DetailLink>
                    </div>
                    <div className="text-xl font-semibold">Rep {index}</div>
                  </Representation.Smart>
                ))}
            </ResponsiveGrid>
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
