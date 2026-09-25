import { useDialog } from "@/core/dialogs/registry";
import { MutationFunction, MutationFunctionOptions, DefaultContext, ApolloCache, FetchResult } from "@apollo/client";
import { toast } from "sonner";

export type UseGraphQLDialogOptions<TData> = {
  successMessage?: string;
  errorPrefix?: string;
  onSuccess?: (data: TData | null | undefined) => void;
};

/**
 * Wraps an Apollo mutation function so that on success it shows a toast and
 * closes the current dialog, and on failure it shows an error toast.
 *
 * @example
 * const [add] = useCreateEntityCategoryMutation({ ... });
 * const submit = useGraphQLDialog(add, { successMessage: "Entity Category created" });
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
  const { closeDialog } = useDialog();

  return (mutationOptions?) =>
    mutationFn(mutationOptions)
      .then((result) => {
        toast.success(options?.successMessage ?? "Success");
        options?.onSuccess?.(result.data);
        closeDialog();
        return result;
      })
      .catch((e: Error) => {
        toast.error((options?.errorPrefix ?? "Error") + ": " + e.message);
      });
}
