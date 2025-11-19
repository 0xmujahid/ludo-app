import { AppDataSource } from "../config/database";
import { v4 as uuidv4 } from "uuid";
import { User, UserRole, Gender, KYCStatus } from "../entities/User";
import { validatePhoneNumber } from "../utils/validationUtils";
import { Wallet } from "../entities/Wallet";
import { MoreThan } from "typeorm";
import * as adminService from "./adminService";

interface CreateUserData {
  phoneNumber: string;
  username?: string;
  email?: string;
  password?: string;
  gender?: Gender;
  avatarUrl?: string;
  kycStatus?: KYCStatus;
  kycSubmittedAt?: Date | null;
  kycVerifiedAt?: Date | null;
  referralCode?: string;
}

function generateUniqueUserId(): string {
  return uuidv4();
}

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const createUser = async (userData: CreateUserData): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);

  if (!userData.phoneNumber) {
    throw new Error("Phone number is required");
  }

  if (
    !userData.username ||
    userData.username.length < 3 ||
    userData.username.length > 30
  ) {
    throw new Error("Username must be between 3 and 30 characters long");
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(userData.username)) {
    throw new Error(
      "Username can only contain alphanumeric characters and underscores"
    );
  }

  if (!validatePhoneNumber(userData.phoneNumber)) {
    throw new Error("Invalid phone number format");
  }

  const existingUser = await userRepository.findOne({
    where: [
      { username: userData.username },
      { phoneNumber: userData.phoneNumber },
    ],
  });

  if (existingUser) {
    throw new Error("Username or phone number already exists");
  }

  // Handle referral code if provided
  let referrerUser = null;
  if (userData.referralCode) {
    referrerUser = await userRepository.findOne({
      where: { referralCode: userData.referralCode }
    });
    if (!referrerUser) {
      throw new Error("Invalid referral code");
    }
  }

  const userEntity = new User();
  const referralCode = generateReferralCode();

  Object.assign(userEntity, {
    ...userData,
    role: UserRole.PLAYER,
    isVerified: false,
    eloRating: 1,
    gamesWon: 0,
    totalGamesPlayed: 0,
    kycStatus: userData.kycStatus || KYCStatus.NOT_SUBMITTED,
    kycSubmittedAt: userData.kycSubmittedAt || null,
    kycVerifiedAt: userData.kycVerifiedAt || null,
    createdAt: new Date(),
    referralCode,
    referredBy: referrerUser?.id || null,
    totalReferrals: 0,
    totalReferralEarnings: 0,
    referralHistory: []
  });

  const user = userRepository.create(userEntity);
  return userRepository.save(user);
};

export const handleFirstDepositReferralBonus = async (userId: string): Promise<void> => {
  const userRepository = AppDataSource.getRepository(User);
  const walletRepository = AppDataSource.getRepository(Wallet);

  try {
    // Start a transaction to ensure data consistency
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      const user = await transactionalEntityManager.findOne(User, { 
        where: { id: userId },
        relations: ['wallet'],
        lock: { mode: 'pessimistic_write' }
      });

      if (!user || !user.referredBy || user.hasClaimedReferralBonus) {
        console.info(`Skipping referral bonus for user ${userId}: ${!user ? 'user not found' : !user.referredBy ? 'no referrer' : 'bonus already claimed'}`);
        return;
      }

      const referrer = await transactionalEntityManager.findOne(User, {
        where: { id: user.referredBy },
        relations: ['wallet'],
        lock: { mode: 'pessimistic_write' }
      });

      if (!referrer || !referrer.wallet) {
        console.error(`Referrer or referrer's wallet not found for user ${userId}`);
        return;
      }

      // Get referral amount from active config
      const activeConfig = await adminService.getActiveConfig();
      const referralAmount = activeConfig.referralAmount;

      // Calculate bonus with validation
      if (referralAmount <= 0) {
        console.error(`Invalid referral amount configured: ${referralAmount}`);
        return;
      }

      // Update referrer's cashback balance
      referrer.wallet.cashbackAmount = (referrer.wallet.cashbackAmount || 0) + referralAmount;
      referrer.wallet.totalBalance = referrer.wallet.balance + 
                                   referrer.wallet.winningAmount + 
                                   referrer.wallet.cashbackAmount;

      // Update referrer's statistics
      referrer.totalReferrals += 1;
      referrer.totalReferralEarnings += referralAmount;

      // Update referral history
      const referralHistory = referrer.referralHistory || [];
      referralHistory.push({
        referredUserId: userId,
        username: user.username || 'Unknown User',
        joinedAt: new Date(),
        bonusAmount: referralAmount,
        bonusClaimed: true,
        claimedAt: new Date()
      });
      referrer.referralHistory = referralHistory;

      // Mark user as having claimed referral bonus
      user.hasClaimedReferralBonus = true;

      // Save all changes
      await transactionalEntityManager.save([referrer, user]);
    });
  } catch (error) {
    console.error('Error processing referral bonus:', error);
    throw new Error('Failed to process referral bonus');
  }
};

