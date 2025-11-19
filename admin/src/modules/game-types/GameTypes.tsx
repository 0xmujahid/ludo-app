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
  InputLabel,
  Switch,
  IconButton,
  Tooltip
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';

interface GameType {
  id: string;
  name: string;
  description: string;
  maxPlayers: number;
  minPlayers: number;
  entryFee: string;
  timeLimit: number;
  timePerMove: number;
  turnTimeLimit: number;
  pointsToWin: number;
  maxMoves: number;
  quickGameMoves: number;
  quickGamePoints: number;
  quickGameTimeLimit: number;
  killModePoints: number;
  lifeCount: number;
  killModeBonus: number;
  classicBonusPoints: number;
  classicPenaltyPoints: number;
  rules: {
    captureReward: number;
    rankingPoints: {
      first: number;
      second: number;
      third: number;
      fourth: number;
    };
    safeZoneRules: string;
    skipTurnOnSix: boolean;
    winningAmount: number;
    bonusTurnOnSix: boolean;
    timeoutPenalty: number;
    allowCustomDice: boolean;
    powerUpsEnabled: boolean;
    quickGameTimerEnabled: boolean;
    killModeEnabled?: boolean;
    reconnectionTime: number;
    disqualificationMoves: number;
    multipleTokensPerSquare: boolean;
  };
  specialSquares: Record<string, { type: string }>;
  variant: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  configId: number;
  fee: number;
  tds: number;
}

