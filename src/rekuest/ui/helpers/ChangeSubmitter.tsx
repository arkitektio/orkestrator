import { useFormikContext } from "formik";
import { isEqual } from "lodash";
import React, { useEffect, useState } from "react";
import { Subject, Subscription } from "rxjs";
import { debounceTime } from "rxjs/operators";

const onSearch$ = new Subject();

interface ChangeSubmitHelperProps {
  debounce?: number;
}

export const ChangeSubmitHelper: React.FC<ChangeSubmitHelperProps> = (
  props
) => {
  const [lastValues, updateState] = useState<unknown | undefined>();
  const { values, initialValues, submitForm, dirty } = useFormikContext();

  useEffect(() => {
    let subscription = onSearch$
      .pipe(debounceTime(props.debounce || 0))
      .subscribe(async (debounced) => {
        await submitForm();
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log(lastValues);
    const valuesEqualLastValues = isEqual(lastValues, values);
    const valuesEqualInitialValues = values === initialValues;

    if (!valuesEqualLastValues) {
      console.log("Updating state");
      updateState(values);
    }

    if (!valuesEqualLastValues && !valuesEqualInitialValues && dirty) {
      console.log("Submitting");
      onSearch$.next(null);
    }
  }, [lastValues, values, initialValues]);

  return <></>;
};
