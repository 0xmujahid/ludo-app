import { Request, Response } from "express";
import { getDataSource } from "../config/database";
import { GameType } from "../entities/GameType";
import { logger } from "../utils/logger";
import { AppDataSource } from "../config/database";
import { ZodError } from "zod";
import { gameTypeSchema } from "../types/gameType";
import { Repository, DeepPartial } from "typeorm";
import { GameVariant } from "../types/game";
import { Config } from "../entities/Config";

export class GameTypeController {
  private static instance: GameTypeController;
  private gameTypeRepo: Repository<GameType> | null = null;

  private constructor() {}

  private async ensureRepository() {
    if (!this.gameTypeRepo) {
      try {
        const dataSource = await getDataSource(); // Added await here
        if (!dataSource.isInitialized) {
          throw new Error("Database connection not initialized");
        }
        this.gameTypeRepo = dataSource.getRepository(GameType);
      } catch (error) {
        logger.error("Failed to initialize GameType repository:", error);
        throw error;
      }
    }
    return this.gameTypeRepo;
  }

  public static getInstance(): GameTypeController {
    if (!GameTypeController.instance) {
      GameTypeController.instance = new GameTypeController();
    }
    return GameTypeController.instance;
  }

  // Admin: Create new game type
  public create = async (req: Request, res: Response) => {
    try {
      const repo = await this.ensureRepository();

      // Parse and validate the request data with default values
      const validatedData = gameTypeSchema.parse({
        name: req.body.name,
        description: req.body.description,
        maxPlayers: req.body.maxPlayers ?? 4,
        entryFee: req.body.entryFee ?? 0,
        variant: req.body.variant ?? GameVariant.CLASSIC,
        configId: req.body.configId,
        rules: {
          skipTurnOnSix: false,
          multipleTokensPerSquare: false,
          safeZoneRules: "standard",
          captureReward: 10,
          bonusTurnOnSix: true,
          timeoutPenalty: 5,
          ...req.body.rules,
        },
        specialSquares: {
          "1": { type: "safe" },
          "9": { type: "safe" },
          "14": { type: "safe" },
          "22": { type: "safe" },
          "27": { type: "safe" },
          "35": { type: "safe" },
          "40": { type: "safe" },
          "48": { type: "safe" },
          "57": { type: "home" },
          ...req.body.specialSquares,
        },
      });

      logger.info("Creating new game type with data:", validatedData);

      // Create and save the game type
      const gameType = repo.create(validatedData as DeepPartial<GameType>);
      const savedGameType = await repo.save(gameType);

      logger.info("New game type created:", {
        id: savedGameType.id,
        name: savedGameType.name,
      });
      return res.status(201).json(savedGameType);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Validation error while creating game type:", {
          errors: error.errors,
          receivedData: req.body,
        });
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }
      logger.error("Error creating game type:", error);
      return res.status(500).json({ error: "Failed to create game type" });
    }
  };

  // Admin: Update game type
  public update = async (req: Request, res: Response) => {
    try {
      const repo = await this.ensureRepository();
      const { id } = req.params;
      const validatedData = gameTypeSchema.partial().parse(req.body);

      const gameType = await repo.findOneBy({ id });
      if (!gameType) {
        return res.status(404).json({ error: "Game type not found" });
      }

      Object.assign(gameType, validatedData);
      await repo.save(gameType);

      logger.info("Game type updated:", { id: gameType.id });
      return res.json(gameType);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }
      logger.error("Error updating game type:", error);
      return res.status(500).json({ error: "Failed to update game type" });
    }
  };

  // Admin: Get single game type
  public get = async (req: Request, res: Response) => {
    try {
      const repo = await this.ensureRepository();
      const { id } = req.params;
      const gameType = await repo.findOneBy({ id });

      if (!gameType) {
        return res.status(404).json({ error: "Game type not found" });
      }

      const configRepository = (await getDataSource()).getRepository(Config);
      const config = await configRepository.findOne({
        where: { id: gameType.configId },
      });

      const gameTypeResponse = {
        ...gameType,
        ...(config ? { fee: config.fee, tds: config.tds } : {}),
      };

      if (!config) {
        const defaultConfig = await configRepository.findOne({
          where: { status: true },
        });
        if (defaultConfig) {
          gameTypeResponse.fee = defaultConfig.fee;
          gameTypeResponse.tds = defaultConfig.tds;
        }
      }

      return res.json(gameTypeResponse);
    } catch (error) {
      logger.error("Error fetching game type:", error);
      return res.status(500).json({ error: "Failed to fetch game type" });
    }
  };

  // Admin: Toggle game type status
  public toggleStatus = async (req: Request, res: Response) => {
    try {
      const repo = await this.ensureRepository();
      const { id } = req.params;
      const gameType = await repo.findOneBy({ id });

      if (!gameType) {
        return res.status(404).json({ error: "Game type not found" });
      }

      gameType.isActive = !gameType.isActive;
      await repo.save(gameType);

      logger.info("Game type status toggled:", {
        id,
        isActive: gameType.isActive,
      });
      return res.json({ id, isActive: gameType.isActive });
    } catch (error) {
      logger.error("Error toggling game type status:", error);
      return res
        .status(500)
        .json({ error: "Failed to toggle game type status" });
    }
  };

  // Public: Get single game type details by ID (for users)
  public getById = async (req: Request, res: Response) => {
    try {
      const repo = await this.ensureRepository();
      const { id } = req.params;
      
      // Find the game type and make sure it's active
      const gameType = await repo.findOne({
        where: { id, isActive: true }
      });

      if (!gameType) {
        return res.status(404).json({ error: "Game type not found or not active" });
      }

      // Get config data for fee and TDS information
      const configRepository = (await getDataSource()).getRepository(Config);
      const config = await configRepository.findOne({
        where: { id: gameType.configId },
      });

      // Prepare comprehensive response with all GameType details
      const gameTypeResponse = {
        id: gameType.id,
        name: gameType.name,
        description: gameType.description,
        variant: gameType.variant,
        
        // Player configuration
        maxPlayers: gameType.maxPlayers,
        minPlayers: gameType.minPlayers,
        
        // Game timing
        timeLimit: gameType.timeLimit,
        turnTimeLimit: gameType.turnTimeLimit,
        timePerMove: gameType.timePerMove,
        
        // Points and scoring
        pointsToWin: gameType.pointsToWin,
        maxMoves: gameType.maxMoves,
        quickGameMoves: gameType.quickGameMoves,
        quickGamePoints: gameType.quickGamePoints,
        quickGameTimeLimit: gameType.quickGameTimeLimit,
        
        // Kill mode settings
        killModePoints: gameType.killModePoints,
        lifeCount: gameType.lifeCount,
        killModeBonus: gameType.killModeBonus,
        
        // Classic mode bonuses
        classicBonusPoints: gameType.classicBonusPoints,
        classicPenaltyPoints: gameType.classicPenaltyPoints,
        
        // Entry fee and financial
        entryFee: gameType.entryFee,
        
        // Prize distributions
        twoPlayers: gameType.twoPlayers,
        threePlayers: gameType.threePlayers,
        fourPlayers: gameType.fourPlayers,
        
        // Game rules and customization
        rules: gameType.rules,
        specialSquares: gameType.specialSquares,
        
        // Status and metadata
        isActive: gameType.isActive,
        configId: gameType.configId,
        createdAt: gameType.createdAt,
        updatedAt: gameType.updatedAt,
        
        // Config-based financial information
        ...(config ? { fee: config.fee, tds: config.tds } : {}),
      };

      // If no specific config found, try to get default config
      if (!config) {
        const defaultConfig = await configRepository.findOne({
          where: { status: true },
        });
        if (defaultConfig) {
          gameTypeResponse.fee = defaultConfig.fee;
          gameTypeResponse.tds = defaultConfig.tds;
        }
      }

      logger.info("GameType details fetched:", { 
        id: gameType.id, 
        name: gameType.name,
        variant: gameType.variant 
      });

      return res.json(gameTypeResponse);
    } catch (error) {
      logger.error("Error fetching game type details:", error);
      return res.status(500).json({ error: "Failed to fetch game type details" });
    }
  };

  // User: List game types with filters
  public list = async (req: Request, res: Response) => {
    try {
      const repo = await this.ensureRepository();
      const {
        isActive,
        maxPlayers,
        variant,
        search,
        limit = 10,
        offset = 0,
      } = req.query;

      const queryBuilder = repo.createQueryBuilder("gameType");

      if (isActive !== undefined) {
        queryBuilder.andWhere("gameType.isActive = :isActive", {
          isActive: isActive === "true",
        });
      }

      if (maxPlayers) {
        queryBuilder.andWhere("gameType.maxPlayers = :maxPlayers", {
          maxPlayers: Number(maxPlayers),
        });
      }

      if (variant) {
        queryBuilder.andWhere("gameType.variant = :variant", { variant });
      }

      if (search) {
        queryBuilder.andWhere(
          "(gameType.name ILIKE :search OR gameType.description ILIKE :search)",
          { search: `%${search}%` },
        );
      }

      queryBuilder
        .take(Number(limit))
        .skip(Number(offset))
        .orderBy("gameType.name", "ASC");

      const [gameTypes, total] = await queryBuilder.getManyAndCount();

      // Fetch configuration for each game type
      const configRepository = (await getDataSource()).getRepository(Config);
      const gameTypeResponses = await Promise.all(
        gameTypes.map(async (gameType) => {
          const config = await configRepository.findOne({
            where: { id: gameType.configId },
          });

          const gameTypeResponse = {
            ...gameType,
            ...(config ? { fee: config.fee, tds: config.tds } : {}),
          };

          if (!config) {
            const defaultConfig = await configRepository.findOne({
              where: { status: true },
            });
            if (defaultConfig) {
              gameTypeResponse.fee = defaultConfig.fee;
              gameTypeResponse.tds = defaultConfig.tds;
            }
          }

          return gameTypeResponse;
        }),
      );

      return res.json({
        data: gameTypeResponses,
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error) {
      logger.error("Error listing game types:", error);
      return res.status(500).json({ error: "Failed to list game types" });
    }
  };

  // Admin: Delete game type
  public delete = async (req: Request, res: Response) => {
    try {
      const repo = await this.ensureRepository();
      const { id } = req.params;
      const gameType = await repo.findOneBy({ id });

      if (!gameType) {
        return res.status(404).json({ error: "Game type not found" });
      }

      await repo.softDelete(id);
      logger.info("Game type deleted:", { id });
      return res.status(204).send();
    } catch (error) {
      logger.error("Error deleting game type:", error);
      return res.status(500).json({ error: "Failed to delete game type" });
    }
  };
}

export default GameTypeController.getInstance();