import { FittingResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { SectionTitle } from "../../../layout/SectionTitle";
import { useRequesterMate } from "../../../mates/reservation/useRequesterMate";
import { useTemplateActionMate } from "../../../mates/template/useTemplateActionsMate";
import { withRekuest } from "../../../rekuest";
import {
  useReservableTemplatesQuery,
  useThisFilteredReservationsQuery,
} from "../../../rekuest/api/graphql";
import { ReservationCard } from "../../../rekuest/components/cards/ReservationCard";
import { TemplateCard } from "../../../rekuest/components/cards/TemplateCard";
import { notEmpty } from "../../utils";
import { useEditRiver } from "../context";

export const CanvasSidebar = (props: {}) => {
  const { flow } = useEditRiver();

  const { data: resdata, error: reserror } = withRekuest(
    useThisFilteredReservationsQuery
  )({
    fetchPolicy: "network-only",
    variables: {
      templateParams: [
        {
          key: "flow",
          value: flow.id,
        },
      ],
    },
  });

  const { data: tempdata, error } = withRekuest(useReservableTemplatesQuery)({
    fetchPolicy: "network-only",
    variables: {
      templateParams: [
        {
          key: "flow",
          value: flow.id,
        },
      ],
    },
  });

  const templateMate = useTemplateActionMate();
  const resMate = useRequesterMate();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">{flow.name}</div>
      <div className="text-white flex-initial text-md">{flow.description}</div>

      <SectionTitle>Deployed on</SectionTitle>
      <FittingResponsiveContainerGrid
        fitLength={tempdata?.reservableTemplates?.length}
      >
        {tempdata?.reservableTemplates?.filter(notEmpty).map((temp, index) => (
          <TemplateCard
            key={index}
            template={temp}
            mates={[templateMate(temp)]}
          />
        ))}
      </FittingResponsiveContainerGrid>
      <div className="mt-5">
        <SectionTitle>Used by</SectionTitle>
        <FittingResponsiveContainerGrid
          fitLength={resdata?.reservations?.length}
        >
          {resdata?.reservations?.filter(notEmpty).map((res, index) => (
            <ReservationCard
              key={index}
              reservation={res}
              mates={[resMate(res)]}
            />
          ))}
        </FittingResponsiveContainerGrid>
      </div>
      {error && <div>{error.message}</div>}
      {reserror && <div>{reserror.message}</div>}
    </div>
  );
};
