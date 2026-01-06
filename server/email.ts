/**
 * Módulo de envio de emails transacionais usando Resend
 * Documentação: https://resend.com/docs/send-with-nodejs
 */

import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "CarreiraIA <onboarding@resend.dev>";

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  console.warn("⚠️  RESEND_API_KEY não configurado. Emails não serão enviados.");
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envia um email transacional
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!resend) {
    console.warn("[Email] Resend não configurado, email não enviado:", params.subject);
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error("[Email] Erro ao enviar email:", error);
      return false;
    }

    console.log(`[Email] Email enviado com sucesso: ${params.subject} para ${params.to}`);
    return true;
  } catch (error: any) {
    console.error("[Email] Erro ao enviar email:", error);
    return false;
  }
}

/**
 * Email de boas-vindas
 */
export async function sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo ao CarreiraIA!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            <p>Estamos muito felizes em ter você conosco! O CarreiraIA é sua plataforma completa para encontrar o emprego dos seus sonhos com a ajuda de inteligência artificial.</p>
            
            <h3>🚀 Próximos Passos:</h3>
            <ol>
              <li><strong>Faça upload do seu currículo</strong> - Nossa IA irá analisá-lo e sugerir melhorias</li>
              <li><strong>Busque vagas compatíveis</strong> - Encontre milhares de oportunidades reais</li>
              <li><strong>Envie candidaturas automaticamente</strong> - Deixe a tecnologia trabalhar por você</li>
            </ol>
            
            <p>Escolha um dos nossos planos para começar:</p>
            <ul>
              <li><strong>Básico (R$ 25/mês)</strong> - 15 vagas por mês</li>
              <li><strong>Pleno (R$ 45/mês)</strong> - 25 vagas + Análise IA</li>
              <li><strong>Avançado (R$ 59/mês)</strong> - 30 vagas + Análise IA + Integrações ilimitadas</li>
            </ul>
            
            <a href="https://carreiraai.com/dashboard" class="button">Acessar Dashboard</a>
          </div>
          <div class="footer">
            <p>© 2026 CarreiraIA - Encontre seu emprego dos sonhos com IA</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Bem-vindo ao CarreiraIA, ${userName}!

Estamos muito felizes em ter você conosco! O CarreiraIA é sua plataforma completa para encontrar o emprego dos seus sonhos com a ajuda de inteligência artificial.

Próximos Passos:
1. Faça upload do seu currículo - Nossa IA irá analisá-lo e sugerir melhorias
2. Busque vagas compatíveis - Encontre milhares de oportunidades reais
3. Envie candidaturas automaticamente - Deixe a tecnologia trabalhar por você

Acesse seu dashboard em: https://carreiraai.com/dashboard

© 2026 CarreiraIA
  `;

  return sendEmail({
    to,
    subject: "🎉 Bem-vindo ao CarreiraIA!",
    html,
    text,
  });
}

/**
 * Email de análise de currículo concluída
 */
export async function sendResumeAnalyzedEmail(
  to: string,
  userName: string,
  resumeFileName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Análise de Currículo Concluída!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            <p>A análise do seu currículo <strong>${resumeFileName}</strong> foi concluída com sucesso!</p>
            
            <p>Nossa inteligência artificial analisou seu currículo e gerou sugestões personalizadas para melhorar suas chances de conseguir entrevistas.</p>
            
            <h3>📊 O que analisamos:</h3>
            <ul>
              <li>Pontos fortes do seu perfil</li>
              <li>Áreas que podem ser melhoradas</li>
              <li>Otimização para sistemas ATS</li>
              <li>Formatação profissional</li>
              <li>Quantificação de resultados</li>
            </ul>
            
            <a href="https://carreiraai.com/resumes" class="button">Ver Análise Completa</a>
          </div>
          <div class="footer">
            <p>© 2026 CarreiraIA - Encontre seu emprego dos sonhos com IA</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Análise de Currículo Concluída!

Olá ${userName},

A análise do seu currículo "${resumeFileName}" foi concluída com sucesso!

Nossa inteligência artificial analisou seu currículo e gerou sugestões personalizadas para melhorar suas chances de conseguir entrevistas.

Acesse para ver a análise completa: https://carreiraai.com/resumes

© 2026 CarreiraIA
  `;

  return sendEmail({
    to,
    subject: "✅ Análise de Currículo Concluída - CarreiraIA",
    html,
    text,
  });
}

/**
 * Email de novas vagas encontradas
 */
