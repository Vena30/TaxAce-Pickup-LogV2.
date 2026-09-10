// Vercel serverless entry point.
// Wraps the same tRPC app router used by the local dev server (server/_core/index.ts)
// but without the long-running http.Server / Vite dev-middleware bits, since Vercel
// invokes this as a stateless function per request.
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