const GameTypes = () => {
  const [gameTypes, setGameTypes] = useState<GameType[]>([]);
  const [selectedGameTypes, setSelectedGameTypes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("createdAt");
  const [openDialog, setOpenDialog] = useState(false);
  const [currentGameType, setCurrentGameType] = useState<GameType | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const variantColors: Record<string, any> = {
    CLASSIC: { color: "primary", label: "Classic" },
    KILL: { color: "error", label: "Kill" },
    QUICK: { color: "success", label: "Quick" }
  };

  const columns = [
    { 
      id: "select", 
      label: "Select",
      render: (row) => (
        <Checkbox
          checked={selectedGameTypes.includes(row.id)}
          onChange={(e) => handleSelectGameType(e, row.id)}
        />
      )
    },
    { 
      id: "name", 
      label: "Name",
      render: (row) => (
        <Stack>
          <Typography variant="body1">{row.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {row.description}
          </Typography>
        </Stack>
      )
    },
    { 
      id: "variant", 
      label: "Variant",
      render: (row) => (
        <Chip 
          label={variantColors[row.variant]?.label || row.variant}
          color={variantColors[row.variant]?.color || "default"}
          size="small"
        />
      )
    },
    { 
      id: "players", 
      label: "Players",
      render: (row) => (
        <Typography variant="body1">
          {row.minPlayers}-{row.maxPlayers}
        </Typography>
      )
    },
    { 
      id: "entryFee", 
      label: "Entry Fee",
      render: (row) => (
        <Typography variant="body1" fontWeight="bold">
          ₹{row.entryFee}
        </Typography>
      )
    },
    { 
      id: "isActive", 
      label: "Status",
      render: (row) => (
        <Chip 
          label={row.isActive ? "Active" : "Inactive"}
          color={row.isActive ? "success" : "error"}
          size="small"
        />
      )
    },
    { 
      id: "createdAt", 
      label: "Created",
      render: (row) => (
        <Typography variant="body2">
          {new Date(row.createdAt).toLocaleDateString()}
        </Typography>
      )
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <Stack direction="row" spacing={1}>
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
              onClick={() => handleDeleteGameType(row.id)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? "Deactivate" : "Activate"}>
            <Switch
              checked={row.isActive}
              onChange={() => handleToggleStatus(row.id, !row.isActive)}
              color="success"
              size="small"
            />
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const fetchGameTypes = async () => {
    setLoading(true);
    try {
      // Align with API collection: GET /game-type
      const response = await apiClient.get("game-type", {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          sortBy: orderBy,
          sortOrder: order.toUpperCase()
        }
      });
      // Be resilient to different response shapes
      const list = (response && (response.data || response.items || response.results || response)) || [];
      const items = Array.isArray(list) ? list : (list.data || list.items || []);
      const meta = list.meta || response.meta || {};
      setGameTypes(items);
      setTotalCount(meta.total || items.length || 0);
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: "Failed to fetch game types",
          severity: "error",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameTypes();
  }, [page, rowsPerPage, order, orderBy]);

  const handleOpenAddDialog = () => {
    // Initialize with sensible defaults matching API collection
    setCurrentGameType({
      id: "",
      name: "",
      description: "",
      minPlayers: 2,
      maxPlayers: 4,
      entryFee: "0",
      variant: "CLASSIC",
      isActive: true,
      timeLimit: 1800,
      timePerMove: 30,
      turnTimeLimit: 30,
      pointsToWin: 100,
      maxMoves: 50,
      quickGameMoves: 20,
      quickGamePoints: 150,
      quickGameTimeLimit: 300,
      killModePoints: 30,
      lifeCount: 3,
      killModeBonus: 20,
      classicBonusPoints: 10,
      classicPenaltyPoints: 5,
      rules: {
        captureReward: 10,
        rankingPoints: { first: 100, second: 60, third: 30, fourth: 10 },
        safeZoneRules: "standard",
        skipTurnOnSix: false,
        winningAmount: 0,
        bonusTurnOnSix: true,
        timeoutPenalty: 5,
        allowCustomDice: false,
        powerUpsEnabled: false,
        quickGameTimerEnabled: true,
        reconnectionTime: 60,
        disqualificationMoves: 3,
        multipleTokensPerSquare: false,
        killModeEnabled: false,
      },
      specialSquares: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      configId: 1,
      fee: 0,
      tds: 0,
    } as unknown as GameType);
    setIsEditMode(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (gameType: GameType) => {
    setCurrentGameType(gameType);
    setIsEditMode(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentGameType(null);
  };

  const buildPayloadFromState = (gt: GameType) => {
    // Map UI state to API payload shape based on the collection
    const payload: any = {
      name: gt.name,
      description: gt.description,
      variant: gt.variant,
      isActive: gt.isActive,
      maxPlayers: Number(gt.maxPlayers),
      minPlayers: Number(gt.minPlayers),
      entryFee: Number(gt.entryFee),
      timeLimit: Number(gt.timeLimit),
      timePerMove: Number(gt.timePerMove),
      turnTimeLimit: Number(gt.turnTimeLimit),
      pointsToWin: Number(gt.pointsToWin),
      maxMoves: Number(gt.maxMoves),
      quickGameMoves: Number(gt.quickGameMoves),
      quickGamePoints: Number(gt.quickGamePoints),
      quickGameTimeLimit: Number(gt.quickGameTimeLimit),
      killModePoints: Number(gt.killModePoints),
      lifeCount: Number(gt.lifeCount),
      killModeBonus: Number(gt.killModeBonus),
      classicBonusPoints: Number(gt.classicBonusPoints),
      classicPenaltyPoints: Number(gt.classicPenaltyPoints),
      configId: Number(gt.configId),
      rules: {
        skipTurnOnSix: Boolean(gt.rules?.skipTurnOnSix),
        multipleTokensPerSquare: Boolean(gt.rules?.multipleTokensPerSquare),
        safeZoneRules: gt.rules?.safeZoneRules ?? "standard",
        captureReward: Number(gt.rules?.captureReward ?? 0),
        bonusTurnOnSix: Boolean(gt.rules?.bonusTurnOnSix),
        timeoutPenalty: Number(gt.rules?.timeoutPenalty ?? 0),
        reconnectionTime: Number(gt.rules?.reconnectionTime ?? 0),
        disqualificationMoves: Number(gt.rules?.disqualificationMoves ?? 0),
        winningAmount: Number(gt.rules?.winningAmount ?? 0),
        powerUpsEnabled: Boolean(gt.rules?.powerUpsEnabled),
        allowCustomDice: Boolean(gt.rules?.allowCustomDice),
        killModeEnabled: Boolean(gt.rules?.killModeEnabled),
        quickGameTimerEnabled: Boolean(gt.rules?.quickGameTimerEnabled),
        rankingPoints: {
          first: Number(gt.rules?.rankingPoints?.first ?? 0),
          second: Number(gt.rules?.rankingPoints?.second ?? 0),
          third: Number(gt.rules?.rankingPoints?.third ?? 0),
          fourth: Number(gt.rules?.rankingPoints?.fourth ?? 0),
        },
      },
      specialSquares: gt.specialSquares || {},
      status: gt.isActive ? "ACTIVE" : "INACTIVE",
    };
    return payload;
  };

  const handleSaveGameType = async () => {
    if (!currentGameType) return;

    try {
      const payload = buildPayloadFromState(currentGameType as GameType);
      if (isEditMode) {
        await apiClient.put(`game-type/${currentGameType.id}`, payload);
        dispatch(
          showNotification({
            message: "Game type updated successfully",
            severity: "success",
          })
        );
      } else {
        await apiClient.post("game-type", payload);
        dispatch(
          showNotification({
            message: "Game type created successfully",
            severity: "success",
          })
        );
      }
      
      fetchGameTypes();
      handleCloseDialog();
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} game type`,
          severity: "error",
        })
      );
    }
  };

  const handleDeleteGameType = async (id: string) => {
    try {
      await apiClient.delete(`game-type/${id}`);
      dispatch(
        showNotification({
          message: "Game type deleted successfully",
          severity: "success",
        })
      );
      fetchGameTypes();
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: error.response?.data?.message || "Failed to delete game type",
          severity: "error",
        })
      );
    }
  };

  const handleToggleStatus = async (id: string, newStatus: boolean) => {
    try {
      await apiClient.patch(`game-type/${id}/toggle-status`, {
        isActive: newStatus,
        reason: newStatus ? "Activated from admin panel" : "Deactivated from admin panel",
      });
      dispatch(
        showNotification({
          message: `Game type ${newStatus ? 'activated' : 'deactivated'} successfully`,
          severity: "success",
        })
      );
      fetchGameTypes();
    } catch (error) {
      console.error("API Error:", error);
      dispatch(
        showNotification({
          message: error.response?.data?.message || "Failed to toggle game type status",
          severity: "error",
        })
      );
    }
  };

  const handleSelectGameType = (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (event.target.checked) {
      setSelectedGameTypes([...selectedGameTypes, id]);
    } else {
      setSelectedGameTypes(selectedGameTypes.filter(gameTypeId => gameTypeId !== id));
    }
  };

  const handleSelectAllGameTypes = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedGameTypes(gameTypes.map(gameType => gameType.id));
    } else {
      setSelectedGameTypes([]);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (currentGameType) {
      setCurrentGameType({
        ...currentGameType,
        [name]: value
      });
    }
  };

  const handleNestedInputChange = (parentPath: string, field: string, value: any) => {
    if (!currentGameType) return;
    // Support deep paths like 'rules.rankingPoints'
    const pathSegments = parentPath.split(".");
    const updated: any = { ...currentGameType };
    let cursor: any = updated;
    for (let i = 0; i < pathSegments.length; i += 1) {
      const key = pathSegments[i];
      if (i === pathSegments.length - 1) {
        cursor[key] = { ...(cursor[key] || {}), [field]: value };
      } else {
        cursor[key] = { ...(cursor[key] || {}) };
        cursor = cursor[key];
      }
    }
    setCurrentGameType(updated);
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    if (!currentGameType) return;
    setCurrentGameType({ ...currentGameType, [name]: checked } as GameType);
  };

  return (
    <div>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Game Types
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={handleOpenAddDialog}
        >
          Add Game Type
        </Button>
      </Stack>

      <ReusableTable
        columns={columns}
        data={gameTypes}
        page={page}
        rowsPerPage={rowsPerPage}
        count={totalCount}
        handleChangePage={handleChangePage}
        handleChangeRowsPerPage={handleChangeRowsPerPage}
        order={order}
        orderBy={orderBy}
        handleSort={handleSort}
        selectAllChecked={
          gameTypes.length > 0 && 
          selectedGameTypes.length === gameTypes.length
        }
        onSelectAll={handleSelectAllGameTypes}
        loading={loading}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {isEditMode ? "Edit Game Type" : "Add New Game Type"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={currentGameType?.name || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={currentGameType?.description || ''}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={2}
              />
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2">Active</Typography>
                <Switch
                  checked={Boolean(currentGameType?.isActive)}
                  onChange={(e) => handleSwitchChange('isActive', e.target.checked)}
                  color="success"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Min Players"
                  name="minPlayers"
                  type="number"
                  value={currentGameType?.minPlayers || 2}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Max Players"
                  name="maxPlayers"
                  type="number"
                  value={currentGameType?.maxPlayers || 2}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Stack>
              <TextField
                fullWidth
                label="Entry Fee"
                name="entryFee"
                type="number"
                value={currentGameType?.entryFee || ''}
                onChange={handleInputChange}
                margin="normal"
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Time Per Move (sec)"
                  name="timePerMove"
                  type="number"
                  value={currentGameType?.timePerMove || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Turn Time Limit (sec)"
                  name="turnTimeLimit"
                  type="number"
                  value={currentGameType?.turnTimeLimit || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Time Limit (sec)"
                  name="timeLimit"
                  type="number"
                  value={currentGameType?.timeLimit || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Max Moves"
                  name="maxMoves"
                  type="number"
                  value={currentGameType?.maxMoves || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Points To Win"
                  name="pointsToWin"
                  type="number"
                  value={currentGameType?.pointsToWin || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Stack>
              <TextField
                fullWidth
                label="Variant"
                name="variant"
                value={currentGameType?.variant || ''}
                onChange={handleInputChange}
                margin="normal"
                select
              >
                <MenuItem value="CLASSIC">Classic</MenuItem>
                <MenuItem value="KILL">Kill</MenuItem>
                <MenuItem value="QUICK">Quick</MenuItem>
              </TextField>
              
              {/* Rules Section */}
              <Typography variant="h6" sx={{ mt: 2 }}>Rules</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Capture Reward"
                  name="captureReward"
                  type="number"
                  value={currentGameType?.rules?.captureReward || 0}
                  onChange={(e) => handleNestedInputChange('rules', 'captureReward', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Reconnection Time (sec)"
                  name="reconnectionTime"
                  type="number"
                  value={currentGameType?.rules?.reconnectionTime || 0}
                  onChange={(e) => handleNestedInputChange('rules', 'reconnectionTime', e.target.value)}
                  margin="normal"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Safe Zone Rules</InputLabel>
                  <Select
                    value={currentGameType?.rules?.safeZoneRules || 'standard'}
                    onChange={(e) => handleNestedInputChange('rules', 'safeZoneRules', e.target.value)}
                    label="Safe Zone Rules"
                  >
                    <MenuItem value="standard">Standard</MenuItem>
                    <MenuItem value="extended">Extended</MenuItem>
                    <MenuItem value="none">None</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Timeout Penalty"
                  name="timeoutPenalty"
                  type="number"
                  value={currentGameType?.rules?.timeoutPenalty || 0}
                  onChange={(e) => handleNestedInputChange('rules', 'timeoutPenalty', e.target.value)}
                  margin="normal"
                />
              </Stack>
              <Stack direction="row" spacing={3} alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">Quick Game Timer</Typography>
                  <Switch
                    checked={Boolean(currentGameType?.rules?.quickGameTimerEnabled)}
                    onChange={(e) => handleNestedInputChange('rules', 'quickGameTimerEnabled', e.target.checked)}
                    color="primary"
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">Skip Turn On Six</Typography>
                  <Switch
                    checked={Boolean(currentGameType?.rules?.skipTurnOnSix)}
                    onChange={(e) => handleNestedInputChange('rules', 'skipTurnOnSix', e.target.checked)}
                    color="primary"
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">Multiple Tokens Per Square</Typography>
                  <Switch
                    checked={Boolean(currentGameType?.rules?.multipleTokensPerSquare)}
                    onChange={(e) => handleNestedInputChange('rules', 'multipleTokensPerSquare', e.target.checked)}
                    color="primary"
                  />
                </Stack>
              </Stack>
              <Stack direction="row" spacing={3} alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">Bonus Turn On Six</Typography>
                  <Switch
                    checked={Boolean(currentGameType?.rules?.bonusTurnOnSix)}
                    onChange={(e) => handleNestedInputChange('rules', 'bonusTurnOnSix', e.target.checked)}
                    color="primary"
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">Power Ups Enabled</Typography>
                  <Switch
                    checked={Boolean(currentGameType?.rules?.powerUpsEnabled)}
                    onChange={(e) => handleNestedInputChange('rules', 'powerUpsEnabled', e.target.checked)}
                    color="primary"
                  />
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2">Allow Custom Dice</Typography>
                  <Switch
                    checked={Boolean(currentGameType?.rules?.allowCustomDice)}
                    onChange={(e) => handleNestedInputChange('rules', 'allowCustomDice', e.target.checked)}
                    color="primary"
                  />
                </Stack>
              </Stack>
              
              {/* Ranking Points */}
              <Typography variant="subtitle1">Ranking Points</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="First Place"
                  name="first"
                  type="number"
                  value={currentGameType?.rules?.rankingPoints?.first || 0}
                  onChange={(e) => handleNestedInputChange('rules.rankingPoints', 'first', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Second Place"
                  name="second"
                  type="number"
                  value={currentGameType?.rules?.rankingPoints?.second || 0}
                  onChange={(e) => handleNestedInputChange('rules.rankingPoints', 'second', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Third Place"
                  name="third"
                  type="number"
                  value={currentGameType?.rules?.rankingPoints?.third || 0}
                  onChange={(e) => handleNestedInputChange('rules.rankingPoints', 'third', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Fourth Place"
                  name="fourth"
                  type="number"
                  value={currentGameType?.rules?.rankingPoints?.fourth || 0}
                  onChange={(e) => handleNestedInputChange('rules.rankingPoints', 'fourth', e.target.value)}
                  margin="normal"
                />
              </Stack>

              {/* Quick/Kill/Classic Specific Settings */}
              <Typography variant="subtitle1">Mode Settings</Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Quick Game Moves"
                  name="quickGameMoves"
                  type="number"
                  value={currentGameType?.quickGameMoves || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Quick Game Points"
                  name="quickGamePoints"
                  type="number"
                  value={currentGameType?.quickGamePoints || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Quick Game Time Limit (sec)"
                  name="quickGameTimeLimit"
                  type="number"
                  value={currentGameType?.quickGameTimeLimit || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  label="Kill Mode Points"
                  name="killModePoints"
                  type="number"
                  value={currentGameType?.killModePoints || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Kill Mode Bonus"
                  name="killModeBonus"
                  type="number"
                  value={currentGameType?.killModeBonus || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Life Count"
                  name="lifeCount"
                  type="number"
                  value={currentGameType?.lifeCount || 0}
                  onChange={handleInputChange}
                  margin="normal"
                />
              </Stack>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveGameType} 
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

export default GameTypes;