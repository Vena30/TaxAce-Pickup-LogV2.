import { z } from "zod";
import {
  createClient,
  getClientById,
  listClients,
  listClientsWithSummary,
  softDeleteClient,
  updateClient,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const clientsRouter = router({
  list: publicProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(({ input }) => listClients(input?.search)),

  listWithSummary: publicProcedure
    .input(z.object({ search: z.string().optional(), showInactive: z.boolean().optional() }).optional())
    .query(({ input }) => listClientsWithSummary(input?.search, input?.showInactive ?? false)),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getClientById(input.id)),

  create: publicProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        spouseFirstName: z.string().optional(),
        spouseLastName: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await createClient({
        firstName: input.firstName,
        lastName: input.lastName,
        spouseFirstName: input.spouseFirstName ?? null,
        spouseLastName: input.spouseLastName ?? null,
        notes: input.notes ?? null,
        isActive: input.isActive ?? true,
      });
      return { success: true };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        spouseFirstName: z.string().nullable().optional(),
        spouseLastName: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateClient(id, data);
      return { success: true };
    }),

  softDelete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await softDeleteClient(input.id);
      return { success: true };
    }),
});
