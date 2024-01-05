import { gql } from "@apollo/client";
import { useOmeroArk } from "@jhnnsrs/omero-ark";
import { useEffect } from "react";
import { useWidgetRegistry } from "../rekuest/widgets/widget-context";

export const OmeroArkWard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
}> = ({ key, fallback }) => {
  const { client } = useOmeroArk();
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
          .then((result: any) => {
            console.log(result.data);
            return result.data;
          });
      };

      registry?.registerWard(key || "omero-ark", {
        search: runFunc,
        hook: (x) => () => <div>Hallo</div>
      });
    }
  }, [client, registry]);

  return <></>;
};
