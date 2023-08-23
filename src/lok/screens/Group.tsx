import React from "react";
import { DropZone } from "../../components/layout/DropZone";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { Representation } from "../../linker";
import { useMikro, withMikro } from "../../mikro/MikroContext";
import { useRepresentationsForQuery } from "../../mikro/api/graphql";
import { useDetailGroupQuery } from "../api/graphql";
import { UserCard } from "../components/cards/UserCard";
import { ChangeGroupDialog } from "../components/dialogs/ChangeGroupDialog";
import { withLok } from "../LokContext";

export type GroupProps = {
  id: string;
};

export const RepresentationsForGroup = ({ name }: { name: string }) => {
  const { data } = withMikro(useRepresentationsForQuery)({
    variables: { group: name },
  });

  return (
    <>
      <ResponsiveGrid>
        {data?.representationsForGroup?.filter(notEmpty).map((u, index) => (
          <Representation.DetailLink
            object={u.id}
            className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black"
          >
            <div className="flex">
              <span className="flex-grow cursor-pointer font-semibold">
                {u?.name}
              </span>
            </div>
          </Representation.DetailLink>
        ))}
      </ResponsiveGrid>
    </>
  );
};

const Group: React.FC<GroupProps> = ({ id }) => {
  const { data } = withLok(useDetailGroupQuery)({
    variables: { id: id },
  });

  const { s3resolve } = useMikro();
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
          <ResponsiveGrid>
            {data?.group?.userSet?.filter(notEmpty).map((u, index) => (
              <UserCard user={u} key={index} />
            ))}
          </ResponsiveGrid>
          <div className="text-xl font-light">
            My Shared Data with this Team
          </div>
          {data?.group?.name && (
            <RepresentationsForGroup name={data?.group?.name} />
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export { Group };
