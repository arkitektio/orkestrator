import { gql } from "@apollo/client";
import React, { useEffect } from "react";
import { useRekuest } from "../rekuest/RekuestContext";
import { useWidgetRegistry } from "../rekuest/widgets/widget-context";

export const RekuestWard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
}> = ({ key, fallback }) => {
  const { client } = useRekuest();
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

      const resolveHook = (hook: string | undefined | null) => {
        if (hook == "metric") {
          return () => <> </>;
        }
      };

      const ward = {
        search: runFunc,
        hook: resolveHook,
      };

      registry?.registerWard("rekuest", ward);
    }
  }, [client, registry]);

  return <></>;
};
