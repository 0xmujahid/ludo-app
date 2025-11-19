import { Router } from "express";
import * as tournamentController from "../controllers/tournamentController";
import { authenticate } from "../middlewares/authMiddleware";
import { RequestHandler } from "express";

const router = Router();

router.post(
  "/",
  authenticate as RequestHandler,
  tournamentController.createTournament as RequestHandler
);
router.post(
  "/:tournamentId/join",
  authenticate as RequestHandler,
  tournamentController.joinTournament as RequestHandler
);
router.get(
  "/",
  authenticate as RequestHandler,
  tournamentController.getTournaments as RequestHandler
);
router.get(
  "/:tournamentId",
  tournamentController.getTournamentDetails as RequestHandler
);
router.post(
  "/:tournamentId/advance",
  authenticate as RequestHandler,
  tournamentController.advanceTournament as RequestHandler
);
router.get(
  "/:tournamentId/standings",
  tournamentController.getTournamentStandings as RequestHandler
);

export default router;
