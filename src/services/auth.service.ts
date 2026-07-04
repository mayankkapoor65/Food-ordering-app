import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { signToken } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuthUser } from "@/types";
import type { LoginInput } from "@/lib/validation";

/**
 * Authentication business logic. Framework-agnostic: takes validated input,
 * returns data or throws domain errors.
 */
export const authService = {
  async login({ email, password }: LoginInput): Promise<{ token: string; user: AuthUser }> {
    await connectDB();

    const user = await User.findOne({ email });
    // Uniform error + always run bcrypt to avoid user-enumeration/timing leaks.
    const hash = user?.password ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinv";
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      logger.warn("Failed login attempt", { email });
      throw new UnauthorizedError("Invalid email or password.");
    }

    const authUser: AuthUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
    };
    logger.info("User logged in", { userId: authUser.id, role: authUser.role });
    return { token: signToken(authUser), user: authUser };
  },
};
