import { Router } from "express";
import * as gameController from "../controllers/gameController";
import { authenticate } from "../middlewares/authMiddleware";
import { RequestHandler } from "express";

const router = Router();

router.post("/", authenticate, gameController.createGame);
router.post("/:gameId/join", authenticate, gameController.joinGame);
router.post(
  "/matchmaking/leave",
  authenticate,
  gameController.leaveMatchmaking,
);
router.post("/matchmaking", authenticate, gameController.joinMatchmaking);
router.post("/:gameId/roll", authenticate, gameController.rollDice);
router.post("/:gameId/move", authenticate, gameController.movePiece);
router.get("/:gameId", authenticate, gameController.getGameState);
router.get("/active", authenticate, gameController.getActiveGames);
// Add new endpoint to check if user can rejoin a game
router.get("/:gameId/can-rejoin", authenticate, gameController.canRejoinGame);
// Add rejoin game endpoint
router.post("/:gameId/rejoin", authenticate, gameController.rejoinGame);
// Add leave game endpoint
router.post("/leave", authenticate, gameController.leaveGame);

export default router;