import { TwoDOffcanvas } from "../experimental/render/TwoDOffcanvas";
import { useDetailRepresentationQuery } from "../mikro/api/graphql";
import { withMikro } from "../mikro/MikroContext";
import { ExperimentalFeature } from "../providers/experimental/Experimental";

export const RepresentationWidget: React.FC<{ value: string }> = ({
  value,
}) => {
  const { data } = withMikro(useDetailRepresentationQuery)({
    variables: { id: value },
  });

  return (
    <ExperimentalFeature>
      <div className="flex-grow">
        {data?.representation && (
          <TwoDOffcanvas
            representation={data?.representation}
            withRois={true}
            follow={"width"}
          />
        )}
      </div>
    </ExperimentalFeature>
  );
};
