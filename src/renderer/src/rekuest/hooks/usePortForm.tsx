import Zod from "zod";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createPortResolver } from "../widgets/portResolver";
import { ArgPort } from "../widgets/types";
import {
  buildZodSchema,
  extractErrorMessages,
  portHash,
  portToDefaults,
  pruneUnmountedPorts,
  submittedDataToRekuestFormat,
} from "../widgets/utils";

export { portHash };

const reportSubmitErrors = (errors: Record<string, unknown>) => {
  const msgs = extractErrorMessages(errors);
  if (msgs.length === 0) toast.error("Please check the form for errors.");
  else if (msgs.length === 1) toast.error(msgs[0]);
  else
    toast.error(
      `${msgs.length} validation errors — ${msgs.slice(0, 3).join("; ")}${msgs.length > 3 ? "…" : ""}`,
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
          reportSubmitErrors(errors as Record<string, unknown>);
        },
      );
    },
    [handleSubmit, props.additionalSchema, props.ports, resolver],
  );

  useEffect(() => {
    if (props.doNotAutoReset) return;
    if (lastResetKeyRef.current === defaultValuesKey) return;

    lastResetKeyRef.current = defaultValuesKey;
    form.reset(defaultValues);
  }, [defaultValues, defaultValuesKey, form, props.doNotAutoReset]);

  return { ...form, handleSubmit: overWrittenHandleSubmit };
};
