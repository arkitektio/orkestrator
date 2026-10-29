import type { ShortcutBindingsInput } from "../api/graphql";

/** A binding rule: every field that is set must be the caller's; an empty one matches anyone. */
export type ShortcutBindingValues = {
  users: string[];
  app?: string | null;
  client?: string | null;
  device?: string | null;
};

export const EMPTY_BINDING: ShortcutBindingValues = { users: [], app: null, client: null, device: null };

/** The rule as the server takes it: one binding per user, or one for every user when none. */
export const toBindingInput = (values: ShortcutBindingValues): ShortcutBindingsInput => ({
  users: values.users?.length ? values.users : null,
  app: values.app || null,
  client: values.client || null,
  device: values.device || null,
});

/** The rule read back as one sentence, so an empty one says it pins for everyone. */
export const describeBinding = (values: ShortcutBindingValues): string => {
  const users = values.users?.length ?? 0;
  const who = users === 0 ? "everyone in the organization" : users === 1 ? "1 member" : `${users} members`;
  const where = [
    values.app ? `in ${values.app}` : null,
    values.client ? "on the chosen client" : null,
    values.device ? "on the chosen device" : null,
  ].filter(Boolean);
  return `Pinned for ${who}${where.length ? `, ${where.join(", ")}` : ", wherever they work"}.`;
};
