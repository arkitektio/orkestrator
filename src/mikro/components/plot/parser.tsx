import {
  Datum,
  Keyword,
  keywords,
  Parser,
  parsers,
  reducers,
  Reducer,
  Group,
  QueryData,
  PlotTree,
  ParsingDatum,
  Schema,
  Axis,
} from "./types";

export const isObject = (x: any): x is object => {
  return typeof x === "object" && x !== null && !Array.isArray(x);
};

export const isArray = (x: any): x is Array<any> => {
  return Array.isArray(x);
};

export const guardObject = (value: any): object => {
  if (isObject(value)) {
    return value;
  }
  console.error(value);
  throw new Error(`Not an object found ${value}`);
};

export const guardArray = (value: any): Array<any> => {
  if (isArray(value)) {
    return value;
  }
  console.error(value);
  throw new Error(`Not an array found ${value}`);
};

export const guardValueNumber = (
  da: Partial<ParsingDatum>,
  key: string
): ParsingDatum<number> => {
  if (typeof da.value === "number") {
    return da as ParsingDatum<number>;
  }
  console.error(da);
  throw new Error(`${key} Not an value number found ${da}`);
};

const valueIsKeyword = (key: string): key is Keyword =>
  keywords.includes(key as Keyword);

const valueIsReducer = (key: string): key is Reducer =>
  reducers.includes(key as Reducer);

const valueIsParser = (key: string): key is Parser =>
  parsers.includes(key as Parser);

const parse = (
  key: Parser,
  value: string | number
): { value: string | number | Date; parser: string } | null => {
  switch (key) {
    case "DATE":
      return { value: new Date(value), parser: "DATE" };
    case "FLOAT":
      return { value: parseFloat(value.toString()), parser: "FLOAT" };
    case "INT":
      return { value: parseInt(value.toString()), parser: "INT" };
    case "STRING":
      return { value: value.toString(), parser: "STRING" };
    case "OBJECT":
      if (isObject(value)) {
        let x = guardObject(value);
        let d = extractDatum(x);
        return { value: d.value | null, parser: d.parser || "OBJECT" };
      } else {
        return null;
      }
    default:
      throw Error(`Parser ${key} not found`);
  }
};

const extractKeyFromModifiers = (modifiers: string[]) => {
  if (modifiers.includes("AS")) {
    return modifiers
      .slice(modifiers.indexOf("AS") + 1, modifiers.length)
      .join(" ");
  }
  throw new Error("No AS found. Needed here");
};

export type ReducerFunction = (
  values: Partial<ParsingDatum>[],
  key: string
) => Partial<ParsingDatum>;

const get_reducer = (key: Reducer): ReducerFunction => {
  switch (key) {
    case "AVG":
      return (values: Partial<ParsingDatum>[], key) => {
        let avg =
          values
            .map((x, index) => guardValueNumber(x, key + "[" + index + "]"))
            .reduce((a, b) => a + b.value, 0) / values.length;
        return { value: avg };
      };
    case "COUNT":
      return (values: Partial<ParsingDatum>[], key) => {
        return { value: values.length };
      };
    case "MAX":
      return (values: Partial<ParsingDatum>[], key) => {
        let max = Math.max(
          ...values
            .map((x, index) => guardValueNumber(x, key + "[" + index + "]"))
            .map((v) => v.value)
        );
        return { value: max };
      };
    case "MIN":
      return (values: Partial<ParsingDatum>[], key) => {
        let min = Math.min(
          ...values
            .map((x, index) => guardValueNumber(x, key + "[" + index + "]"))
            .map((v) => v.value)
        );
        return { value: min };
      };
    case "SUM":
      return (values: Partial<ParsingDatum>[], key) => {
        let sum = values
          .map((x, index) => guardValueNumber(x, key + "[" + index + "]"))
          .reduce((a, b) => a + b.value, 0);
        return { value: sum };
      };
    default:
      throw new Error(`Reducer ${key} not found`);
  }
};

export const extractDatum = (
  value: any,
  basename?: string | number | undefined
): Partial<ParsingDatum> => {
  let partial_datum: Partial<ParsingDatum> = {};
  //console.log("Extracting Datum", value);

  if (isObject(value)) {
    let entries = Object.entries(value);
    for (let [subkey, value] of entries) {
      if (subkey === "__typename") {
        continue;
      }
      let [keyword, ...modifiers] = subkey.split("_");

      console.log(keyword, subkey, value);
      if (valueIsKeyword(keyword)) {
        if (keyword === "TYPE") {
          partial_datum.type = value as string;
        }
        if (keyword === "KEY" || keyword === "NAME") {
          partial_datum.key = value as string;
        }
        if (keyword === "OBJECT") {
          partial_datum.object = value as string;
        }
        if (keyword === "VALUE") {
          if (!modifiers.includes("FROM")) {
            throw new Error(
              `Datum at ${basename}: No FROM for value found. Needed here`
            );
          }
          let parsing = modifiers[modifiers.indexOf("FROM") + 1];
          if (valueIsReducer(parsing)) {
            let array = guardArray(value);
            let parray = array.map((x, index) =>
              extractDatum(x, basename + "[" + index + "]")
            );

            let reducer = get_reducer(parsing);
            partial_datum.value = reducer(parray, basename as string).value;
            partial_datum.parser = "FLOAT";
            partial_datum.reducer = parsing;
          } else if (valueIsParser(parsing)) {
            let parsed_value = parse(parsing, value);
            partial_datum.parser = parsed_value?.parser;
            partial_datum.value = parsed_value?.value;
          } else {
            throw new Error(
              `Datum at ${basename}: No parser found. Needed here specify VALUE_FROM_...`
            );
          }
        }
      } else {
        throw new Error(
          `Datum at ${basename}: ${subkey} is not a keyword. Please only use Keywords in your query`
        );
      }
    }
  } else {
    throw new Error(`Datum at ${basename}`);
  }

  return partial_datum;
};

