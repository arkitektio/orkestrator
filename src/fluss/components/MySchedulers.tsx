import React from "react";

import { ListRender } from "../../layout/SectionTitle";
import { PortDeployment } from "../../linker";
import { useDeleteDeployment } from "../../mates/deployment/useDeleteDeployment";
import { useRequesterMate } from "../../mates/reservation/useRequesterMate";
import { withRekuest } from "../../rekuest";
import { useReservationsQuery } from "../../rekuest/api/graphql";
import { usePostman } from "../../rekuest/providers/postman/postman-context";
import { useSettings } from "../../settings/settings-context";
import { ActiveSchedulerCard } from "./cards/ActiveSchedulerCard";

export type IMyWhalesProps = {};


const MySchedulers: React.FC<IMyWhalesProps> = ({}) => {
    const { settings } = useSettings();

    const { data } = withRekuest(useReservationsQuery)({
        fetchPolicy: "cache-and-network",
        variables: {
        instanceId: settings.instanceId,
        },
    });


    const { reserve } = usePostman()

    const requesterMate = useRequesterMate();
    const deleteDeployment = useDeleteDeployment();

    return (
        <ListRender
        title={
            <PortDeployment.ListLink>My active Schedulers</PortDeployment.ListLink>
        }
        array={data?.reservations?.filter((n => n?.node?.hash == "07afcaeef1c2ed2a74719336920d90c4f506a671ea49eb4efb2668c24377b806"))}
        
        >
        {(item, index) => (
            <ActiveSchedulerCard
            reservation={item}
            key={index}
            mates={[requesterMate(item), ]}
            />
        )}
        </ListRender>
    );
};

export { MySchedulers };
