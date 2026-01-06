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
                content: 'Você é um especialista em análise de currículos e recrutamento com mais de 15 anos de experiência. Analise o currículo de forma detalhada e forneça sugestões práticas e acionáveis de melhoria. IMPORTANTE: Sempre forneça uma análise completa e detalhada, nunca retorne respostas vazias.'
              },
              {
                role: 'user',
                content: `Analise este currículo profundamente e forneça sugestões de melhoria em português brasileiro. Seja específico e detalhado.

## Estrutura da Análise (OBRIGATÓRIA):

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
${resume.originalContent || '[Não foi possível extrair o texto do PDF. Por favor, analise baseado no nome do arquivo e forneça sugestões genéricas mas úteis para currículos profissionais.]'}`
              }
            ]
          });
          
          console.log('Resposta da IA recebida:', JSON.stringify(response, null, 2));
          
          // Validação robusta da resposta
          if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
            console.error('Resposta inválida da IA:', JSON.stringify(response));
            throw new Error('A IA retornou uma resposta inválida ou vazia');
          }
          
          const messageContent = response.choices[0]?.message?.content;
          
          if (!messageContent || typeof messageContent !== 'string' || messageContent.trim() === '') {
            console.error('Conteúdo da mensagem inválido:', messageContent);
            throw new Error('A IA retornou uma análise vazia. Por favor, tente novamente.');
          }
          
          const analysis = messageContent.trim();
          
          // Verifica se a análise tem conteúdo mínimo
          if (analysis.length < 100) {
            console.error('Análise muito curta:', analysis);
            throw new Error('A análise retornada é muito curta. Por favor, tente novamente.');
          }
          
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
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const resume = await db.getResumeById(input.resumeId);
          
          if (!resume || resume.userId !== ctx.user.id) {
            throw new Error('Currículo não encontrado');
          }
          
          if (!resume.analyzedContent) {
            throw new Error('Por favor, analise o currículo primeiro antes de aplicar melhorias');
          }
          
          // Get original content from PDF
          const originalContent = resume.originalContent || '';
          
          if (!originalContent) {
            throw new Error('Não foi possível extrair o texto do PDF original');
          }
          
          // Use AI to merge original content with improvements
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: 'Você é um especialista em otimização de currículos. Sua tarefa é pegar o conteúdo original de um currículo e as sugestões de melhoria, e criar uma versão melhorada que mantenha todas as informações originais mas incorpore as sugestões de forma natural e profissional.'
              },
              {
                role: 'user',
                content: `Por favor, crie uma versão melhorada deste currículo incorporando as sugestões de melhoria.

## CONTEÚDO ORIGINAL DO CURRÍCULO:
${originalContent}

## SUGESTÕES DE MELHORIA:
${resume.analyzedContent}

## INSTRUÇÕES:
1. Mantenha TODAS as informações do currículo original
2. Incorpore as sugestões de melhoria de forma natural
3. Melhore a formatação e estrutura
4. Adicione palavras-chave relevantes para ATS
5. Quantifique resultados quando possível
6. Use linguagem profissional e impactante
7. Retorne APENAS o currículo melhorado, sem comentários adicionais

Currículo melhorado:`
              }
            ]
          });
          
          console.log('Resposta da IA para melhorias:', JSON.stringify(response, null, 2));
          
          // Validação robusta
          if (!response || !response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
            console.error('Resposta inválida da IA:', JSON.stringify(response));
            throw new Error('A IA retornou uma resposta inválida');
          }
          
          const improvedContent = response.choices[0]?.message?.content;
          
          if (!improvedContent || typeof improvedContent !== 'string' || improvedContent.trim() === '') {
            console.error('Conteúdo melhorado inválido:', improvedContent);
            throw new Error('Não foi possível gerar o currículo melhorado');
          }
          
          const finalImprovedContent = improvedContent.trim();
          
          if (finalImprovedContent.length < 100) {
            console.error('Conteúdo melhorado muito curto:', finalImprovedContent);
            throw new Error('O currículo melhorado gerado é muito curto');
          }
          
          // Update resume with improved content
          await db.updateResume(input.resumeId, {
            improvedContent: finalImprovedContent,
            status: 'improved',
          });
          
          console.log('Melhorias aplicadas com sucesso ao currículo', input.resumeId);
          
          return { 
            success: true, 
            improvedContent: finalImprovedContent,
            message: 'Melhorias aplicadas com sucesso!' 
          };
        } catch (error: any) {
          console.error('Erro ao aplicar melhorias:', error);
          throw new Error(error.message || 'Erro ao aplicar melhorias ao currículo');
        }
      }),
    
    deleteDuplicates: protectedProcedure
      .mutation(async ({ ctx }) => {
        try {
          const resumes = await db.getResumesByUserId(ctx.user.id);
          
          if (resumes.length === 0) {
            return { success: true, deletedCount: 0, message: 'Nenhum currículo encontrado' };
          }
          
          // Group resumes by fileName to find duplicates
          const resumesByFileName = new Map<string, typeof resumes>();
          
          for (const resume of resumes) {
            const fileName = resume.fileName.toLowerCase().trim();
            if (!resumesByFileName.has(fileName)) {
              resumesByFileName.set(fileName, []);
            }
            resumesByFileName.get(fileName)!.push(resume);
          }
          
          // Find and delete duplicates (keep the most recent one)
          let deletedCount = 0;
          const duplicateGroups = [];
          
          for (const [fileName, group] of Array.from(resumesByFileName.entries())) {
            if (group.length > 1) {
              // Sort by createdAt descending (most recent first)
              group.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              
              // Keep the first one (most recent), delete the rest
              const toKeep = group[0];
              const toDelete = group.slice(1);
              
              duplicateGroups.push({
                fileName,
                kept: toKeep.id,
                deleted: toDelete.map((r: any) => r.id)
              });
              
              // Delete duplicates
              for (const resume of toDelete) {
                await db.deleteResume(resume.id);
                deletedCount++;
              }
            }
          }
          
          console.log(`Excluídos ${deletedCount} currículos duplicados para usuário ${ctx.user.id}`);
          console.log('Grupos de duplicados:', JSON.stringify(duplicateGroups, null, 2));
          
          return { 
            success: true, 
            deletedCount,
            duplicateGroups,
            message: deletedCount > 0 
              ? `${deletedCount} currículo(s) duplicado(s) excluído(s) com sucesso!`
              : 'Nenhum currículo duplicado encontrado'
          };
        } catch (error: any) {
          console.error('Erro ao excluir duplicados:', error);
          throw new Error(error.message || 'Erro ao excluir currículos duplicados');
        }
      }),
    
    findDuplicates: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          const resumes = await db.getResumesByUserId(ctx.user.id);
          
          if (resumes.length === 0) {
            return { duplicates: [], totalDuplicates: 0 };
          }
          
          // Group resumes by fileName
          const resumesByFileName = new Map<string, typeof resumes>();
          
          for (const resume of resumes) {
            const fileName = resume.fileName.toLowerCase().trim();
            if (!resumesByFileName.has(fileName)) {
              resumesByFileName.set(fileName, []);
            }
            resumesByFileName.get(fileName)!.push(resume);
          }
          
          // Find duplicates
          const duplicates = [];
          let totalDuplicates = 0;
          
          for (const [fileName, group] of Array.from(resumesByFileName.entries())) {
            if (group.length > 1) {
              duplicates.push({
                fileName,
                count: group.length,
                resumes: group.map((r: any) => ({
                  id: r.id,
                  createdAt: r.createdAt,
                  status: r.status
                }))
              });
              totalDuplicates += group.length - 1; // -1 because we keep one
            }
          }
          
          return { duplicates, totalDuplicates };
        } catch (error: any) {
          console.error('Erro ao buscar duplicados:', error);
          throw new Error(error.message || 'Erro ao buscar currículos duplicados');
        }
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
        try {
          // Get user's latest resume
          const resumes = await db.getResumesByUserId(ctx.user.id);
          if (resumes.length === 0) {
            throw new Error('Por favor, faça upload de um currículo primeiro');
          }
          
          const latestResume = resumes[0];
          
          // In production, implement real job search API integration (LinkedIn, Indeed, Catho)
          // For now, create comprehensive mock job listings based on resume
          const mockJobs = [
            {
              title: 'Desenvolvedor Full Stack Sênior',
              company: 'Tech Solutions Brasil',
              location: 'São Paulo, SP (Híbrido)',
              salary: 'R$ 12.000 - R$ 18.000',
              description: 'Buscamos desenvolvedor experiente para liderar projetos de transformação digital. Trabalhe com tecnologias modernas em um ambiente colaborativo.',
              requirements: '5+ anos de experiência, React, Node.js, TypeScript, AWS, Docker',
              sourceUrl: 'https://linkedin.com/jobs/dev-fullstack-senior-123',
              sourceSite: 'LinkedIn',
              matchScore: 95,
            },
            {
              title: 'Engenheiro de Software Pleno',
              company: 'Startup Inovadora',
              location: 'Remoto',
              salary: 'R$ 10.000 - R$ 15.000',
              description: 'Junte-se a uma startup em crescimento rápido. Oportunidade de crescimento e aprendizado.',
              requirements: '3+ anos de experiência, Python, Django, PostgreSQL, Redis',
              sourceUrl: 'https://indeed.com/jobs/engenheiro-software-456',
              sourceSite: 'Indeed',
              matchScore: 88,
            },
            {
              title: 'Desenvolvedor Frontend React',
              company: 'E-commerce Global',
              location: 'Rio de Janeiro, RJ',
              salary: 'R$ 8.000 - R$ 12.000',
              description: 'Desenvolva interfaces incríveis para milhões de usuários. Foco em performance e UX.',
              requirements: 'React, TypeScript, Next.js, Tailwind CSS, testes automatizados',
              sourceUrl: 'https://catho.com.br/vagas/frontend-react-789',
              sourceSite: 'Catho',
              matchScore: 82,
            },
            {
              title: 'Analista de Dados Sênior',
              company: 'Fintech Brasileira',
              location: 'São Paulo, SP',
              salary: 'R$ 11.000 - R$ 16.000',
              description: 'Transforme dados em insights estratégicos. Trabalhe com big data e machine learning.',
              requirements: 'Python, SQL, Power BI, estatística, machine learning',
              sourceUrl: 'https://linkedin.com/jobs/analista-dados-321',
              sourceSite: 'LinkedIn',
              matchScore: 78,
            },
            {
              title: 'DevOps Engineer',
              company: 'Cloud Services Inc',
              location: 'Remoto',
              salary: 'R$ 13.000 - R$ 20.000',
              description: 'Construa e mantenha infraestrutura cloud escalável. Cultura DevOps forte.',
              requirements: 'AWS/Azure, Kubernetes, Terraform, CI/CD, monitoring',
              sourceUrl: 'https://indeed.com/jobs/devops-engineer-654',
              sourceSite: 'Indeed',
              matchScore: 85,
            },
            {
              title: 'Product Manager',
              company: 'SaaS Company',
              location: 'São Paulo, SP (Híbrido)',
              salary: 'R$ 14.000 - R$ 22.000',
              description: 'Lidere o desenvolvimento de produtos inovadores. Trabalhe com times multidisciplinares.',
              requirements: 'Experiência em produto digital, metodologias ágeis, visão estratégica',
              sourceUrl: 'https://catho.com.br/vagas/product-manager-987',
              sourceSite: 'Catho',
              matchScore: 72,
            },
          ];
          
          console.log(`Buscando vagas para usuário ${ctx.user.id} com currículo: ${latestResume.fileName}`);
          
          // Save jobs to database
          const savedJobs = [];
          for (const job of mockJobs) {
            try {
              await db.createJobListing(job);
              savedJobs.push(job);
            } catch (error) {
              console.error('Erro ao salvar vaga:', error);
              // Continue even if one job fails
            }
          }
          
          console.log(`${savedJobs.length} vagas encontradas e salvas`);
          
          return { 
            success: true, 
            jobs: savedJobs,
            message: `Encontramos ${savedJobs.length} vagas compatíveis com seu perfil!`
          };
        } catch (error: any) {
          console.error('Erro na busca de vagas:', error);
          throw new Error(error.message || 'Erro ao buscar vagas');
        }
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
