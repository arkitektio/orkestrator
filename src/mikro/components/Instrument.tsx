import React from "react";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { SelfActions } from "../../components/SelfActions";
import { notEmpty } from "../../floating/utils";
import { MikroKomments } from "../../komment/MikroKomments";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";
import { CommentableModels, useDetailInstrumentQuery } from "../api/graphql";
import { withMikro } from "../MikroContext";

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
          <MikroKomments id={id} model={CommentableModels.GrunnlagInstrument} />
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
