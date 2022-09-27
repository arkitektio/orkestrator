import React from "react";

export const SectionTitle = (props: { children: React.ReactNode }) => {
  return (
    <span className="font-light text-xl dark:text-white">{props.children}</span>
  );
};
