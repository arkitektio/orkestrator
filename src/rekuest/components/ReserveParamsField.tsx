import { useField } from "formik";
import React from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { useDetailClientQuery, useUserQuery } from "../../lok/api/graphql";
import { withMan } from "../../lok/man";
import { useMikro } from "../../mikro/MikroContext";
import { ReservableTemplateFragment, ReserveBindsInput } from "../api/graphql";
import { StatusPulse } from "./generic/StatusPulse";

interface TemplatesDisplayProps {
  templates: ReservableTemplateFragment[];
  name: string;
}

export const UserImage: React.FC<{ sub: string }> = ({ sub }) => {
  const { data, error } = withMan(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useMikro();
  return (
    <>
      {data?.user?.id && (
        <img
          className={`h-8 w-8 rounded-3 rounded `}
          src={
            data?.user?.profile?.avatar
              ? s3resolve(data?.user?.profile.avatar)
              : `https://eu.ui-avatars.com/api/?name=${data?.user?.username}&background=random`
          }
          alt=""
        />
      )}
    </>
  );
};

export const App: React.FC<{ clientId: string }> = ({ clientId }) => {
  const { data, error } = withMan(useDetailClientQuery)({
    variables: { clientId: clientId },
  });

  const { s3resolve } = useMikro();
  return (
    <div>
      {data?.client?.release?.logo && (
        <img
          className={`h-20 w-auto rounded-2 
            cursor-pointer`}
          src={s3resolve(data?.client?.release?.logo)}
          alt=""
        />
      )}
      <div className="text-xs text-gray-500">
        {data?.client?.release?.app?.identifier}
      </div>
      <div className="text-xs text-gray-500">
        {data?.client?.release?.version}
      </div>
    </div>
  );
};

export const ReserveParamsField = ({
  templates,
  name,
}: TemplatesDisplayProps) => {
  const restructuredData = templates.reduce<
    {
      clientId: string;
      templates: ReservableTemplateFragment[];
    }[]
  >((prev, current) => {
    if (current?.agent?.registry?.client) {
      const app = current.agent?.registry?.client;

      let prev_app = prev.find(
        (predicate) => predicate.clientId === app.clientId
      );
      if (prev_app) {
        return prev.map((p) =>
          p.clientId === app.clientId
            ? {
                ...p,
                templates: [...p.templates, current],
              }
            : p
        );
      } else {
        return [...prev, { ...app, templates: [current] }];
      }
    }

    return prev;
  }, []);

  const [field, meta, helpers] = useField<ReserveBindsInput | undefined>({
    name: name,
  });

  return (
    <div className=" p-2">
      <div className="mb-2">
        {!field.value ? (
          <button
            type="button"
            className="border border-1 w-full items-center border-slate-600  rounded rounded-md p-2 flex flex-col bg-slate-800 ring-primary-400 ring-2 cursor-pointer"
            onClick={() => helpers.setValue(undefined)}
          >
            Auto
          </button>
        ) : field.value.clients.length === 0 &&
          field.value.templates.length === 0 ? (
          <button
            type="button"
            className="border border-1  w-full items-centerborder-slate-600 rounded rounded-md p-2 flex flex-col bg-slate-800 ring-primary-400 ring-2 mb-1 cursor-pointer"
            onClick={() => helpers.setValue(undefined)}
          >
            Auto
          </button>
        ) : (
          <button
            type="button"
            className="border border-1  w-full items-center border-slate-600 rounded rounded-md p-2 flex flex-col bg-slate-800 mb-1 cursor-pointer"
            onClick={() => helpers.setValue(undefined)}
          >
            Auto
          </button>
        )}
      </div>
      <ResponsiveContainerGrid>
        {restructuredData?.map((app) => (
          <div
            key={app.clientId}
            className={`border border-1 border-slate-600 rounded rounded-md p-2 flex flex-col bg-slate-800  @container ${
              field.value?.clients.includes(app.clientId)
                ? "ring-primary-400 ring-2"
                : "hover:ring-primary-200 hover:ring-2"
            }  cursor-pointer`}
            onClick={() => {
              if (field.value?.clients.includes(app.clientId)) {
                helpers.setValue({
                  ...field.value,
                  clients: field.value.clients.filter((t) => t != app.clientId),
                });
              } else {
                helpers.setValue({
                  ...(field.value || { templates: [] }),
                  clients: [...(field.value?.clients || []), app.clientId],
                });
              }
            }}
          >
            <App clientId={app.clientId} />

            <ResponsiveContainerGrid fitLength={app.templates?.length}>
              {app.templates.map((template) => (
                <div
                  key={template.id}
                  className={`flex flex-row @container justify-between p-1 w-full rounded rounded-md ${
                    field.value?.templates.includes(template.id)
                      ? "ring-primary-400 ring-2"
                      : "hover:ring-primary-200 hover:ring-2"
                  }  cursor-pointer`}
                  onClick={(e) => {
                    if (field.value?.templates.includes(template.id)) {
                      helpers.setValue({
                        ...field.value,
                        templates: field.value.templates.filter(
                          (t) => t != template.id
                        ),
                      });
                    } else {
                      helpers.setValue({
                        ...(field.value || { clients: [] }),
                        templates: [
                          ...(field.value?.templates || []),
                          template.id,
                        ],
                      });
                    }
                    e.stopPropagation();
                  }}
                >
                  {template?.agent?.registry?.user?.sub && (
                    <UserImage sub={template?.agent?.registry?.user?.sub} />
                  )}
                  <label className="my-auto text-sm font-medium text-gray-700">
                    {template.agent.instanceId}
                  </label>
                  <label className="flex-initial my-auto font-medium text-gray-700">
                    {template.agent.status && (
                      <StatusPulse status={template.agent.status} />
                    )}
                  </label>
                </div>
              ))}
            </ResponsiveContainerGrid>
          </div>
        ))}
      </ResponsiveContainerGrid>
    </div>
  );
};
