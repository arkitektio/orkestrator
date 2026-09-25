import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import Timestamp from "@/core/components/ui/timestamp";
import { useActionDescription } from "@/core/lib/ports/ActionDescription";
import {
  ActionOverviewFragment,
  DetailActionFragment,
} from "@/rekuest/api/graphql";
import { actionsBrowseLink } from "@/rekuest/lib/actionBrowse";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * Title block of the action page. It renders from `DetailAction` right away
 * and fills in what only the overview query carries (purity flags, definedAt,
 * protocol ids for the chip links) once that arrives.
 */
export const ActionHeader = ({
  action,
  overview,
}: {
  action: DetailActionFragment;
  overview?: ActionOverviewFragment;
}) => {
  const description = useActionDescription({
    description: action.description || "",
  });
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(action.hash || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Chips link by protocol id, which DetailAction does not select.
  const protocols = overview?.protocols ?? [];
  const collections = overview?.collections ?? action.collections;

  return (
    <div className="mb-6">
      <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <Link
          to={actionsBrowseLink({ app: action.app.identifier })}
          className="hover:underline"
        >
          {action.app.identifier}
        </Link>
        <span>v{action.version}</span>
        {overview?.definedAt && (
          <span className="inline-flex gap-1">
            defined <Timestamp date={overview.definedAt} relative />
          </span>
        )}
      </div>

      <h1 className="mt-1 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        {action.name}
      </h1>

      {description && (
        <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
          {description}
        </p>
      )}

      <div className="mt-4 flex flex-row flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{action.kind.toLowerCase()}</Badge>
        {action.stateful && <Badge variant="secondary">stateful</Badge>}
        {overview?.pure && <Badge variant="secondary">pure</Badge>}
        {overview?.idempotent && <Badge variant="secondary">idempotent</Badge>}
        {overview?.isDev && <Badge variant="outline">dev</Badge>}

        {protocols.map((protocol) => (
          <Link key={protocol.id} to={actionsBrowseLink({ protocol: protocol.id })}>
            <Badge variant="outline" className="hover:bg-muted">
              {protocol.name}
            </Badge>
          </Link>
        ))}
        {collections.map((collection) => (
          <Link
            key={collection.id}
            to={actionsBrowseLink({ collection: collection.name })}
          >
            <Badge variant="outline" className="hover:bg-muted">
              {collection.name}
            </Badge>
          </Link>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 font-mono text-xs text-muted-foreground"
          onClick={copyHash}
          title="Copy the action hash"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {String(action.hash).slice(0, 10)}
        </Button>
      </div>
    </div>
  );
};
