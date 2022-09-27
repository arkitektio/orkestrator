import { useFormikContext } from "formik";
import React from "react";
import { ThreeDots } from "react-loader-spinner";

export type SubmitButtonProps = {
  className: string;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
};

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  className,
  ref,
  ...props
}) => {
  const { submitForm, isValid, isSubmitting, dirty } = useFormikContext();

  return (
    <button type="submit" disabled={!isValid} className={className} ref={ref}>
      {isSubmitting ? (
        <ThreeDots color="#00BFFF" height={20} width={20} />
      ) : (
        props.children
      )}
    </button>
  );
};
