export type FieldProps = {
  name: string;
  label?: string;
  description?: string;
  /**
   * @deprecated Never applied: port forms always use a resolver, which makes
   * react-hook-form skip field rules. Validation lives in
   * `rekuest/widgets/portResolver.ts`. Kept only so non-port callers compile.
   */
  validate?: (v: any, values: any) => string | undefined;
};
