import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { clientsRouter } from "./routers/clients";
import { businessesRouter } from "./routers/businesses";
import { taxYearRecordsRouter } from "./routers/taxYearRecords";
import {
  historyRouter,
  dashboardRouter,
  searchRouter,
  duplicatesRouter,
  csvImportRouter,
  bulkRouter,
} from "./routers/misc";
import { staffAuthRouter } from "./routers/staffAuth";
import { z } from "zod";
import { ENV } from "./_core/env";
import { createHmac } from "crypto";
import { parse as parseCookieHeader } from "cookie";

const SITE_AUTH_COOKIE = "taxace_site_auth";

function signToken(secret: string): string {
  const payload = "unlocked";
  const sig = createHmac("sha256", secret || "fallback").update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifyToken(token: string, secret: string): boolean {
  const expected = signToken(secret);
  return token === expected;
}

export const appRouter = router({
  system: systemRouter,

  siteAuth: router({
    // Check if the visitor has already unlocked the site
    check: publicProcedure.query(({ ctx }) => {
      // Parse cookies from the raw header (no cookie-parser middleware in this stack)
      const cookies = parseCookieHeader(ctx.req.headers.cookie ?? "");
      const cookie = cookies[SITE_AUTH_COOKIE];
      // If no site password is configured, always allow
      if (!ENV.sitePassword) return { unlocked: true };
      return { unlocked: cookie ? verifyToken(cookie, ENV.cookieSecret) : false };
    }),
    // Verify the entered password and set the unlock cookie
    verify: publicProcedure
      .input(z.object({ password: z.string() }))
      .mutation(({ ctx, input }) => {
        if (!ENV.sitePassword || input.password === ENV.sitePassword) {
          const opts = getSessionCookieOptions(ctx.req);
          const token = signToken(ENV.cookieSecret);
          ctx.res.cookie(SITE_AUTH_COOKIE, token, {
            ...opts,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          });
          return { success: true };
        }
        return { success: false };
      }),
    // Lock the site by clearing the auth cookie server-side
    lock: publicProcedure.mutation(({ ctx }) => {
      const opts = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(SITE_AUTH_COOKIE, { ...opts, maxAge: -1 });
      return { success: true };
    }),
  }),

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  staffAuth: staffAuthRouter,
  clients: clientsRouter,
  businesses: businessesRouter,
  taxYearRecords: taxYearRecordsRouter,
  history: historyRouter,
  dashboard: dashboardRouter,
  search: searchRouter,
  duplicates: duplicatesRouter,
  csvImport: csvImportRouter,
  bulk: bulkRouter,
});

export type AppRouter = typeof appRouter;
