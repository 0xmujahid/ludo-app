import React, { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import ReusableTable from "../../components/ReusableTable";
import { showNotification } from "../../store/Reducers/notificationSlice";
import { useDispatch } from "react-redux";
import { Button, Typography, Stack, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box } from '@mui/material';

interface Config {
  id: number;
  name: string;
  tds: number;
  fee: number;
  cashback: number;
  status: boolean;
  referralAmount?: number;
  email?: string | null;
  telegram?: string | null;
  whatsapp?: string | null;
  twoPlayer?: number[];
  threePlayer?: number[];
  fourPlayer?: number[];
  createdAt?: string;
  updatedAt?: string;
}

const Settings = () => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [payments, setpayments] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("id");
  const [openDialog, setOpenDialog] = useState(false);
const [currentConfig, setCurrentConfig] = useState<Config | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const dispatch = useDispatch();
  

  const initialFormState: Partial<Config> & {
    name: string;
    tds: number;
    fee: number;
    cashback: number;
    status: boolean;
    referralAmount: number;
    email: string;
    telegram: string;
    whatsapp: string;
    twoPlayer: number[];
    threePlayer: number[];
    fourPlayer: number[];
  } = {
    name: "",
    tds: 0,
    fee: 0,
    cashback: 0,
    status: true,
    referralAmount: 0,
    email: "",
    telegram: "",
    whatsapp: "",
    twoPlayer: [0, 0],
    threePlayer: [0, 0, 0],
    fourPlayer: [0, 0, 0, 0]
  };

  const [formData, setFormData] = useState(initialFormState);

  const columns = [
    {
      id: "id", 
      label: "ID",
      render: (configs) => (
        <Typography variant="body2" color="textSecondary">
          {configs.id}
        </Typography>
      )
    },
    { 
      id: "name", 
      label: "Name",
      render: (row) => (
        <Typography variant="body1">
          {row.name?.charAt(0).toUpperCase() + row.name?.slice(1)}
        </Typography>
      )
    },
    { 
      id: "tds", 
      label: "TDS (%)",
      render: (row) => (
        <Typography variant="body1">
          {row.tds}%
        </Typography>
      )
    },
    { 
      id: "fee", 
      label: "Fee (%)",
      render: (row) => (
        <Typography variant="body1">
          {row.fee}%
        </Typography>
      )
    },
    { 
      id: "cashback", 
      label: "Cashback (%)",
      render: (row) => (
        <Typography variant="body1">
          {row.cashback}%
        </Typography>
      )
    },
    {
      id: "referralAmount",
      label: "Referral Amount",
      render: (row) => (
        <Typography variant="body1">{row.referralAmount ?? 0}</Typography>
      )
    },
    { 
      id: "status", 
      label: "Status",
      render: (row) => (
        <Checkbox
          checked={row.status}
          color="primary"
          disabled
        />
      )
    },
    {
      id: "twoPlayer",
      label: "Two Player (%)",
      render: (row) => (
        <Typography variant="body1">{(row.twoPlayer ?? []).join(" / ")}</Typography>
      )
    },
    {
      id: "threePlayer",
      label: "Three Player (%)",
      render: (row) => (
        <Typography variant="body1">{(row.threePlayer ?? []).join(" / ")}</Typography>
      )
    },
    {
      id: "fourPlayer",
      label: "Four Player (%)",
      render: (row) => (
        <Typography variant="body1">{(row.fourPlayer ?? []).join(" / ")}</Typography>
      )
    },
    {
      id: "email",
      label: "Email",
      render: (row) => (
        <Typography variant="body1">{row.email ?? "-"}</Typography>
      )
    },
    {
      id: "telegram",
      label: "Telegram",
      render: (row) => (
        <Typography variant="body1">{row.telegram ?? "-"}</Typography>
      )
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      render: (row) => (
        <Typography variant="body1">{row.whatsapp ?? "-"}</Typography>
      )
    },
    {
      id: "createdAt",
      label: "Created At",
      render: (row) => (
        <Typography variant="body2" color="textSecondary">
          {row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}
        </Typography>
      )
    },
    {
      id: "updatedAt",
      label: "Updated At",
      render: (row) => (
        <Typography variant="body2" color="textSecondary">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}
        </Typography>
      )
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <Stack direction="row" spacing={1}>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => handleOpenEditDialog(row)}
          >
            Edit
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            color="error"
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </Button>
        </Stack>
      ),
    },
  ];

  const fetchConfigs = async () => {
    try {
      const response = await apiClient.get("/admin/configs");
      if (response) {
        setConfigs(response as any);
      }
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: "Failed to fetch configs",
          severity: "error",
        })
      );
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchpayments = async () => {
    try {
      const response = await apiClient.get("admin/payments/transactions ");
      if (response) {
        setpayments(response as any);
        console.log("response",response)
      }
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: "Failed to fetch configs",
          severity: "error",
        })
      );
    }
  };

  useEffect(() => {
    fetchpayments();
  }, []);

  const handleOpenAddDialog = () => {
    setIsEditing(false);
    setCurrentConfig(null);
    setFormData(initialFormState);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (config: Config) => {
    setIsEditing(true);
    setCurrentConfig(config);
    setFormData({
      name: config.name,
      tds: config.tds,
      fee: config.fee,
      cashback: config.cashback,
      status: config.status,
      referralAmount: config.referralAmount ?? 0,
      email: config.email ?? "",
      telegram: config.telegram ?? "",
      whatsapp: config.whatsapp ?? "",
      twoPlayer: config.twoPlayer && config.twoPlayer.length ? [...config.twoPlayer] : [0, 0],
      threePlayer: config.threePlayer && config.threePlayer.length ? [...config.threePlayer] : [0, 0, 0],
      fourPlayer: config.fourPlayer && config.fourPlayer.length ? [...config.fourPlayer] : [0, 0, 0, 0]
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    // Handle array inputs like twoPlayer_0, threePlayer_1, fourPlayer_2
    if (name.includes("_")) {
      const [key, indexStr] = name.split("_");
      const index = Number(indexStr);
      if (["twoPlayer", "threePlayer", "fourPlayer"].includes(key)) {
        const currentArray = (formData as any)[key] as number[];
        const newArray = [...currentArray];
        newArray[index] = Number(value);
        setFormData({
          ...formData,
          [key]: newArray,
        });
        return;
      }
    }

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    });
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        // normalize empty strings to null for optional contact fields
        email: formData.email?.trim() ? formData.email : null,
        telegram: formData.telegram?.trim() ? formData.telegram : null,
        whatsapp: formData.whatsapp?.trim() ? formData.whatsapp : null,
      } as any;

      if (isEditing && currentConfig ) {
        await apiClient.put(`/admin/configs/${currentConfig.id}`, payload);
        dispatch(
          showNotification({
            message: "Config updated successfully",
            severity: "success",
          })
        );
      } else {
        await apiClient.post("/admin/configs", payload);
        dispatch(
          showNotification({
            message: "Config added successfully",
            severity: "success",
          })
        );
      }
      fetchConfigs();
      handleCloseDialog();
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} config`,
          severity: "error",
        })
      );
    }
  };

  const handleDelete = async (configId) => {
    if (window.confirm("Are you sure you want to delete this config?")) {
      try {
        await apiClient.delete(`/admin/configs/${configId}`);
        dispatch(
          showNotification({
            message: "Config deleted successfully",
            severity: "success",
          })
        );
        fetchConfigs();
      } catch (error) {
        console.error("API Error:", error);
        dispatch(
          showNotification({
            message: error.response?.data?.message || "Failed to delete config",
            severity: "error",
          })
        );
      }
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

  const sortedData = [...configs].sort((a: any, b: any) => {
    if (a[orderBy] < b[orderBy]) {
      return order === "asc" ? -1 : 1;
    }
    if (a[orderBy] > b[orderBy]) {
      return order === "asc" ? 1 : -1;
    }
    return 0;
  });

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Configurations
      </Typography>
      <Button 
        variant="contained" 
        sx={{ mb: 2 }}
        onClick={handleOpenAddDialog}
      >
        Add New Config
      </Button>
      
      <ReusableTable
        columns={columns}
        data={sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
        page={page}
        rowsPerPage={rowsPerPage}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        order={order}
        orderBy={orderBy}
        handleSort={handleSort}
      />

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Configuration' : 'Add New Configuration'}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="TDS (%)"
              name="tds"
              type="number"
              value={formData.tds}
              onChange={handleInputChange}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Fee (%)"
              name="fee"
              type="number"
              value={formData.fee}
              onChange={handleInputChange}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Cashback (%)"
              name="cashback"
              type="number"
              value={formData.cashback}
              onChange={handleInputChange}
              inputProps={{ min: 0, max: 100 }}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Referral Amount"
              name="referralAmount"
              type="number"
              value={formData.referralAmount}
              onChange={handleInputChange}
              inputProps={{ min: 0 }}
            />

            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Two Player distribution (%)</Typography>
              <Stack direction="row" spacing={2}>
                {formData.twoPlayer.map((val, idx) => (
                  <TextField
                    key={`tp-${idx}`}
                    label={`P${idx + 1}`}
                    name={`twoPlayer_${idx}`}
                    type="number"
                    value={val}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: 120 }}
                  />
                ))}
              </Stack>
            </Stack>

            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Three Player distribution (%)</Typography>
              <Stack direction="row" spacing={2}>
                {formData.threePlayer.map((val, idx) => (
                  <TextField
                    key={`thp-${idx}`}
                    label={`P${idx + 1}`}
                    name={`threePlayer_${idx}`}
                    type="number"
                    value={val}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: 120 }}
                  />
                ))}
              </Stack>
            </Stack>

            <Stack spacing={1} sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Four Player distribution (%)</Typography>
              <Stack direction="row" spacing={2}>
                {formData.fourPlayer.map((val, idx) => (
                  <TextField
                    key={`fp-${idx}`}
                    label={`P${idx + 1}`}
                    name={`fourPlayer_${idx}`}
                    type="number"
                    value={val}
                    onChange={handleInputChange}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: 120 }}
                  />
                ))}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2, mb: 2 }}>
              <Typography>Status (active):</Typography>
              <Checkbox
                name="status"
                checked={formData.status}
                onChange={handleInputChange}
              />
            </Stack>

            <TextField
              margin="normal"
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Telegram"
              name="telegram"
              value={formData.telegram}
              onChange={handleInputChange}
            />
            <TextField
              margin="normal"
              fullWidth
              label="WhatsApp"
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleInputChange}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {isEditing ? 'Update' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Settings;