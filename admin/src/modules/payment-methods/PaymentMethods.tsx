import React, { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import ReusableTable from "../../components/ReusableTable";
import { showNotification } from "../../store/Reducers/notificationSlice";
import { useDispatch } from "react-redux";
import {
  Button,
  Typography,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Divider,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Settings,
  Payment,
  CreditCard,
  AccountBalance,
  Schedule
} from '@mui/icons-material';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'paytm' | 'manual' | 'upi' | 'card' | 'netbanking';
  enabled: boolean;
  environment: 'production' | 'staging' | 'sandbox';
  minimumAmount: number;
  maximumAmount: number;
  processingFee: number;
  processingTime: string;
  autoApproval: boolean;
  requireScreenshot: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  schedule?: {
    enabled: boolean;
    maintenanceWindows: Array<{
      start: string;
      end: string;
      timezone: string;
      days: string[];
    }>;
  };
  config: {
    merchantId?: string;
    apiKey?: string;
    secretKey?: string;
    callbackUrl?: string;
    returnUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const PaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  const [openDialog, setOpenDialog] = useState(false);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const typeColors: Record<string, any> = {
    paytm: { color: "primary", label: "Paytm", icon: <Payment /> },
    manual: { color: "secondary", label: "Manual", icon: <AccountBalance /> },
    upi: { color: "success", label: "UPI", icon: <CreditCard /> },
    wallet: { color: "success", label: "Wallet", icon: <CreditCard /> },
    card: { color: "warning", label: "Card", icon: <CreditCard /> },
    netbanking: { color: "info", label: "Net Banking", icon: <AccountBalance /> },
    razorpay: { color: "success", label: "Razorpay", icon: <CreditCard /> },
    phonepe: { color: "warning", label: "PhonePe", icon: <CreditCard /> },
  };

  const environmentColors: Record<string, any> = {
    production: { color: "success", label: "Production" },
    staging: { color: "warning", label: "Staging" },
    sandbox: { color: "info", label: "Sandbox" }
  };

  const columns = [
    {
      id: "paymentMethod",
      label: "Payment Method",
      render: (row: PaymentMethod) => (
        <Stack direction="row" spacing={1} alignItems="center">
          {typeColors[row.paymentMethod.toLowerCase()]?.icon}
          <Stack>
            <Typography variant="body1" fontWeight="bold">{row.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {typeColors[row.paymentMethod.toLowerCase()]?.label}
            </Typography>
          </Stack>
        </Stack>
      )
    },
    {
      id: "status",
      label: "Status",
      render: (row: PaymentMethod) => (
        <Stack spacing={1}>
          <Chip
            label={row.enabled ? "Enabled" : "Disabled"}
            color={row.enabled ? "success" : "error"}
            size="small"
          />
          {row.maintenanceMode && (
            <Chip
              label="Maintenance"
              color="warning"
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      )
    },
    {
      id: "environment",
      label: "Environment",
      render: (row: PaymentMethod) => (
        <Chip
          label={environmentColors[row.environment]?.label || row.environment}
          color={environmentColors[row.environment]?.color || "default"}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      id: "limits",
      label: "Amount Limits",
      render: (row: PaymentMethod) => (
        <Typography variant="body2">
          ₹{row.minimumAmount} - ₹{row.maximumAmount}
        </Typography>
      )
    },
    {
      id: "processingFee",
      label: "Processing Fee",
      render: (row: PaymentMethod) => (
        <Typography variant="body2">
          {row.processingFee}%
        </Typography>
      )
    },
    {
      id: "processingTime",
      label: "Processing Time",
      render: (row: PaymentMethod) => (
        <Typography variant="body2">
          {row.processingTime}
        </Typography>
      )
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: PaymentMethod) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => handleOpenEditDialog(row)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Configure">
            <IconButton
              size="small"
              onClick={() => handleConfigure(row)}
            >
              <Settings fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Schedule">
            <IconButton
              size="small"
              onClick={() => handleSchedule(row)}
            >
              <Schedule fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.enabled ? "Disable" : "Enable"}>
            <Switch
              checked={row.enabled}
              onChange={() => handleToggleStatus(row.id, !row.enabled)}
              color="success"
              size="small"
            />
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const fetchPaymentMethods = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/payments/payment-methods");
      if (response) {
        setPaymentMethods(response.configs as any);
      }
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: "Failed to fetch payment methods",
          severity: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleOpenAddDialog = () => {
    setCurrentMethod({
      id: "",
      name: "",
      type: "paytm",
      enabled: true,
      environment: "staging",
      minimumAmount: 10,
      maximumAmount: 50000,
      processingFee: 2.5,
      processingTime: "2-3 hours",
      autoApproval: false,
      requireScreenshot: false,
      maintenanceMode: false,
      config: {},
      createdAt: "",
      updatedAt: ""
    });
    setIsEditMode(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (method: PaymentMethod) => {
    setCurrentMethod(method);
    setIsEditMode(true);
    setOpenDialog(true);
  };

  const handleConfigure = (method: PaymentMethod) => {
    // TODO: Implement configuration dialog
    console.log("Configure payment method:", method);
  };

  const handleSchedule = (method: PaymentMethod) => {
    // TODO: Implement schedule dialog
    console.log("Schedule payment method:", method);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentMethod(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    if (currentMethod) {
      setCurrentMethod({
        ...currentMethod,
        [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
      });
    }
  };

  const handleSaveMethod = async () => {
    if (!currentMethod) return;

    try {
      if (isEditMode) {
        await apiClient.put(`/admin-payment/payment-methods/${currentMethod.id}`, currentMethod);
        dispatch(
          showNotification({
            message: "Payment method updated successfully",
            severity: "success",
          })
        );
      } else {
        await apiClient.post("/admin-payment/payment-methods", currentMethod);
        dispatch(
          showNotification({
            message: "Payment method created successfully",
            severity: "success",
          })
        );
      }

      fetchPaymentMethods();
      handleCloseDialog();
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} payment method`,
          severity: "error",
        })
      );
    }
  };

  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
      await apiClient.put(`/admin-payment/payment-methods/${id}/status`, {
        enabled: newStatus
      });
      dispatch(
        showNotification({
          message: `Payment method ${newStatus ? 'enabled' : 'disabled'} successfully`,
          severity: "success",
        })
      );
      fetchPaymentMethods();
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: error.response?.data?.message || "Failed to toggle payment method status",
          severity: "error",
        })
      );
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  return (
    <div>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Payment Methods
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAddDialog}
        >
          Add Payment Method
        </Button>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Methods
              </Typography>
              <Typography variant="h4">
                {paymentMethods.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Enabled Methods
              </Typography>
              <Typography variant="h4" color="success.main">
                {paymentMethods.filter(m => m.enabled).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Production Methods
              </Typography>
              <Typography variant="h4" color="primary.main">
                {paymentMethods.filter(m => m.environment === 'production').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                In Maintenance
              </Typography>
              <Typography variant="h4" color="warning.main">
                {paymentMethods.filter(m => m.maintenanceMode).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ReusableTable
        columns={columns}
        data={paymentMethods}
        page={page}
        rowsPerPage={rowsPerPage}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        order={order}
        orderBy={orderBy}
        handleSort={handleSort}
        loading={loading}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditMode ? "Edit Payment Method" : "Add New Payment Method"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Method Name"
                  name="name"
                  value={currentMethod?.name || ''}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={currentMethod?.type || 'paytm'}
                    onChange={(e) => setCurrentMethod(prev => prev ? { ...prev, type: e.target.value } : null)}
                    label="Type"
                  >
                    <MenuItem value="paytm">Paytm</MenuItem>
                    <MenuItem value="manual">Manual</MenuItem>
                    <MenuItem value="upi">UPI</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="netbanking">Net Banking</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Environment</InputLabel>
                  <Select
                    value={currentMethod?.environment || 'staging'}
                    onChange={(e) => setCurrentMethod(prev => prev ? { ...prev, environment: e.target.value } : null)}
                    label="Environment"
                  >
                    <MenuItem value="sandbox">Sandbox</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Processing Time"
                  name="processingTime"
                  value={currentMethod?.processingTime || ''}
                  onChange={handleInputChange}
                  margin="normal"
                  placeholder="e.g., 2-3 hours"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Amount"
                  name="minimumAmount"
                  type="number"
                  value={currentMethod?.minimumAmount || 0}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Maximum Amount"
                  name="maximumAmount"
                  type="number"
                  value={currentMethod?.maximumAmount || 0}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Processing Fee (%)"
                  name="processingFee"
                  type="number"
                  value={currentMethod?.processingFee || 0}
                  onChange={handleInputChange}
                  margin="normal"
                  inputProps={{ step: 0.1 }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2 }}>Settings</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentMethod?.autoApproval || false}
                      onChange={(e) => setCurrentMethod(prev => prev ? { ...prev, autoApproval: e.target.checked } : null)}
                    />
                  }
                  label="Auto Approval"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentMethod?.requireScreenshot || false}
                      onChange={(e) => setCurrentMethod(prev => prev ? { ...prev, requireScreenshot: e.target.checked } : null)}
                    />
                  }
                  label="Require Screenshot"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentMethod?.maintenanceMode || false}
                      onChange={(e) => setCurrentMethod(prev => prev ? { ...prev, maintenanceMode: e.target.checked } : null)}
                    />
                  }
                  label="Maintenance Mode"
                />
              </Grid>

              {currentMethod?.maintenanceMode && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Maintenance Message"
                    name="maintenanceMessage"
                    value={currentMethod?.maintenanceMessage || ''}
                    onChange={handleInputChange}
                    margin="normal"
                    multiline
                    rows={2}
                    placeholder="Enter maintenance message for users"
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveMethod}
            variant="contained"
            color="primary"
          >
            {isEditMode ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PaymentMethods;

