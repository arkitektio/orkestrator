import { buildSmart } from "@/core/smart/builder";

// The app-wide barrel of smart objects. Each module builds its own from its
// manifest (`<module>/linkers.tsx`); only host-owned models are declared here.
export * from "@/alpaka/linkers";
export * from "@/bank/linkers";
export * from "@/dokuments/linkers";
export * from "@/elektro/linkers";
export * from "@/fluss/linkers";
export * from "@/kabinet/linkers";
export * from "@/kraph/linkers";
export * from "@/lok/linkers";
export * from "@/lovekit/linkers";
export * from "@/mikro/linkers";
export * from "@/omeroark/linkers";
export * from "@/rekuest/linkers";

export const BlokBlok = buildSmart({
  identifier: "@blok/blok",
  path: "blok/bloks",
  name: "Blok",
});

export const PortPod = buildSmart({
  identifier: "@port-next/pod",
  path: "port-next/pod",
  name: "Pod (Port)",
});

export const PortDefinition = buildSmart({
  identifier: "@port-next/definition",
  path: "port-next/definition",
  name: "Definition (Port)",
});
