import nodemailer from "nodemailer";

// Envoi d'email via le compte Microsoft 365 de l'entreprise (SMTP AUTH).
// Variables requises : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
// Pour Microsoft 365 : smtp.office365.com, port 587, l'adresse complète comme
// utilisateur, et un mot de passe d'application si la double authentification
// est activée sur la boîte (l'authentification SMTP doit aussi être activée
// pour cette boîte dans le centre d'administration Microsoft 365).

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const port = Number(SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export function emailConfigure(): boolean {
  return getTransporter() !== null;
}

export async function envoyerEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) {
    return {
      ok: false,
      error: "Envoi d'email non configuré. Ajoutez SMTP_HOST, SMTP_USER et SMTP_PASS dans les variables d'environnement.",
    };
  }

  try {
    await t.sendMail({
      from: `"SDA Rénovation" <${process.env.SMTP_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur d'envoi inconnue" };
  }
}
