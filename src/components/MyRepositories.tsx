import React from "react";
import { BiTrash } from "react-icons/bi";
import { useNavigate } from "react-router";
import {
  AppRepositoryFragment,
  MirrorRepositoryFragment,
  useDeleteRepoMutation,
  useRepositoriesQuery,
} from "../rekuest/api/graphql";
import { notEmpty } from "../floating/utils";
import { SectionTitle } from "../layout/SectionTitle";
import { AppRepository, MirrorRepository } from "../linker";
import { useConfirm } from "./confirmer/confirmer-context";
import { ResponsiveGrid } from "./layout/ResponsiveGrid";
import { withRekuest } from "../rekuest";

export type IActiveClientsProps = {};

export const MirrorRepositoryItem = ({
  repository,
}: {
  repository: MirrorRepositoryFragment;
}) => {
  return (
    <MirrorRepository.Smart
      showSelfMates={true}
      placement="bottom"
      object={repository.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded border overflow-hidden shadow-md p-3 text-white ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="p-2">
        <div className="flex">
          <MirrorRepository.DetailLink
            className={({ isActive }) =>
              "cursor-pointer " + (isActive ? "text-primary-300" : "")
            }
            object={repository.id}
          >
            {repository?.name}
          </MirrorRepository.DetailLink>
          <div className="flex-grow"></div>
        </div>
      </div>
    </MirrorRepository.Smart>
  );
};

export const AppRepositoryItem = ({
  repository,
}: {
  repository: AppRepositoryFragment;
}) => {
  const [deleteRepo] = withRekuest(useDeleteRepoMutation)();

  const { confirm } = useConfirm();

  return (
    <AppRepository.Smart
      showSelfMates={true}
      placement="bottom"
      object={repository.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded border overflow-hidden shadow-md p-3 text-white ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      additionalMates={(accept, self) => {
        if (!self) return [];

        if (accept == "item:@rekuest/apprepository") {
          return [
            {
              action: async (self, drops) => {
                await confirm({
                  message: "Do you really want to delete?",
                  subtitle: "Deletion is irreversible!",
                  confirmLabel: "Yes delete!",
                });

                await deleteRepo({
                  variables: { id: repository.id },
                });
              },
              label: <BiTrash />,
              description: "Delete Repository",
            },
          ];
        }

        return [];
      }}
    >
      <div className="p-2">
        <div className="flex">
          <AppRepository.DetailLink
            className={({ isActive }) =>
              "cursor-pointer " + (isActive ? "text-primary-300" : "")
            }
            object={repository?.id}
          >
            {repository?.app?.identifier}
          </AppRepository.DetailLink>
          <div className="flex-grow"></div>
        </div>
        <p className="text-gray-700 text-base"></p>
      </div>
    </AppRepository.Smart>
  );
};

export const MyRepositories: React.FC<IActiveClientsProps> = ({}) => {
  const { data } = withRekuest(useRepositoriesQuery)();
  const navigate = useNavigate();

  return (
    <>
      <SectionTitle>Repos</SectionTitle>
      <br />
      <ResponsiveGrid>
        {data?.allrepositories
          ?.filter(notEmpty)
          .map((rep, index) =>
            rep.__typename == "MirrorRepository" ? (
              <MirrorRepositoryItem repository={rep} key={index} />
            ) : (
              <AppRepositoryItem repository={rep} key={index} />
            )
          )}
      </ResponsiveGrid>
    </>
  );
};
