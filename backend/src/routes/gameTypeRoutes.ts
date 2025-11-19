import express from "express";
import { authenticate, isAdmin } from "../middlewares/authMiddleware";
import gameTypeController from "../controllers/gameTypeController";

const router = express.Router();

// Admin routes (protected by isAdmin middleware)
router.post("/", authenticate, isAdmin, gameTypeController.create);
router.put("/:id", authenticate, isAdmin, gameTypeController.update);
router.delete("/:id", authenticate, isAdmin, gameTypeController.delete);
router.get("/admin/:id", authenticate, isAdmin, gameTypeController.get);
router.patch(
  "/:id/toggle-status",
  authenticate,
  isAdmin,
  gameTypeController.toggleStatus
);

// User routes
router.get("/", gameTypeController.list);
router.get("/details/:id", gameTypeController.getById);

export default router;