export const getReferralStats = async (userId: string) => {
  try {
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'username',
        'referralCode',
        'totalReferrals',
        'totalReferralEarnings',
        'referralHistory',
      ],
      relations: ['wallet']
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate pending and claimed bonuses
    const pendingBonuses = user.referralHistory?.filter(ref => !ref.bonusClaimed)?.length || 0;
    const claimedBonuses = user.referralHistory?.filter(ref => ref.bonusClaimed)?.length || 0;

    // Get the referral amount from active config
    let currentReferralBonus = 50; // Default value
    try {
      const activeConfig = await adminService.getActiveConfig();
      currentReferralBonus = activeConfig.referralAmount;
    } catch (error) {
      console.warn('Failed to get referral amount from config, using default:', error);
    }

    return {
      referralCode: user.referralCode || '',
      totalReferrals: user.totalReferrals || 0,
      totalReferralEarnings: user.totalReferralEarnings || 0,
      pendingBonuses,
      claimedBonuses,
      currentReferralBonus,
      availableCashback: user.wallet?.cashbackAmount || 0,
      referralHistory: (user.referralHistory || []).map(ref => ({
        ...ref,
        joinedAt: ref.joinedAt,
        joinedAgo: getRelativeTimeString(ref.joinedAt),
        claimedAt: ref.claimedAt,
        claimedAgo: ref.claimedAt ? getRelativeTimeString(ref.claimedAt) : null
      }))
    };
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    throw new Error('Failed to fetch referral statistics');
  }
};

// Helper function to generate relative time strings
function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export const getAdminReferralStats = async () => {
  const userRepository = AppDataSource.getRepository(User);
  const users = await userRepository.find({
    where: {
      totalReferrals: MoreThan(0)
    },
    select: [
      'id',
      'username',
      'referralCode',
      'totalReferrals',
      'totalReferralEarnings',
      'referralHistory'
    ],
    order: {
      totalReferrals: 'DESC'
    }
  });

  return users;
};

export const getUserByPhone = async (
  phoneNumber: string
): Promise<User | undefined> => {
  if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
    throw new Error("Invalid phone number format");
  }

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { phoneNumber } });
  return user || undefined;
};

export const findUserByPhoneNumber = async (
  phoneNumber: string
): Promise<boolean> => {
  const user = await getUserByPhone(phoneNumber);
  return user !== undefined;
};

export const getUserById = async (userId: string): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

type AllowedUserUpdates = Omit<
  Partial<User>,
  "role" | "eloRating" | "createdAt"
>;

export const updateUser = async (
  userId: string,
  updates: AllowedUserUpdates
): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user) {
    throw new Error("User not found");
  }

  if (updates.phoneNumber !== undefined) {
    if (!validatePhoneNumber(updates.phoneNumber)) {
      throw new Error("Invalid phone number format");
    }
  }

  const safeUpdates: AllowedUserUpdates = { ...updates };
  const updatedUser = { ...user, ...safeUpdates };
  return userRepository.save(updatedUser);
};

export const checkPhoneVerification = async (
  phoneNumber: string
): Promise<boolean> => {
  if (!phoneNumber || !validatePhoneNumber(phoneNumber)) return false;
  const user = await getUserByPhone(phoneNumber);
  return user ? user.isVerified : false;
};