export const extractData = (
  dataarray: any,
  basename?: string | number | undefined
): { data: Datum[]; schema: Schema } => {
  let data: Datum[] = [];

  let axisMap: { [key: string]: Partial<Axis> } = {};

  let schema: Schema = { axis: [] };

  if (isArray(dataarray)) {
    for (let datumobject of dataarray) {
      console.log(dataarray, datumobject);
      if (isObject(datumobject)) {
        let datumentries = Object.entries(datumobject);

        let flatdata: Datum = {};

        for (let [datumkey, datumvalue] of datumentries) {
          if (datumkey === "__typename") continue;
          let [keyword, ...modifiers] = datumkey.split("_");
          console.log(keyword, datumkey, datumvalue);

          if (valueIsKeyword(keyword)) {
            if (keyword === "FLATDATUM") {
              let flatdatumkey = extractKeyFromModifiers(modifiers);
              if (!(flatdatumkey in axisMap)) {
                axisMap[flatdatumkey] = { key: flatdatumkey };
              }
              if (modifiers.includes("TYPE")) {
                axisMap[flatdatumkey].type =
                  datumvalue || axisMap[flatdatumkey].type;
              } else if (modifiers.includes("OBJECT")) {
                flatdata[`${flatdatumkey}_object`] =
                  (datumvalue as any) || flatdata[`${flatdatumkey}_object`];
              } else if (modifiers.includes("VALUE")) {
                if (!modifiers.includes("FROM")) {
                  throw new Error(
                    `Datum at ${basename}: No FROM for value found. Needed here`
                  );
                }
                let parsing = modifiers[modifiers.indexOf("FROM") + 1];
                if (valueIsReducer(parsing)) {
                  let array = guardArray(datumvalue);
                  let parray = array.map((x, index) =>
                    extractDatum(x, basename + "[" + index + "]")
                  );

                  let reducer = get_reducer(parsing);
                  flatdata[`${flatdatumkey}_value`] =
                    reducer(parray, basename as string).value ||
                    flatdata[`${flatdatumkey}_value`];
                  axisMap[flatdatumkey].reducer = parsing;
                } else if (valueIsParser(parsing)) {
                  let parsed_value = parse(parsing, datumvalue);

                  axisMap[flatdatumkey].parser = parsed_value?.parser;
                  flatdata[`${flatdatumkey}_value`] = parsed_value?.value;
                } else {
                  throw new Error(
                    `Datum at ${basename}: No parser found. Needed here specify VALUE_FROM_...`
                  );
                }
              } else {
                throw new Error(
                  `Data at ${basename}: Unknown modifier for FLATDATUM ${modifiers}`
                );
              }
            }
            if (keyword === "DATUMS") {
              if (isArray(datumvalue)) {
                datumvalue.forEach((subvalue: any, index) => {
                  let object = guardObject(subvalue);
                  let partial_datum = extractDatum(
                    object,
                    basename + "->" + datumkey + "[" + index + "]"
                  );
                  let subdatumkey = partial_datum.key;
                  if (!subdatumkey) {
                    throw new Error("No key found. Needed here");
                  }
                  flatdata[`${subdatumkey}_value`] =
                    partial_datum.value || flatdata[`${subdatumkey}_value`];
                  flatdata[`${subdatumkey}_object`] =
                    partial_datum.object || flatdata[`${subdatumkey}_object`];

                  if (subdatumkey in axisMap) {
                    axisMap[subdatumkey].type =
                      partial_datum.type || axisMap[subdatumkey].type;
                    axisMap[subdatumkey].reducer =
                      partial_datum.reducer || axisMap[subdatumkey].reducer;
                    axisMap[subdatumkey].parser =
                      partial_datum.parser || axisMap[subdatumkey].parser;
                  } else {
                    axisMap[subdatumkey] = {
                      type: partial_datum.type as string,
                      reducer: partial_datum.reducer,
                      parser: partial_datum.parser,
                    };
                  }
                });
              } else {
                throw new Error(
                  `Data at ${basename}: No array found. Needed here`
                );
              }
            }

            if (keyword === "DATUM") {
              let subdatumkey = extractKeyFromModifiers(modifiers);
              let partial_datum: Partial<ParsingDatum> = { key: subdatumkey };

              if (modifiers.includes("FIRST")) {
                let array = guardArray(datumvalue);
                if (array.length > 0) {
                  partial_datum = {
                    ...partial_datum,
                    ...extractDatum(
                      array[0],
                      basename + "->" + subdatumkey + "[" + 0 + "]"
                    ),
                  };
                } else {
                  console.warn("No FIRST found for datum", subdatumkey);
                }
              } else if (modifiers.includes("SUM")) {
                let array = guardArray(datumvalue);
                let sum = array
                  .map((x, index) =>
                    extractDatum(
                      x,
                      basename + "->" + datumkey + "[" + index + "]"
                    )
                  )
                  .map(guardValueNumber)
                  .reduce((acc, x) => acc + x.value || 0, 0);
                partial_datum = {
                  ...partial_datum,
                  value: sum,
                  reducer: "SUM",
                };
              } else {
                if (datumvalue) {
                  partial_datum = {
                    ...partial_datum,
                    ...extractDatum(datumvalue, basename + "->" + subdatumkey),
                  };
                }
              }

              flatdata[`${subdatumkey}_value`] =
                partial_datum.value || flatdata[`${subdatumkey}_value`];
              flatdata[`${subdatumkey}_object`] =
                partial_datum.object || flatdata[`${subdatumkey}_object`];
              if (subdatumkey in axisMap) {
                axisMap[subdatumkey].type =
                  partial_datum.type || axisMap[subdatumkey].type;
                axisMap[subdatumkey].reducer =
                  partial_datum.reducer || axisMap[subdatumkey].reducer;
                axisMap[subdatumkey].parser =
                  partial_datum.parser || axisMap[subdatumkey].parser;
              } else {
                axisMap[subdatumkey] = {
                  type: partial_datum.type as string,
                  reducer: partial_datum.reducer,
                  parser: partial_datum.parser,
                };
              }
            }
          }
        }
        console.log(flatdata);
        data.push(flatdata);
      } else {
        throw new Error(
          `Data at ${basename}: is not an object. Please only use objects in your query`
        );
      }
    }
  } else {
    throw new Error("Not an array found at");
  }

  schema.axis = Object.entries(axisMap).map(([key, value]) => ({
    key: key,
    ...value,
  }));

  return { data, schema };
};

