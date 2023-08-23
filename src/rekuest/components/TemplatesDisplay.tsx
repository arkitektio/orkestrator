import { useDatalayer } from "@jhnnsrs/datalayer";
import React, { useState } from "react";
import { ResponsiveContainerGrid } from "../../components/layout/ResponsiveContainerGrid";
import { withLok } from "../../lok/LokContext";
import { useAppQuery, useUserQuery } from "../../lok/api/graphql";
import { ReservableTemplateFragment } from "../api/graphql";
import { StatusPulse } from "./generic/StatusPulse";

interface TemplatesDisplayProps {
  templates: ReservableTemplateFragment[];
}

export const UserImage: React.FC<{ sub: string }> = ({ sub }) => {
  const { data, error } = withLok(useUserQuery)({
    variables: { id: sub },
  });

  const { s3resolve } = useDatalayer();
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
  const { data, error } = withLok(useAppQuery)({
    variables: { clientId: clientId },
  });

  const { s3resolve } = useDatalayer();
  return (
    <div>
      {data?.app?.logo && (
        <img
          className={`h-20 w-auto rounded-2 
            cursor-pointer`}
          src={s3resolve(data?.app?.logo)}
          alt=""
        />
      )}
      <div className="text-xs text-gray-500">{data?.app?.identifier}</div>
      <div className="text-xs text-gray-500">{data?.app?.version}</div>
    </div>
  );
};

export const TemplatesDisplay = ({ templates }: TemplatesDisplayProps) => {
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

  const [selectedTemplate, setSelectedTemplates] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProvisions, setSelectedProvisions] = useState<string[]>([]);

  return (
    <div className=" p-2">
      <ResponsiveContainerGrid>
        {restructuredData?.map((app) => (
          <div
            key={app.clientId}
            className={`border border-1 rounded rounded-md p-2 flex flex-col bg-gray-300  @container ${
              selectedClients.includes(app.clientId)
                ? "ring-primary-400 ring-2"
                : "hover:ring-primary-200 hover:ring-2"
            }  cursor-pointer`}
            onClick={() =>
              setSelectedClients((list) =>
                list.includes(app.clientId)
                  ? list.filter((t) => t != app.clientId)
                  : [...list, app.clientId]
              )
            }
          >
            <App clientId={app.clientId} />

            <ResponsiveContainerGrid>
              {app.templates.map((template) => (
                <div
                  key={template.id}
                  className={`flex flex-row @container justify-between p-1 rounded rounded-md ${
                    selectedTemplate.includes(template.id)
                      ? "ring-primary-400 ring-2"
                      : "hover:ring-primary-200 hover:ring-2"
                  }  cursor-pointer`}
                  onClick={(e) => {
                    setSelectedTemplates((list) =>
                      list.includes(template.id)
                        ? list.filter((t) => t != template.id)
                        : [...list, template.id]
                    );
                    e.stopPropagation();
                  }}
                >
                  {template?.agent?.registry?.user?.sub && (
                    <UserImage sub={template?.agent?.registry?.user?.sub} />
                  )}
                  <label className="my-auto text-sm font-medium text-gray-700">
                    {template.agent.instanceId}
                  </label>
                  <label className="my-auto text-sm font-medium text-gray-700">
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
