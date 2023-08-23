import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import React, { useEffect } from "react";
import { useMikroNext } from "../mikro_next/MikroNextContext";
import result from "../mikro_next/api/fragments";

export const MikroNextAutoConfigure: React.FC<{}> = (props) => {
  const { configure } = useMikroNext();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (token && fakts.mikro_new) {
      configure({
        secure: fakts.mikro_new.secure,
        datalayer: fakts.mikro_new.datalayer,
        wsEndpointUrl: fakts.mikro_new.ws_endpoint_url,
        endpointUrl: fakts.mikro_new.endpoint_url,
        possibleTypes: result.possibleTypes,
        retrieveToken: () => token,
      });
    }
    else {
      configure(undefined);
    }
  }, [token, fakts]);

  return <> </>;
};
