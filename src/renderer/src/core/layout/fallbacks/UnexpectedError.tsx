import { Bug } from "lucide-react";
import type { ReactNode } from "react";
import { StatusPage, type StatusPageProps } from "./StatusPage";

const describeError = (error: unknown): { message: string; technical: string | null } => {
  if (error instanceof Error) {
    return { message: error.message, technical: error.stack ?? `${error.name}: ${error.message}` };
  }
  if (typeof error === "string") return { message: error, technical: null };
  return { message: "Unknown error", technical: null };
};

/**
 * Something failed that nobody planned for: a render that threw, a query the
 * server answered with an error we cannot name.
 *
 * Router-free on purpose (the buttons come in as `actions`): the outermost
 * boundary renders it where there is no shell and no tab.
 */
export const UnexpectedError = ({
  error,
  title = "Something went wrong",
  description = "An unexpected error occurred while showing this page. Your data is safe: this is a problem in the app, not with your account.",
  technical,
  actions,
  variant,
}: {
  error?: unknown;
  title?: ReactNode;
  description?: ReactNode;
  /** Overrides the stack as the "Technical details" block. */
  technical?: string | null;
  actions?: ReactNode;
  variant?: StatusPageProps["variant"];
}) => {
  const described = describeError(error);
  return (
    <StatusPage
      variant={variant}
      tone="destructive"
      icon={Bug}
      eyebrow="Error"
      title={title}
      description={description}
      hints={[
        <>Try again: many of these are transient.</>,
        <>If it happens every time, report it; the details below go along.</>,
      ]}
      actions={actions}
      details={[{ label: "Error", value: described.message, mono: true }]}
      technical={technical ?? described.technical}
    />
  );
};

export default UnexpectedError;
