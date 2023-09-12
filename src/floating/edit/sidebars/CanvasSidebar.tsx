import { useEffect } from "react";
import { FittingResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { SectionTitle } from "../../../layout/SectionTitle";
import { useRequesterMate } from "../../../mates/reservation/useRequesterMate";
import { useTemplateActionMate } from "../../../mates/template/useTemplateActionsMate";
import { withRekuest } from "../../../rekuest";
import {
  TemplatesEventDocument,
  TemplatesEventSubscription,
  useReservableTemplatesQuery,
  useReservationsQuery,
} from "../../../rekuest/api/graphql";
import { ReservationCard } from "../../../rekuest/components/cards/ReservationCard";
import { TemplateCard } from "../../../rekuest/components/cards/TemplateCard";
import { useSettings } from "../../../settings/settings-context";
import { notEmpty } from "../../utils";
import { useEditRiver } from "../context";

export const CanvasSidebar = (props: {}) => {
  const { flow } = useEditRiver();

  const { settings } = useSettings();

  const { data: resdata, error: reserror } = withRekuest(useReservationsQuery)({
    fetchPolicy: "network-only",
    variables: {
      instanceId: settings.instanceId,
    },
  });

  const reservations = resdata?.reservations?.filter(notEmpty).filter((r) => {
    return r.node.interfaces?.includes("flow:" + flow.id);
  });

  const {
    data: tempdata,
    error,
    subscribeToMore,
  } = withRekuest(useReservableTemplatesQuery)({
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

  useEffect(() => {
    console.log("Subscription to ", flow.id);
    return subscribeToMore<TemplatesEventSubscription>({
      document: TemplatesEventDocument,
      variables: {
        templateParams: [
          {
            key: "flow",
            value: flow.id,
          },
        ],
      },
      updateQuery: (prev, { subscriptionData }) => {
        if (!subscriptionData.data) return prev;
        const newReservation = subscriptionData.data.templates?.created;
        if (!newReservation) return prev;
        return Object.assign({}, prev, {
          reservableTemplates: [
            ...(prev.reservableTemplates?.filter(notEmpty) || []),
            newReservation,
          ],
        });
      },
    });
  }, [flow.id]);

  const templateMate = useTemplateActionMate();
  const resMate = useRequesterMate();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">
        {flow.name} {flow.id}
      </div>

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
        <FittingResponsiveContainerGrid fitLength={reservations?.length}>
          {reservations?.filter(notEmpty).map((res, index) => (
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
