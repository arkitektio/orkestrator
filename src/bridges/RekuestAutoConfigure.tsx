import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import React, { useEffect } from "react";
import { useRekuest } from "../rekuest";
import result from "../rekuest/api/fragments";

export const RekuestAutoConfigure: React.FC<{}> = (props) => {
  const { configure } = useRekuest();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (token && fakts.rekuest) {
      configure({
        secure: fakts.rekuest.secure,
        wsEndpointUrl: fakts.rekuest.ws_endpoint_url,
        agent: fakts.rekuest.agent,
        postman: fakts.rekuest.postman,

        endpointUrl: fakts.rekuest.endpoint_url,
        possibleTypes: result.possibleTypes,
        retrieveToken: () => token,
      });
    } else {
      configure(undefined);
    }
  }, [token, fakts]);

  return <> </>;
};
