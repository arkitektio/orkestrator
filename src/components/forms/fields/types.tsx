export type CommonFieldProps<T extends any> = {
  name: string;
  accepts?: string[];
  validate?: (
    value: T | undefined
  ) => undefined | string | Promise<string | undefined>;
};
