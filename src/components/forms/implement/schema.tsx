import * as Yup from "yup";

export const implementValidationSchema = Yup.object().shape({
  engine: Yup.string()
    .lowercase("This must be a lowercase string")
    .min(2, "*Names must have at least 2 characters")
    .max(100, "*Names can't be longer than 100 characters"),
});
