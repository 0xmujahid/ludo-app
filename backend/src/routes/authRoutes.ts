import {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import { AuthController } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";
import { validatePhoneNumber, validateOTP } from "../utils/validationUtils";
import { logger } from "../utils/logger";

const router = Router();
const authController = new AuthController();

// Test route to verify auth router is mounted
router.get("/status", (req: Request, res: Response) => {
  res.json({
    status: "success",
    message: "Auth routes are working",
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
router.post("/register", (async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Basic validation
    const { phoneNumber, username } = req.body;

    // Log the incoming request
    logger.info("Registration attempt:", { phoneNumber, username });

    if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
      logger.warn("Invalid phone number format:", { phoneNumber });
      return res.status(400).json({
        status: "error",
        message: "Invalid phone number format",
      });
    }

    // Call the controller method
    await authController.register(req, res);
  } catch (error) {
    logger.error("Registration error:", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    if (error instanceof Error && error.message.includes("already exists")) {
      return res.status(409).json({
        status: "error",
        message: error.message,
      });
    }
    next(error);
  }
}) as RequestHandler);

router.post(
  "/request-otp",
  ((req: Request, res: Response, next: NextFunction) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid phone number format",
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,
  authController.requestOTP.bind(authController) as RequestHandler
);

router.post(
  "/verify",
  ((req: Request, res: Response, next: NextFunction) => {
    try {
      const { phoneNumber, otp } = req.body;
      if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid phone number format",
        });
      }
      if (!otp || !validateOTP(otp)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid OTP format",
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  }) as RequestHandler,
  authController.verifyAndLogin.bind(authController) as RequestHandler
);

// Protected routes that require authentication
router.get(
  "/verify-token",
  authenticate as RequestHandler,
  authController.verifyToken.bind(authController) as RequestHandler // Updated line
);

export default router;
