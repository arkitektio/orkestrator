import { useField } from "formik";
import { useEffect } from "react";
import { useFilePicker } from "use-file-picker";
import { Alert } from "../Alert";
import { wrapped } from "./Wrapper";
import { CommonFieldProps } from "./types";

export type FieldInputProps = CommonFieldProps<File> & {
  multiple?: boolean;
  accept?: string | string[];
};

export const FileField = (props: FieldInputProps) => {
  const [field, meta, { setValue }] = useField({
    name: props.name,
    validate: props.validate,
  });

  const [openFileSelector, { filesContent, plainFiles }] = useFilePicker({
    accept: props.accept || ".*",
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
  );
};

export const FileInputField = wrapped(FileField);
