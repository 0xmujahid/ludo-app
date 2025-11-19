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
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material';
import { 
  Visibility, 
  Edit, 
  Delete, 
  PlayArrow,
  Stop,
  Refresh,
  Group,
  Timer,
  EmojiEvents
} from '@mui/icons-material';

interface Game {
  id: string;
  roomCode: string;
  name: string;
  variant: string;
  gameTypeId: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  minPlayers: number;
  maxPlayers: number;
  currentPlayers: number;
  entryFee: number;
  timeLimit: number;
  timePerMove: number;
  pointsToWin: number;
  maxMoves: number;
  isPrivate: boolean;
  password?: string;
  createdAt: string;
  updatedAt: string;
  players: Array<{
    id: string;
    username: string;
    avatar?: string;
    color: string;
    position: number;
    score: number;
    isReady: boolean;
    isSpectator: boolean;
  }>;
  winner?: {
    id: string;
    username: string;
    score: number;
  };
  duration?: number;
  totalMoves?: number;
}

const Games = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const statusColors: Record<string, any> = {
    waiting: { color: "info", label: "Waiting" },
    active: { color: "success", label: "Active" },
    completed: { color: "default", label: "Completed" },
    cancelled: { color: "error", label: "Cancelled" }
  };

  const variantColors: Record<string, any> = {
    CLASSIC: { color: "primary", label: "Classic" },
    KILL: { color: "error", label: "Kill" },
    QUICK: { color: "success", label: "Quick" }
  };

  const columns = [
    { 
      id: "roomCode", 
      label: "Room Code",
      render: (row: Game) => (
        <Stack>
          <Typography variant="body1" fontWeight="bold" fontFamily="monospace">
            {row.roomCode}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {row.name}
          </Typography>
        </Stack>
      )
    },
    { 
      id: "status", 
      label: "Status",
      render: (row: Game) => (
        <Chip 
          label={statusColors[row.status]?.label || row.status}
          color={statusColors[row.status]?.color || "default"}
          size="small"
        />
      )
    },
    { 
      id: "variant", 
      label: "Variant",
      render: (row: Game) => (
        <Chip 
          label={variantColors[row.variant]?.label || row.variant}
          color={variantColors[row.variant]?.color || "default"}
          size="small"
          variant="outlined"
        />
      )
    },
    { 
      id: "players", 
      label: "Players",
      render: (row: Game) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Group fontSize="small" />
          <Typography variant="body2">
            {row.currentPlayers}/{row.maxPlayers}
          </Typography>
        </Stack>
      )
    },
    { 
      id: "entryFee", 
      label: "Entry Fee",
      render: (row: Game) => (
        <Typography variant="body1" fontWeight="bold">
          ₹{row.entryFee}
        </Typography>
      )
    },
    { 
      id: "duration", 
      label: "Duration",
      render: (row: Game) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Timer fontSize="small" />
          <Typography variant="body2">
            {row.duration ? `${Math.floor(row.duration / 60)}m ${row.duration % 60}s` : '-'}
          </Typography>
        </Stack>
      )
    },
    { 
      id: "winner", 
      label: "Winner",
      render: (row: Game) => (
        row.winner ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <EmojiEvents fontSize="small" color="primary" />
            <Typography variant="body2">
              {row.winner.username}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="textSecondary">
            -
          </Typography>
        )
      )
    },
    { 
      id: "createdAt", 
      label: "Created",
      render: (row: Game) => (
        <Typography variant="body2">
          {new Date(row.createdAt).toLocaleDateString()}
        </Typography>
      )
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: Game) => (
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
              onClick={() => handleEditGame(row)}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton 
              size="small"
              color="error"
              onClick={() => handleDeleteGame(row.id)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const fetchGames = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/admin/games", {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          status: "all"
        }
      });
      if (response) {
        setGames(response as any);
      }
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: "Failed to fetch games",
          severity: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, [page, rowsPerPage]);

  const handleViewDetails = (game: Game) => {
    setSelectedGame(game);
    setOpenDialog(true);
  };

  const handleEditGame = (game: Game) => {
    // TODO: Implement edit game functionality
    console.log("Edit game:", game);
  };

  const handleDeleteGame = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this game?")) {
      try {
        await apiClient.delete(`/admin/games/${id}`);
        dispatch(
          showNotification({
            message: "Game deleted successfully",
            severity: "success",
          })
        );
        fetchGames();
      } catch (error) {
        console.error("API Error:", error);
        dispatch(
          showNotification({
            message: error.response?.data?.message || "Failed to delete game",
            severity: "error",
          })
        );
      }
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedGame(null);
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
          Game Management
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Refresh />}
          onClick={fetchGames}
        >
          Refresh
        </Button>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Games
              </Typography>
              <Typography variant="h4">
                {games.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Games
              </Typography>
              <Typography variant="h4" color="success.main">
                {games.filter(g => g.status === 'active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Waiting Games
              </Typography>
              <Typography variant="h4" color="info.main">
                {games.filter(g => g.status === 'waiting').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Players
              </Typography>
              <Typography variant="h4" color="primary.main">
                {games.reduce((sum, g) => sum + g.currentPlayers, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ReusableTable
        columns={columns}
        data={games}
        page={page}
        rowsPerPage={rowsPerPage}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        order={order}
        orderBy={orderBy}
        handleSort={handleSort}
        loading={loading}
      />

      {/* Game Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          Game Details - {selectedGame?.roomCode}
        </DialogTitle>
        <DialogContent>
          {selectedGame && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Game Information</Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Room Code</Typography>
                      <Typography variant="body1" fontFamily="monospace">{selectedGame.roomCode}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Name</Typography>
                      <Typography variant="body1">{selectedGame.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Status</Typography>
                      <Chip 
                        label={statusColors[selectedGame.status]?.label || selectedGame.status}
                        color={statusColors[selectedGame.status]?.color || "default"}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Variant</Typography>
                      <Chip 
                        label={variantColors[selectedGame.variant]?.label || selectedGame.variant}
                        color={variantColors[selectedGame.variant]?.color || "default"}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Entry Fee</Typography>
                      <Typography variant="body1" fontWeight="bold">₹{selectedGame.entryFee}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Time Limit</Typography>
                      <Typography variant="body1">{selectedGame.timeLimit} seconds</Typography>
                    </Box>
                  </Stack>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Game Statistics</Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Duration</Typography>
                      <Typography variant="body1">
                        {selectedGame.duration ? `${Math.floor(selectedGame.duration / 60)}m ${selectedGame.duration % 60}s` : 'N/A'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Total Moves</Typography>
                      <Typography variant="body1">{selectedGame.totalMoves || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Created</Typography>
                      <Typography variant="body1">
                        {new Date(selectedGame.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="textSecondary">Updated</Typography>
                      <Typography variant="body1">
                        {new Date(selectedGame.updatedAt).toLocaleString()}
                      </Typography>
                    </Box>
                    {selectedGame.winner && (
                      <Box>
                        <Typography variant="body2" color="textSecondary">Winner</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <EmojiEvents fontSize="small" color="primary" />
                          <Typography variant="body1">{selectedGame.winner.username}</Typography>
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>Players</Typography>
                  <List>
                    {selectedGame.players.map((player, index) => (
                      <React.Fragment key={player.id}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: player.color }}>
                              {player.username.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={player.username}
                            secondary={
                              <Stack direction="row" spacing={2}>
                                <Typography variant="body2">
                                  Position: {player.position}
                                </Typography>
                                <Typography variant="body2">
                                  Score: {player.score}
                                </Typography>
                                <Chip 
                                  label={player.isReady ? "Ready" : "Not Ready"}
                                  color={player.isReady ? "success" : "warning"}
                                  size="small"
                                />
                                {player.isSpectator && (
                                  <Chip 
                                    label="Spectator"
                                    color="info"
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            }
                          />
                        </ListItem>
                        {index < selectedGame.players.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Games;

