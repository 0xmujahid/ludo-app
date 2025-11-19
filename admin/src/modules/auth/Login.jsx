import { Formik, Form } from "formik";

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  styled,
  TextField,
  Typography,
} from "@mui/material";
import apiClient from "../../api/apiClient";
import { setCredentials, setLoading } from "../../store/Reducers/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LoginSchema, LoginSchemaOtp } from "../../schema/loginSchema";

import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { useState } from "react";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [details, setDetails] = useState({ phoneNumber: "", otp: "" });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const { isLoading } = useSelector((state) => state.auth);
  const isAuthenticated = !!sessionStorage.getItem("token");

  if (isAuthenticated) {
    navigate("/");
  }

  const handleSubmit = async (values) => {
    dispatch(setLoading(true));
    try {
      let phoneNumber = values.phone.startsWith("+")
        ? values.phone.slice(1)
        : values.phone;

      setDetails({ ...details, phoneNumber });
      const response = await apiClient.post("/auth/request-otp", {
        phoneNumber,
      });
      if (response.status) {
        setDetails({ ...details, phoneNumber });
        setIsOtpSent(true);
        dispatch(setLoading(false));
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleOtpLogin = async (values) => {
    dispatch(setLoading(true));
    try {
      let phoneNumber = details.phoneNumber.startsWith("+")
        ? details.phoneNumber.slice(1)
        : details.phoneNumber;
      setDetails({ ...details, phoneNumber });
      const response = await apiClient.post("/auth/verify", {
        ...details,
        phoneNumber,
        otp: values.otp,
      });
      if (response && response?.user?.role === "player") {
        alert("You are not authorized to access this resource.");
        setIsOtpSent(false);
        return;
      }
      if (response.status) {
        setDetails({ ...details, otp: values.otp });
        dispatch(setLoading(false));
      }
      console.log(response);
      dispatch(setCredentials(response));
      navigate("/users");
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const Card = styled(MuiCard)(({ theme }) => ({
    display: "flex",
    flexDirection: "column",
    alignSelf: "center",
    width: "100%",
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: "auto",
    [theme.breakpoints.up("sm")]: {
      maxWidth: "450px",
    },
    boxShadow:
      "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
    ...theme.applyStyles("dark", {
      boxShadow:
        "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
    }),
  }));

  const LogInContainer = styled(Stack)(({ theme }) => ({
    height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
    minHeight: "100%",
    padding: theme.spacing(2),
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(4),
    },
    "&::before": {
      content: '""',
      display: "block",
      position: "absolute",
      zIndex: -1,
      inset: 0,
      backgroundImage:
        "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
      backgroundRepeat: "no-repeat",
      ...theme.applyStyles("dark", {
        backgroundImage:
          "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
      }),
    },
  }));

  return (
    <LogInContainer direction="column" justifyContent="space-between">
      <Card variant="outlined">
        <Typography
          component="h1"
          variant="h4"
          sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}
        >
          Sign in
        </Typography>
        {!isOtpSent ? (
          <Formik
            initialValues={{ phone: "" }}
            enableReinitialize
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, values, setFieldValue }) => {
              return (
                <Form>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      gap: 2,
                    }}
                  >
                    <TextField
                      name="phone"
                      id="phone"
                      onChange={(e) => {
                        setFieldValue("phone", e.target.value);
                      }}
                      label="Phone Number"
                      error={touched.phone && !!errors.phone}
                      helperText={touched.phone && errors.phone}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{ alignSelf: "center" }}
                      disabled={isLoading || errors.phone}
                    >
                      {!isLoading ? "Request Otp" : "Sending Otp"}
                    </Button>
                  </Box>
                </Form>
              );
            }}
          </Formik>
        ) : (
          <Formik
            initialValues={{ otp: "" }}
            enableReinitialize
            validationSchema={LoginSchemaOtp}
            onSubmit={handleOtpLogin}
          >
            {({ errors, touched, values, setFieldValue }) => {
              return (
                <Form>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      width: "100%",
                      gap: 2,
                    }}
                  >
                    <TextField
                      name="otp"
                      id="otp"
                      inputProps={{ maxLength: 4 }}
                      onChange={(e) => {
                        setFieldValue("otp", e.target.value);
                      }}
                      label="otp"
                      error={touched.otp && !!errors.otp}
                      helperText={touched.otp && errors.otp}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      sx={{ alignSelf: "center" }}
                      disabled={isLoading || errors.otp}
                    >
                      {!isLoading ? "Login" : "Loading.."}
                    </Button>
                  </Box>
                </Form>
              );
            }}
          </Formik>
        )}
      </Card>
    </LogInContainer>
  );
};

export default Login;
