import React from "react";

export const SectionTitle = (props: { children: React.ReactNode }) => {
  return (
    <span className="font-light text-xl dark:text-white mb-2 mt-1">
      {props.children}
    </span>
  );
};
