import { gql } from "@apollo/client";
import { useKluster } from "@jhnnsrs/kluster";
import { useEffect } from "react";
import { useWidgetRegistry } from "../rekuest/widgets/widget-context";

export const KlusterWard: React.FC<{
  key?: string;
  fallback?: React.ReactNode;
}> = ({ key, fallback }) => {
  const { client } = useKluster();
  const { registry } = useWidgetRegistry();

  useEffect(() => {
    if (client && registry) {
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

      registry?.registerWard(key || "kluster", {
        search: runFunc,
        hook: (x) => () => <div>Hallo</div>
      });
    }
  }, [client, registry]);

  return <></>;
};
