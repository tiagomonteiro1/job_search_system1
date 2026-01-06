import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import { extractTextFromPDF } from "./pdfExtractor";

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
        try {
          // Convert base64 to buffer
          const fileBuffer = Buffer.from(input.fileContent, 'base64');
          
          // Extract text from PDF
          let extractedText = '';
          try {
            extractedText = await extractTextFromPDF(fileBuffer);
            console.log(`Texto extraído do PDF (${extractedText.length} caracteres)`);
          } catch (extractError: any) {
            console.warn('Não foi possível extrair texto do PDF:', extractError.message);
            extractedText = `[Arquivo PDF: ${input.fileName}]`;
          }
          
          // Upload to S3
          const fileKey = `resumes/${ctx.user.id}/${nanoid()}-${input.fileName}`;
          const { url } = await storagePut(fileKey, fileBuffer, 'application/pdf');
          
          // Save to database with extracted text
          await db.createResume({
            userId: ctx.user.id,
            fileName: input.fileName,
            fileKey,
            fileUrl: url,
            originalContent: extractedText,
            status: 'uploaded',
          });
          
          return { success: true, url, textExtracted: extractedText.length > 0 };
        } catch (error: any) {
          console.error('Erro no upload do currículo:', error);
          throw new Error(error.message || 'Erro ao fazer upload do currículo');
        }
      }),
    
    analyze: protectedProcedure
      .input(z.object({
        resumeId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const resume = await db.getResumeById(input.resumeId);
          
          if (!resume || resume.userId !== ctx.user.id) {
            throw new Error('Currículo não encontrado');
          }
          
          // Check if user has AI analysis in their plan
          const user = await db.getUserById(ctx.user.id);
          if (user?.subscriptionPlanId) {
            const plan = await db.getSubscriptionPlanById(user.subscriptionPlanId);
            if (!plan?.hasAiAnalysis) {
              throw new Error('Análise com IA não disponível no seu plano');
            }
          }
          
          // Update status to analyzing
          await db.updateResume(input.resumeId, { status: 'analyzing' });
          
          // Analyze with AI
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em análise de currículos e recrutamento com mais de 15 anos de experiência. Analise o currículo de forma detalhada e forneça sugestões práticas e acionáveis de melhoria.'
              },
              {
                role: 'user',
                content: `Analise este currículo profundamente e forneça sugestões de melhoria em português brasileiro. Seja específico e detalhado.

## Estrutura da Análise:

### 1. Pontos Fortes
Identifique os principais pontos positivos do currículo.

### 2. Áreas de Melhoria
Liste sugestões específicas e acionáveis para melhorar o currículo.

### 3. Otimização para ATS (Applicant Tracking System)
Sugira palavras-chave e formatações que ajudem o currículo a passar por sistemas automatizados.

### 4. Formatação Profissional
Dicas de como melhorar a apresentação visual e estrutura do documento.

### 5. Quantificação de Resultados
Como adicionar métricas e números para demonstrar impacto.

---

**Currículo analisado:** ${resume.fileName}

**CONTEÚDO DO CURRÍCULO:**
${resume.originalContent || '[Não foi possível extrair o texto do PDF. Por favor, analise baseado no nome do arquivo e forneça sugestões genéricas.]'}`
              }
            ]
          });
          
          const messageContent = response.choices[0]?.message?.content;
          
          if (!messageContent || typeof messageContent !== 'string') {
            throw new Error('Erro ao obter resposta da IA');
          }
          
          const analysis = messageContent;
          
          // Update resume with analysis
          await db.updateResume(input.resumeId, {
            analyzedContent: analysis,
            status: 'analyzed',
          });
          
          return { success: true, analysis };
        } catch (error: any) {
          // Rollback status on error
          try {
            await db.updateResume(input.resumeId, { status: 'uploaded' });
          } catch (rollbackError) {
            console.error('Failed to rollback resume status:', rollbackError);
          }
          
          throw new Error(error.message || 'Erro ao analisar currículo');
        }
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
    
    updateUserPlan: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .input(z.object({
        userId: z.number(),
        planId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Verify plan exists
        const plan = await db.getSubscriptionPlanById(input.planId);
        if (!plan) {
          throw new Error('Plano não encontrado');
        }
        
        // Update user plan
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new Error('Database not available');
        }
        
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        await dbInstance
          .update(users)
          .set({ subscriptionPlanId: input.planId })
          .where(eq(users.id, input.userId));
        
        return { success: true, message: `Plano atualizado para ${plan.name}` };
      }),
    
    getUserDetails: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new Error('Usuário não encontrado');
        }
        
        const resumes = await db.getResumesByUserId(input.userId);
        const applications = await db.getApplicationsByUserId(input.userId);
        const integrations = await db.getIntegrationsByUserId(input.userId);
        
        let plan = null;
        if (user.subscriptionPlanId) {
          plan = await db.getSubscriptionPlanById(user.subscriptionPlanId);
        }
        
        return {
          user,
          plan,
          stats: {
            totalResumes: resumes.length,
            totalApplications: applications.length,
            totalIntegrations: integrations.length,
          },
        };
      }),
    
    getAllResumes: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .query(async () => {
        const dbInstance = await db.getDb();
        if (!dbInstance) return [];
        
        const { resumes, users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        
        // Get all resumes with user information
        const allResumes = await dbInstance
          .select({
            id: resumes.id,
            userId: resumes.userId,
            fileName: resumes.fileName,
            fileUrl: resumes.fileUrl,
            status: resumes.status,
            originalContent: resumes.originalContent,
            analyzedContent: resumes.analyzedContent,
            improvedContent: resumes.improvedContent,
            createdAt: resumes.createdAt,
            userName: users.name,
            userEmail: users.email,
          })
          .from(resumes)
          .leftJoin(users, eq(resumes.userId, users.id))
          .orderBy(resumes.createdAt);
        
        return allResumes;
      }),
    
    analyzeResumeAdmin: protectedProcedure
      .use(({ ctx, next }) => {
        if (ctx.user.role !== 'admin') {
          throw new Error('Unauthorized');
        }
        return next({ ctx });
      })
      .input(z.object({
        resumeId: z.number(),
      }))
      .mutation(async ({ input }) => {
        try {
          // Get resume
          const dbInstance = await db.getDb();
          if (!dbInstance) {
            throw new Error('Database not available');
          }
          
          const { resumes } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          
          const resumeList = await dbInstance
            .select()
            .from(resumes)
            .where(eq(resumes.id, input.resumeId))
            .limit(1);
          
          const resume = resumeList[0];
          if (!resume) {
            throw new Error('Currículo não encontrado');
          }
          
          // Update status to analyzing
          await dbInstance
            .update(resumes)
            .set({ status: 'analyzing' })
            .where(eq(resumes.id, input.resumeId));
          
          // Call AI for analysis
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: `Você é um especialista em análise de currículos e recrutamento com 15 anos de experiência.
Sua tarefa é analisar currículos de forma detalhada e profissional, fornecendo feedback construtivo.

Estruture sua análise em 5 seções:

## 1. Pontos Fortes
Identifique e destaque os aspectos mais positivos do currículo.

## 2. Áreas de Melhoria
Aponte o que pode ser melhorado de forma construtiva.

## 3. Otimização para ATS
Sugestões para passar por sistemas de rastreamento de candidatos.

## 4. Formatação Profissional
Recomendações sobre estrutura, design e apresentação.

## 5. Quantificação de Resultados
Como adicionar métricas e números para demonstrar impacto.

---

**Currículo analisado:** ${resume.fileName}

**CONTEÚDO DO CURRÍCULO:**
${resume.originalContent || '[Não foi possível extrair o texto do PDF. Por favor, analise baseado no nome do arquivo e forneça sugestões genéricas.]'}`
              }
            ]
          });
          
          // Validate response structure
          if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
            console.error('Resposta inválida da IA:', JSON.stringify(response));
            throw new Error('A IA retornou uma resposta inválida ou vazia');
          }
          
          const analysis = response.choices[0]?.message?.content;
          
          if (!analysis || typeof analysis !== 'string') {
            console.error('Conteúdo da análise inválido:', analysis);
            throw new Error('A IA não retornou uma análise válida');
          }
          
          // Update resume with analysis
          await dbInstance
            .update(resumes)
            .set({ 
              analyzedContent: analysis as string,
              status: 'analyzed'
            })
            .where(eq(resumes.id, input.resumeId));
          
          return { success: true, analysis };
        } catch (error: any) {
          console.error('Erro na análise admin:', error);
          
          // Rollback status on error
          try {
            const dbInstance = await db.getDb();
            if (dbInstance) {
              const { resumes } = await import("../drizzle/schema");
              const { eq } = await import("drizzle-orm");
              await dbInstance
                .update(resumes)
                .set({ status: 'uploaded' })
                .where(eq(resumes.id, input.resumeId));
            }
          } catch (rollbackError) {
            console.error('Erro ao fazer rollback:', rollbackError);
          }
          
          throw new Error(error.message || 'Erro ao analisar currículo');
        }
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
