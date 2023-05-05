export type CommonFieldProps<T extends any> = {
  name: string;
  validate?: (
    value: T | undefined
  ) => undefined | string | Promise<string | undefined>;
};
