import { buildFaktsRetrieveGrant } from "@jhnnsrs/fakts";

export const grantBuilder = (endpoint: any) => {
  return buildFaktsRetrieveGrant(endpoint, {
    version: "latest",
    identifier: "github.io.jhnnsrs.orkestrator",
  });
};
