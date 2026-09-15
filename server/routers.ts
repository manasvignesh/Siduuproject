import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { hashPassword, verifyPassword } from "./_core/authUtils";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { upsertUser, getUserByEmail, getUserByOpenId } from "./db";
import { departmentsRouter } from "./routers/departments";
import { issuesRouter } from "./routers/issues";
import { notificationsRouter } from "./routers/notifications";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().trim().email("Please enter a valid email address"),
          password: z.string().min(1, "Password is required"),
          role: z.enum(["user", "admin"]).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const email = input.email.toLowerCase().trim();
        const password = input.password.trim();

        // 1. Look up user in database
        let dbUser = await getUserByEmail(email);

        let role: "user" | "admin" = "user";
        let openId = "";
        let name = "";
        let userId = 1;

        if (dbUser) {
          // Verify real password hash from DB
          const isValid = verifyPassword(password, dbUser.passwordHash);
          if (!isValid) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Incorrect password. For demo accounts, use password '123456'.",
            });
          }
          role = dbUser.role;
          openId = dbUser.openId;
          name = dbUser.name || email.split("@")[0];
          userId = dbUser.id;

          // Update lastSignedIn
          await upsertUser({
            openId,
            lastSignedIn: new Date(),
          });
        } else {
          // If not yet in DB, check fallback demo credentials or create user
          if (email === "admin@gmail.com") {
            role = "admin";
            openId = "admin-01";
            name = "Operations Administrator";
          } else if (email === "user@gmail.com") {
            role = "user";
            openId = "user-01";
            name = "Citizen User";
          } else {
            role = input.role || (email.includes("admin") ? "admin" : "user");
            const hex = Buffer.from(email).toString("hex").slice(0, 16);
            openId = `usr_${hex}`;
            name = email.split("@")[0].replace(/[._-]/g, " ");
          }

          if (password !== "123456" && password.length < 6) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Incorrect credentials. Use password '123456' for test accounts.",
            });
          }

          const passwordHash = hashPassword(password);
          await upsertUser({
            openId,
            name,
            email,
            role,
            loginMethod: "local",
            passwordHash,
            lastSignedIn: new Date(),
          });

          const created = await getUserByEmail(email);
          if (created) {
            userId = created.id;
          }
        }

        // 2. Generate JWT session token
        const token = await sdk.signSession({
          openId,
          appId: "citycare",
          name,
          email,
          role,
        });

        // 3. Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        const loggedInUser = {
          id: userId,
          openId,
          name,
          email,
          role,
          loginMethod: "local",
          lastSignedIn: new Date(),
          createdAt: dbUser?.createdAt || new Date(),
          updatedAt: new Date(),
        };

        return {
          success: true as const,
          token,
          user: loggedInUser,
        };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  departments: departmentsRouter,
  issues: issuesRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
