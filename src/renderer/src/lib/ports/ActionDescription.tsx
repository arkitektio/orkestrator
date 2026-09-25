import Handlebars from "handlebars";
import { useMemo } from "react";
import { Control, FieldValues, useWatch } from "react-hook-form";

function replaceVariablesWithNames(implementation: string) {
  // This regular expression captures Handlebars expressions {{ variable }}
  const regex = /\{\{([^\{\}]+)\}\}/g;

  return implementation.replace(regex, function (_match, variableName) {
    // Remove any whitespace and return the variable name
    return variableName.trim();
  });
}

function replaceUndefinedValuesWithKeyName(obj: any) {
  for (const key in obj) {
    if (obj[key] === undefined || obj[key] === null) {
      obj[key] = key;
    }
  }
  return obj;
}

// Compiling a Handlebars template parses and code-generates; the description
// text rarely changes while the variables change on every keystroke, so cache
// the compiled template per description.
const compiledTemplates = new Map<string, HandlebarsTemplateDelegate>();
const compileDescription = (description: string) => {
  let template = compiledTemplates.get(description);
  if (!template) {
    template = Handlebars.compile(description);
    compiledTemplates.set(description, template);
  }
  return template;
};

// `description` is nullable on the wire (graph nodes and actions may carry
// none), so an absent description renders as empty rather than throwing.
export const useActionDescription = (props: {
  description?: string | null;
  variables?: { [key: string]: any };
}) => {
  return useMemo(() => {
    if (!props.description) return "";
    if (props.variables) {
      return compileDescription(props.description)(
        replaceUndefinedValuesWithKeyName({ ...props.variables }),
      );
    }
    return replaceVariablesWithNames(props.description);
  }, [props.description, props.variables]);
};

export const ActionDescription = (props: {
  description?: string | null;
  variables?: { [key: string]: any };
}) => {
  const text = useActionDescription(props);
  return <>{text}</>;
};

/**
 * An `ActionDescription` fed by the live values of a react-hook-form form.
 *
 * Use this instead of `form.watch()` in the form component: watching the whole
 * form there rerenders every widget on every keystroke, whereas this leaf only
 * rerenders itself.
 */
export const FormActionDescription = (props: {
  description?: string | null;
  control: Control<FieldValues>;
}) => {
  const variables = useWatch({ control: props.control });
  return <ActionDescription description={props.description} variables={variables} />;
};
