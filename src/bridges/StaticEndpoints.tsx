import { FaktsEndpoint, introspectUrl } from "@jhnnsrs/fakts";
import { useEffect } from "react";
import { useEndpoints } from "../providers/endpoints/EndpointsProvider";

export const StaticEndpoints = (props: {
  endpoints: string[];
  timeout?: number;
}) => {
  const { setEndpoints } = useEndpoints();

  let introSpectAll = async () => {
    let endpoints: FaktsEndpoint[] = [];

    for (let endpoint of props.endpoints) {
      try {
        let introspected = await introspectUrl(endpoint, props.timeout || 2000);
        endpoints.push(introspected);
      } catch (e) {
        console.error(e);
      }
    }
    return endpoints;
  };

  useEffect(() => {
    introSpectAll().then((endpoints) => {
      setEndpoints((oldendpoint) => [...oldendpoint, ...endpoints]);
    });
  }, [props.endpoints]);

  return <></>;
};
