import { request, type APIRequestContext } from "@playwright/test";

/**
 * Approve an app's sign-in the way a person would on the hub's configure page,
 * without a browser: log into lok as the user, then accept the device code
 * through lok's management API. A port of konstruktor's
 * `crates/konstruktor-core/tests/support/lok.rs` (`Lok::login`, `accept_app`).
 */
export const approveDeviceCode = async (options: {
  gatewayUrl: string;
  username: string;
  password: string;
  /** The `user_code` the app was handed (the code its approval page names). */
  userCode: string;
  /** The hub's name in lok (`hub` in `access.json`). */
  hub: string;
}): Promise<void> => {
  const base = options.gatewayUrl.replace(/\/$/, "");
  const lok = await request.newContext({ baseURL: base, maxRedirects: 0 });
  try {
    await login(lok, base, options.username, options.password);
    const pending = await graphql<{ deviceCodeByCode: { id: string } }>(
      lok,
      base,
      "query($c: String!) { deviceCodeByCode(deviceCode: $c) { id } }",
      { c: options.userCode },
    );
    const hubs = await graphql<{ hubs: { id: string; name: string }[] }>(lok, base, "{ hubs { id name } }", {});
    const hub = hubs.hubs.find((candidate) => candidate.name === options.hub);
    if (!hub) throw new Error(`lok has no hub ${options.hub}: ${JSON.stringify(hubs.hubs)}`);
    await graphql(
      lok,
      base,
      "mutation($i: AcceptDeviceCodeInput!) { acceptDeviceCode(input: $i) { id } }",
      { i: { deviceCode: pending.deviceCodeByCode.id, code: options.userCode, hub: hub.id, allowIonscale: false } },
    );
  } finally {
    await lok.dispose();
  }
};

const csrf = async (lok: APIRequestContext) =>
  (await lok.storageState()).cookies.find((cookie) => cookie.name === "csrftoken")?.value ?? "";

const login = async (lok: APIRequestContext, base: string, username: string, password: string) => {
  const page = `${base}/lok/accounts/login/`;
  await lok.get(page);
  await lok.post(page, {
    form: { csrfmiddlewaretoken: await csrf(lok), login: username, password },
    headers: { Referer: page },
  });
  const signedIn = (await lok.storageState()).cookies.some((cookie) => cookie.name === "sessionid");
  if (!signedIn) throw new Error(`${username} could not log into lok at ${base}`);
};

const graphql = async <T = unknown>(
  lok: APIRequestContext,
  base: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> => {
  const answer = await lok.post(`${base}/lok/managementgraphql/`, {
    data: { query, variables },
    headers: { "X-CSRFToken": await csrf(lok), Referer: `${base}/` },
  });
  const body = (await answer.json()) as { data?: T; errors?: unknown };
  if (body.errors || !body.data) throw new Error(`${query}: ${JSON.stringify(body)}`);
  return body.data;
};
