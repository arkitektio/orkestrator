import { ApolloError } from "@apollo/client";
import { toast } from "sonner";

const formatGraphQLErrorEntry = (error: ApolloError["graphQLErrors"][number]) => {
  const code = typeof error.extensions?.code === "string" ? error.extensions.code : undefined;
  const path = error.path?.length ? error.path.join(".") : undefined;
  const details = [code, path ? `path: ${path}` : undefined].filter(Boolean).join(" | ");

  return details ? `${error.message} (${details})` : error.message;
};

const formatNetworkError = (error: ApolloError) => {
  const networkError = error.networkError;

  if (!networkError) {
    return null;
  }

  const statusCode = "statusCode" in networkError ? networkError.statusCode : undefined;
  const result = "result" in networkError ? networkError.result : undefined;
  const resultMessage =
    result && typeof result === "object" && "message" in result
      ? String(result.message)
      : undefined;

  const details = [
    statusCode ? `status: ${String(statusCode)}` : undefined,
    resultMessage,
    networkError.message,
  ]
    .filter(Boolean)
    .join(" | ");

  return details || error.message;
};

export const formatApolloError = (error: unknown, service?: string) => {
  if (!(error instanceof ApolloError)) {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  const graphQlMessage = error.graphQLErrors.length
    ? error.graphQLErrors.map(formatGraphQLErrorEntry).join("; ")
    : null;
  const networkMessage = formatNetworkError(error);
  const message = graphQlMessage || networkMessage || error.message;

  return service ? `[${service}] ${message}` : message;
};

export const onApolloError = (service: string) => (error: ApolloError) => {
  console.error(error);

  const graphQlMessages = error.graphQLErrors.map(formatGraphQLErrorEntry);
  const networkMessage = formatNetworkError(error);

  if (graphQlMessages.length > 0) {
    graphQlMessages.forEach((message) => {
      toast.error(<div className="p-3">{message}</div>, {
        description: `GraphQL error on ${service}`,
      });
    });
  } else {
    toast.error(<div className="p-3">{networkMessage || error.message}</div>, {
      description: `Network error on ${service}`,
    });
  }

  return error;
};
