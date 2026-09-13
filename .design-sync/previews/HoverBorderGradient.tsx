import { HoverBorderGradient } from 'orkestrator';
import { Zap, ArrowRight } from 'lucide-react';

export function Default() {
  return (
    <HoverBorderGradient containerClassName="rounded-md" className="px-4 py-2 text-sm font-medium">
      Get started
    </HoverBorderGradient>
  );
}

export function WithIcon() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      <HoverBorderGradient containerClassName="rounded-md" className="px-4 py-2 text-sm font-medium flex items-center gap-2">
        <Zap style={{ width: 14, height: 14 }} />
        Upgrade plan
      </HoverBorderGradient>
      <HoverBorderGradient containerClassName="rounded-md" className="px-4 py-2 text-sm font-medium flex items-center gap-2">
        Deploy now
        <ArrowRight style={{ width: 14, height: 14 }} />
      </HoverBorderGradient>
    </div>
  );
}
