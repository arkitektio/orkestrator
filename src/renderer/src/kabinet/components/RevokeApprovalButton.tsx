import { useHasRoles } from "@/core/connection/roles";
import { useSelf } from "@/core/connection/useSelf";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { ShieldOff } from "lucide-react";
import React from "react";

/**
 * Open the revoke dialog for one approval, which withdraws it and revokes the
 * lok mandate behind it. The same dialog the `revoke-approval` local action
 * opens; this is the visible way to it on a page. Shown to whom kabinet lets
 * revoke: the approver or a Kabinet admin (cosmetic, kabinet decides).
 */
export const RevokeApprovalButton = ({
  approval,
  size = "sm",
  variant = "outline",
  className,
  label = "Revoke",
}: {
  approval: { id: string; revokedAt?: string | null; approver: { sub: string } };
  size?: "sm" | "default" | "lg";
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  label?: React.ReactNode;
}) => {
  const { openDialog } = useDialog();
  const { userId } = useSelf();
  const admin = useHasRoles(["kabinet_admin"]);

  if (approval.revokedAt || (approval.approver.sub !== userId && !admin)) return null;

  return (
    <Button
      size={size}
      variant={variant}
      className={cn("rounded-full", className)}
      onClick={(e) => {
        e.stopPropagation();
        openDialog("revokeapproval", { ids: [approval.id] }, { size: "small" });
      }}
    >
      <ShieldOff />
      {label}
    </Button>
  );
};
