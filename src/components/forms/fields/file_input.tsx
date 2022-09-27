import { useField } from "formik";
import React, { useEffect } from "react";
import { useFilePicker } from "use-file-picker";
import { Alert } from "../Alert";

interface Props {
  name: string;
  label: string;
  description?: string;
  placeholder?: string;
  multiple?: boolean;
}

export const FileInputField: React.FC<Props> = (props) => {
  const [field, meta, { setValue }] = useField(props);

  const [openFileSelector, { filesContent, plainFiles }] = useFilePicker({
    accept: ".*",
    multiple: props.multiple || false,
  });

  useEffect(() => {
    if (plainFiles) {
      if (!props.multiple) {
        setValue(plainFiles[0]);
        console.log(plainFiles[0]);
      } else {
        setValue(plainFiles);
        console.log(plainFiles);
      }
    }
  }, [plainFiles, props.multiple]);

  return (
    <div>
      <label className="font-light" htmlFor={props.name}>
        {props.label}
      </label>
      <div className="w-full mt-2 mb-2 relative">
        <div
          className="w-fit border border-gray-800 rounded px-2 py-1 focus:border-blue cursor-pointer shadow-md hover:bg-slate-200 focus:shadow"
          onClick={() => openFileSelector()}
        >
          Upload{" "}
          {filesContent.map((file) => (
            <>{file.name}</>
          ))}
        </div>
        {meta.touched && meta.error && (
          <Alert prepend="Error" message={meta.error} />
        )}
      </div>
      {props.description && (
        <div
          id={`${props.name}-help`}
          className="text-xs text-gray-600 mb-4 font-light"
        >
          {props.description}
        </div>
      )}
    </div>
  );
};
