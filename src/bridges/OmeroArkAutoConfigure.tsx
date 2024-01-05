import { useFakts } from "@jhnnsrs/fakts";
import { useHerre } from "@jhnnsrs/herre";
import { useOmeroArk } from "@jhnnsrs/omero-ark";
import React, { useEffect } from "react";
import result from "../omero-ark/api/fragments";

export const OmeroArkAutoConfigure: React.FC<{}> = (props) => {
  const { configure } = useOmeroArk();
  const { token } = useHerre();
  const { fakts } = useFakts();

  useEffect(() => {
    if (token && fakts.omero_ark) {
      configure({
        secure: fakts.omero_ark.secure,
        wsEndpointUrl: fakts.omero_ark.ws_endpoint_url,
        endpointUrl: fakts.omero_ark.endpoint_url,
        possibleTypes: result.possibleTypes,
        retrieveToken: () => token,
      });
    }
  }, [token, fakts]);

  return <> </>;
};
