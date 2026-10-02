import { ApolloError } from "@apollo/client";

/**
 * What stands between a form and its assign, as the dry run sees it: the
 * dependencies anywhere in the tree that are not met yet.
 */
export const DependencyTreeNotice = ({
  tree,
}: {
  tree: {
    satisfied?: boolean;
    unmet: { path: string[]; reason: string }[];
    error?: ApolloError;
  };
}) => {
  if (tree.error) {
    return (
      <p className="text-xs text-muted-foreground mb-2">
        The dependency tree could not be previewed ({tree.error.message}); the assign itself will tell.
      </p>
    );
  }
  if (tree.satisfied !== false) return null;
  return (
    <div className="text-xs text-destructive mb-2">
      {tree.unmet.length === 0 && "A dependency is not met yet."}
      {tree.unmet.map(({ path, reason }) => (
        <p key={path.join("/")}>
          <span className="font-medium">{path.join(" › ")}</span>: {reason}
        </p>
      ))}
    </div>
  );
};
