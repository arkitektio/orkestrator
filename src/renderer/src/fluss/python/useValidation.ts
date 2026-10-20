import {
  ManifestEntryInput,
  PythonFlowValidationFragment,
  ValidatePythonFlowDocument,
  ValidatePythonFlowQuery,
  ValidatePythonFlowQueryVariables,
} from "@/fluss/api/graphql";
import { useFluss } from "@/fluss/api/hooks";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 400;

export type ValidationState = {
  validation: PythonFlowValidationFragment | null;
  /** The current input has not been answered yet. */
  validating: boolean;
  /** The check itself failed (not the source): the server could not be asked. */
  error: unknown;
};

/**
 * The server's check of a source against its manifest, as createPythonFlow
 * would run it: re-asked a moment after the last edit, and a stale answer
 * (to an edit since superseded) is dropped.
 */
export const useValidation = (args: {
  source: string;
  manifest: ManifestEntryInput[];
  structures: string[];
  entrypoint?: string;
  /** Hold off, e.g. while the manifest is still being looked up. */
  paused?: boolean;
}): ValidationState => {
  const fluss = useFluss();
  const inputKey = JSON.stringify([args.source, args.manifest, args.structures, args.entrypoint]);
  const [answer, setAnswer] = useState<{
    key: string | null;
    validation: PythonFlowValidationFragment | null;
    error: unknown;
  }>({ key: null, validation: null, error: null });
  const latest = useRef(inputKey);

  useEffect(() => {
    latest.current = inputKey;
    if (args.paused) return;
    const timer = setTimeout(() => {
      fluss
        .query<ValidatePythonFlowQuery, ValidatePythonFlowQueryVariables>({
          query: ValidatePythonFlowDocument,
          variables: {
            input: {
              source: args.source,
              manifest: args.manifest,
              structures: args.structures,
              entrypoint: args.entrypoint ?? "main",
            },
          },
          fetchPolicy: "no-cache",
        })
        .then(({ data }) => {
          if (latest.current !== inputKey) return;
          setAnswer({ key: inputKey, validation: data.validatePythonFlow, error: null });
        })
        .catch((error: unknown) => {
          if (latest.current !== inputKey) return;
          setAnswer((previous) => ({ ...previous, key: inputKey, error }));
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fluss, inputKey, args.paused]);

  return {
    validation: answer.validation,
    validating: !args.paused && answer.key !== inputKey,
    error: answer.error,
  };
};
