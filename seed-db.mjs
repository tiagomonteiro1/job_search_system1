import { drizzle } from "drizzle-orm/mysql2";
import { subscriptionPlans, testimonials, faqs } from "./drizzle/schema.js";
import dotenv from "dotenv";

dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function seed() {
  console.log("🌱 Seeding database...");

  // Inserir planos de assinatura
  await db.insert(subscriptionPlans).values([
    {
      name: "Básico",
      description: "Ideal para quem está começando a busca por emprego",
      price: "25.00",
      currency: "BRL",
      maxApplications: 15,
      hasAiAnalysis: false,
      features: JSON.stringify([
        "15 envios de currículo por mês",
        "Busca automática de vagas",
        "Suporte por email"
      ]),
      isActive: true
    },
    {
      name: "Pleno",
      description: "Para profissionais que buscam mais oportunidades",
      price: "45.00",
      currency: "BRL",
      maxApplications: 25,
      hasAiAnalysis: true,
      features: JSON.stringify([
        "25 envios de currículo por mês",
        "Análise de currículo com IA",
        "Busca automática de vagas",
        "Sugestões de melhorias",
        "Suporte prioritário"
      ]),
      isActive: true
    },
    {
      name: "Avançado",
      description: "Solução completa para acelerar sua carreira",
      price: "59.00",
      currency: "BRL",
      maxApplications: 30,
      hasAiAnalysis: true,
      features: JSON.stringify([
        "30 envios de currículo por mês",
        "Análise avançada com IA",
        "Busca automática em múltiplos sites",
        "Otimização profissional do currículo",
        "Integrações ilimitadas",
        "Suporte VIP 24/7"
      ]),
      isActive: true
    }
  ]);

  // Inserir depoimentos
  await db.insert(testimonials).values([
    {
      authorName: "Maria Silva",
      authorRole: "Desenvolvedora Full Stack",
      content: "Consegui meu emprego dos sonhos em apenas 2 semanas! A análise de IA do meu currículo fez toda a diferença.",
      rating: 5,
      isVisible: true
    },
    {
      authorName: "João Santos",
      authorRole: "Gerente de Projetos",
      content: "Plataforma incrível! O envio automático economizou horas do meu tempo e recebi várias respostas positivas.",
      rating: 5,
      isVisible: true
    },
    {
      authorName: "Ana Costa",
      authorRole: "Designer UX/UI",
      content: "A melhor ferramenta para busca de emprego que já usei. Recomendo para todos os meus amigos!",
      rating: 5,
      isVisible: true
    }
  ]);

  // Inserir FAQs
  await db.insert(faqs).values([
    {
      question: "Como funciona a análise de currículo com IA?",
      answer: "Nossa IA analisa seu currículo e fornece sugestões personalizadas para torná-lo mais atraente para recrutadores, incluindo melhorias no formato, palavras-chave relevantes e destaque de suas principais competências.",
      order: 1,
      isVisible: true
    },
    {
      question: "Posso cancelar minha assinatura a qualquer momento?",
      answer: "Sim! Você pode cancelar sua assinatura a qualquer momento sem taxas adicionais. Seu acesso permanecerá ativo até o final do período pago.",
      order: 2,
      isVisible: true
    },
    {
      question: "Em quais sites de emprego vocês buscam vagas?",
      answer: "Buscamos vagas nos principais sites do mercado brasileiro, incluindo LinkedIn, Indeed, Catho, InfoJobs, Vagas.com e muitos outros.",
      order: 3,
      isVisible: true
    },
    {
      question: "Como funciona o envio automático de currículos?",
      answer: "Após analisar seu perfil, nossa plataforma identifica vagas compatíveis e envia seu currículo automaticamente, respeitando o limite do seu plano. Você recebe notificações de cada envio realizado.",
      order: 4,
      isVisible: true
    },
    {
      question: "Meus dados estão seguros?",
      answer: "Sim! Utilizamos criptografia de ponta a ponta e armazenamento seguro em nuvem (S3) para proteger todos os seus dados e documentos. Nunca compartilhamos suas informações com terceiros sem sua autorização.",
      order: 5,
      isVisible: true
    }
  ]);

  console.log("✅ Database seeded successfully!");
}

seed().catch(console.error);
