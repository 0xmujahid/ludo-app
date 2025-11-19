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
  Tooltip
} from '@mui/material';
import { 
  Add, 
  Edit, 
  Delete, 
  Visibility,
  PlayArrow,
  Stop,
  Refresh
} from '@mui/icons-material';

interface Tournament {
  id: string;
  name: string;
  description: string;
  gameTypeId: string;
  variant: string;
  entryFee: number;
  maxParticipants: number;
  minParticipants: number;
  startDate: string;
  registrationDeadline: string;
  format: string;
  rounds: number;
  timePerMove: number;
  timePerGame: number;
  pointsToWin: number;
  maxMoves: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  prizeDistribution: {
    first: number;
    second: number;
    third: number;
    fourthToEighth?: number;
  };
  currentParticipants: number;
  createdAt: string;
  updatedAt: string;
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const statusColors: Record<string, any> = {
    upcoming: { color: "info", label: "Upcoming" },
    active: { color: "success", label: "Active" },
    completed: { color: "default", label: "Completed" },
    cancelled: { color: "error", label: "Cancelled" }
  };

  const formatColors: Record<string, any> = {
    elimination: { color: "primary", label: "Elimination" },
    round_robin: { color: "secondary", label: "Round Robin" },
    swiss: { color: "warning", label: "Swiss" }
  };

  const columns = [
    { 
      id: "name", 
      label: "Tournament",
      render: (row: Tournament) => (
        <Stack>
          <Typography variant="body1" fontWeight="bold">{row.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {row.description}
          </Typography>
        </Stack>
      )
    },
    { 
      id: "status", 
      label: "Status",
      render: (row: Tournament) => (
        <Chip 
          label={statusColors[row.status]?.label || row.status}
          color={statusColors[row.status]?.color || "default"}
          size="small"
        />
      )
    },
    { 
      id: "format", 
      label: "Format",
      render: (row: Tournament) => (
        <Chip 
          label={formatColors[row.format]?.label || row.format}
          color={formatColors[row.format]?.color || "default"}
          size="small"
          variant="outlined"
        />
      )
    },
    { 
      id: "participants", 
      label: "Participants",
      render: (row: Tournament) => (
        <Typography variant="body2">
          {row.currentParticipants}/{row.maxParticipants}
        </Typography>
      )
    },
    { 
      id: "entryFee", 
      label: "Entry Fee",
      render: (row: Tournament) => (
        <Typography variant="body1" fontWeight="bold">
          ₹{row.entryFee}
        </Typography>
      )
    },
    { 
      id: "prizePool", 
      label: "Prize Pool",
      render: (row: Tournament) => (
        <Typography variant="body2">
          ₹{row.prizeDistribution.first + row.prizeDistribution.second + row.prizeDistribution.third}
        </Typography>
      )
    },
    { 
      id: "startDate", 
      label: "Start Date",
      render: (row: Tournament) => (
        <Typography variant="body2">
          {new Date(row.startDate).toLocaleDateString()}
        </Typography>
      )
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: Tournament) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="View Details">
            <IconButton 
              size="small"
              onClick={() => handleViewDetails(row)}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton 
              size="small"
              onClick={() => handleOpenEditDialog(row)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton 
              size="small"
              color="error"
              onClick={() => handleDeleteTournament(row.id)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/tournaments", {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          status: "all"
        }
      });
      if (response) {
        setTournaments(response as any);
      }
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: "Failed to fetch tournaments",
          severity: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [page, rowsPerPage]);

