import Handlebars from "handlebars";
import { useEffect, useState } from "react";

function replaceVariablesWithNames(template: string) {
  // This regular expression captures Handlebars expressions {{ variable }}
  let regex = /\{\{([^\{\}]+)\}\}/g;

  return template.replace(regex, function (match, variableName) {
    // Remove any whitespace and return the variable name
    return variableName.trim();
  });
}

function replaceUndefinedValuesWithKeyName(obj) {
  for (let key in obj) {
    if (obj[key] === undefined || obj[key] === null) {
      obj[key] = key;
    }
  }
  return obj;
}

export const NodeDescription = (props: {
  description: string;
  variables?: { [key: string]: any };
}) => {
  const [template, setTemplate] =
    useState<HandlebarsTemplateDelegate<any> | null>(null);
  const [text, setText] = useState<string>(
    replaceVariablesWithNames(props.description)
  );

  useEffect(() => {
    if (props.description) {
      const template = Handlebars.compile(props.description);
      setTemplate(template);
    }
  }, [props.description]);

  useEffect(() => {
    if (props.description) {
      if (props.variables) {
        const template = Handlebars.compile(props.description);
        const newText = template(
          replaceUndefinedValuesWithKeyName({ ...props.variables })
        );
        setText(newText);
      }
    }
  }, [props.variables, props.variables]);

  return <>{text}</>;
};
