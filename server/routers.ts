import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { upsertUser, getUserByOpenId } from "./db";
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

        // Validate credentials (default test password is 123456)
        if (password !== "123456" && password.length < 4) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid password. Default testing password is '123456'.",
          });
        }

        let role: "user" | "admin" = "user";
        let openId = "";
        let name = "";

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

        // Upsert user in Postgres DB
        try {
          await upsertUser({
            openId,
            name,
            email,
            role,
            loginMethod: "local",
            lastSignedIn: new Date(),
          });
        } catch (error) {
          console.warn("[Auth Login] Database upsert warning:", error);
        }

        // Generate JWT session token
        const token = await sdk.signSession({
          openId,
          appId: "citycare",
          name,
          email,
          role,
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        const loggedInUser = {
          id: openId === "admin-01" ? 1 : 2,
          openId,
          name,
          email,
          role,
          loginMethod: "local",
          lastSignedIn: new Date(),
          createdAt: new Date(),
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
