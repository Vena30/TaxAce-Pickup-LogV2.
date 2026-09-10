import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { staffUsers } from "../../drizzle/schema";
import type { StaffUser } from "../../drizzle/schema";
import { parse as parseCookieHeader } from "cookie";

export const STAFF_COOKIE = "taxace_staff_session";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

function getSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "fallback-secret");
}

async function signStaffToken(staffUserId: number): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ staffUserId, type: "staff" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(secret);
}

export async function verifyStaffToken(
  cookieHeader: string | undefined
): Promise<number | null> {
  if (!cookieHeader) return null;
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[STAFF_COOKIE];
  if (!token) return null;
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.type !== "staff" || typeof payload.staffUserId !== "number") return null;
    return payload.staffUserId as number;
  } catch {
    return null;
  }
}

export async function getStaffUserFromRequest(
  cookieHeader: string | undefined
): Promise<StaffUser | null> {
  const staffUserId = await verifyStaffToken(cookieHeader);
  if (!staffUserId) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, staffUserId))
    .limit(1);
  const user = rows[0];
  if (!user || !user.isActive) return null;
  return user;
}

export const staffAuthRouter = router({
  // Check if current visitor has a valid staff session
  me: publicProcedure.query(async ({ ctx }) => {
    const staff = await getStaffUserFromRequest(ctx.req.headers.cookie);
    if (!staff) return null;
    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      mustChangePassword: staff.mustChangePassword,
    };
  }),

  // Login with email + password
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const rows = await db
        .select()
        .from(staffUsers)
        .where(eq(staffUsers.email, input.email.toLowerCase()))
        .limit(1);
      const user = rows[0];

      if (!user || !user.isActive) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
      }

      // Update lastSignedIn
      await db
        .update(staffUsers)
        .set({ lastSignedIn: new Date() })
        .where(eq(staffUsers.id, user.id));

      const token = await signStaffToken(user.id);
      const opts = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(STAFF_COOKIE, token, { ...opts, maxAge: ONE_YEAR_MS });

      return {
        success: true,
        mustChangePassword: user.mustChangePassword,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        },
      };
    }),

  // Logout — clear the staff session cookie
  logout: publicProcedure.mutation(({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(STAFF_COOKIE, { ...opts, maxAge: -1 });
    return { success: true };
  }),

  // Change password (required on first login, available any time)
  changePassword: publicProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staff = await getStaffUserFromRequest(ctx.req.headers.cookie);
      if (!staff) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const valid = await bcrypt.compare(input.currentPassword, staff.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect." });
      }

      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db
        .update(staffUsers)
        .set({ passwordHash: newHash, mustChangePassword: false })
        .where(eq(staffUsers.id, staff.id));

      return { success: true };
    }),

  // ─── Team Management (admin only) ──────────────────────────────────────────

  // List all team members
  listTeam: publicProcedure.query(async ({ ctx }) => {
    const staff = await getStaffUserFromRequest(ctx.req.headers.cookie);
    if (!staff || staff.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

    const members = await db
      .select({
        id: staffUsers.id,
        name: staffUsers.name,
        email: staffUsers.email,
        role: staffUsers.role,
        isActive: staffUsers.isActive,
        mustChangePassword: staffUsers.mustChangePassword,
        lastSignedIn: staffUsers.lastSignedIn,
        createdAt: staffUsers.createdAt,
      })
      .from(staffUsers)
      .orderBy(staffUsers.name);
    return members;
  }),

  // Add a new team member
  addMember: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staff = await getStaffUserFromRequest(ctx.req.headers.cookie);
      if (!staff || staff.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const tempPassword = "WelcomeTaxAce!";
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await db.insert(staffUsers).values({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        mustChangePassword: true,
        isActive: true,
      });

      return { success: true };
    }),

  // Update a team member's role, active status, or name
  updateMember: publicProcedure
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const staff = await getStaffUserFromRequest(ctx.req.headers.cookie);
      if (!staff || staff.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const updates: Record<string, unknown> = {};
      if (input.role !== undefined) updates.role = input.role;
      if (input.isActive !== undefined) updates.isActive = input.isActive;
      if (input.name !== undefined) updates.name = input.name;

      await db
        .update(staffUsers)
        .set(updates as any)
        .where(eq(staffUsers.id, input.id));

      return { success: true };
    }),

  // Reset a team member's password back to the temp password
  resetPassword: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const staff = await getStaffUserFromRequest(ctx.req.headers.cookie);
      if (!staff || staff.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      const tempPassword = "WelcomeTaxAce!";
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await db
        .update(staffUsers)
        .set({ passwordHash, mustChangePassword: true })
        .where(eq(staffUsers.id, input.id));

      return { success: true };
    }),

  // Remove a team member (soft deactivate)
  removeMember: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const staff = await getStaffUserFromRequest(ctx.req.headers.cookie);
      if (!staff || staff.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admins only." });
      }
      // Prevent removing yourself
      if (input.id === staff.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own account." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });

      await db
        .update(staffUsers)
        .set({ isActive: false })
        .where(eq(staffUsers.id, input.id));

      return { success: true };
    }),
});
