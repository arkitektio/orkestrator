/**
 * The coordination server's own base URL, from the session's fakts endpoint.
 *
 * The endpoint is lok's fakts route on that server — `https://host/lok/f/`, or
 * `https://host/prefix/lok/f/` behind a prefix — so the server is what is left
 * once that route is taken off. It is NOT the `datalayer` service fakts
 * hands out: lok's own media (avatars, logos) lives in the store the
 * coordination server fronts at its base path.
 *
 * Returned without a trailing slash, ready for `${base}/${bucket}`.
 */
export const coordinationBase = (endpointBaseUrl: string): string => {
  const url = new URL(endpointBaseUrl);
  const path = url.pathname.replace(/\/lok\/f\/?$/, "").replace(/\/+$/, "");
  return `${url.origin}${path}`;
};
