import { Avatar, AvatarFallback } from "@/core/ui/avatar";
import { cn } from "@/core/util/utils";

/** "JD" for Jane Doe, "J" for jane@…: the monogram's letters. */
export const initials = (name: string | null | undefined, address: string) => {
  const words = (name?.trim() || address.split("@")[0]).split(/[\s._-]+/).filter((w) => /\p{L}/u.test(w));
  return ((words[0]?.[0] ?? "?") + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
};

/** A sender's monogram: their initials on a soft tint of the brand colour. */
export const Monogram = ({
  name,
  address,
  className,
}: {
  name?: string | null;
  address: string;
  className?: string;
}) => (
  <Avatar className={cn("size-10", className)}>
    <AvatarFallback className="bg-primary/15 text-[0.8em] font-semibold text-primary">
      {initials(name, address)}
    </AvatarFallback>
  </Avatar>
);
