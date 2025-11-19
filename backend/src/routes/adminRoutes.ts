import { Router } from "express";
import * as adminController from "../controllers/adminController";
import { authenticate, authorizeAdmin } from "../middlewares/authMiddleware";
import { RequestHandler } from "express";

const router = Router();

// Admin routes
router.use(authenticate as RequestHandler);
router.get(
  "/configs/active",
  adminController.getActiveConfig as RequestHandler,
);
router.use(authorizeAdmin as RequestHandler);

// User management routes
router.get("/users", adminController.getAllUsers as RequestHandler);
router.get("/users/:id", adminController.getUserById as RequestHandler);
router.put("/users/:id", adminController.updateUser as RequestHandler);
router.delete("/users/:id", adminController.deleteUser as RequestHandler);

// Game management routes
router.get("/games", adminController.getAllGames as RequestHandler);
router.get("/games/:id", adminController.getGameById as RequestHandler);
router.put("/games/:id", adminController.updateGame as RequestHandler);
router.delete("/games/:id", adminController.deleteGame as RequestHandler);

// Tournament management routes
router.get("/tournaments", adminController.getAllTournaments as RequestHandler);
router.get(
  "/tournaments/:id",
  adminController.getTournamentById as RequestHandler,
);
router.put(
  "/tournaments/:id",
  adminController.updateTournament as RequestHandler,
);
router.delete(
  "/tournaments/:id",
  adminController.deleteTournament as RequestHandler,
);

// Game type management routes
router.get("/game-types", adminController.getAllGameTypes as RequestHandler);
router.post("/game-types", adminController.createGameType as RequestHandler);
router.put("/game-types/:id", adminController.updateGameType as RequestHandler);
router.delete(
  "/game-types/:id",
  adminController.deleteGameType as RequestHandler,
);

// Config management routes
router.get("/configs", adminController.getAllConfigs as RequestHandler);

router.get(
  "/configs/:configId",
  adminController.getConfigDetails as RequestHandler,
);
router.post("/configs", adminController.createConfig as RequestHandler);
router.put(
  "/configs/:configId",
  adminController.updateConfig as RequestHandler,
);
router.delete(
  "/configs/:configId",
  adminController.deleteConfig as RequestHandler,
);

router.post(
  "/admin/update-withdrawal-upi",
  adminController.adminUpdateWithdrawalUpi,
);

export default router;
