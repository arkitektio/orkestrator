import React from "react";
import {
  SharableModels,
  useUserQuery as useArkitektUserQuery,
} from "../../rekuest/api/graphql";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { Modal } from "../../components/modals/Modal";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { Team } from "../../linker";
import { useRepresentationsForUserQuery } from "../../mikro/api/graphql";
import { useMikro, withMikro } from "../../mikro/MikroContext";
import { useDetailUserQuery } from "../api/graphql";
import { withMan } from "../man";
import { withRekuest } from "../../rekuest";
import { useDialog } from "../../layout/dialog/DialogProvider";
import { ChangeUserDialog } from "../components/dialogs/ChangeUserDialog";
import { userInfo } from "os";
import { TeamCard } from "../components/cards/TeamCard";

export type UserProps = {
  id: string;
};

export const ManageMikro = ({ email }: { email: string }) => {
  const { data } = withMikro(useRepresentationsForUserQuery)({
    variables: { email: email },
  });

  return (
    <>
      <div className="h3">Mikro</div>
      <ResponsiveGrid>
        {data?.representationsForUser?.map((u, index) => (
          <div className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black">
            <div className="flex">
              <span className="flex-grow cursor-pointer font-semibold">
                {u?.name}
              </span>
            </div>
          </div>
        ))}
      </ResponsiveGrid>
    </>
  );
};

const User: React.FC<UserProps> = ({ id }) => {
  const { data } = withMan(useDetailUserQuery)({
    variables: { id: id },
  });
  const { s3resolve } = useMikro();

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
          <ResponsiveGrid>
            {data?.user?.groups?.map((u, index) => (
              <TeamCard group={u} key={index} />
            ))}
          </ResponsiveGrid>
          <div className="text-xl font-light">
            My Shared Data with this User
          </div>
          {data?.user?.email && (
            <>
              <ManageMikro email={data?.user?.email} />
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export { User };
