import React from "react";
import { Link } from "react-router-dom";
import { isVoidExpression } from "typescript";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";
import { CommentableModels, useDetailRoiQuery } from "../api/graphql";
import { withMikro } from "../mikro-types";
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
      <div className="p-5 dark:text-white w-full">
        <div className="text-xl font-light">{data?.roi?.id}</div>
        <div className="text-md mt-2">
          {data?.roi?.representation && (
            <Link to={`/representation/${data.roi.representation.id}`}>
              {" "}
              Belongs to Stack {data.roi.representation.name}
            </Link>
          )}
        </div>
        <ResponsiveGrid>
          {data?.roi?.vectors?.map((vec, index) => (
            <div className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black">
              <div className="flex">
                <span className="flex-grow cursor-pointer font-semibold">
                  {vec?.x} {vec?.y} {vec?.z}
                </span>
              </div>
              <div className="text-xl font-semibold">Vector {index}</div>
            </div>
          ))}
        </ResponsiveGrid>
        <div className="text-white">Derived images </div>
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
    </PageLayout>
  );
};

export { Roi };
