import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}

export function emailConfigure(): boolean {
  return getClient() !== null;
}

export async function envoyerEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string; // ex. "Prénom Nom <prenom.nom@sda-renovation.com>"
}): Promise<{ ok: boolean; error?: string }> {
  const c = getClient();
  if (!c) {
    return {
      ok: false,
      error: "Envoi d'email non configuré. Ajoutez RESEND_API_KEY dans les variables d'environnement.",
    };
  }

  try {
    const { error } = await c.emails.send({
      from: params.from ?? "SDA Rénovation <contact@sda-renovation.com>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erreur d'envoi inconnue" };
  }
}
