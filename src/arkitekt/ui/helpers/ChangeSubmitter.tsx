import { isEqual } from "lodash";
import React, { useEffect, useState } from "react";
import { Subject, Subscription } from "rxjs";
import { debounceTime } from "rxjs/operators";

const onSearch$ = new Subject();

interface ChangeSubmitHelperProps {
  formik: any;
  onChange?: any;
  debounce?: number;
}

export const ChangeSubmitHelper: React.FC<ChangeSubmitHelperProps> = (
  props
) => {
  const [lastValues, updateState] = useState(props.formik.values);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (!subscription) {
      setSubscription(
        onSearch$
          .pipe(debounceTime(props.debounce || 0))
          .subscribe((debounced) => props.formik.submitForm())
      );
    }
  }, [subscription]);

  useEffect(() => {
    const valuesEqualLastValues = isEqual(lastValues, props.formik.values);
    const valuesEqualInitialValues =
      props.formik.values === props.formik.initialValues;

    if (!valuesEqualLastValues) {
      updateState(props.formik.values);
    }

    if (!valuesEqualLastValues && !valuesEqualInitialValues) {
      onSearch$.next(null);
    }
  }, [
    lastValues,
    props.formik.values,
    props.formik.initialValues,
    props.onChange,
    props.formik,
  ]);

  return null;
};
