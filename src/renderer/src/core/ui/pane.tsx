import { cn } from "@/core/util/utils";
import {
  Card,
  CardHeader,
  CardTitle,
} from "./card";

export const DetailPane = ({
  className,
  ...props
}: React.ComponentProps<typeof Card>) => {
  return <Card {...props} className={cn("", className)} />;
};

export const DetailPaneHeader = ({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) => {
  return <CardHeader {...props} className={cn("", className)} />;
};

export const DetailPaneTitle = ({
  className,
  children,
  actions,
  ...props
}: React.ComponentProps<typeof CardTitle> & { actions?: React.ReactNode }) => {
  return (
    <CardTitle
      {...props}
      className={cn(
        "flex text-xl flex-row justify-between w-full truncate ellipsis",
        className,
      )}
    >
      <div className="flex-grow">{children}</div>
      <div>{actions}</div>
    </CardTitle>
  );
};
