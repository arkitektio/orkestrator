import type { NetworkProbeResult } from "../../../../../../main/doctor/protocol";
import { STAGES, STAGE_LABEL, stageOf, type StageState } from "@/core/lib/arkitekt/doctor/stages";
import { cn } from "@/core/lib/utils";

/**
 * Every address that was tried, stage by stage — the raw facts behind the
 * findings, for the times the verdict is wrong or an admin asks "what did you
 * actually see?".
 */

const CELL: Record<StageState, { mark: string; className: string }> = {
  ok: { mark: "✓", className: "text-emerald-600 dark:text-emerald-400" },
  failed: { mark: "✗", className: "text-destructive" },
  skipped: { mark: "–", className: "text-muted-foreground/60" },
};

export const StageTable = ({ probes }: { probes: NetworkProbeResult[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-left text-muted-foreground/70">
          <th className="py-1 pr-3 font-normal">Address</th>
          <th className="py-1 pr-3 font-normal">Route</th>
          {STAGES.map((stage) => (
            <th key={stage} className="py-1 pr-3 font-normal">
              {STAGE_LABEL[stage]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {probes.map((probe) => {
          const { route, stages } = stageOf(probe);
          return (
            <tr key={probe.url + (probe.target.label ?? "")} className="border-t border-border/50 align-top">
              <td className="py-1 pr-3">
                <div>{probe.target.label || probe.target.host}</div>
                <div className="font-mono break-all text-muted-foreground/70">{probe.url}</div>
              </td>
              <td className="py-1 pr-3 whitespace-nowrap text-muted-foreground">
                {route === "mesh" ? "via mesh" : "direct"}
              </td>
              {STAGES.map((stage) => {
                const { state, detail } = stages[stage];
                return (
                  <td key={stage} className="py-1 pr-3">
                    <span className={cn("font-medium", CELL[state].className)} aria-label={state}>
                      {CELL[state].mark}
                    </span>
                    {detail && <span className="ml-1 font-mono text-muted-foreground">{detail}</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
