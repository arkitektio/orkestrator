import { useEffect } from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { PageLayout } from "../../layout/PageLayout";
import { Representation } from "../../linker";
import { withRekuest } from "../../rekuest";
import { useUnfoldProvenanceQuery } from "../../rekuest/api/graphql";
import { useProvenanceLazyQuery } from "../api/graphql";
import { withMikro } from "../MikroContext";
import { RepresentationCard } from "./cards/RepresentationCard";

export type ProvenanceProps = {
  id: string;
};

export const Provenance = (props: ProvenanceProps) => {
  const { data } = withRekuest(useUnfoldProvenanceQuery)({
    variables: { id: props.id },
  });

  const [fetch, provenance] = withMikro(useProvenanceLazyQuery)();

  useEffect(() => {
    if (data?.assignation?.id) {
      let createdWhiles = data.assignation.children
        .map((c) => c.id)
        .concat(data.assignation.id);
      fetch({
        variables: {
          ids: createdWhiles,
        },
      });
    }
  }, [data]);

  return (
    <PageLayout>
      <ResponsiveContainerGrid>
        {provenance?.data?.provenance?.map((p, index) => {
          switch (p?.__typename) {
            case "Representation":
              return <RepresentationCard rep={p} key={index} mates={[]} />;
            default:
              return <div className="text-white">{p?.__typename}</div>;
          }
        })}
      </ResponsiveContainerGrid>
    </PageLayout>
  );
};
