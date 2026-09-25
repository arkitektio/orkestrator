import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PortConstraint = {
  key: string;
  operator: string;
  value?: any;
};

const formatValue = (value: any) => {
  if (value === null || value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export const PortConstraintBadges = ({
  items,
  className,
}: {
  items?: PortConstraint[] | null;
  className?: string;
}) => {
  if (!items?.length) return null;

  return (
    <div className={cn("flex flex-row flex-wrap gap-1", className)}>
      {items.map((c, index) => (
        <Badge
          key={index}
          variant="outline"
          className="text-[10px] font-mono font-light text-muted-foreground"
        >
          {c.key} {c.operator.toLowerCase().replace(/_/g, " ")}{" "}
          {formatValue(c.value)}
        </Badge>
      ))}
    </div>
  );
};

export default PortConstraintBadges;
