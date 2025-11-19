import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/common";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";

export const isAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user || user.role !== "admin") {
      res
        .status(403)
        .json({ message: "Access denied: Admin privileges required" });
      return;
    }

    next();
  } catch (error) {
    console.error("Role middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
