import { gql } from "@apollo/client";
import React, { useEffect } from "react";
import { useDetailMetricQuery } from "../mikro/api/graphql";
import { useMikro, withMikro } from "../mikro/MikroContext";
import { useRekuest } from "../rekuest/RekuestContext";
import { useWidgetRegistry } from "../rekuest/widgets/widget-context";

export const MetricWidget = (props: any) => {
  const { data } = withMikro(useDetailMetricQuery)({
    variables: {
      id: props.value,
    },
  });

  return (
    <div className="grid text-white grid-cols-2">
      <div className="font-light">{data?.metric?.key}</div>
      <div className="font-light">{JSON.stringify(data?.metric?.value)}</div>
    </div>
  );
};

export const MikroWard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client, s3resolve } = useMikro();
  const { registry } = useWidgetRegistry();

  useEffect(() => {
    if (client) {
      const runFunc = (options: { query: string; variables: any }) => {
        let document = gql(options.query);
        return client
          .query({
            query: document,
            variables: options.variables,
          })
          .then((result: any) => result.data);
      };

      const resolveImage = (options: { query: string; variables: any }) => {
        let document = gql(options.query);
        return client
          .query({
            query: document,
            variables: options.variables,
          })
          .then((result: any) => result.data?.image.path)
          .then((path: string) => s3resolve(path));
      };

      const resolveHook = (hook: string | undefined | null) => {
        if (hook == "metric") {
          return (value: any) => <MetricWidget value={value} />;
        }
      };

      registry?.registerWard("mikro", {
        search: runFunc,
        resolveImage: resolveImage,
        hook: resolveHook,
      });
    }
  }, [client, registry]);

  return <>{children}</>;
};
