import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

export const AutoSubmitter = ({
  onSubmit,
  debounce = 500,
}: {
  onSubmit: (values: any) => void;
  debounce?: number;
}) => {
  const { watch, handleSubmit } = useFormContext();
  const [values, setValues] = useState<any>(null);
  const debouncedValues = useDebounce(values, debounce);

  useEffect(() => {
    // TypeScript users
    const subscription = watch(() => handleSubmit(setValues)());
    return () => subscription.unsubscribe();
  }, [handleSubmit, setValues, watch]);

  useEffect(() => {
    if (!debouncedValues) return;
    onSubmit(debouncedValues);
  }, [debouncedValues]);

  return <> </>;
};
