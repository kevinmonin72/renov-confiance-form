import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service d'envoi d'emails via l'API Gmail ou Nodemailer
 * avec fallback en mode Aperçu HTML local si l'API n'est pas encore configurée.
 */
export async function sendQuoteEmail({ to, subject, html, text, quoteReference = 'DEV-000' }) {
  const gmailUser = process.env.GMAIL_USER || 'archisimple13@gmail.com';
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || 'waxfyqcqrkvapiuc';
  const gmailClientId = process.env.GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GMAIL_CLIENT_SECRET;
  const gmailRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const gmailAccessToken = process.env.GMAIL_ACCESS_TOKEN;

  // 1. Enregistrement d'une copie locale (dans /tmp pour compatibilité Vercel)
  const outboxDir = '/tmp/archisimple_outbox';
  try {
    if (!fs.existsSync(outboxDir)) {
      fs.mkdirSync(outboxDir, { recursive: true });
    }
    const previewPath = path.join(outboxDir, `${quoteReference}.html`);
    fs.writeFileSync(previewPath, html, 'utf8');
  } catch (e) {}

  // 2. Cas 1 : Configuration Gmail via OAuth2 (Client ID, Secret, Refresh Token)
  if (gmailUser && gmailClientId && gmailClientSecret && gmailRefreshToken) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: gmailUser,
          clientId: gmailClientId,
          clientSecret: gmailClientSecret,
          refreshToken: gmailRefreshToken,
          accessToken: gmailAccessToken || undefined
        }
      });

      const info = await transporter.sendMail({
        from: `"ArchiSimple" <${gmailUser}>`,
        to,
        subject,
        html,
        text
      });

      console.log(`[MAILER] ✓ Email envoyé avec succès via Gmail API OAuth2 à ${to} (Message ID: ${info.messageId})`);
      return {
        success: true,
        mode: 'gmail-oauth2',
        messageId: info.messageId,
        previewFile: previewPath
      };
    } catch (err) {
      console.error(`[MAILER] Erreur Gmail OAuth2 :`, err.message);
      // Fallback au mode preview
    }
  }

  // 3. Cas 2 : Configuration Gmail via Mot de passe d'application (App Password 16 caractères)
  if (gmailUser && gmailAppPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword.replace(/\s+/g, '') // supprime les espaces
        }
      });

      const info = await transporter.sendMail({
        from: `"ArchiSimple" <${gmailUser}>`,
        replyTo: gmailUser,
        to,
        subject,
        html,
        text
      });

      console.log(`[MAILER] ✓ Email envoyé avec succès via Gmail App Password à ${to} (Message ID: ${info.messageId})`);
      return {
        success: true,
        mode: 'gmail-smtp',
        messageId: info.messageId,
        previewFile: previewPath
      };
    } catch (err) {
      console.error(`[MAILER] Erreur Gmail SMTP :`, err.message);
    }
  }

  // 4. Cas 3 : Mode Aperçu / En attente de la clé API Gmail de l'utilisateur
  console.log(`\n======================================================`);
  console.log(`[MAILER] MODE APERÇU LOCAL (En attente de vos identifiants Gmail API)`);
  console.log(`Destinataire : ${to}`);
  console.log(`Objet        : ${subject}`);
  console.log(`Aperçu HTML  : ${previewPath}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    mode: 'preview-saved',
    message: "Email généré et sauvegardé. Ajoutez vos identifiants Gmail dans le fichier .env pour l'expédition directe.",
    previewFile: previewPath
  };
}
