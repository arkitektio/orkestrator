import { reportError } from "@/core/notify";
import { useCopyToClipboard } from "@/core/ui/copy-button";
import { cn } from "@/core/util/utils";
import {
  AgentFragment,
  useAgentForProtocolLazyQuery,
} from "@/rekuest/api/graphql";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { protocolAgentToPythonString } from "./protocolAgentToPythonString";

/**
 * Copies the agent as a Python protocol, a quiet link-sized control for the
 * agent's Info tab. The protocol is fetched on click (it is a deep query the
 * page does not need), so a failed fetch is reported; the copy confirms on
 * the control itself, like every `CopyButton`.
 */
export const CopyAgentPythonButton = (props: { agent: AgentFragment; className?: string }) => {
  const { copy, copied } = useCopyToClipboard();
  const [loading, setLoading] = useState(false);
  const [fetchProtocol] = useAgentForProtocolLazyQuery();

  const handleCopy = async () => {
    setLoading(true);
    try {
      const result = await fetchProtocol({ variables: { id: props.agent.id } });
      if (!result.data?.agent) throw result.error ?? new Error("The agent's protocol came back empty");
      await copy(protocolAgentToPythonString(result.data.agent));
    } catch (error) {
      reportError(error, "Couldn't copy the agent as Python");
    } finally {
      setLoading(false);
    }
  };

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50",
        props.className,
      )}
    >
      <Icon className="size-3" />
      {copied ? "Copied" : loading ? "Loading…" : "Copy as Python"}
    </button>
  );
};
