import { useDatalayer } from "@jhnnsrs/datalayer";
import React from "react";
import { useParams } from "react-router";
import { DropZone } from "../../../components/layout/DropZone";
import { ResponsiveContainerGrid } from "../../../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../../../floating/utils";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { useDialog } from "../../../providers/dialog/DialogProvider";
import { withLok } from "../../LokContext";
import { useDetailGroupQuery } from "../../api/graphql";
import { UserCard } from "../../components/cards/UserCard";
import { ChangeGroupDialog } from "../../components/dialogs/ChangeGroupDialog";

export interface ManTeamProps {}

export const ManTeam: React.FC<ManTeamProps> = (props) => {
  const { team } = useParams<{ team: string }>();

  if (!team) return <></>;

  const { data } = withLok(useDetailGroupQuery)({
    variables: { id: team },
  });

  const { s3resolve } = useDatalayer();
  const { ask } = useDialog();
  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Change"
            onAction={async (x) => {
              if (data?.group) {
                await ask(ChangeGroupDialog, { group: data?.group });
              }
            }}
          />
        </>
      }
    >
      <div className="text-white flex-grow">
        <div
          className="text-6xl font-light row-span-2 p-5 border rounded-lg"
          style={
            data?.group?.profile?.avatar
              ? {
                  backgroundImage: `url(${s3resolve(
                    data?.group?.profile?.avatar
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
          {data?.group?.name}
        </div>
        <DropZone
          className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black"
          accepts={["item:@lok/user"]}
          overLabel="Release to add user"
          canDropLabel="Drop a user here to add them to this group"
          onDrop={async (e) => {
            console.log(e);
          }}
        />

        <div className="text-md mt-2">
          <div className="text-xl font-light">Members of this Group</div>
          <ResponsiveContainerGrid>
            {data?.group?.userSet?.filter(notEmpty).map((u, index) => (
              <UserCard user={u} key={index} />
            ))}
          </ResponsiveContainerGrid>
          <div className="text-xl font-light">
            My Shared Data with this Team
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
