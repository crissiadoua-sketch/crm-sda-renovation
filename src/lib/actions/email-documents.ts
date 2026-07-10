"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";

// ---------------------------------------------------------------------------
// Template HTML partagé
// ---------------------------------------------------------------------------
function emailLayout(titre: string, corps: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titre}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#1E2F6E;border-radius:10px 10px 0 0;padding:24px 32px">
    <p style="margin:0;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px">SDA Rénovation</p>
    <p style="margin:4px 0 0;font-size:13px;color:#93c5fd">${titre}</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:32px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    ${corps}
  </td></tr>
  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:16px 32px;text-align:center">
    <p style="margin:0;font-size:12px;color:#94a3b8">SDA Rénovation · <a href="mailto:contact@sda-renovation.com" style="color:#6366f1;text-decoration:none">contact@sda-renovation.com</a></p>
    <p style="margin:4px 0 0;font-size:11px;color:#cbd5e1">Ce message a été envoyé automatiquement depuis le CRM SDA Rénovation</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function boiteDoc(contenu: string): string {
  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #1E2F6E;border-radius:6px;padding:20px 24px;margin:20px 0">${contenu}</div>`;
}

function boutonCta(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0">
    <a href="${href}" style="display:inline-block;background:#1E2F6E;color:#ffffff;text-decoration:none;padding:13px 36px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px">${label}</a>
  </div>`;
}

function salutation(prenom: string | null | undefined, message: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Bonjour${prenom ? ` ${prenom}` : ""},</p>
${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : ""}`;
}

function signature(): string {
  return `<p style="margin:24px 0 0;font-size:14px;color:#334155">Cordialement,<br><strong>L'équipe SDA Rénovation</strong></p>`;
}

