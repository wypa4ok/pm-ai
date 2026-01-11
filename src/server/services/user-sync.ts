import { prisma } from "../db";
import { UserRole } from "@prisma/client";

export type SyncUserInput = {
  supabaseUserId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: UserRole;
};

/**
 * Sync a Supabase Auth user to our database
 * Creates or updates the user record
 */
export async function syncUser(input: SyncUserInput): Promise<void> {
  const { supabaseUserId, email, fullName, avatarUrl, role } = input;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { id: supabaseUserId },
  });

  if (existingUser) {
    // Update existing user
    await prisma.user.update({
      where: { id: supabaseUserId },
      data: {
        email,
        ...(fullName && { fullName }),
        ...(avatarUrl && { avatarUrl }),
        ...(role && { role }),
      },
    });
  } else {
    // Create new user
    await prisma.user.create({
      data: {
        id: supabaseUserId,
        email,
        fullName: fullName || email.split("@")[0],
        avatarUrl,
        role: role || UserRole.OWNER, // Default to OWNER for new landlords
        onboardingCompleted: false, // New users need to complete onboarding
      },
    });
  }
}

/**
 * Delete a user from our database
 * Called when a user is deleted from Supabase Auth
 */
export async function deleteUser(supabaseUserId: string): Promise<void> {
  await prisma.user.delete({
    where: { id: supabaseUserId },
  });
}

/**
 * Get or create a user from Supabase Auth ID
 * Used by authentication middleware
 */
export async function getOrCreateUser(input: {
  supabaseUserId: string;
  email: string;
  fullName?: string;
}): Promise<{ id: string; email: string; fullName: string; role: UserRole; onboardingCompleted: boolean }> {
  const { supabaseUserId, email, fullName } = input;

  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { id: supabaseUserId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      onboardingCompleted: true,
    },
  });

  if (!user) {
    // Create new user if doesn't exist
    user = await prisma.user.create({
      data: {
        id: supabaseUserId,
        email,
        fullName: fullName || email.split("@")[0],
        role: UserRole.OWNER, // Default to OWNER for new users
        onboardingCompleted: false,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        onboardingCompleted: true,
      },
    });
  }

  return user;
}
