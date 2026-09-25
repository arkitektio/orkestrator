import { cn } from "@/core/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
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

export const DetailPaneDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof CardDescription>) => {
  return <CardDescription {...props} className={cn("", className)} />;
};

export const DetailPaneContent = ({
  className,
  ...props
}: React.ComponentProps<typeof CardContent>) => {
  return <CardContent {...props} className={cn("", className)} />;
};
