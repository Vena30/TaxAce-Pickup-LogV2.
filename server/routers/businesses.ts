import { z } from "zod";
import {
  createBusiness,
  getBusinessById,
  listBusinessesByClient,
  searchBusinesses,
  softDeleteBusiness,
  updateBusiness,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const businessesRouter = router({
  listByClient: publicProcedure
    .input(z.object({ clientId: z.number() }))
    .query(({ input }) => listBusinessesByClient(input.clientId)),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getBusinessById(input.id)),

  search: publicProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(({ input }) => searchBusinesses(input.query)),

  create: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        name: z.string().min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createBusiness({
        clientId: input.clientId,
        name: input.name,
        notes: input.notes ?? null,
      });
      return { success: true };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateBusiness(id, data);
      return { success: true };
    }),

  softDelete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await softDeleteBusiness(input.id);
      return { success: true };
    }),
});
