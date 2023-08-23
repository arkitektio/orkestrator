export type Identifier = string;

export type Modifier = "list" | "item";

export type Accept = `${Modifier}:${Identifier}`;

export type Drop = {
  identifier: Identifier;
  id: string;
};

export type ActionEvent = {
  self: Drop;
  partners: Drop[];
  progress: (x: number) => Promise<void>;
};

export type MateOptions = {
  partners?: Drop[];
  self: Drop;
  partnersIncludeSelf: boolean;
  justSelf: boolean;
};

export type Mate = {
  action: (event: ActionEvent) => Promise<any>;
  label: React.ReactNode;
  className?: (options: { isOver: boolean }) => string | string;
  description?:
    | ((options: { self: Drop; drops: Drop[] }) => React.ReactNode)
    | React.ReactNode;
};

export type MateFinder = (options: MateOptions) => Promise<Mate[] | undefined>;
