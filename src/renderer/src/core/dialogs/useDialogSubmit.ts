import { useDialogError } from "@/core/dialogs/DialogError";
import { useDialog } from "@/core/dialogs/registry";
import { isAbort, toast } from "@/core/notify";
import { useCallback, useRef, useState } from "react";

export type DialogSubmitOptions<R> = {
  /** After the work succeeded, before the dialog closes. */
  onSuccess?: (result: R) => void;
  /**
   * A toast once it worked — only for an effect the user cannot see ("Invite
   * sent"). Where the result appears (a list refreshes, the page navigates to
   * it) the dialog closing is the confirmation: leave this out.
   */
  successMessage?: string;
  /** The headline of the inline error: "Couldn't create the folder". */
  errorTitle?: string;
  /** Close the dialog on success. Default true. */
  close?: boolean;
};

/**
 * A dialog's submit: runs `fn`, and on success closes the dialog; on failure
 * keeps it open and shows the reason in it (`DialogErrorScope`). `fn` throws
 * to fail — a mutation rejects on its own, since the module wrappers no
 * longer swallow errors.
 *
 * @example
 * const [create] = useCreateFolderMutation();
 * const { submit, submitting } = useDialogSubmit((data: FormValues) =>
 *   create({ variables: { input: data } }),
 * );
 * <form onSubmit={form.handleSubmit(submit)}>
 */
export const useDialogSubmit = <A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options: DialogSubmitOptions<R> = {},
) => {
  const { closeDialog } = useDialog();
  const { report, clear } = useDialogError();
  const [submitting, setSubmitting] = useState(false);
  const latest = useRef({ fn, options });
  latest.current = { fn, options };

  const submit = useCallback(
    async (...args: A): Promise<R | undefined> => {
      clear();
      setSubmitting(true);
      try {
        const result = await latest.current.fn(...args);
        const { onSuccess, successMessage, close = true } = latest.current.options;
        onSuccess?.(result);
        if (successMessage) toast.success(successMessage);
        if (close) closeDialog();
        return result;
      } catch (error) {
        if (!isAbort(error)) report(error, latest.current.options.errorTitle);
        return undefined;
      } finally {
        setSubmitting(false);
      }
    },
    [clear, report, closeDialog],
  );

  return { submit, submitting };
};
