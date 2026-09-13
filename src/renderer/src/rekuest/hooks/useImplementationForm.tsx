import { useCallback, useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Zod from "zod";
import { DetailImplementationFragment, ListDependencyFragment, ResolvedDependencyInput } from "../api/graphql";
import { createPortResolver } from "../widgets/portResolver";
import {
  buildZodSchema,
  extractErrorMessages,
  portHash,
  portToDefaults,
  pruneUnmountedPorts,
  submittedDataToRekuestFormat,
} from "../widgets/utils";

export { portHash };

const buildDependenciesSchema = (
  dependencies: ListDependencyFragment[],
) => {
  const resolvedDepSchema = Zod.object({
    autoResolve: Zod.boolean().optional(),
    key: Zod.string(),
    mappedAgents: Zod.array(
      Zod.object({
        agent: Zod.string(),
        key: Zod.string(),
      }),
    ),
  });

  // No dependencies defined — allow anything
  if (dependencies.length === 0) {
    return Zod.array(resolvedDepSchema).default([]);
  }

  return Zod.array(resolvedDepSchema)
    .default([])
    .superRefine((resolved, ctx) => {
      const resolvedArr = resolved ?? [];

      for (const dep of dependencies) {
        const entry = resolvedArr.find((r) => r.key === dep.key);
        const agentCount = entry?.mappedAgents?.length ?? 0;
        const isAutoResolving = entry?.autoResolve === true;

        // If auto-resolvable and user opted into auto-resolve, skip agent count checks
        if (dep.autoResolvable && isAutoResolving) continue;
        // If auto-resolvable and no entry at all, also skip (backend can handle)
        if (dep.autoResolvable && !entry) continue;

        // Must be set (either agents or autoResolve)
        if (agentCount === 0 && !isAutoResolving) {
          ctx.addIssue({
            code: Zod.ZodIssueCode.custom,
            message: `Requires at least one agent${dep.autoResolvable ? ", or enable auto-resolve" : ""}.`,
            path: [dep.key],
          });
          continue;
        }

        // Check singular — only one agent allowed
        if (dep.singular && agentCount > 1) {
          ctx.addIssue({
            code: Zod.ZodIssueCode.custom,
            message: `Singular dependency — only one agent allowed, but ${agentCount} were provided.`,
            path: [dep.key],
          });
        }

        // Check minViableInstances
        if (dep.minViableInstances != null && agentCount < dep.minViableInstances) {
          ctx.addIssue({
            code: Zod.ZodIssueCode.custom,
            message: `Requires at least ${dep.minViableInstances} agent(s), but only ${agentCount} provided.`,
            path: [dep.key],
          });
        }

        // Check maxViableInstances
        if (dep.maxViableInstances != null && agentCount > dep.maxViableInstances) {
          ctx.addIssue({
            code: Zod.ZodIssueCode.custom,
            message: `Allows at most ${dep.maxViableInstances} agent(s), but ${agentCount} provided.`,
            path: [dep.key],
          });
        }
      }
    });
};

export const useImplementationForm = (props: {
  implementation?: DetailImplementationFragment;
  overwrites?: { [key: string]: unknown };
  presetDependencies?: ResolvedDependencyInput[] ;
  doNotAutoReset?: boolean;
  additionalSchema?: Zod.ZodObject<Zod.ZodRawShape>;
  mode?: "onChange" | "onBlur" | "onSubmit" | "onTouched" | "all";
  reValidateMode?: "onChange" | "onBlur" | "onSubmit";
}) => {
  const args = props.implementation?.action.args;
  const hash = portHash(args || []);
  const overwritesKey = JSON.stringify(props.overwrites || {});
  const presetKey = JSON.stringify(props.presetDependencies || []);

  const buildDefaults = useCallback(
    () => ({
      args: portToDefaults(args || [], props.overwrites || {}),
      dependencies: props.presetDependencies || [],
    }),
    // The JSON keys stand in for the identity of the (often inline) objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hash, overwritesKey, presetKey],
  );

  const resolver = useMemo(() => {
    const zodSchema = Zod.object({
      args: buildZodSchema(args || []),
      dependencies: buildDependenciesSchema(props.implementation?.dependencies || []),
    });
    return createPortResolver(zodSchema, args || [], {
      portsPath: ["args"],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, props.implementation?.dependencies]);

  const { handleSubmit, ...form } = useForm({
    defaultValues: buildDefaults(),
    mode: props.mode || "onSubmit",
    reValidateMode: props.reValidateMode || "onChange",
    resolver,
  });

  const overWrittenHandleSubmit = useCallback(
    (onSubmit: any) => {
      return handleSubmit(
        (data) => {
          onSubmit({
            args: pruneUnmountedPorts(
              submittedDataToRekuestFormat(data.args || {}, args || []),
              args || [],
              resolver.mountedNames(),
              ["args"],
            ),
            dependencies: data.dependencies,
          });
        },
        (errors) => {
          const msgs = extractErrorMessages(errors as Record<string, any>);
          if (msgs.length === 0) toast.error("Please check the form for errors.");
          else if (msgs.length === 1) toast.error(msgs[0]);
          else toast.error(`${msgs.length} validation errors — ${msgs.slice(0, 3).join("; ")}${msgs.length > 3 ? "…" : ""}`);
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleSubmit, hash, resolver],
  );

  const lastResetKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (props.doNotAutoReset) return;
    const key = `${hash}:${overwritesKey}:${presetKey}`;
    if (lastResetKeyRef.current === key) return;
    lastResetKeyRef.current = key;
    form.reset(buildDefaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, overwritesKey, presetKey, props.doNotAutoReset]);

  return { ...form, handleSubmit: overWrittenHandleSubmit };
};
