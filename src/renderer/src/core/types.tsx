export type Identifier = string;
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

/**
 * What a smart component (`<MikroImage.Smart object={image}>`) is handed: the
 * module's own fragment, of which only `id` (and a `label`/`name`, as the
 * display hint) leave the module in the Structure it becomes.
 */
export type Object = {
  id: string;
  [key: string]: JSONValue;
};

/**
 * A reference to anything, the only currency that crosses a module border.
 * Identity is `identifier` + `id`, compared by value (`sameStructure`).
 * `descriptors` are what it PROVIDES (sent to rekuest to match port
 * `requires`); `label` is a display hint. See `lib/module-spec`.
 */
export type Structure = {
  identifier: Identifier;
  id: string;
  descriptors?: JSONObject;
  label?: string;
};
