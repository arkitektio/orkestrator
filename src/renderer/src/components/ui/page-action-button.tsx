import { PageAction, PageActionProps } from "./page-action";

/** @deprecated Use `PageAction`, which also carries a collapse policy. */
export const PageActionButton = (props: Omit<PageActionProps, "variant">) => (
  <PageAction variant="outline" {...props} />
);
