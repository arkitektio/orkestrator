import Zod from "zod";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useDialogError } from "@/core/dialogs/DialogError";
import { createPortResolver } from "./portResolver";
import { ArgPort } from "./types";
import {
  buildZodSchema,
  extractErrorMessages,
  portHash,
  portToDefaults,
  pruneUnmountedPorts,
  submittedDataToRekuestFormat,
} from "./utils";

export { portHash };

/** A failed validation as one sentence: fields that are folded away or hidden still get named. */
export const validationSummary = (errors: Record<string, unknown>): string => {
  const msgs = extractErrorMessages(errors);
  if (msgs.length === 0) return "Some fields need attention.";
  if (msgs.length === 1) return msgs[0];
  return `${msgs.length} fields need attention — ${msgs.slice(0, 3).join("; ")}${msgs.length > 3 ? "…" : ""}`;
};

/**
 * Reports a failed validation where the form is: inline in a dialog
 * (`DialogErrorScope`), as an island toast elsewhere.
 */
export const useReportValidation = () => {
  const { report } = useDialogError();
  return useCallback(
    (errors: Record<string, unknown>) => report(new Error(validationSummary(errors)), "Check the form"),
    [report],
  );
};

export const usePortForm = (props: {
  ports: ArgPort[];
  overwrites?: Record<string, unknown>;
  doNotAutoReset?: boolean;
  additionalSchema?: Zod.ZodObject<Zod.ZodRawShape>;
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
  reValidateMode?: "onChange" | "onBlur" | "onSubmit";
}) => {
  const defaultValuesKey = useMemo(
    () => `${portHash(props.ports)}:${JSON.stringify(props.overwrites || {})}`,
    [props.overwrites, props.ports],
  );

  const defaultValues = useMemo(
    () => portToDefaults(props.ports, props.overwrites || {}),
    [props.overwrites, props.ports],
  );

  const lastResetKeyRef = useRef<string | null>(null);

  const resolver = useMemo(() => {
    const zodSchema = buildZodSchema(props.ports);
    // `.extend` (not `.merge`): merge throws on schemas with refinements.
    const schema = props.additionalSchema
      ? zodSchema.extend(props.additionalSchema.shape)
      : zodSchema;
    return createPortResolver(schema, props.ports);
  }, [props.additionalSchema, props.ports]);

  const reportValidation = useReportValidation();

  const { handleSubmit, ...form } = useForm({
    defaultValues,
    mode: props.mode || "onSubmit",
    reValidateMode: props.reValidateMode || "onChange",
    resolver,
  });

  const overWrittenHandleSubmit = useCallback(
    (onSubmit: (data: Record<string, unknown>) => void) => {
      return handleSubmit(
        (data) => {
          const additionalData = Object.keys(data).reduce((acc, key) => {
            if (props.additionalSchema?.shape[key]) {
              acc[key] = data[key];
            }
            return acc;
          }, {} as Record<string, unknown>);

          onSubmit({
            ...pruneUnmountedPorts(
              submittedDataToRekuestFormat(data, props.ports),
              props.ports,
              resolver.mountedNames(),
            ),
            ...additionalData,
          });
        },
        (errors) => {
          reportValidation(errors as Record<string, unknown>);
        },
      );
    },
    [handleSubmit, props.additionalSchema, props.ports, resolver, reportValidation],
  );

  useEffect(() => {
    if (props.doNotAutoReset) return;
    if (lastResetKeyRef.current === defaultValuesKey) return;

    lastResetKeyRef.current = defaultValuesKey;
    form.reset(defaultValues);
  }, [defaultValues, defaultValuesKey, form, props.doNotAutoReset]);

  return { ...form, handleSubmit: overWrittenHandleSubmit };
};
