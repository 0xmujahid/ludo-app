import { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";
import ReusableTable from "../../components/ReusableTable";
import { showNotification } from "../../store/Reducers/notificationSlice";
import { useDispatch } from "react-redux";
import { 
  Button, 
  Typography, 
  Stack, 
  Checkbox, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Box,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';

interface Transaction {
  id: string;
  amount: string;
  transactionType: string;
  status: string;
  description: string;
  paymentMethod: string;
  metadata: {
    orderId: string;
    utrNumber: string;
    initiatedAt: string;
  };
  user: {
    username: string;
    phoneNumber: string;
  };
  wallet: {
    balance: string;
  };
  createdAt: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | "">("");
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const dispatch = useDispatch();

  const statusColors: Record<string, any> = {
    PENDING: { color: "warning", label: "Pending" },
    APPROVED: { color: "success", label: "Approved" },
    REJECTED: { color: "error", label: "Rejected" },
    FAILED: { color: "error", label: "Failed" },
    COMPLETED: { color: "success", label: "Completed" }
  };

  const transactionTypeColors: Record<string, any> = {
    DEPOSIT: { color: "primary", label: "Deposit" },
    WITHDRAWAL: { color: "secondary", label: "Withdrawal" },
    WINNING: { color: "success", label: "Winning" },
    REFUND: { color: "info", label: "Refund" }
  };

  const columns = [
    { 
      id: "select", 
      label: "Select",
      render: (row) => (
        <Checkbox
          checked={selectedTransactions.includes(row.id)}
          onChange={(e) => handleSelectTransaction(e, row.id)}
        />
      )
    },
    { 
      id: "id", 
      label: "Transaction ID",
      render: (row) => (
        <Typography variant="body2" color="textSecondary">
          {row.id.substring(0, 8)}...
        </Typography>
      )
    },
    { 
      id: "user.username", 
      label: "User",
      render: (row) => (
        <Stack>
          <Typography variant="body1">{row.user.username}</Typography>
          <Typography variant="caption" color="textSecondary">
            {row.user.phoneNumber}
          </Typography>
        </Stack>
      )
    },
    { 
      id: "amount", 
      label: "Amount",
      render: (row) => (
        <Typography variant="body1" fontWeight="bold">
          ₹{row.amount}
        </Typography>
      )
    },
    { 
      id: "transactionType", 
      label: "Type",
      render: (row) => (
        <Chip 
          label={transactionTypeColors[row.transactionType]?.label || row.transactionType}
          color={transactionTypeColors[row.transactionType]?.color || "default"}
          size="small"
        />
      )
    },
    { 
      id: "status", 
      label: "Status",
      render: (row) => (
        <Chip 
          label={statusColors[row.status]?.label || row.status}
          color={statusColors[row.status]?.color || "default"}
          size="small"
        />
      )
    },
    { 
      id: "paymentMethod", 
      label: "Method",
      render: (row) => (
        <Typography variant="body1">
          {row.paymentMethod}
        </Typography>
      )
    },
    { 
      id: "metadata.utrNumber", 
      label: "UTR/Ref",
      render: (row) => (
        <Typography variant="body2">
          {row.metadata?.utrNumber || 'N/A'}
        </Typography>
      )
    },
    { 
      id: "createdAt", 
      label: "Date",
      render: (row) => (
        <Typography variant="body2">
          {new Date(row.createdAt).toLocaleString()}
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
            color="success"
            disabled={row.status !== "PENDING"}
            onClick={() => handleOpenActionDialog(row, "approve")}
          >
            Approve
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            color="error"
            disabled={row.status !== "PENDING"}
            onClick={() => handleOpenActionDialog(row, "reject")}
          >
            Reject
          </Button>
        </Stack>
      ),
    },
  ];

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/payments/transactions", {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sortBy: orderBy,
          sortOrder: order.toUpperCase()
        }
      });
      if (response?.success) {
        setTransactions(response.transactions);
        setTotalCount(response.pagination.total);
      }
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: "Failed to fetch transactions",
          severity: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, rowsPerPage, order, orderBy]);


  const handleOpenActionDialog = (transaction: Transaction, action: "approve" | "reject") => {
    setCurrentTransaction(transaction);
    setActionType(action);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTransaction(null);
    setActionType(null);
  };

  // const handleTransactionAction = async () => {
  //   if (!currentTransaction || !actionType) return;

  //   try {
  //     const endpoint = actionType === "approve" 
  //       ? `/admin/payments/transactions/${currentTransaction.id}/approve`
  //       : `/admin/payments/transactions/${currentTransaction.id}/reject`;

  //     await apiClient.post(endpoint);
      
  //     dispatch(
  //       showNotification({
  //         message: `Transaction ${actionType}d successfully`,
  //         severity: "success",
  //       })
  //     );
      
  //     fetchTransactions();
  //     handleCloseDialog();
  //   } catch (error) {
  //     console.error("API Error:", error);
  //     dispatch(
  //       showNotification({
  //         message: error.response?.data?.message || `Failed to ${actionType} transaction`,
  //         severity: "error",
  //       })
  //     );
  //   }
  // };

 const handleTransactionAction = async () => {
  if (!currentTransaction || !actionType) return;

  try {
    const endpoint = actionType === "approve" 
      ? `/admin/payments/transactions/${currentTransaction.id}/approve`
      : `/admin/payments/transactions/${currentTransaction.id}/reject`;

    // For reject action, send either the provided reason or default message
    const payload = actionType === "reject" 
      ? { reason: rejectionReason.trim() || "Invalid transaction" }
      : {};

    await apiClient.post(endpoint, payload);
    
    dispatch(
      showNotification({
        message: `Transaction ${actionType}d successfully`,
        severity: "success",
      })
    );
    
    fetchTransactions();
    handleCloseDialog();
    setRejectionReason(""); // Reset rejection reason
  } catch (error) {
    console.error("API Error:", error);
    dispatch(
      showNotification({
        message: error.response?.data?.message || `Failed to ${actionType} transaction`,
        severity: "error",
      })
    );
  }
};


  const handleBulkAction = async () => {
  if (selectedTransactions.length === 0 || !bulkAction) return;

  try {
    const endpoint = bulkAction === "approve"
      ? "/admin/payments/transactions/bulk/approve"
      : "/admin/payments/transactions/bulk/reject";

    const payload = bulkAction === "approve"
      ? { transactionIds: selectedTransactions }
      : { 
          transactionIds: selectedTransactions,
          reason: rejectReason || 'Invalid Payment' 
        };

    await apiClient.post(endpoint, payload);
    
    dispatch(
      showNotification({
        message: `${selectedTransactions.length} transactions ${bulkAction}d successfully`,
        severity: "success",
      })
    );
    
    setSelectedTransactions([]);
    setBulkAction("");
    setRejectReason(""); // Clear the reject reason after successful action
    fetchTransactions();
  } catch (error) {
    console.error("API Error:", error);
    dispatch(
      showNotification({
        message: error.response?.data?.message || `Failed to ${bulkAction} transactions`,
        severity: "error",
      })
    );
  }
};

  const handleSelectTransaction = (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (event.target.checked) {
      setSelectedTransactions([...selectedTransactions, id]);
    } else {
      setSelectedTransactions(selectedTransactions.filter(transactionId => transactionId !== id));
    }
  };

  const handleSelectAllTransactions = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedTransactions(transactions.map(transaction => transaction.id));
    } else {
      setSelectedTransactions([]);
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
      <Typography variant="h4" gutterBottom>
        Payment Transactions
      </Typography>

      {/* Bulk Actions */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Typography>
          {selectedTransactions.length} selected
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Bulk Action</InputLabel>
          <Select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as "approve" | "reject" | "")}
            label="Bulk Action"
            disabled={selectedTransactions.length === 0}
          >
            <MenuItem value="">Select Action</MenuItem>
            <MenuItem value="approve">Approve Selected</MenuItem>
            <MenuItem value="reject">Reject Selected</MenuItem>
          </Select>
        </FormControl>

        <Button 
          variant="contained"
          disabled={!bulkAction || selectedTransactions.length === 0}
          onClick={handleBulkAction}
        >
          Apply
        </Button>
      </Stack>
      
      <ReusableTable
        columns={columns}
        data={transactions}
        page={page}
        rowsPerPage={rowsPerPage}
        count={totalCount}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        order={order}
        orderBy={orderBy}
        handleSort={handleSort}
        selectAllChecked={
          transactions.length > 0 && 
          selectedTransactions.length === transactions.length
        }
        onSelectAll={handleSelectAllTransactions}
        loading={loading}
      />

      {/* Action Confirmation Dialog */}
<Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
  <DialogTitle>
    {actionType === "approve" ? "Approve Transaction" : "Reject Transaction"}
  </DialogTitle>
  <DialogContent>
    <Box sx={{ mt: 2 }}>
      <Typography variant="body1" gutterBottom>
        Transaction ID: {currentTransaction?.id}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Amount: ₹{currentTransaction?.amount}
      </Typography>
      <Typography variant="body1" gutterBottom>
        User: {currentTransaction?.user.username} ({currentTransaction?.user.phoneNumber})
      </Typography>
      
    {actionType === "reject" && (
  <TextField
    margin="normal"
    fullWidth
    label="Rejection Reason (Optional)"
    name="rejectionReason"
    value={rejectionReason}
    onChange={(e) => setRejectionReason(e.target.value)}
    multiline
    rows={3}
    placeholder="Leave empty for default 'Invalid transaction' reason"
  />
)}
    </Box>
  </DialogContent>
  <DialogActions>
    <Button onClick={handleCloseDialog}>Cancel</Button>
    <Button 
      onClick={handleTransactionAction} 
      variant="contained" 
      color={actionType === "approve" ? "success" : "error"}
    >
      Confirm {actionType}
    </Button>
  </DialogActions>
</Dialog>
{bulkAction === "reject" && (
  <TextField
    label="Reject Reason"
    value={rejectReason}
    onChange={(e) => setRejectReason(e.target.value)}
    placeholder="Enter reject reason (default: Invalid Payment)"
  />
)}

    </div>
  );
};

export default Transactions;