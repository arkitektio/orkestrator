import React from "react";
import {
  AvailableModels,
  useUserQuery as useArkitektUserQuery,
} from "../../arkitekt/api/graphql";
import { withArkitekt } from "../../arkitekt/arkitekt";
import { ShareModal } from "../../arkitekt/components/dialogs/ShareModal";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { Modal } from "../../components/modals/Modal";
import { ActionButton } from "../../layout/ActionButton";
import { PageLayout } from "../../layout/PageLayout";
import { Team } from "../../linker";
import { useRepresentationsForUserQuery } from "../../mikro/api/graphql";
import { withMikro } from "../../mikro/mikro-types";
import { useDetailUserQuery } from "../api/graphql";
import { withMan } from "../man";

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

export const ManageArkitekt = ({ email }: { email: string }) => {
  const { data } = withArkitekt(useArkitektUserQuery)({
    variables: { email: email },
  });

  return (
    <>
      <div className="h3">Arkitekt</div>
      {data?.user?.id && (
        <Modal child={<button>OPEN SHARE</button>}>
          <ShareModal
            type={AvailableModels.LokLokuser}
            object={data?.user?.id}
          />
        </Modal>
      )}
    </>
  );
};

const User: React.FC<UserProps> = ({ id }) => {
  const { data } = withMan(useDetailUserQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout
      actions={
        <ActionButton
          label="Email"
          onAction={async (x) => {
            window.open(`mailto:${data?.user?.email}`, "_blank");
          }}
        />
      }
    >
      <div className="dark:text-white grid grid-rows-6">
        <div
          className="text-6xl font-light row-span-2 p-5 border rounded-lg"
          style={
            data?.user?.avatar
              ? {
                  backgroundImage: `url(${data?.user?.avatar}), linear-gradient(rgba(0,0,0,0.3), rgba(1,1,1,0.5))`,
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
          {data?.user?.username}
        </div>
        <div className="text-md mt-2">
          <div className="text-xl font-light">Member of these Groups</div>
          <ResponsiveGrid>
            {data?.user?.groups?.map((u, index) => (
              <Team.Smart
                object={u.id}
                className="mt-2 p-6 rounded shadow-md bg-white border-gray-200 group text-black relative"
              >
                <div className="flex">
                  <Team.DetailLink
                    object={u.id}
                    className="flex-grow cursor-pointer font-semibold"
                  >
                    {u.name}
                  </Team.DetailLink>
                </div>
              </Team.Smart>
            ))}
          </ResponsiveGrid>
          <div className="text-xl font-light">
            My Shared Data with this User
          </div>
          {data?.user?.email && (
            <>
              <ManageArkitekt email={data?.user?.email} />
              <ManageMikro email={data?.user?.email} />
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export { User };
