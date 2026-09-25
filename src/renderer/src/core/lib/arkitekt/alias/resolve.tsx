import { Alias, Instance } from "../fakts/faktsSchema";
import { fetchWithTimeout } from "../utils";
import { aliasToHttpPath } from "./helpers";

/** The caller gave up: that ends the walk, unlike an alias that did not answer. */
const cancelled = (controller: AbortController): Error =>
  controller.signal.reason instanceof Error
    ? controller.signal.reason
    : new DOMException("The alias check was cancelled", "AbortError");

/**
 * Does this alias answer its challenge? A network error or a timeout is an
 * answer too — "no" — so a caller can move on to the next alias rather than
 * treating one unreachable address as the service being down. Only the
 * caller's own cancel throws.
 */
export const checkAliasHealth = async (
  alias: Alias,
  timeout: number,
  controller: AbortController,
): Promise<boolean> => {
  const url = aliasToHttpPath(alias, alias.challenge);
  try {
    const response = await fetchWithTimeout(url, { timeout, controller });
    if (!response.ok) console.warn(`[alias] ${url} answered ${response.status}`);
    return response.ok;
  } catch (error) {
    if (controller.signal.aborted) throw cancelled(controller);
    console.warn(`[alias] ${url} did not answer:`, error instanceof Error ? error.message : error);
    return false;
  }
};

/** The first of the instance's aliases that answers, in the order fakts lists them. */
export const resolveWorkingAlias = async ({
  instance,
  timeout = 5000,
  controller,
}: {
  instance: Instance;
  timeout?: number;
  controller: AbortController;
}): Promise<Alias> => {
  for (const alias of instance.aliases) {
    if (await checkAliasHealth(alias, timeout, controller)) return alias;
  }
  throw new Error(`No working alias found for service: ${instance.service}`);
};
