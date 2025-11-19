// @ts-nocheck
import { Request, Response } from "express";
import * as adminService from "../services/adminService";
import { UserRole } from "../entities/User";
import { AuthenticatedRequest } from "../types/common";
import { TournamentFormat } from "../entities/Tournament";
import * as walletService from "../services/walletService"; // Import walletService
import { RequestHandler } from 'express';

export const getAllUsers: RequestHandler = async (req: Request, res: Response) => {
  try {
    const users = await adminService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUserById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

export const updateUser: RequestHandler = async (req: Request, res: Response) => {
  try {
    const user = await adminService.updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const deleteUser: RequestHandler = async (req: Request, res: Response) => {
  try {
    await adminService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

export const getUserDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await adminService.getUserDetails(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }
    const updatedUser = await adminService.updateUserRole(userId, role);
    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getGameStatistics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const statistics = await adminService.getGameStatistics();
    res.json(statistics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTournamentStatistics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const statistics = await adminService.getTournamentStatistics();
    res.json(statistics);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllTournaments: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tournaments = await adminService.getAllTournaments();
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tournaments' });
  }
};

export const getTournamentById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tournament = await adminService.getTournamentById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tournament' });
  }
};

export const updateTournament: RequestHandler = async (req: Request, res: Response) => {
  try {
    const tournament = await adminService.updateTournament(req.params.id, req.body);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update tournament' });
  }
};

export const deleteTournament: RequestHandler = async (req: Request, res: Response) => {
  try {
    await adminService.deleteTournament(req.params.id);
    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete tournament' });
  }
};

export const getAllConfigs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const configs = await adminService.getAllConfigs();
    res.json(configs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getConfigDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const configId = parseInt(req.params.configId, 10);
    const config = await adminService.getConfigDetails(configId);
    if (!config) {
      res.status(404).json({ message: "Config not found" });
      return;
    }
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createConfig = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      tds,
      fee,
      cashback,
      referralAmount,
      name,
      status = false,
      twoPlayer,
      threePlayer,
      fourPlayer,
      whatsapp,
      telegram,
      email,
    } = req.body;

    // Validate required fields
    if (!twoPlayer || !threePlayer || !fourPlayer) {
      res.status(400).json({ message: "Player configurations are required" });
      return;
    }

    if (referralAmount === undefined || referralAmount < 0) {
      res.status(400).json({ message: "Valid referralAmount is required" });
      return;
    }

    const config = await adminService.createConfig({
      tds,
      fee,
      cashback,
      referralAmount,
      name,
      status,
      twoPlayer,
      threePlayer,
      fourPlayer,
      whatsapp,
      telegram,
      email,
    });
    res.status(201).json(config);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateConfig = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const configId = parseInt(req.params.configId, 10);
    const updateData = req.body;
    const updatedConfig = await adminService.updateConfig(configId, updateData);
    res.json(updatedConfig);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteConfig = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const configId = parseInt(req.params.configId, 10);
    await adminService.deleteConfig(configId);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const adminUpdateWithdrawalUpi = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId, withdrawalUpi } = req.body;

    if (!withdrawalUpi) {
      res.status(400).json({ message: "Withdrawal UPI is required" });
      return;
    }

    const updatedWallet = await walletService.adminUpdateWithdrawalUpi(userId, withdrawalUpi);
    res.json({ message: "Withdrawal UPI updated successfully", wallet: updatedWallet });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    res.status(400).json({ message: errorMessage });
  }
};

export const getActiveConfig = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const activeConfig = await adminService.getActiveConfig();
    res.json(activeConfig);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

// Game management
export const getAllGames: RequestHandler = async (req: Request, res: Response) => {
  try {
    const games = await adminService.getAllGames();
    res.json(games);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch games' });
  }
};

export const getGameById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const game = await adminService.getGameById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch game' });
  }
};

export const updateGame: RequestHandler = async (req: Request, res: Response) => {
  try {
    const game = await adminService.updateGame(req.params.id, req.body);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update game' });
  }
};

export const deleteGame: RequestHandler = async (req: Request, res: Response) => {
  try {
    await adminService.deleteGame(req.params.id);
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete game' });
  }
};

// Game type management
export const getAllGameTypes: RequestHandler = async (req: Request, res: Response) => {
  try {
    const gameTypes = await adminService.getAllGameTypes();
    res.json(gameTypes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch game types' });
  }
};

export const createGameType: RequestHandler = async (req: Request, res: Response) => {
  try {
    const gameType = await adminService.createGameType(req.body);
    res.status(201).json(gameType);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create game type' });
  }
};

export const updateGameType: RequestHandler = async (req: Request, res: Response) => {
  try {
    const gameType = await adminService.updateGameType(req.params.id, req.body);
    if (!gameType) {
      return res.status(404).json({ message: 'Game type not found' });
    }
    res.json(gameType);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update game type' });
  }
};

export const deleteGameType: RequestHandler = async (req: Request, res: Response) => {
  try {
    await adminService.deleteGameType(req.params.id);
    res.json({ message: 'Game type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete game type' });
  }
};

// Other existing functions...
