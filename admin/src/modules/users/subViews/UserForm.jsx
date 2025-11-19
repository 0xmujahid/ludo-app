import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";

const UserSchema = Yup.object().shape({
  username: Yup.string().required("Username is required"), // changed from name to username
  email: Yup.string().email("Invalid email").required("Email is required"),
  phoneNumber: Yup.string().required("Phone number is required"),
});

const UserForm = ({ open, onClose, onSubmit, user }) => {
  const initialValues = user || { username: "", email: "", phoneNumber: "" }; // changed from name to username

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{user ? "Edit User" : "Add New User"}</DialogTitle>
      <Formik
        initialValues={initialValues}
        validationSchema={UserSchema}
        onSubmit={onSubmit}
      >
        {({ errors, touched }) => (
          <Form>
            <DialogContent>
              <Field
                name="username"  // changed from name to username
                as={TextField}
                label="Username"  // updated label
                fullWidth
                margin="normal"
                error={touched.username && !!errors.username}
                helperText={touched.username && errors.username}
              />
              <Field
                name="email"
                as={TextField}
                label="Email"
                fullWidth
                margin="normal"
                error={touched.email && !!errors.email}
                helperText={touched.email && errors.email}
              />
              <Field
                name="phoneNumber"
                as={TextField}
                label="Phone"
                fullWidth
                margin="normal"
                error={touched.phoneNumber && !!errors.phoneNumber}
                helperText={touched.phoneNumber && errors.phoneNumber}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>Cancel</Button>
              <Button type="submit">Save</Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default UserForm;