import { gql } from "@apollo/client";
import React, { useEffect } from "react";
import { useWidgetRegistry } from "../rekuest/widgets/widget-context";
import { useFluss } from "./fluss-context";

export const FlussWard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
}> = ({ key, children, fallback }) => {
  const { client } = useFluss();
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

      registry?.registerWard("fluss", {
        search: runFunc,
        hook: () => {
          return undefined;
        },
      });
    }
  }, [client, registry]);

  return <></>;
};
