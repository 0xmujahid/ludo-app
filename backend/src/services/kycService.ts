import { Repository, DataSource } from "typeorm";
import { KYC } from "../entities/KYC";
import { User } from "../entities/User";
import { KYCStatus, KYCVerificationMetadata } from "../types/auth";
import { logger } from "../utils/logger";
import { getDataSource } from "../config/database";

export class KYCService {
  private kycRepository?: Repository<KYC>;
  private userRepository?: Repository<User>;
  private initialized: boolean = false;
  private initializationPromise?: Promise<void>;

  constructor() {
    // Add event listeners for unhandled rejections specifically for KYC service
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection in KYC Service:", {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    // Don't initialize in constructor - we'll do lazy initialization
    logger.info("KYC service instance created - will initialize on first use");
  }

  private async initializeRepositories(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = (async () => {
      try {
        // Get data source with retries
        let dataSource: DataSource | null = null;
        let retries = 0;
        const maxRetries = 5;

        while (!dataSource && retries < maxRetries) {
          try {
            // Use await here since getDataSource is now async
            dataSource = await getDataSource();
            if (!dataSource.isInitialized) {
              throw new Error("DataSource not initialized");
            }
          } catch (err) {
            retries++;
            logger.warn(
              `KYC Service: Database connection attempt ${retries}/${maxRetries} failed:`,
              {
                error: err instanceof Error ? err.message : "Unknown error",
              }
            );
            if (retries >= maxRetries) throw err;
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 10000))
            );
          }
        }

        if (!dataSource) {
          throw new Error("Failed to get database connection");
        }

        // Initialize repositories
        this.kycRepository = dataSource.getRepository(KYC);
        this.userRepository = dataSource.getRepository(User);

        // Verify repositories with more detailed error handling
        try {
          await Promise.all([
            this.kycRepository.metadata.connection.query("SELECT 1"),
            this.userRepository.metadata.connection.query("SELECT 1"),
          ]);

          this.initialized = true;
          logger.info("KYC repositories initialized successfully", {
            kycRepoStatus: !!this.kycRepository,
            userRepoStatus: !!this.userRepository,
          });
        } catch (verifyError) {
          throw new Error(
            `Repository verification failed: ${verifyError.message}`
          );
        }
      } catch (error) {
        this.initialized = false;
        logger.error("Failed to initialize KYC repositories:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        this.initializationPromise = null;
        throw error;
      }
    })();

    await this.initializationPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeRepositories();
    }
  }

  async submitKYC(
    userId: string,
    kycData: {
      aadharNumber: string;
      panNumber: string;
      aadharPhotoUrl: string;
      panPhotoUrl: string;
      selfiePhotoUrl: string;
    }
  ): Promise<KYC> {
    await this.ensureInitialized();

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error("User not found");
      }

      const existingKYC = await this.kycRepository.findOne({
        where: { userId },
      });
      if (existingKYC) {
        throw new Error("KYC already submitted");
      }

      // Validate KYC data
      const aadharRegex = /^\d{12}$/; // Aadhar number should be 12 digits
      const panRegex = /^[A-Z]{5}\d{4}[A-Z]{1}$/; // PAN number format

      if (!aadharRegex.test(kycData.aadharNumber)) {
        throw new Error("Invalid Aadhar number format");
      }

      if (!panRegex.test(kycData.panNumber)) {
        throw new Error("Invalid PAN number format");
      }

      if (
        !kycData.aadharPhotoUrl ||
        !kycData.panPhotoUrl ||
        !kycData.selfiePhotoUrl
      ) {
        throw new Error("All photo URLs must be provided");
      }

      const kyc = this.kycRepository.create({
        userId,
        ...kycData,
        status: KYCStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await this.userRepository.save({
        ...user,
        kycStatus: KYCStatus.PENDING,
        kycSubmittedAt: new Date(),
        updatedAt: new Date(),
      });

      const savedKYC = await this.kycRepository.save(kyc);
      logger.info(`KYC submitted for user ${userId}`, {
        userId,
        kycId: savedKYC.id,
        status: savedKYC.status,
      });

      return savedKYC;
    } catch (error) {
      logger.error("Error submitting KYC:", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async getKYCStatus(userId: string): Promise<{
    status: KYCStatus;
    submittedAt?: Date;
    verifiedAt?: Date | null;
    kycDetails?: KYC;
  }> {
    await this.ensureInitialized();

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new Error("User not found");
      }

      const kyc = await this.kycRepository.findOne({ where: { userId } });
      return {
        status: user.kycStatus,
        submittedAt: user.kycSubmittedAt,
        verifiedAt: user.kycVerifiedAt,
        kycDetails: kyc || undefined,
      };
    } catch (error) {
      logger.error("Error getting KYC status:", {
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async verifyKYC(
    kycId: string,
    adminId: string,
    isApproved: boolean,
    rejectionReason?: string
  ): Promise<{
    status: KYCStatus;
    submittedAt?: Date;
    verifiedAt?: Date | null;
    kycDetails?: KYC;
  }> {
    await this.ensureInitialized();

    try {
      const kyc = await this.kycRepository.findOne({ where: { id: kycId } });
      if (!kyc) {
        throw new Error("KYC record not found");
      }

      const newStatus = isApproved ? KYCStatus.VERIFIED : KYCStatus.REJECTED;
      const verificationMetadata: KYCVerificationMetadata = {
        verifiedAt: new Date(),
        verifiedBy: adminId,
        comments: rejectionReason,
      };

      // Update KYC verification metadata
      await this.kycRepository.update(kycId, {
        status: newStatus,
        verificationMetadata,
        rejectionReason,
        updatedAt: new Date(),
      });

      // Update user KYC status
      await this.userRepository.update(kyc.userId, {
        kycStatus: newStatus,
        kycVerifiedAt: isApproved ? new Date() : null,
        updatedAt: new Date(),
      } as Partial<User>);

      logger.info(`KYC ${isApproved ? "verified" : "rejected"}`, {
        kycId,
        userId: kyc.userId,
        adminId,
        newStatus,
      });

      return this.getKYCStatus(kyc.userId);
    } catch (error) {
      logger.error("Error verifying KYC:", {
        error: error instanceof Error ? error.message : "Unknown error",
        kycId,
        adminId,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }
}

export const kycService = new KYCService();
