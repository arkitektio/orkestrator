import {
  ActionKind,
  ActionSignatureByHashDocument,
  ActionSignatureByHashQuery,
  ActionSignatureByHashQueryVariables,
  AllActionsDocument,
  AllActionsQuery,
  AllActionsQueryVariables,
  ListActionFragment,
} from "@/rekuest/api/graphql";
import { useRekuest } from "@/rekuest/api/hooks";
import { useCallback } from "react";
import { ManifestAction, SignaturePort } from "./manifest";

const toManifestAction = (action: ActionSignatureByHashQuery["action"]): ManifestAction => ({
  id: action.id,
  hash: action.hash,
  name: action.name,
  description: action.description,
  kind: action.kind,
  key: action.key,
  version: action.version,
  app: action.app ? { identifier: action.app.identifier } : null,
  args: action.args as unknown as SignaturePort[],
  returns: action.returns as unknown as SignaturePort[],
});

/**
 * rekuest as a Python flow's manifest needs it: an action's signature by
 * hash (`null` when rekuest does not know it), and the function actions whose
 * name matches what is being typed. Callers sit inside a `RekuestGuard`.
 */
export const useRekuestActions = () => {
  const rekuest = useRekuest();

  const resolve = useCallback(
    async (hash: string): Promise<ManifestAction | null> => {
      try {
        const { data } = await rekuest.query<ActionSignatureByHashQuery, ActionSignatureByHashQueryVariables>({
          query: ActionSignatureByHashDocument,
          variables: { hash },
          fetchPolicy: "cache-first",
        });
        return data?.action ? toManifestAction(data.action) : null;
      } catch {
        return null;
      }
    },
    [rekuest],
  );

  const search = useCallback(
    async (text: string, limit = 8): Promise<readonly ListActionFragment[]> => {
      try {
        const { data } = await rekuest.query<AllActionsQuery, AllActionsQueryVariables>({
          query: AllActionsDocument,
          variables: { filters: { search: text, kind: ActionKind.Function }, pagination: { limit } },
          fetchPolicy: "cache-first",
        });
        return data?.actions ?? [];
      } catch {
        return [];
      }
    },
    [rekuest],
  );

  return { resolve, search };
};
