import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Public routes for landing page
  public: router({
    getPlans: publicProcedure.query(async () => {
      return await db.getAllSubscriptionPlans();
    }),
    
    getTestimonials: publicProcedure.query(async () => {
      return await db.getVisibleTestimonials();
    }),
    
    getFaqs: publicProcedure.query(async () => {
      return await db.getVisibleFaqs();
    }),
  }),

  // User routes
  user: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserById(ctx.user.id);
    }),
    
    getResumes: protectedProcedure.query(async ({ ctx }) => {
      return await db.getResumesByUserId(ctx.user.id);
    }),
    
    getApplications: protectedProcedure.query(async ({ ctx }) => {
      return await db.getApplicationsByUserId(ctx.user.id);
    }),
    
    getIntegrations: protectedProcedure.query(async ({ ctx }) => {
      return await db.getIntegrationsByUserId(ctx.user.id);
    }),
  }),

  // Admin routes
  admin: router({
    getAllApplications: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .query(async () => {
        return await db.getAllApplications();
      }),
    
    createPlan: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .input(z.object({
        name: z.string(),
        description: z.string(),
        price: z.string(),
        maxApplications: z.number(),
        hasAiAnalysis: z.boolean(),
        features: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createSubscriptionPlan(input);
      }),
    
    updatePlan: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        maxApplications: z.number().optional(),
        hasAiAnalysis: z.boolean().optional(),
        features: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateSubscriptionPlan(id, data);
      }),
  }),
});

export type AppRouter = typeof appRouter;
