/** The `code` and `state` a provider redirect carries, from a pasted URL or query string. */
export const parseRedirect = (text: string): { code: string; state: string } | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let params: URLSearchParams;
  try {
    params = new URL(trimmed).searchParams;
  } catch {
    params = new URLSearchParams(trimmed.replace(/^[^?]*\?/, ""));
  }
  const code = params.get("code");
  const state = params.get("state");
  return code && state ? { code, state } : null;
};
