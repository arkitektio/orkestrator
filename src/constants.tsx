import { buildFaktsRetrieveGrant } from "@jhnnsrs/fakts";

export const grantBuilder = (endpoint: any) => {
  return buildFaktsRetrieveGrant(
    endpoint,
    "latest",
    "github.io.jhnnsrs.orkestrator",

    window.location.origin + "/callback"
  );
};
