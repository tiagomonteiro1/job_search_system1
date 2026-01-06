/**
 * Produtos e Preços do Stripe para CarreiraIA
 * 
 * Define os planos de assinatura disponíveis na plataforma
 */

export const STRIPE_PRODUCTS = {
  BASICO: {
    name: "Plano Básico",
    priceId: process.env.STRIPE_PRICE_BASICO || "price_basico",
    amount: 2500, // R$ 25,00 em centavos
    currency: "brl",
    interval: "month" as const,
    features: [
      "15 vagas por mês",
      "Busca automática de vagas",
      "Envio automático de candidaturas",
      "Suporte por email"
    ],
    jobLimit: 15,
    aiAnalysis: false
  },
  PLENO: {
    name: "Plano Pleno",
    priceId: process.env.STRIPE_PRICE_PLENO || "price_pleno",
    amount: 4500, // R$ 45,00 em centavos
    currency: "brl",
    interval: "month" as const,
    features: [
      "25 vagas por mês",
      "Análise de currículo com IA",
      "Busca automática de vagas",
      "Envio automático de candidaturas",
      "Suporte prioritário"
    ],
    jobLimit: 25,
    aiAnalysis: true
  },
  AVANCADO: {
    name: "Plano Avançado",
    priceId: process.env.STRIPE_PRICE_AVANCADO || "price_avancado",
    amount: 5900, // R$ 59,00 em centavos
    currency: "brl",
    interval: "month" as const,
    features: [
      "30 vagas por mês",
      "Análise de currículo com IA",
      "Busca automática de vagas",
      "Envio automático de candidaturas",
      "Integrações ilimitadas",
      "Suporte prioritário 24/7"
    ],
    jobLimit: 30,
    aiAnalysis: true
  }
} as const;

export type PlanType = keyof typeof STRIPE_PRODUCTS;
