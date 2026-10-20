import { Badge } from "@/core/ui/badge";
import { cn } from "@/core/util/utils";
import { PythonFlowStatus, PythonRunStatus } from "@/fluss/api/graphql";

const FLOW_STATUS: Record<PythonFlowStatus, { label: string; dot: string }> = {
  [PythonFlowStatus.Draft]: { label: "Draft", dot: "bg-muted-foreground/50" },
  [PythonFlowStatus.Published]: { label: "Published", dot: "bg-green-500" },
  [PythonFlowStatus.Archived]: { label: "Archived", dot: "bg-amber-500/70" },
};

const RUN_STATUS: Record<PythonRunStatus, { label: string; dot: string }> = {
  [PythonRunStatus.Running]: { label: "Running", dot: "bg-blue-500 animate-pulse" },
  [PythonRunStatus.Completed]: { label: "Completed", dot: "bg-green-500" },
  [PythonRunStatus.Failed]: { label: "Failed", dot: "bg-red-500" },
  [PythonRunStatus.Cancelled]: { label: "Cancelled", dot: "bg-muted-foreground/50" },
};

const Pill = ({ label, dot, className }: { label: string; dot: string; className?: string }) => (
  <Badge variant="outline" className={cn("gap-1.5 rounded-full font-normal", className)}>
    <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
    {label}
  </Badge>
);

export const PythonFlowStatusBadge = ({ status, className }: { status: PythonFlowStatus; className?: string }) => (
  <Pill {...FLOW_STATUS[status]} className={className} />
);

export const PythonRunStatusBadge = ({ status, className }: { status: PythonRunStatus; className?: string }) => (
  <Pill {...RUN_STATUS[status]} className={className} />
);
