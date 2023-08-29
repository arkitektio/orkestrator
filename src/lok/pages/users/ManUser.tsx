import { useDatalayer } from "@jhnnsrs/datalayer";
import React from "react";
import { useParams } from "react-router";
import { FittingResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { useDialog } from "../../../providers/dialog/DialogProvider";
import { withLok } from "../../LokContext";
import { useDetailUserQuery } from "../../api/graphql";
import { TeamCard } from "../../components/cards/TeamCard";
import { ChangeUserDialog } from "../../components/dialogs/ChangeUserDialog";

export interface ManUserProps {}

export const ManUser: React.FC<ManUserProps> = (props) => {
  const { user } = useParams<{ user: string }>();

  if (!user) return <></>;

  const { data } = withLok(useDetailUserQuery)({
    variables: { id: user },
  });
  const { s3resolve } = useDatalayer();

  const { ask } = useDialog();

  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Email"
            onAction={async (x) => {
              window.open(`mailto:${data?.user?.email}`, "_blank");
            }}
          />
          <ActionButton
            label="Change"
            onAction={async (x) => {
              if (data?.user) {
                await ask(ChangeUserDialog, { user: data?.user });
              }
            }}
          />
        </>
      }
    >
      <div className="dark:text-white grid grid-rows-6">
        <div
          className="text-6xl font-light row-span-2 p-5 border rounded-lg"
          style={
            data?.user?.profile?.avatar
              ? {
                  backgroundImage: `url(${s3resolve(
                    data?.user?.profile?.avatar
                  )}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
                  backgroundRepeat: "no-repeat",
                  backgroundBlendMode: "multiply",
                  backgroundSize: "cover",
                }
              : {
                  background:
                    "linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.95))",
                }
          }
        >
          {data?.user?.firstName ? (
            <>
              {data?.user.firstName} {data?.user.lastName}
              <div className="text-2xl font-light">{data?.user?.username}</div>
            </>
          ) : (
            data?.user?.username
          )}
        </div>
        <div className="text-md mt-2">
          <div className="text-xl font-light">Member of these Groups</div>
          <FittingResponsiveContainerGrid>
            {data?.user?.groups?.map((u, index) => (
              <TeamCard group={u} key={index} />
            ))}
          </FittingResponsiveContainerGrid>
          <div className="text-xl font-light">
            My Shared Data with this User
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
