import { useEffect, useState } from "react";
// import { Typography, Button } from "@mui/material";
import apiClient from "../../api/apiClient";
import UserForm from "./subViews/UserForm";
import ReusableTable from "../../components/ReusableTable";
import { showNotification } from "../../store/Reducers/notificationSlice";
import { useDispatch } from "react-redux";
import {
  Button, Chip, Checkbox, Typography, Stack
} from '@mui/material';
import { Edit as EditIcon, Block as BlockIcon } from '@mui/icons-material';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("name");
  const dispatch = useDispatch();

  // const columns = [
  //   { id: "username", label: "username" },
  //   { id: "id", label: "id" },
  //   { id: "role", label: "role" },
  //   { id: "phoneNumber", label: "phoneNumber" },
  //   { id: "isVerified", label: "isVerified" },
  //   {
  //     id: "actions",
  //     label: "Actions",
  //     render: (row) => (
  //       <>
  //         <Button onClick={() => handleEditUser(row)}>Edit</Button>
  //         <Button onClick={() => handleDisableUser(row.id)}>Disable</Button>
  //       </>
  //     ),
  //   },
  // ];
  
  const formatPhoneNumber = (phone) => {
    if (!phone) return '-';
    if (phone.startsWith('91') && phone.length === 12) {
      return `+${phone.substring(0, 2)} ${phone.substring(2, 7)} ${phone.substring(7)}`;
    }
    return phone;
  };

  // Format verification status
  const renderVerificationStatus = (isVerified) => (
    <Checkbox
      checked={isVerified}
      color="primary"
      disabled
    />
  );

  // Format role display
  const renderRole = (role) => (
    <Chip 
      label={role} 
      color={
        role === 'admin' ? 'primary' : 
        role === 'player' ? 'secondary' : 'default'
      }
    />
  );

  // Table columns configuration
  const columns = [
    { 
      id: "username", 
      label: "Username",
      render: (user) => <strong>{user.username}</strong>
    },
    { 
      id: "id", 
      label: "ID",
      render: (user) => (
        <Typography variant="body2" color="textSecondary">
          {user.id.substring(0, 8)}...
        </Typography>
      )
    },
    { 
      id: "role", 
      label: "Role",
      render: (user) => renderRole(user.role)
    },
    { 
      id: "phoneNumber", 
      label: "Phone Number",
      render: (user) => formatPhoneNumber(user.phoneNumber)
    },
    { 
      id: "isVerified", 
      label: "Verified",
      render: (user) => renderVerificationStatus(user.isVerified)
    },
    {
      id: "actions",
      label: "Actions",
      render: (user) => (
        <Stack direction="row" spacing={1}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => handleEditUser(user)}
            startIcon={<EditIcon />}
          >
            Edit
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            color="error"
            onClick={() => handleDisableUser(user.id)}
            startIcon={<BlockIcon />}
          >
            Disable
          </Button>
        </Stack>
      ),
    },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

 const fetchUsers = async () => {
  try {
    const response = await apiClient.get("/admin/users");
    setUsers(response || []); 
  } catch (error) {
    console.error("API Error:", error); 
    dispatch(
      showNotification({
        message: "Failed to fetch users",
        severity: "error",
      })
    );
  }
};
  
  const handleAddUser = () => {
    setSelectedUser(null);
    setOpenForm(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setOpenForm(true);
  };

  const handleDisableUser = async (userId) => {
    try {
      await apiClient.put(`/users/${userId}/disable`);
      fetchUsers();
      dispatch(
        showNotification({
          message: "User disabled successfully",
          severity: "success",
        })
      );
    } catch (error) {
      dispatch(
        showNotification({
          message: "Failed to disable user",
          severity: "error",
        })
      );
    }
  };

const handleFormSubmit = async (userData) => {
  try {
    if (selectedUser) {
      const updatePayload = {
        username: userData.username,
        email: userData.email,
        isActive: userData.isVerified
     
      };
      await apiClient.put(`/users/${selectedUser.id}`, updatePayload);
    } else {
      // For new user registration - use the full userData
      await apiClient.post("/auth/register", userData);
    }
    setOpenForm(false);
    fetchUsers();
    dispatch(
      showNotification({
        message: "User saved successfully",
        severity: "success",
      })
    );
  } catch (error) {
    dispatch(
      showNotification({ 
        message: error.response?.data?.message || "Failed to save user", 
        severity: "error" 
      })
    );
  }
};

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = users.sort((a, b) => {
    if (order === "asc") {
      return a[orderBy] > b[orderBy] ? 1 : -1;
    } else {
      return a[orderBy] < b[orderBy] ? 1 : -1;
    }
  });

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Button variant="contained" onClick={handleAddUser} sx={{ mb: 2 }}>
        Add New User
      </Button>
      <ReusableTable
        columns={columns}
        data={sortedData}
        page={page}
        rowsPerPage={rowsPerPage}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        order={order}
        orderBy={orderBy}
        handleSort={handleSort}
      />
      <UserForm
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={handleFormSubmit}
        user={selectedUser}
      />
    </div>
  );
};

export default Users;