export const delegateGroup = (groupvalue: any, basename?: string): Group => {
  let group: Partial<Group> = { name: basename };

  let groups: Group[] = [];

  let object = guardObject(groupvalue);

  let entries = Object.entries(object);
  //console.log("Extracting group", value);
  for (let [subkey, value] of entries) {
    if (subkey === "__typename") continue;
    let [keyword, ...modifiers] = subkey.split("_");
    //console.log(keyword, subkey, value);

    if (valueIsKeyword(keyword)) {
      if (keyword === "NAME") {
        group.name = value as string;
      }
      if (keyword === "TYPE") {
        group.type = value as string;
      }
      if (keyword === "OBJECT") {
        group.object = value as string;
      }
      if (keyword === "GROUP") {
        let omit = modifiers.includes("OMIT");
        let group: Partial<Group> = { omit };

        if (isArray(value)) {
          if (modifiers.includes("FIRST")) {
            groups.push({
              ...group,
              ...delegateGroup(value[0], basename + "->" + subkey),
            });
          } else if (modifiers.includes("HYPER")) {
            let hypergroups = value.map((x, index) =>
              delegateGroup(x, basename + "->" + subkey + "[" + index + "]")
            );
            let hypername = extractKeyFromModifiers(modifiers);

            groups.push({
              ...group,
              name: hypername,
              groups: hypergroups,
            });
          } else {
            throw new Error(
              `Group at ${basename}: ${subkey} is array but now modifiers to extract group found. Please specify FIRST or HYPER or use GROUPS for multiple groups`
            );
          }
        } else if (isObject(value)) {
          groups.push({
            ...group,
            ...delegateGroup(value, basename + "->" + subkey),
          });
        } else {
          throw new Error(
            `Group at ${basename}: ${subkey} must be an array or object`
          );
        }
      }
      if (keyword === "GROUPS") {
        if (isArray(value)) {
          let subgroups = value.map((x, index) =>
            delegateGroup(x, basename + "->" + subkey + "[" + index + "]")
          );
          for (let group of subgroups) {
            groups.push(group);
          }
        } else {
          throw new Error(`Group at ${basename}: ${subkey} must be an array`);
        }
      }
      if (keyword === "DATA") {
        let { data, schema } = extractData(value, basename + "->" + subkey);
        group.data = data;
        group.schema = schema;
      }
    } else {
      throw new Error(
        `Group at ${basename}: ${subkey} is not a keyword. Please only use Keywords in your query`
      );
    }
  }

  if (group.name === undefined) {
    throw new Error(`Group at ${basename} was not sufficiently defined`);
  } else {
    return { ...group, groups: groups } as Group;
  }

  // Vanilla Group definition
};

export const parseQueryData = (data: QueryData): PlotTree => {
  let t = { omit: true, ...delegateGroup(data, "BASE") };
  return t;
};
