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
  useDetailPositionQuery,
  useDetailRoiQuery,
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import CommentSection from "./comments/CommentSection";
import { DiscussionSidebar } from "./comments/DiscussionSidebar";

export type PositionProps = {
  id: string;
};

const Position: React.FC<PositionProps> = ({ id }) => {
  const { data } = withMikro(useDetailPositionQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/position"} object={id} />}
      sidebar={
        <div className="p-5">
          <CommentSection id={id} model={CommentableModels.GrunnlagPosition} />
        </div>
      }
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.position?.stage?.id && (
            <Stage.DetailLink object={data?.position?.stage?.id}>
              Position on {data?.position?.stage?.name}
            </Stage.DetailLink>
          )}
        </div>
        <div className="flex flex-row">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="text-md mt-2">{data?.position?.x}</div>
            <div className="text-md mt-2">{data?.position?.y}</div>
            <div className="text-md mt-2">{data?.position?.z}</div>
            <div className="text-md mt-2">{data?.position?.t}</div>
            <div className="text-md mt-2">{data?.position?.c}</div>
            <div className="">Atached images </div>
            <ResponsiveGrid>
              {data?.position?.omeros?.filter(notEmpty).map((omero, index) => (
                <Representation.Smart
                  object={omero.representation.id}
                  className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black"
                >
                  <div className="flex">
                    <Representation.DetailLink
                      object={omero.representation.id}
                      className="flex-grow cursor-pointer font-semibold"
                    >
                      Image
                    </Representation.DetailLink>
                  </div>
                  <div className="text-xl font-semibold">Rep {index}</div>
                </Representation.Smart>
              ))}
            </ResponsiveGrid>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Position };
