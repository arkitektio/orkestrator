import type { SmartContextProps } from "@/core/smart/extensions/types";

/**
 * A run whose partner is only a suggestion (`SmartContextProps.askPartner`),
 * as the assign form's props: the objects' keys filled and hidden, the
 * partner's key a DEFAULT — the action's latest run wins over it, so the
 * channel someone ran it with last time comes back. Null when the run is not
 * one of these (not asked, or no partner): it goes the usual way.
 */
export const askPartnerForm = (
  action: { args: ReadonlyArray<{ key: string }> },
  run: SmartContextProps,
  keys: Record<string, unknown>,
): { args: Record<string, unknown>; hidden: Record<string, unknown>; defaults: Record<string, unknown> } | null => {
  if (!run.askPartner || !run.partners?.length) return null;
  const partnerKey = action.args.at(1)?.key;
  if (!partnerKey || !(partnerKey in keys)) return null;
  const { [partnerKey]: partner, ...fixed } = keys;
  return { args: fixed, hidden: fixed, defaults: { [partnerKey]: partner } };
};
