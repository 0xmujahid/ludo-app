import * as Yup from "yup";

export const LoginSchema = Yup.object().shape({
  phone: Yup.string()
    .required("Phone number is required")
    .test(
      "phone",
      "Please enter a valid phone number",
      value => /^(\+?\d{1,4}[\s-]?)?(\(?\d{2,3}\)?[\s-]?)?[\d\s-]{4,}$/.test(value)
    )
  // otp: Yup.string().required("OTP is required"),
});
export const LoginSchemaOtp = Yup.object().shape({
  
  otp: Yup.string().required("OTP is required").min(4).max(4),
});