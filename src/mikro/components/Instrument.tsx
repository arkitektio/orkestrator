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
  useDetailPositionQuery,
  useDetailRoiQuery,
} from "../api/graphql";
import { withMikro } from "../MikroContext";
import CommentSection from "./comments/CommentSection";
import { DiscussionSidebar } from "./comments/DiscussionSidebar";

export type InstrumentProps = {
  id: string;
};

const Instrument: React.FC<InstrumentProps> = ({ id }) => {
  const { data } = withMikro(useDetailInstrumentQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      actions={<SelfActions type={"@mikro/instrument"} object={id} />}
      sidebar={
        <div className="p-5">
          <CommentSection
            id={id}
            model={CommentableModels.GrunnlagInstrument}
          />
        </div>
      }
    >
      <div className="p-5 w-full">
        <div className="text-xl font-light text-white">
          {data?.instrument?.name}
        </div>
        <div className="flex flex-row">
          <div className="p-4 flex-1 bg-white border shadow mt-2 rounded">
            <div className="">Latest uses </div>
            <ResponsiveGrid>
              {data?.instrument?.omeros
                ?.filter(notEmpty)
                .map((omero, index) => (
                  <Representation.Smart
                    object={omero.representation.id}
                    className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black"
                  >
                    <div className="flex">
                      <Representation.DetailLink
                        object={omero.representation.id}
                        className="flex-grow cursor-pointer font-semibold"
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

export { Instrument };
