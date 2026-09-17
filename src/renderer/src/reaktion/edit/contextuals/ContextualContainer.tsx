import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const ContextualContainer: React.FC<{
  active: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties | undefined;
}> = ({ ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow dark:border-gray-700 border-gray-400",
        "absolute translate-x-[-50%] z-50 p-2 max-w-[200px] text-xs bg-sidebar flex flex-col opacity-70 data-[found=true]:opacity-100 shadow-xl shadow-xl dark:shadow-xl dark:shadow-xl",
      )}
      data-found={props.active}
      style={props.style}
    >
      {props.children}
    </motion.div>
  );
};
