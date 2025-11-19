import express, {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import * as paymentController from "../controllers/paymentController";
import * as paymentConfigController from "../controllers/paymentConfigController";
import { authenticate } from "../middlewares/authMiddleware";
import { WebhookRequest } from "../types/payment";

const router: Router = Router();

// Debug middleware
const logHeaders: RequestHandler = (req, res, next) => {
  console.log("Auth headers:", req.headers);
  next();
};

// Webhook signature validator middleware
const validateWebhookSignature: RequestHandler = (req, res, next) => {
  const provider = req.params.provider;
  if (provider.toLowerCase() !== "paytm") {
    const signature = req.headers["x-webhook-signature"];
    if (!signature) {
      res.status(401).json({
        success: false,
        message: "Missing webhook signature",
        code: "MISSING_SIGNATURE",
      });
      return;
    }
  }
  (req as Request & WebhookRequest).webhookProvider = provider;
  next();
};

// Paytm payment routes
router.post(
  "/paytm/initiate",
  authenticate,
  logHeaders,
  paymentController.initiatePaytmPayment
);

router.post(
  "/paytm/callback",
  paymentController.handlePaytmCallback
);

// Payment webhook routes
// GET endpoint for testing webhook URL availability
router.get("/webhook/:provider", ((req: Request, res: Response) => {
  res.json({
    success: true,
    message: `Webhook endpoint for ${req.params.provider} is available`,
    supported_methods: ["POST"],
    documentation: "Use POST method to submit webhook data",
  });
}) as RequestHandler);

// POST endpoint for actual webhook processing
router.post(
  "/webhook/:provider",
  express.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
      (req as any).rawBody = buf.toString(); // Save raw body for signature verification
    },
    limit: "100kb", // Limit payload size
  }),
  validateWebhookSignature,
  (req: Request, res: Response) => 
    paymentController.handleWebhook(req as Request & WebhookRequest, res)
);

// Transaction routes
router.get(
  "/transaction/:transactionId",
  authenticate,
  paymentController.getTransactionStatus
);

router.get(
  "/transactions/history",
  authenticate,
  paymentController.getTransactionHistory
);

router.get(
  "/transaction/filter/:status",
  authenticate,
  paymentController.getTransactionHistoryFilter
);

// Payment configuration routes
router.get(
  "/config/manual",
  authenticate,
  paymentConfigController.getManualPaymentConfig
);

router.get(
  "/config/manual/status",
  paymentConfigController.checkManualPaymentStatus
);

router.post(
  "/config/manual/validate",
  paymentConfigController.validateManualPaymentAmount
);

router.get(
  "/config/methods",
  paymentConfigController.getAvailablePaymentMethods
);

router.post(
  "/config/validate",
  paymentConfigController.validatePaymentAmount
);

export default router;
