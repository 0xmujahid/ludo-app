import React, { useEffect, useState } from "react";
import { 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box, 
  Stack,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button
} from "@mui/material";
import {
  People,
  SportsEsports,
  EmojiEvents,
  Payment,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Settings,
  Refresh,
  Visibility
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  users: {
    total: number;
    active: number;
    newToday: number;
    verified: number;
  };
  games: {
    total: number;
    active: number;
    completed: number;
    waiting: number;
  };
  tournaments: {
    total: number;
    active: number;
    upcoming: number;
    completed: number;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
    totalAmount: number;
  };
  paymentMethods: {
    total: number;
    enabled: number;
    production: number;
  };
  system: {
    configs: number;
    activeConfig: string;
  };
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    users: { total: 0, active: 0, newToday: 0, verified: 0 },
    games: { total: 0, active: 0, completed: 0, waiting: 0 },
    tournaments: { total: 0, active: 0, upcoming: 0, completed: 0 },
    transactions: { total: 0, pending: 0, completed: 0, failed: 0, totalAmount: 0 },
    paymentMethods: { total: 0, enabled: 0, production: 0 },
    system: { configs: 0, activeConfig: "Default" }
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // In a real implementation, you would fetch this from a dashboard stats endpoint
      // For now, we'll simulate the data
      const mockStats: DashboardStats = {
        users: { total: 1250, active: 890, newToday: 23, verified: 756 },
        games: { total: 156, active: 34, completed: 98, waiting: 24 },
        tournaments: { total: 12, active: 3, upcoming: 5, completed: 4 },
        transactions: { total: 2340, pending: 45, completed: 2156, failed: 139, totalAmount: 1250000 },
        paymentMethods: { total: 5, enabled: 4, production: 3 },
        system: { configs: 3, activeConfig: "Production Config v2.1" }
      };
      setStats(mockStats);
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color = "primary", 
    trend, 
    onClick 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color?: "primary" | "success" | "warning" | "error" | "info";
    trend?: { value: number; isPositive: boolean };
    onClick?: () => void;
  }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 4
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                {trend.isPositive ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography 
                  variant="body2" 
                  color={trend.isPositive ? "success.main" : "error.main"}
                >
                  {trend.value}%
                </Typography>
              </Stack>
            )}
          </Box>
          <Box 
            sx={{ 
              p: 1, 
              borderRadius: 2, 
              backgroundColor: `${color}.light`,
              color: `${color}.main`
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const QuickActions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<People />}
              fullWidth
              onClick={() => navigate('/users')}
            >
              View Users
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<SportsEsports />}
              fullWidth
              onClick={() => navigate('/games')}
            >
              Active Games
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<Payment />}
              fullWidth
              onClick={() => navigate('/transactions')}
            >
              Transactions
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              fullWidth
              onClick={() => navigate('/settings')}
            >
              Settings
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const SystemStatus = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          System Status
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <Settings color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Active Configuration"
              secondary={stats.system.activeConfig}
            />
            <Chip label="Active" color="success" size="small" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <AccountBalance color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Payment Methods"
              secondary={`${stats.paymentMethods.enabled}/${stats.paymentMethods.total} enabled`}
            />
            <Chip label={`${stats.paymentMethods.production} production`} color="primary" size="small" />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <SportsEsports color="info" />
            </ListItemIcon>
            <ListItemText
              primary="Active Games"
              secondary={`${stats.games.active} currently running`}
            />
            <Chip label={`${stats.games.waiting} waiting`} color="info" size="small" />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );

  const RecentActivity = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <People color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="New user registered"
              secondary="2 minutes ago"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <Payment color="success" />
            </ListItemIcon>
            <ListItemText
              primary="Payment completed"
              secondary="₹500 - 5 minutes ago"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <SportsEsports color="info" />
            </ListItemIcon>
            <ListItemText
              primary="Game completed"
              secondary="Room ABC123 - 10 minutes ago"
            />
          </ListItem>
          <Divider />
          <ListItem>
            <ListItemIcon>
              <EmojiEvents color="warning" />
            </ListItemIcon>
            <ListItemText
              primary="Tournament started"
              secondary="Grand Championship 2024 - 15 minutes ago"
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard Overview
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchDashboardStats}
        >
          Refresh
        </Button>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.users.total.toLocaleString()}
            subtitle={`${stats.users.active} active`}
            icon={<People />}
            color="primary"
            trend={{ value: 12, isPositive: true }}
            onClick={() => navigate('/users')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Games"
            value={stats.games.active}
            subtitle={`${stats.games.waiting} waiting`}
            icon={<SportsEsports />}
            color="success"
            onClick={() => navigate('/games')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Tournaments"
            value={stats.tournaments.active}
            subtitle={`${stats.tournaments.upcoming} upcoming`}
            icon={<EmojiEvents />}
            color="warning"
            onClick={() => navigate('/tournaments')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`₹${(stats.transactions.totalAmount / 100000).toFixed(1)}L`}
            subtitle={`${stats.transactions.completed} transactions`}
            icon={<Payment />}
            color="info"
            trend={{ value: 8, isPositive: true }}
            onClick={() => navigate('/transactions')}
          />
        </Grid>
      </Grid>

      {/* Additional Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="New Users Today"
            value={stats.users.newToday}
            icon={<People />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed Games"
            value={stats.games.completed}
            icon={<SportsEsports />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Transactions"
            value={stats.transactions.pending}
            icon={<Payment />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Payment Methods"
            value={stats.paymentMethods.enabled}
            subtitle={`${stats.paymentMethods.production} production`}
            icon={<AccountBalance />}
            color="info"
            onClick={() => navigate('/payment-methods')}
          />
        </Grid>
      </Grid>

      {/* Quick Actions and System Status */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <QuickActions />
        </Grid>
        <Grid item xs={12} md={4}>
          <SystemStatus />
        </Grid>
        <Grid item xs={12} md={4}>
          <RecentActivity />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

