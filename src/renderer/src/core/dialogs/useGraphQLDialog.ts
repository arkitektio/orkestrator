import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { MutationFunction, MutationFunctionOptions, DefaultContext, ApolloCache, FetchResult } from "@apollo/client";

export type UseGraphQLDialogOptions<TData> = {
  /** Only for an effect the user cannot see; see `useDialogSubmit`. */
  successMessage?: string;
  /** The headline of the inline error: "Couldn't create the folder". */
  errorTitle?: string;
  onSuccess?: (data: TData | null | undefined) => void;
};

/**
 * `useDialogSubmit` for one Apollo mutation: on success it closes the current
 * dialog, on failure the dialog stays open with the reason in it.
 *
 * @example
 * const [add] = useCreateEntityCategoryMutation({ ... });
 * const submit = useGraphQLDialog(add, { errorTitle: "Couldn't create the category" });
 * // submit({ variables: { input: data } })
 */
export function useGraphQLDialog<
  TData,
  TVariables,
  TContext = DefaultContext,
  TCache extends ApolloCache<any> = ApolloCache<any>,
>(
  mutationFn: MutationFunction<TData, TVariables, TContext, TCache>,
  options?: UseGraphQLDialogOptions<TData>,
): (mutationOptions?: MutationFunctionOptions<TData, TVariables, TContext, TCache>) => Promise<FetchResult<TData> | void> {
  const { submit } = useDialogSubmit(
    (mutationOptions?: MutationFunctionOptions<TData, TVariables, TContext, TCache>) => mutationFn(mutationOptions),
    {
      successMessage: options?.successMessage,
      errorTitle: options?.errorTitle,
      onSuccess: (result) => options?.onSuccess?.(result.data),
    },
  );
  return submit;
}
