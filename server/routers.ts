import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";

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

  // Resume routes
  resume: router({
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileContent: z.string(), // Base64 encoded file
      }))
      .mutation(async ({ ctx, input }) => {
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.fileContent, 'base64');
        
        // Upload to S3
        const fileKey = `resumes/${ctx.user.id}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, 'application/pdf');
        
        // Save to database
        await db.createResume({
          userId: ctx.user.id,
          fileName: input.fileName,
          fileKey,
          fileUrl: url,
          status: 'uploaded',
        });
        
        return { success: true, url };
      }),
    
    analyze: protectedProcedure
      .input(z.object({
        resumeId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const resume = await db.getResumeById(input.resumeId);
        
        if (!resume || resume.userId !== ctx.user.id) {
          throw new Error('Resume not found');
        }
        
        // Check if user has AI analysis in their plan
        const user = await db.getUserById(ctx.user.id);
        if (user?.subscriptionPlanId) {
          const plan = await db.getSubscriptionPlanById(user.subscriptionPlanId);
          if (!plan?.hasAiAnalysis) {
            throw new Error('AI analysis not available in your plan');
          }
        }
        
        // Update status to analyzing
        await db.updateResume(input.resumeId, { status: 'analyzing' });
        
        // Analyze with AI
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em análise de currículos e recrutamento. Analise o currículo e forneça sugestões detalhadas de melhoria.'
            },
            {
              role: 'user',
              content: `Analise este currículo e forneça sugestões de melhoria em português brasileiro. Inclua:
1. Pontos fortes do currículo
2. Sugestões específicas de melhoria
3. Otimização de palavras-chave para ATS
4. Dicas de formatação profissional
5. Como quantificar resultados

Currículo: ${resume.originalContent || 'Arquivo PDF enviado - ' + resume.fileName}`
            }
          ]
        });
        
        const messageContent = response.choices[0]?.message?.content;
        const analysis = typeof messageContent === 'string' ? messageContent : 'Análise não disponível';
        
        // Update resume with analysis
        await db.updateResume(input.resumeId, {
          analyzedContent: analysis,
          status: 'analyzed',
        });
        
        return { success: true, analysis };
      }),
    
    applyImprovements: protectedProcedure
      .input(z.object({
        resumeId: z.number(),
        improvedContent: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const resume = await db.getResumeById(input.resumeId);
        
        if (!resume || resume.userId !== ctx.user.id) {
          throw new Error('Resume not found');
        }
        
        await db.updateResume(input.resumeId, {
          improvedContent: input.improvedContent,
          status: 'improved',
        });
        
        return { success: true };
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
    
    createIntegration: protectedProcedure
      .input(z.object({
        platform: z.string(),
        platformUrl: z.string().optional(),
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        // In production, encrypt the password
        const encryptedPassword = Buffer.from(input.password).toString('base64');
        
        await db.createIntegration({
          userId: ctx.user.id,
          platform: input.platform,
          platformUrl: input.platformUrl,
          username: input.username,
          encryptedPassword,
          isActive: true,
        });
        
        return { success: true };
      }),
    
    deleteIntegration: protectedProcedure
      .input(z.object({
        integrationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const integration = await db.getIntegrationsByUserId(ctx.user.id);
        const found = integration.find(i => i.id === input.integrationId);
        
        if (!found) {
          throw new Error('Integration not found');
        }
        
        await db.deleteIntegration(input.integrationId);
        return { success: true };
      }),
  }),

  // Job routes
  jobs: router({
    searchJobs: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get user's latest resume
        const resumes = await db.getResumesByUserId(ctx.user.id);
        if (resumes.length === 0) {
          throw new Error('Please upload a resume first');
        }
        
        // In production, implement real job search API integration
        // For now, create mock job listings
        const mockJobs = [
          {
            title: 'Desenvolvedor Full Stack Sênior',
            company: 'Tech Solutions',
            location: 'São Paulo, SP',
            salary: 'R$ 12.000 - R$ 18.000',
            description: 'Buscamos desenvolvedor experiente com React, Node.js e TypeScript.',
            requirements: '5+ anos de experiência, React, Node.js, TypeScript, AWS',
            sourceUrl: 'https://linkedin.com/jobs/123',
            sourceSite: 'LinkedIn',
            matchScore: 95,
          },
          {
            title: 'Engenheiro de Software',
            company: 'Startup Inovadora',
            location: 'Remote',
            salary: 'R$ 10.000 - R$ 15.000',
            description: 'Junte-se a uma startup em crescimento.',
            requirements: '3+ anos de experiência, Python, Django, PostgreSQL',
            sourceUrl: 'https://indeed.com/jobs/456',
            sourceSite: 'Indeed',
            matchScore: 88,
          },
        ];
        
        // Save jobs to database
        for (const job of mockJobs) {
          await db.createJobListing(job);
        }
        
        return { success: true, jobs: mockJobs };
      }),
    
    applyToJob: protectedProcedure
      .input(z.object({
        jobListingId: z.number(),
        resumeId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check application limit
        const user = await db.getUserById(ctx.user.id);
        const applications = await db.getApplicationsByUserId(ctx.user.id);
        
        if (user?.subscriptionPlanId) {
          const plan = await db.getSubscriptionPlanById(user.subscriptionPlanId);
          if (plan && applications.length >= plan.maxApplications) {
            throw new Error(`You have reached your plan limit of ${plan.maxApplications} applications`);
          }
        }
        
        // Create application
        await db.createJobApplication({
          userId: ctx.user.id,
          resumeId: input.resumeId,
          jobListingId: input.jobListingId,
          status: 'pending',
        });
        
        // In production, implement actual job application submission
        // For now, simulate sending
        setTimeout(async () => {
          const apps = await db.getApplicationsByUserId(ctx.user.id);
          const latestApp = apps[0];
          if (latestApp) {
            await db.updateJobApplication(latestApp.id, {
              status: 'sent',
              sentAt: new Date(),
              responsePayload: JSON.stringify({ success: true, message: 'Application sent successfully' }),
            });
          }
        }, 2000);
        
        return { success: true };
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
    
    getAllUsers: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .query(async () => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        
        const { users } = await import("../drizzle/schema");
        return await dbInstance.select().from(users);
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
        await db.createSubscriptionPlan(input);
        return { success: true };
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
        await db.updateSubscriptionPlan(id, data);
        return { success: true };
      }),
    
    updateApplicationStatus: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .input(z.object({
        applicationId: z.number(),
        status: z.enum(['pending', 'sent', 'failed', 'confirmed']),
        responsePayload: z.string().optional(),
        errorMessage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { applicationId, ...data } = input;
        await db.updateJobApplication(applicationId, data);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
