import { Label } from "@/core/ui/label";

export const FieldBlock = ({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-sm font-medium">{label}</Label>
    {description && <p className="-mt-1 text-xs text-muted-foreground">{description}</p>}
    {children}
  </div>
);
