export type RunQueryFunc = (options: {
  query: string;
  variables: any;
}) => Promise<any>;

export class WardRegistry {
  ward_registry: { [ward_key: string]: RunQueryFunc };
  identifer_ward_map: { [identifier: string]: string };

  constructor() {
    this.ward_registry = {};
    this.identifer_ward_map = {};
  }

  public registerWard(ward_key: string, the_func: RunQueryFunc): void {
    this.ward_registry[ward_key] = the_func;
  }

  public setWardForIdentifier(identifer: string, ward_key: string): void {
    this.identifer_ward_map[identifer] = ward_key;
  }

  public getWardForIdentifier(identifier: string): RunQueryFunc {
    let ward_key = this.identifer_ward_map[identifier];
    console.log(ward_key, this.ward_registry);
    return this.ward_registry[ward_key] || {};
  }
}
