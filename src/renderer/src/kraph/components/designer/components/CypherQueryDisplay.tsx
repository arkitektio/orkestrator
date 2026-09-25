import { Button } from "@/core/components/ui/button";
import { Card } from "@/core/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/core/components/ui/collapsible";
import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CypherQueryDisplayProps {
  query: string;
  title?: string;
}

export const CypherQueryDisplay = ({
  query,
  title = "Generated Cypher Query",
}: CypherQueryDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  // Clear the pending copy-reset timer on unmount to avoid a setState-after-unmount.
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(query);
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-3 border-b flex items-center justify-between">
          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <div className="font-semibold text-sm">{title}</div>
          </CollapsibleTrigger>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-8 px-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
        <CollapsibleContent>
          <div className="p-3">
            <pre className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto max-h-96 overflow-y-auto select-text">
              {query}
            </pre>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
