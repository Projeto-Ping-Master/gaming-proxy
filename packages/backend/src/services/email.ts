import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  try {
    const verificationUrl = `${config.app.url}/api/v1/auth/verify/${token}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Gaming Proxy - Verificação de Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Bem-vindo ao Gaming Proxy!</h2>
          <p>Obrigado por se cadastrar! Para ativar sua conta, clique no link abaixo:</p>
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verificar Email
          </a>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>Este link expira em 24 horas.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Se você não criou uma conta, pode ignorar este email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to: ${email}`);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendResetEmail(email: string, token: string) {
  try {
    const resetUrl = `${config.app.clientUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Gaming Proxy - Reset de Senha',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset de Senha</h2>
          <p>Você solicitou um reset de senha. Clique no link abaixo para criar uma nova senha:</p>
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Resetar Senha
          </a>
          <p>Ou copie e cole este link no seu navegador:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>Este link expira em 1 hora.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Se você não solicitou este reset, pode ignorar este email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Reset email sent to: ${email}`);
  } catch (error) {
    logger.error('Failed to send reset email:', error);
    throw new Error('Failed to send reset email');
  }
}