  const handleOpenAddDialog = () => {
    setCurrentTournament({
      id: "",
      name: "",
      description: "",
      gameTypeId: "",
      variant: "CLASSIC",
      entryFee: 0,
      maxParticipants: 64,
      minParticipants: 32,
      startDate: "",
      registrationDeadline: "",
      format: "elimination",
      rounds: 6,
      timePerMove: 30,
      timePerGame: 1800,
      pointsToWin: 100,
      maxMoves: 50,
      status: "upcoming",
      prizeDistribution: {
        first: 10000,
        second: 5000,
        third: 2500
      },
      currentParticipants: 0,
      createdAt: "",
      updatedAt: ""
    });
    setIsEditMode(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (tournament: Tournament) => {
    setCurrentTournament(tournament);
    setIsEditMode(true);
    setOpenDialog(true);
  };

  const handleViewDetails = (tournament: Tournament) => {
    // TODO: Implement tournament details view
    console.log("View tournament details:", tournament);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTournament(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (currentTournament) {
      setCurrentTournament({
        ...currentTournament,
        [name]: value
      });
    }
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    if (currentTournament) {
      setCurrentTournament({
        ...currentTournament,
        [parent]: {
          ...currentTournament[parent as keyof Tournament],
          [field]: value
        }
      });
    }
  };

  const handleSaveTournament = async () => {
    if (!currentTournament) return;

    try {
      if (isEditMode) {
        await apiClient.put(`/admin/tournaments/${currentTournament.id}`, currentTournament);
        dispatch(
          showNotification({
            message: "Tournament updated successfully",
            severity: "success",
          })
        );
      } else {
        await apiClient.post("/tournament", currentTournament);
        dispatch(
          showNotification({
            message: "Tournament created successfully",
            severity: "success",
          })
        );
      }
      
      fetchTournaments();
      handleCloseDialog();
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} tournament`,
          severity: "error",
        })
      );
    }
  };

  const handleDeleteTournament = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this tournament?")) {
      try {
        await apiClient.delete(`/admin/tournaments/${id}`);
        dispatch(
          showNotification({
            message: "Tournament deleted successfully",
            severity: "success",
          })
        );
        fetchTournaments();
      } catch (error) {
        console.error("API Error:", error);
        dispatch(
          showNotification({
            message: error.response?.data?.message || "Failed to delete tournament",
            severity: "error",
          })
        );
      }
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
          Tournament Management
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={handleOpenAddDialog}
        >
          Create Tournament
        </Button>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Tournaments
              </Typography>
              <Typography variant="h4">
                {tournaments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Tournaments
              </Typography>
              <Typography variant="h4" color="success.main">
                {tournaments.filter(t => t.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Upcoming Tournaments
              </Typography>
              <Typography variant="h4" color="info.main">
                {tournaments.filter(t => t.status === 'upcoming').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Participants
              </Typography>
              <Typography variant="h4" color="primary.main">
                {tournaments.reduce((sum, t) => sum + t.currentParticipants, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ReusableTable
        columns={columns}
        data={tournaments}
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {isEditMode ? "Edit Tournament" : "Create New Tournament"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Tournament Name"
                  name="name"
                  value={currentTournament?.name || ''}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Game Type ID"
                  name="gameTypeId"
                  value={currentTournament?.gameTypeId || ''}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={currentTournament?.description || ''}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Entry Fee"
                  name="entryFee"
                  type="number"
                  value={currentTournament?.entryFee || 0}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={currentTournament?.format || 'elimination'}
                    onChange={(e) => setCurrentTournament(prev => prev ? {...prev, format: e.target.value} : null)}
                    label="Format"
                  >
                    <MenuItem value="elimination">Elimination</MenuItem>
                    <MenuItem value="round_robin">Round Robin</MenuItem>
                    <MenuItem value="swiss">Swiss</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Participants"
                  name="maxParticipants"
                  type="number"
                  value={currentTournament?.maxParticipants || 64}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Min Participants"
                  name="minParticipants"
                  type="number"
                  value={currentTournament?.minParticipants || 32}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  name="startDate"
                  type="datetime-local"
                  value={currentTournament?.startDate || ''}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Registration Deadline"
                  name="registrationDeadline"
                  type="datetime-local"
                  value={currentTournament?.registrationDeadline || ''}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              {/* Prize Distribution */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Prize Distribution</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="First Place Prize"
                  name="first"
                  type="number"
                  value={currentTournament?.prizeDistribution?.first || 0}
                  onChange={(e) => handleNestedInputChange('prizeDistribution', 'first', Number(e.target.value))}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Second Place Prize"
                  name="second"
                  type="number"
                  value={currentTournament?.prizeDistribution?.second || 0}
                  onChange={(e) => handleNestedInputChange('prizeDistribution', 'second', Number(e.target.value))}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Third Place Prize"
                  name="third"
                  type="number"
                  value={currentTournament?.prizeDistribution?.third || 0}
                  onChange={(e) => handleNestedInputChange('prizeDistribution', 'third', Number(e.target.value))}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveTournament} 
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

export default Tournaments;