export async function sendJobsFoundEmail(
  to: string,
  userName: string,
  jobCount: number,
  searchQuery: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .highlight { background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Novas Vagas Encontradas!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            
            <div class="highlight">
              <p style="margin: 0; font-size: 18px;"><strong>${jobCount} novas vagas</strong> foram encontradas para "${searchQuery}"!</p>
            </div>
            
            <p>Encontramos oportunidades que combinam com seu perfil. Não perca tempo e candidate-se agora!</p>
            
            <h3>💼 Próximos Passos:</h3>
            <ol>
              <li>Acesse a página de vagas</li>
              <li>Revise as oportunidades encontradas</li>
              <li>Envie suas candidaturas com um clique</li>
            </ol>
            
            <a href="https://carreiraai.com/jobs" class="button">Ver Vagas</a>
          </div>
          <div class="footer">
            <p>© 2026 CarreiraIA - Encontre seu emprego dos sonhos com IA</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Novas Vagas Encontradas!

Olá ${userName},

${jobCount} novas vagas foram encontradas para "${searchQuery}"!

Encontramos oportunidades que combinam com seu perfil. Não perca tempo e candidate-se agora!

Acesse: https://carreiraai.com/jobs

© 2026 CarreiraIA
  `;

  return sendEmail({
    to,
    subject: `🎯 ${jobCount} Novas Vagas Encontradas - CarreiraIA`,
    html,
    text,
  });
}

/**
 * Email de confirmação de candidatura
 */
export async function sendApplicationConfirmationEmail(
  to: string,
  userName: string,
  jobTitle: string,
  company: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .job-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Candidatura Enviada!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            <p>Sua candidatura foi enviada com sucesso!</p>
            
            <div class="job-card">
              <h3 style="margin-top: 0;">${jobTitle}</h3>
              <p style="color: #666; margin: 0;"><strong>${company}</strong></p>
            </div>
            
            <p>Agora é só aguardar o retorno da empresa. Boa sorte! 🍀</p>
            
            <h3>📌 Dicas:</h3>
            <ul>
              <li>Mantenha seu perfil atualizado</li>
              <li>Prepare-se para possíveis entrevistas</li>
              <li>Continue buscando outras oportunidades</li>
            </ul>
            
            <a href="https://carreiraai.com/dashboard" class="button">Ver Minhas Candidaturas</a>
          </div>
          <div class="footer">
            <p>© 2026 CarreiraIA - Encontre seu emprego dos sonhos com IA</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Candidatura Enviada!

Olá ${userName},

Sua candidatura foi enviada com sucesso!

Vaga: ${jobTitle}
Empresa: ${company}

Agora é só aguardar o retorno da empresa. Boa sorte!

Acesse: https://carreiraai.com/dashboard

© 2026 CarreiraIA
  `;

  return sendEmail({
    to,
    subject: `✅ Candidatura Enviada: ${jobTitle} - CarreiraIA`,
    html,
    text,
  });
}

/**
 * Email de assinatura ativada
 */
export async function sendSubscriptionActivatedEmail(
  to: string,
  userName: string,
  planName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .plan-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 Assinatura Ativada!</h1>
          </div>
          <div class="content">
            <p>Olá <strong>${userName}</strong>,</p>
            <p>Sua assinatura foi ativada com sucesso!</p>
            
            <p>Você agora tem acesso ao plano:</p>
            <div style="text-align: center;">
              <span class="plan-badge">${planName}</span>
            </div>
            
            <h3>🚀 Recursos Disponíveis:</h3>
            <ul>
              <li>Busca automática de vagas</li>
              <li>Envio automático de candidaturas</li>
              ${planName !== 'Plano Básico' ? '<li>Análise de currículo com IA</li>' : ''}
              ${planName === 'Plano Avançado' ? '<li>Integrações ilimitadas</li>' : ''}
              <li>Suporte prioritário</li>
            </ul>
            
            <p>Comece agora a encontrar seu emprego dos sonhos!</p>
            
            <a href="https://carreiraai.com/dashboard" class="button">Começar Agora</a>
          </div>
          <div class="footer">
            <p>© 2026 CarreiraIA - Encontre seu emprego dos sonhos com IA</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Assinatura Ativada!

Olá ${userName},

Sua assinatura foi ativada com sucesso!

Plano: ${planName}

Comece agora a encontrar seu emprego dos sonhos!

Acesse: https://carreiraai.com/dashboard

© 2026 CarreiraIA
  `;

  return sendEmail({
    to,
    subject: `🎊 Assinatura Ativada: ${planName} - CarreiraIA`,
    html,
    text,
  });
}
