import React from "react";
import { SelfActions } from "../../components/SelfActions";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { PageLayout } from "../../layout/PageLayout";
import { MikroInstrument, MikroRepresentation } from "../../linker";
import { withMikro } from "../MikroContext";
import { useDetailInstrumentQuery } from "../api/graphql";

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
      sidebars={[
        {
          label: "Comments",
          content: <MikroInstrument.Komments object={id} />,
          key: "comments",
        },
      ]}
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
                  <MikroRepresentation.Smart
                    object={omero.representation.id}
                    className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black"
                  >
                    <div className="flex">
                      <MikroRepresentation.DetailLink
                        object={omero.representation.id}
                        className="flex-grow cursor-pointer font-semibold"
                      >
                        {omero.representation.name}
                      </MikroRepresentation.DetailLink>
                    </div>
                  </MikroRepresentation.Smart>
                ))}
            </ResponsiveGrid>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export { Instrument };
