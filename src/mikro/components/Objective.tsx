import React from "react";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { OptimizedImage } from "../../layout/OptimizedImage";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";
import { CommentableModels, useDetailObjectiveQuery } from "../api/graphql";
import { useMikro, withMikro } from "../MikroContext";

export type ObjectiveProps = {
  id: string;
};

const Objective: React.FC<ObjectiveProps> = ({ id }) => {
  const { data } = withMikro(useDetailObjectiveQuery)({
    variables: { id: id },
  });

  const { s3resolve } = useMikro();

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/objective"} object={id} />}
      sidebar={
        <div className="p-5">
          <MikroKomments id={id} model={CommentableModels.GrunnlagObjective} />
        </div>
      }
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.objective?.name}
          {data?.objective?.magnification} x
        </div>
        <div className="flex flex-row">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="">Latest images acquired with this objective </div>
            <ResponsiveGrid>
              {data?.objective?.omeros?.filter(notEmpty).map((omero, index) => (
                <Representation.Smart
                  object={omero.representation.id}
                  className="rounded shadow-md border-gray-200 h-20 group text-black relative"
                >
                  {omero.representation.latestThumbnail && (
                    <OptimizedImage
                      src={s3resolve(
                        omero.representation?.latestThumbnail.image
                      )}
                      style={{ filter: "brightness(0.7)" }}
                      className="object-cover h-20 w-full absolute top-0 left-0 rounded"
                      blurhash={omero.representation?.latestThumbnail.blurhash}
                    />
                  )}
                  <div className="h-20 p-2 absolute">
                    <Representation.DetailLink
                      object={omero.representation.id}
                      className="flex-grow  text-white cursor-pointer font-semibold"
                    >
                      {omero.representation.name}
                    </Representation.DetailLink>
                  </div>
                </Representation.Smart>
              ))}
            </ResponsiveGrid>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Objective };
