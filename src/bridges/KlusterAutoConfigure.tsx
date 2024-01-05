import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import { useKluster } from "@jhnnsrs/kluster";
import React, { useEffect } from "react";
import result from "../omero-ark/api/fragments";

export const KlusterAutoConfigure: React.FC<{}> = (props) => {
  const { configure } = useKluster();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (token && fakts.kluster) {
      configure({
        secure: fakts.kluster.secure,
        wsEndpointUrl: fakts.kluster.ws_endpoint_url,
        endpointUrl: fakts.kluster.endpoint_url,
        possibleTypes: result.possibleTypes,
        retrieveToken: () => token,
      });
    }
  }, [token, fakts]);

  return <> </>;
};
