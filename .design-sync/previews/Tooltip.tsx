import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
  Button,
} from 'orkestrator';
import { Play, RotateCcw, Trash2, Settings } from 'lucide-react';

export function ActionTooltips() {
  return (
    <TooltipProvider>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, paddingTop: 48, paddingBottom: 16 }}>
        {/* Primary tooltip shown open */}
        <Tooltip defaultOpen>
          <TooltipTrigger asChild>
            <Button size="sm">
              <Play size={13} />
              Run workflow
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Execute the workflow with current inputs
          </TooltipContent>
        </Tooltip>

        {/* Row of icon buttons with tooltips */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <RotateCcw size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Retry last run</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <Settings size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Configure</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <Trash2 size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