// ---------------------------------------------------------------------------
// Devis
// ---------------------------------------------------------------------------
export async function envoyerDevisParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const [devis, parametres] = await Promise.all([
    prisma.devis.findUnique({
      where: { id },
      include: {
        client:  { select: { prenom: true, nom: true, raisonSociale: true } },
        chantier: { select: { nom: true } },
        lignes:  { select: { styleTexte: true, designation: true, totalHT: true }, orderBy: { ordre: "asc" } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);
  if (!devis) return { ok: false, error: "Devis introuvable." };

  // Obtient ou crée le token de signature
  let token = devis.signatureToken;
  if (!token) {
    token = randomBytes(32).toString("hex");
    await prisma.devis.update({
      where: { id },
      data: { signatureToken: token, statut: "ENVOYE" },
    });
    revalidatePath(`/devis/${id}`);
  } else if (devis.statut === "BROUILLON") {
    await prisma.devis.update({ where: { id }, data: { statut: "ENVOYE" } });
    revalidatePath(`/devis/${id}`);
  }

  const signatureUrl = `${APP_URL}/devis/sign/${token}`;
  const lignesResume = devis.lignes
    .filter(l => l.styleTexte !== "TITRE" && l.totalHT)
    .slice(0, 5)
    .map(l => `<tr><td style="padding:4px 0;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9">${l.designation}</td><td style="padding:4px 0 4px 16px;font-size:13px;color:#334155;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9">${formatEuros(l.totalHT ?? 0)}</td></tr>`)
    .join("");

  const corps = salutation(devis.client.prenom, message)
    + boiteDoc(`
        <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Devis</p>
        <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${devis.numero}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${devis.chantier.nom}</strong></p>
        ${devis.objet ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Objet : ${devis.objet}</p>` : ""}
        ${devis.dateValidite ? `<p style="margin:0 0 14px;font-size:12px;color:#dc2626">Valable jusqu'au ${formatDate(devis.dateValidite)}</p>` : "<p style='margin:0 0 14px'></p>"}
        ${lignesResume ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px"><tbody>${lignesResume}</tbody></table>` : ""}
        <p style="margin:0;font-size:18px;font-weight:bold;color:#1e293b">Total TTC : ${formatEuros(devis.totalTTC ?? 0)}</p>
        ${parametres?.tauxTvaDefaut ? `<p style="margin:2px 0 0;font-size:12px;color:#64748b">TVA ${parametres.tauxTvaDefaut} %</p>` : ""}
      `)
    + boutonCta(signatureUrl, "Consulter et signer le devis →")
    + `<p style="font-size:12px;color:#94a3b8;text-align:center;margin:-16px 0 20px">Ou copiez ce lien : <a href="${signatureUrl}" style="color:#6366f1">${signatureUrl}</a></p>`
    + `<p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>`
    + signature();

  return envoyerEmail({
    to,
    subject: `Devis ${devis.numero} — SDA Rénovation`,
    html: emailLayout(`Devis N° ${devis.numero}`, corps),
    text: `Bonjour,\n\n${message ? message + "\n\n" : ""}Devis ${devis.numero} — Chantier : ${devis.chantier.nom}\nMontant TTC : ${devis.totalTTC ?? 0} €\n${devis.dateValidite ? `Valable jusqu'au ${devis.dateValidite}\n` : ""}Consultez et signez : ${signatureUrl}\n\nCordialement,\nSDA Rénovation`,
  });
}

// ---------------------------------------------------------------------------
// Facture
// ---------------------------------------------------------------------------
export async function envoyerFactureParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const [facture, parametres] = await Promise.all([
    prisma.facture.findUnique({
      where: { id },
      include: {
        client:  { select: { prenom: true, nom: true, raisonSociale: true } },
        chantier: { select: { nom: true } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);
  if (!facture) return { ok: false, error: "Facture introuvable." };

  // Met à jour le statut
  if (facture.statut === "BROUILLON") {
    await prisma.facture.update({ where: { id }, data: { statut: "ENVOYEE" } });
    revalidatePath(`/factures/${id}`);
  }

  const resteDu  = Math.max(0, facture.totalTTC - facture.montantPaye);
  const typeLabel: Record<string, string> = {
    STANDARD: "Facture", ACOMPTE: "Facture d'acompte",
    SITUATION: "Situation de travaux", SOLDE: "Facture de solde", AVOIR: "Avoir",
  };

  const paiementHtml = parametres?.iban
    ? `<div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:6px;padding:14px 18px;margin-top:16px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#166534;text-transform:uppercase">Coordonnées bancaires — Virement</p>
        <p style="margin:0 0 2px;font-size:13px;color:#166534">IBAN : <strong>${parametres.iban}</strong></p>
        ${parametres.bic ? `<p style="margin:0 0 2px;font-size:13px;color:#166534">BIC : <strong>${parametres.bic}</strong></p>` : ""}
        ${parametres.nomBanque ? `<p style="margin:0;font-size:13px;color:#166534">Banque : ${parametres.nomBanque}</p>` : ""}
      </div>`
    : "";

  const corps = salutation(facture.client.prenom, message)
    + boiteDoc(`
        <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${typeLabel[facture.type] ?? "Facture"}</p>
        <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${facture.numero}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${facture.chantier.nom}</strong></p>
        ${facture.dateEmission ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Date d'émission : ${formatDate(facture.dateEmission)}</p>` : ""}
        ${facture.dateEcheance ? `<p style="margin:0 0 12px;font-size:13px;color:#dc2626">Échéance : ${formatDate(facture.dateEcheance)}</p>` : "<p style='margin:0 0 12px'></p>"}
        <p style="margin:0 0 4px;font-size:18px;font-weight:bold;color:#1e293b">Montant TTC : ${formatEuros(facture.totalTTC)}</p>
        ${resteDu > 0 && resteDu < facture.totalTTC ? `<p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#dc2626">Reste à payer : ${formatEuros(resteDu)}</p>` : ""}
        ${paiementHtml}
      `)
    + `<p style="margin:0;font-size:13px;color:#64748b">Merci de bien vouloir procéder au règlement avant l'échéance indiquée. Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>`
    + signature();

  return envoyerEmail({
    to,
    subject: `${typeLabel[facture.type] ?? "Facture"} ${facture.numero} — SDA Rénovation`,
    html: emailLayout(`${typeLabel[facture.type] ?? "Facture"} N° ${facture.numero}`, corps),
    text: `Bonjour,\n\n${message ? message + "\n\n" : ""}${typeLabel[facture.type] ?? "Facture"} ${facture.numero} — ${facture.chantier.nom}\nMontant TTC : ${formatEuros(facture.totalTTC)}\n${facture.dateEcheance ? `Échéance : ${formatDate(facture.dateEcheance)}\n` : ""}${resteDu > 0 ? `Reste à payer : ${formatEuros(resteDu)}\n` : ""}\nCordialement,\nSDA Rénovation`,
  });
}

// ---------------------------------------------------------------------------
// Bon de Commande
// ---------------------------------------------------------------------------
export async function envoyerBcParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const bc = await prisma.bonCommande.findUnique({
    where: { id },
    include: {
      fournisseur: { select: { nom: true, email: true } },
      chantier:    { select: { nom: true } },
      lignes:      { select: { designation: true, quantite: true, unite: true, prixUnitaireHT: true, totalHT: true }, orderBy: { ordre: "asc" }, take: 10 },
    },
  });
  if (!bc) return { ok: false, error: "Bon de commande introuvable." };

  const lignesHtml = bc.lignes
    .filter(l => l.designation)
    .map(l => `<tr>
      <td style="padding:5px 8px 5px 0;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9">${l.designation}</td>
      <td style="padding:5px 0;font-size:13px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9">${l.quantite ?? ""} ${l.unite ?? ""}</td>
      <td style="padding:5px 0 5px 8px;font-size:13px;color:#334155;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9">${l.totalHT != null ? formatEuros(l.totalHT) : ""}</td>
    </tr>`)
    .join("");

  const enteteTable = `<tr style="background:#f1f5f9">
    <th style="padding:6px 8px 6px 0;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase">Désignation</th>
    <th style="padding:6px 0;font-size:11px;color:#64748b;text-align:center;font-weight:700;text-transform:uppercase">Qté</th>
    <th style="padding:6px 0 6px 8px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase">Total HT</th>
  </tr>`;

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre bon de commande.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Bon de Commande</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${bc.numero}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Fournisseur : <strong>${bc.fournisseur.nom}</strong></p>
      ${bc.chantier ? `<p style="margin:0 0 12px;font-size:13px;color:#475569">Chantier : <strong>${bc.chantier.nom}</strong></p>` : "<p style='margin:0 0 12px'></p>"}
      ${lignesHtml ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px"><thead>${enteteTable}</thead><tbody>${lignesHtml}</tbody></table>` : ""}
      <p style="margin:0;font-size:17px;font-weight:bold;color:#1e293b">Total HT : ${formatEuros(bc.totalHT)}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#64748b">Total TTC : ${formatEuros(bc.totalTTC)}</p>
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Merci de bien vouloir accuser réception de cette commande. Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return envoyerEmail({
    to,
    subject: `Bon de Commande ${bc.numero} — SDA Rénovation`,
    html: emailLayout(`Bon de Commande N° ${bc.numero}`, corps),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Bon de Commande ${bc.numero}\nFournisseur : ${bc.fournisseur.nom}\n${bc.chantier ? `Chantier : ${bc.chantier.nom}\n` : ""}Total TTC : ${formatEuros(bc.totalTTC)}\n\nCordialement,\nSDA Rénovation`,
  });
}

// ---------------------------------------------------------------------------
// Bon de Commande Béton
// ---------------------------------------------------------------------------
export async function envoyerBcBetonParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const bcb = await prisma.bonCommandeBeton.findUnique({
    where: { id },
    include: {
      fournisseur: { select: { nom: true, email: true } },
      chantier:    { select: { nom: true } },
    },
  });
  if (!bcb) return { ok: false, error: "Bon de commande béton introuvable." };

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre bon de commande béton.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Bon de Commande Béton</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${bcb.numero}</p>
      ${bcb.fournisseur ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Centrale : <strong>${bcb.fournisseur.nom}</strong></p>` : ""}
      ${bcb.chantier ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${bcb.chantier.nom}</strong></p>` : ""}
      ${bcb.dateLivraison ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Date de livraison : ${formatDate(bcb.dateLivraison)}</p>` : ""}
      ${bcb.heureDebut ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Heure début : <strong>${bcb.heureDebut}</strong></p>` : ""}
      ${bcb.qteTotale ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Volume total : <strong>${bcb.qteTotale} m³</strong></p>` : ""}
      ${bcb.classeExposition ? `<p style="margin:0 0 12px;font-size:13px;color:#475569">Classe d'exposition : ${bcb.classeExposition}</p>` : ""}
      ${bcb.totalHT ? `<p style="margin:0;font-size:17px;font-weight:bold;color:#1e293b">Total HT : ${formatEuros(bcb.totalHT)}</p>` : ""}
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Merci de bien vouloir confirmer la disponibilité. Contact : <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return envoyerEmail({
    to,
    subject: `BC Béton ${bcb.numero} — SDA Rénovation`,
    html: emailLayout(`Bon de Commande Béton N° ${bcb.numero}`, corps),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}BC Béton ${bcb.numero}\n${bcb.fournisseur ? `Centrale : ${bcb.fournisseur.nom}\n` : ""}${bcb.chantier ? `Chantier : ${bcb.chantier.nom}\n` : ""}${bcb.qteTotale ? `Volume : ${bcb.qteTotale} m³\n` : ""}\nCordialement,\nSDA Rénovation`,
  });
}

// ---------------------------------------------------------------------------
// Test de configuration SMTP
// ---------------------------------------------------------------------------
export async function testerConfigurationEmail(
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to = (formData.get("to") as string)?.trim();
  if (!to) return { ok: false, error: "Adresse email manquante." };

  return envoyerEmail({
    to,
    subject: "Test de configuration SMTP — CRM SDA Rénovation",
    html: emailLayout("Test de configuration email", `
      <p style="font-size:15px;color:#1e293b">Bonjour,</p>
      <p style="font-size:14px;color:#334155">Ce message confirme que la configuration SMTP de votre CRM SDA Rénovation fonctionne correctement.</p>
      <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:6px;padding:16px;margin:20px 0">
        <p style="margin:0;font-size:14px;color:#166534;font-weight:600">✓ Envoi d'email opérationnel</p>
        <p style="margin:4px 0 0;font-size:13px;color:#166534">Les documents du CRM peuvent être envoyés par email.</p>
      </div>
      <p style="font-size:13px;color:#64748b">Envoyé le ${new Date().toLocaleDateString("fr-FR", { dateStyle: "full" })}.</p>
    `),
    text: "Test de configuration SMTP — CRM SDA Rénovation\n\nLa configuration email fonctionne correctement.",
  });
}
