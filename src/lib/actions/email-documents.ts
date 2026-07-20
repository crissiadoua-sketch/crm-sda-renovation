"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";

// ---------------------------------------------------------------------------
// Wrapper envoyerEmail + journalisation automatique dans EmailLog
// ---------------------------------------------------------------------------
type LogMeta = { type: string; documentId: string; documentRef: string; sentBy: string; vue?: string };

async function sendAndLog(
  params: Parameters<typeof envoyerEmail>[0],
  meta: LogMeta,
): Promise<{ ok: boolean; error?: string }> {
  const result = await envoyerEmail(params);
  if (result.ok) {
    try {
      await prisma.emailLog.create({
        data: {
          documentType: meta.type,
          documentId: meta.documentId,
          documentRef: meta.documentRef,
          to: params.to,
          cc: params.cc ?? null,
          subject: params.subject,
          vue: meta.vue ?? null,
          sentBy: meta.sentBy,
        },
      });
    } catch { /* journalisation non bloquante */ }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Template HTML partagé
// ---------------------------------------------------------------------------
type Signataire = { name: string; titre?: string | null; telephone?: string | null; email: string; societe?: string | null; adresse?: string | null; externe?: boolean };

function signatureHtml(s: Signataire): string {
  const tel = s.telephone ?? "";
  if (s.externe) {
    const adresseLines = s.adresse ? s.adresse.replace(/\n/g, "<br>") : "";
    return `
<table cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px;width:100%">
  <tr>
    <td style="vertical-align:top;padding-bottom:12px">
      <p style="margin:0;font-size:13px;font-weight:bold;color:#1e293b">${s.name}</p>
      ${s.titre ? `<p style="margin:2px 0 0;font-size:12px;color:#475569">${s.titre}</p>` : ""}
      ${s.societe ? `<p style="margin:8px 0 0;font-size:12px;font-weight:600;color:#1e293b">${s.societe}</p>` : ""}
      ${adresseLines ? `<p style="margin:2px 0 0;font-size:12px;color:#475569;line-height:1.6">${adresseLines}</p>` : ""}
      ${tel ? `<p style="margin:6px 0 0;font-size:12px;color:#1e293b">Tél : <a href="tel:${tel}" style="color:#1e293b;text-decoration:none">${tel}</a></p>` : ""}
      <p style="margin:3px 0 0;font-size:12px"><a href="mailto:${s.email}" style="color:#1e293b;text-decoration:underline">${s.email}</a></p>
    </td>
  </tr>
  <tr>
    <td style="padding-top:10px">
      <img src="${APP_URL}/logo-oec.jpg" alt="Ordre des Experts-Comptables" width="180" style="display:block;max-width:180px">
    </td>
  </tr>
</table>`;
  }
  return `
<table cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px;width:100%">
  <tr>
    <!-- Logo -->
    <td style="width:90px;padding-right:16px;vertical-align:middle">
      <img src="${APP_URL}/logo.png" alt="SDA Rénovation" width="80" style="display:block;max-width:80px">
    </td>
    <!-- Séparateur -->
    <td style="width:1px;background:#e2e8f0;padding:0">&nbsp;</td>
    <!-- Infos -->
    <td style="padding-left:16px;vertical-align:top">
      <p style="margin:0;font-size:13px;font-weight:bold;color:#1E2F6E">${s.name}</p>
      ${s.titre ? `<p style="margin:1px 0 0;font-size:12px;color:#1E2F6E">${s.titre}</p>` : ""}
      <p style="margin:1px 0 0;font-size:12px;color:#1E2F6E">SDA Rénovation</p>
      ${tel ? `<p style="margin:8px 0 0;font-size:12px;color:#1e293b"><a href="tel:${tel}" style="color:#1e293b;text-decoration:none">${tel}</a></p>` : ""}
      <p style="margin:3px 0 0;font-size:12px"><a href="mailto:${s.email}" style="color:#1e293b;text-decoration:underline">${s.email}</a></p>
      <p style="margin:3px 0 0;font-size:11px;color:#64748b">Z.I du Casque 23 bis rue Aristide Berges,<br>31270 Cugnaux</p>
      <table cellpadding="0" cellspacing="0" style="margin-top:8px">
        <tr>
          <td style="padding-right:6px">
            <a href="https://www.facebook.com/sdarenovation" style="display:inline-block;width:28px;height:28px;background:#1e1e1e;border-radius:50%;text-align:center;line-height:28px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold">f</a>
          </td>
          <td>
            <a href="https://www.linkedin.com/company/sda-renovation" style="display:inline-block;width:28px;height:28px;background:#1e1e1e;border-radius:50%;text-align:center;line-height:28px;color:#ffffff;text-decoration:none;font-size:11px;font-weight:bold">in</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

// FROM toujours contact@sda-renovation.com (adresse de confiance vérifiée Resend).
// L'email du collaborateur va en Reply-To pour que les réponses lui reviennent.
function fromAddress(signataire: Signataire | undefined): string {
  if (!signataire || signataire.externe) return "SDA Rénovation <contact@sda-renovation.com>";
  // Si l'email du profil est sur le domaine vérifié, l'utiliser comme adresse expéditeur
  if (signataire.email?.endsWith("@sda-renovation.com")) {
    return `${signataire.name} <${signataire.email}>`;
  }
  return `${signataire.name} <contact@sda-renovation.com>`;
}

function replyToAddress(signataire: Signataire | undefined): string | undefined {
  if (!signataire || signataire.externe) return undefined;
  // Si le FROM est déjà leur email perso (@sda-renovation.com), pas besoin de Reply-To
  if (signataire.email?.endsWith("@sda-renovation.com")) return undefined;
  return signataire.email !== "contact@sda-renovation.com" ? signataire.email : undefined;
}

async function getSignataire(): Promise<Signataire | undefined> {
  try {
    const { getUser } = await import("@/lib/dal");
    const u = await getUser();
    return {
      name: u.name,
      titre: (u as { titre?: string | null }).titre ?? null,
      telephone: (u as { telephone?: string | null }).telephone ?? null,
      email: u.email,
      societe: (u as { societe?: string | null }).societe ?? null,
      adresse: (u as { adresse?: string | null }).adresse ?? null,
      externe: u.role === "EXPERT_COMPTABLE",
    };
  } catch {
    return undefined;
  }
}

function emailLayout(titre: string, corps: string, signataire?: Signataire): string {
  const sig = signataire ? signatureHtml(signataire) : `
    <p style="margin:0;font-size:12px;color:#94a3b8">SDA Rénovation · <a href="mailto:contact@sda-renovation.com" style="color:#1E2F6E;text-decoration:none">contact@sda-renovation.com</a></p>`;
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
  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:20px 32px">
    ${sig}
    <p style="margin:16px 0 0;font-size:10px;color:#cbd5e1;text-align:center">Ce message a été envoyé automatiquement depuis le CRM SDA Rénovation</p>
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
// Devis — avec choix de la vue
// ---------------------------------------------------------------------------
export async function envoyerDevisParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;
  // Vue : "client" | "commerciale" | "synthese" | "sans_prix"
  const vue     = (formData.get("vue") as string) || "client";

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const [signataire, [devis, parametres]] = await Promise.all([
    getSignataire(),
    Promise.all([
    prisma.devis.findUnique({
      where: { id },
      include: {
        client:  { select: { prenom: true, nom: true, raisonSociale: true } },
        chantier: { select: { nom: true } },
        lignes:  {
          select: { styleTexte: true, designation: true, quantite: true, unite: true, prixUnitaireHT: true, totalHT: true },
          orderBy: { ordre: "asc" },
        },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
    ]),
  ]);
  if (!devis) return { ok: false, error: "Devis introuvable." };

  // Génère ou récupère le token de signature (toutes les vues sauf sans_prix)
  let token = devis.signatureToken;
  if (!token && vue !== "sans_prix") {
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

  const consulterUrl = token ? `${APP_URL}/devis/consulter/${token}` : "";
  const signatureUrl = token ? `${APP_URL}/devis/sign/${token}` : "";

  // ── Entête commune à toutes les vues ────────────────────────────────────
  const enteteDoc = `
    <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Devis</p>
    <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${devis.numero}</p>
    <p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${devis.chantier.nom}</strong></p>
    ${devis.objet ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Objet : <strong>${devis.objet}</strong></p>` : ""}
    ${devis.dateValidite ? `<p style="margin:0 0 8px;font-size:12px;color:#dc2626">Offre valable jusqu'au ${formatDate(devis.dateValidite)}</p>` : ""}
    ${devis.totalTTC ? `<p style="margin:8px 0 0;font-size:20px;font-weight:800;color:#1e293b">Total TTC : ${formatEuros(devis.totalTTC)}</p>` : ""}
    ${parametres?.tauxTvaDefaut ? `<p style="margin:2px 0 0;font-size:12px;color:#64748b">TVA ${parametres.tauxTvaDefaut} %</p>` : ""}
  `;

  // ── Lignes selon la vue (vues internes uniquement) ──────────────────────
  const lignesFiltrees = devis.lignes.filter(l => l.styleTexte !== "TITRE");

  const lignesCommerciales = lignesFiltrees
    .filter(l => l.totalHT)
    .map(l => `<tr>
      <td style="padding:5px 0;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9">${l.designation}</td>
      ${l.quantite != null ? `<td style="padding:5px 8px;font-size:12px;color:#64748b;text-align:center;white-space:nowrap;border-bottom:1px solid #f1f5f9">${l.quantite} ${l.unite ?? ""}</td>` : `<td style="border-bottom:1px solid #f1f5f9"></td>`}
      <td style="padding:5px 0 5px 16px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9">${formatEuros(l.totalHT ?? 0)}</td>
    </tr>`)
    .join("");

  const lignesSansPrix = lignesFiltrees
    .map(l => `<tr><td style="padding:4px 0;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9">• ${l.designation}</td></tr>`)
    .join("");

  const tableEntete = `<tr style="background:#f1f5f9">
    <th style="padding:6px 0;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase">Désignation</th>
    <th style="padding:6px 8px;font-size:11px;color:#64748b;text-align:center;font-weight:700;text-transform:uppercase">Qté</th>
    <th style="padding:6px 0 6px 16px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase">Montant HT</th>
  </tr>`;

  let corps = "";

  if (vue === "client") {
    // Vue client : email épuré — juste l'essentiel + bouton "Consulter"
    corps = salutation(devis.client.prenom, message)
      + boiteDoc(enteteDoc)
      + boutonCta(consulterUrl, "Consulter votre devis →")
      + `<p style="font-size:12px;color:#94a3b8;text-align:center;margin:-16px 0 20px">Ou copiez ce lien : <a href="${consulterUrl}" style="color:#6366f1">${consulterUrl}</a></p>`
      + `<p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>`
      + signature();
  } else if (vue === "commerciale") {
    corps = salutation(devis.client.prenom, message)
      + boiteDoc(enteteDoc
        + (lignesCommerciales ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px"><thead>${tableEntete}</thead><tbody>${lignesCommerciales}</tbody></table>` : "")
        + `<div style="border-top:2px solid #1E2F6E;margin-top:8px;padding-top:10px">`
        + `<p style="margin:0;font-size:14px;color:#475569">Total HT : <strong>${formatEuros(devis.totalHT ?? 0)}</strong></p>`
        + (parametres?.tauxTvaDefaut ? `<p style="margin:2px 0;font-size:13px;color:#64748b">TVA ${parametres.tauxTvaDefaut} % : ${formatEuros((devis.totalTTC ?? 0) - (devis.totalHT ?? 0))}</p>` : "")
        + `<p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#1e293b">Total TTC : ${formatEuros(devis.totalTTC ?? 0)}</p>`
        + `</div>`)
      + boutonCta(signatureUrl, "Consulter et signer le devis →")
      + `<p style="font-size:12px;color:#94a3b8;text-align:center;margin:-16px 0 20px">Ou copiez ce lien : <a href="${signatureUrl}" style="color:#6366f1">${signatureUrl}</a></p>`
      + `<p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>`
      + signature();
  } else if (vue === "synthese") {
    corps = salutation(devis.client.prenom, message)
      + boiteDoc(enteteDoc
        + `<div style="display:flex;gap:24px;margin-top:8px">`
        + `<div><p style="margin:0 0 2px;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700">Total HT</p><p style="margin:0;font-size:20px;font-weight:bold;color:#1e293b">${formatEuros(devis.totalHT ?? 0)}</p></div>`
        + (parametres?.tauxTvaDefaut ? `<div><p style="margin:0 0 2px;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700">TVA ${parametres.tauxTvaDefaut}%</p><p style="margin:0;font-size:20px;font-weight:bold;color:#64748b">${formatEuros((devis.totalTTC ?? 0) - (devis.totalHT ?? 0))}</p></div>` : "")
        + `<div><p style="margin:0 0 2px;font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700">Total TTC</p><p style="margin:0;font-size:22px;font-weight:800;color:#1E2F6E">${formatEuros(devis.totalTTC ?? 0)}</p></div>`
        + `</div>`)
      + boutonCta(signatureUrl, "Consulter et signer le devis →")
      + `<p style="font-size:12px;color:#94a3b8;text-align:center;margin:-16px 0 20px">Ou copiez ce lien : <a href="${signatureUrl}" style="color:#6366f1">${signatureUrl}</a></p>`
      + `<p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>`
      + signature();
  } else {
    // Vue sans_prix : descriptions uniquement, pas de montants
    corps = salutation(devis.client.prenom, message)
      + boiteDoc(enteteDoc
        + (lignesSansPrix ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px"><tbody>${lignesSansPrix}</tbody></table>` : ""))
      + `<p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>`
      + signature();
  }

  const vueLabel: Record<string, string> = {
    client: "Vue client", commerciale: "Vue commerciale détaillée",
    synthese: "Vue synthèse", sans_prix: "Vue sans prix",
  };

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Devis ${devis.numero} — SDA Rénovation`,
    html: emailLayout(`Devis N° ${devis.numero}`, corps, signataire),
    text: `Bonjour,\n\n${message ? message + "\n\n" : ""}Devis ${devis.numero} — Chantier : ${devis.chantier.nom}\n${devis.objet ? `Objet : ${devis.objet}\n` : ""}${vue !== "sans_prix" ? `Montant TTC : ${formatEuros(devis.totalTTC ?? 0)}\n` : ""}${devis.dateValidite ? `Offre valable jusqu'au ${formatDate(devis.dateValidite)}\n` : ""}${vue === "client" && consulterUrl ? `Consultez votre devis : ${consulterUrl}\n` : signatureUrl ? `Consultez et signez : ${signatureUrl}\n` : ""}\nCordialement,\nSDA Rénovation\n[${vueLabel[vue] ?? vue}]`,
    cc,
    bcc,
  }, { type: "devis", documentId: id, documentRef: String(devis.numero), sentBy: signataire?.name ?? "", vue: vue });
}

// ---------------------------------------------------------------------------
// Variantes de devis — envoi groupé client (toutes les offres en un email)
// ---------------------------------------------------------------------------
export async function envoyerVariantesGroupeesParEmail(
  chantierId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc = (formData.get("cc") as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;
  const selectedIdsRaw = (formData.get("selectedIds") as string)?.trim() || "";
  const selectedIds = selectedIdsRaw ? selectedIdsRaw.split(",").filter(Boolean) : [];

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const [signataire, chantier] = await Promise.all([
    getSignataire(),
    prisma.chantier.findUnique({
      where: { id: chantierId },
      include: { client: { select: { prenom: true, nom: true, raisonSociale: true } } },
    }),
  ]);

  if (!chantier) return { ok: false, error: "Chantier introuvable." };

  const variantes = await prisma.devis.findMany({
    where: {
      chantierId,
      ...(selectedIds.length > 0 ? { id: { in: selectedIds } } : {}),
      statut: { in: ["BROUILLON", "ENVOYE"] },
      type: "INITIAL",
    },
    orderBy: { totalTTC: "asc" },
  });

  if (variantes.length === 0) return { ok: false, error: "Aucune variante disponible à envoyer." };

  // Génère un token de signature pour chaque variante si absent + passe en ENVOYE
  const variantesAvecToken = await Promise.all(
    variantes.map(async (v) => {
      let token = v.signatureToken;
      if (!token) {
        token = randomBytes(32).toString("hex");
        await prisma.devis.update({ where: { id: v.id }, data: { signatureToken: token, statut: "ENVOYE" } });
      } else if (v.statut === "BROUILLON") {
        await prisma.devis.update({ where: { id: v.id }, data: { statut: "ENVOYE" } });
      }
      return { ...v, signatureToken: token };
    }),
  );

  function badgeStyle(objet: string | null): { label: string; bg: string; color: string } {
    const o = (objet ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
    if (o.includes("ECONOMIQUE") || o.includes("ESSENTIELLE")) return { label: "Essentielle", bg: "#dcfce7", color: "#166534" };
    if (o.includes("OPTIMISEE") || o.includes("OPTIMISE")) return { label: "Optimisée", bg: "#dbeafe", color: "#1e40af" };
    if (o.includes("COMPLETE")) return { label: "Complète", bg: "#ede9fe", color: "#5b21b6" };
    if (o.includes("PREMIUM")) return { label: "Premium ✦", bg: "#fef3c7", color: "#92400e" };
    return { label: "Offre", bg: "#f1f5f9", color: "#475569" };
  }

  const cardsHtml = variantesAvecToken.map((v) => {
    const badge = badgeStyle(v.objet);
    const lien = `${APP_URL}/devis/consulter/${v.signatureToken}`;
    return `
<div style="border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:14px">
  <div style="margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-size:12px;color:#64748b;font-family:monospace;font-weight:600">${v.numero}</span>
      <span style="padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:700;background:${badge.bg};color:${badge.color}">${badge.label}</span>
    </div>
    <p style="margin:0;font-size:26px;font-weight:700;color:#1E2F6E;letter-spacing:-0.5px">${formatEuros(v.totalTTC ?? 0)} <span style="font-size:13px;font-weight:400;color:#64748b">TTC</span></p>
    <p style="margin:3px 0 0;font-size:12px;color:#94a3b8">${formatEuros(v.totalHT ?? 0)} HT · ${formatEuros(v.totalTVA ?? 0)} TVA</p>
    ${v.objet ? `<p style="margin:6px 0 0;font-size:13px;color:#334155;font-style:italic">${v.objet}</p>` : ""}
  </div>
  <a href="${lien}" style="display:inline-block;background:#1E2F6E;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:7px;font-size:14px;font-weight:600;letter-spacing:0.1px">Voir et signer ce devis →</a>
</div>`;
  }).join("");

  const nb = variantesAvecToken.length;
  const clientPrenom = chantier.client?.prenom ?? null;

  const corps = salutation(clientPrenom, message)
    + cardsHtml
    + signature();

  const subject = customSubject ?? `Vos offres — ${chantier.nom} — SDA Rénovation`;

  const result = await sendAndLog(
    {
      from: fromAddress(signataire),
      replyTo: replyToAddress(signataire),
      to,
      subject,
      html: emailLayout(`Vos offres — ${chantier.nom}`, corps, signataire),
      text: `Bonjour${chantier.client?.prenom ? ` ${chantier.client.prenom}` : ""},\n\n${message ? message + "\n\n" : ""}`
        + variantesAvecToken.map((v) => `• ${v.numero} — ${formatEuros(v.totalTTC ?? 0)} TTC${v.objet ? ` (${v.objet})` : ""}\n  ${APP_URL}/devis/consulter/${v.signatureToken}`).join("\n\n")
        + `\n\nCordialement,\nSDA Rénovation`,
      cc,
      bcc,
    },
    { type: "variantes", documentId: chantierId, documentRef: chantier.nom, sentBy: signataire?.name ?? "CRM" },
  );

  revalidatePath(`/devis/comparer/${chantierId}`);
  revalidatePath("/devis");
  return result;
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
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

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
  const signataire = await getSignataire();

  if (!facture) return { ok: false, error: "Facture introuvable." };

  // Générer le token de téléchargement si absent
  let downloadToken = facture.downloadToken;
  if (!downloadToken) {
    downloadToken = randomBytes(32).toString("hex");
    await prisma.facture.update({ where: { id }, data: { downloadToken } });
  }

  // Met à jour le statut
  if (facture.statut === "BROUILLON") {
    await prisma.facture.update({ where: { id }, data: { statut: "ENVOYEE" } });
    revalidatePath(`/factures/${id}`);
  }

  const dlUrl    = `${APP_URL}/api/factures/${id}/dl?token=${downloadToken}`;
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
    + boutonCta(dlUrl, "📄 Télécharger / Voir ma facture")
    + `<p style="margin:0;font-size:13px;color:#64748b">Merci de bien vouloir procéder au règlement avant l'échéance indiquée. Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>`
    + signature();

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `${typeLabel[facture.type] ?? "Facture"} ${facture.numero} — SDA Rénovation`,
    html: emailLayout(`${typeLabel[facture.type] ?? "Facture"} N° ${facture.numero}`, corps, signataire),
    text: `Bonjour,\n\n${message ? message + "\n\n" : ""}${typeLabel[facture.type] ?? "Facture"} ${facture.numero} — ${facture.chantier.nom}\nMontant TTC : ${formatEuros(facture.totalTTC)}\n${facture.dateEcheance ? `Échéance : ${formatDate(facture.dateEcheance)}\n` : ""}${resteDu > 0 ? `Reste à payer : ${formatEuros(resteDu)}\n` : ""}\nTélécharger : ${dlUrl}\n\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "facture", documentId: id, documentRef: String(facture.numero), sentBy: signataire?.name ?? "" });
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
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const bc = await prisma.bonCommande.findUnique({
    where: { id },
    include: {
      fournisseur: { select: { nom: true, email: true } },
      chantier:    { select: { nom: true } },
      lignes:      { select: { designation: true, quantite: true, unite: true, prixUnitaireHT: true, totalHT: true }, orderBy: { ordre: "asc" }, take: 10 },
    },
  });
  const signataire = await getSignataire();

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

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Bon de Commande ${bc.numero} — SDA Rénovation`,
    html: emailLayout(`Bon de Commande N° ${bc.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Bon de Commande ${bc.numero}\nFournisseur : ${bc.fournisseur.nom}\n${bc.chantier ? `Chantier : ${bc.chantier.nom}\n` : ""}Total TTC : ${formatEuros(bc.totalTTC)}\n\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "bon-commande", documentId: id, documentRef: String(bc.numero), sentBy: signataire?.name ?? "" });
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
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const bcb = await prisma.bonCommandeBeton.findUnique({
    where: { id },
    include: {
      fournisseur: { select: { nom: true, email: true } },
      chantier:    { select: { nom: true } },
    },
  });
  const signataire = await getSignataire();

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

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `BC Béton ${bcb.numero} — SDA Rénovation`,
    html: emailLayout(`Bon de Commande Béton N° ${bcb.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}BC Béton ${bcb.numero}\n${bcb.fournisseur ? `Centrale : ${bcb.fournisseur.nom}\n` : ""}${bcb.chantier ? `Chantier : ${bcb.chantier.nom}\n` : ""}${bcb.qteTotale ? `Volume : ${bcb.qteTotale} m³\n` : ""}\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "bc-beton", documentId: id, documentRef: String(bcb.numero), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Contrat de sous-traitance
// ---------------------------------------------------------------------------
export async function envoyerContratSTParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const contrat = await prisma.contratSousTraitance.findUnique({
    where: { id },
    include: {
      sousTraitant: { select: { nom: true, email: true } },
      chantier:     { select: { nom: true } },
    },
  });
  const signataire = await getSignataire();

  if (!contrat) return { ok: false, error: "Contrat introuvable." };

  if (contrat.statut === "BROUILLON") {
    await prisma.contratSousTraitance.update({ where: { id }, data: { statut: "ENVOYE" } });
    revalidatePath(`/contrats-sous-traitance/${id}`);
  }

  const signatureUrl = contrat.signatureToken
    ? `${APP_URL}/contrats/sign/${contrat.signatureToken}`
    : null;

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre contrat de sous-traitance à signer électroniquement.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Contrat de sous-traitance</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${contrat.numero}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Sous-traitant : <strong>${contrat.sousTraitant.nom}</strong></p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${contrat.chantier.nom}</strong></p>
      ${contrat.objet ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Objet : ${contrat.objet}</p>` : ""}
      ${contrat.montantHT != null ? `<p style="margin:8px 0 0;font-size:17px;font-weight:bold;color:#1e293b">Montant HT : ${formatEuros(contrat.montantHT)}</p>` : ""}
    `)}
    ${signatureUrl ? boutonCta(signatureUrl, "✍️ Signer le contrat électroniquement") : ""}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Contrat de sous-traitance ${contrat.numero} — SDA Rénovation`,
    html: emailLayout(`Contrat de sous-traitance N° ${contrat.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Contrat ${contrat.numero}\nSous-traitant : ${contrat.sousTraitant.nom}\nChantier : ${contrat.chantier.nom}\n${contrat.montantHT != null ? `Montant HT : ${formatEuros(contrat.montantHT)}\n` : ""}${signatureUrl ? `\nLien de signature : ${signatureUrl}\n` : ""}\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "contrat-st", documentId: id, documentRef: String(contrat.numero), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Ordre de mission
// ---------------------------------------------------------------------------
export async function envoyerOrdreMissionParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const om = await prisma.ordreMission.findUnique({
    where: { id },
    include: {
      sousTraitant: { select: { nom: true, email: true } },
      interimaire:  { select: { nom: true, prenom: true } },
      chantier:     { select: { nom: true } },
    },
  });
  const signataire = await getSignataire();

  if (!om) return { ok: false, error: "Ordre de mission introuvable." };

  if (om.statut === "BROUILLON") {
    await prisma.ordreMission.update({ where: { id }, data: { statut: "ENVOYE" } });
    revalidatePath(`/ordres-mission/${id}`);
  }

  const intervenant = om.interimaire
    ? `${om.interimaire.prenom} ${om.interimaire.nom}`
    : (om.sousTraitant?.nom ?? "—");

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous l'ordre de mission.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Ordre de mission</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${om.numero}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Mission : <strong>${om.titre}</strong></p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Intervenant : <strong>${intervenant}</strong></p>
      ${om.lieu ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Lieu : ${om.lieu}</p>` : ""}
      ${om.chantier ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : ${om.chantier.nom}</p>` : ""}
      <p style="margin:0 0 0;font-size:13px;color:#475569">Du : <strong>${formatDate(om.dateDebut)}</strong>${om.dateFin ? ` au ${formatDate(om.dateFin)}` : ""}</p>
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Ordre de mission ${om.numero} — SDA Rénovation`,
    html: emailLayout(`Ordre de mission N° ${om.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Ordre de mission ${om.numero} — ${om.titre}\nIntervenant : ${intervenant}\n${om.chantier ? `Chantier : ${om.chantier.nom}\n` : ""}Du ${formatDate(om.dateDebut)}${om.dateFin ? ` au ${formatDate(om.dateFin)}` : ""}\n\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "ordre-mission", documentId: id, documentRef: String(om.numero), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// État des réserves
// ---------------------------------------------------------------------------
export async function envoyerEtatReservesParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const etat = await prisma.etatReserves.findUnique({
    where: { id },
    include: {
      chantier: { select: { nom: true } },
      client:   { select: { nom: true, email: true } },
    },
  });
  const signataire = await getSignataire();

  if (!etat) return { ok: false, error: "État des réserves introuvable." };

  const statutLabel: Record<string, string> = { EN_COURS: "En cours", SIGNE: "Signé", LEVE: "Réserves levées" };

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous l'état des réserves.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">État des réserves</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${etat.numero}</p>
      ${etat.chantier ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${etat.chantier.nom}</strong></p>` : ""}
      ${etat.client ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Client : <strong>${etat.client.nom}</strong></p>` : ""}
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Date : ${formatDate(etat.dateDocument)}</p>
      <p style="margin:0 0 0;font-size:13px;color:#475569">Statut : <strong>${statutLabel[etat.statut] ?? etat.statut}</strong></p>
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `État des réserves ${etat.numero} — SDA Rénovation`,
    html: emailLayout(`État des réserves N° ${etat.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}État des réserves ${etat.numero}\n${etat.chantier ? `Chantier : ${etat.chantier.nom}\n` : ""}${etat.client ? `Client : ${etat.client.nom}\n` : ""}Date : ${formatDate(etat.dateDocument)}\n\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "etat-reserves", documentId: id, documentRef: String(etat.numero), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Mémoire technique
// ---------------------------------------------------------------------------
export async function envoyerMemoireTechniqueParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const mt = await prisma.memoireTechnique.findUnique({
    where: { id },
    include: {
      chantier: { select: { nom: true, client: { select: { nom: true, email: true } } } },
    },
  });
  const signataire = await getSignataire();

  if (!mt) return { ok: false, error: "Mémoire technique introuvable." };

  const typeLabel: Record<string, string> = {
    TYPE_1: "Type 1 (5-10p)", TYPE_2: "Type 2 (12p classique)",
    TYPE_3: "Type 3 (22p multi-lots)", TYPE_4: "Type 4 (30p gros marchés)",
  };

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre mémoire technique.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Mémoire technique</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${mt.reference}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Titre : <strong>${mt.titre}</strong></p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Type : ${typeLabel[mt.type] ?? mt.type}</p>
      <p style="margin:0 0 0;font-size:13px;color:#475569">Chantier : <strong>${mt.chantier.nom}</strong></p>
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Mémoire technique ${mt.reference} — SDA Rénovation`,
    html: emailLayout(`Mémoire technique ${mt.reference}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Mémoire technique ${mt.reference} — ${mt.titre}\nChantier : ${mt.chantier.nom}\n\nCordialement,\nSDA Rénovation`,
      cc,
      bcc,
  }, { type: "memoire-technique", documentId: id, documentRef: String(mt.reference), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// PPSPS
// ---------------------------------------------------------------------------
export async function envoyerPpspsParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const ppsps = await prisma.pPSPS.findUnique({
    where: { id },
    include: { chantier: { select: { nom: true } } },
  });
  const signataire = await getSignataire();

  if (!ppsps) return { ok: false, error: "PPSPS introuvable." };

  if (ppsps.statut !== "TRANSMIS") {
    await prisma.pPSPS.update({ where: { id }, data: { statut: "TRANSMIS" } });
    revalidatePath(`/ppsps/${id}`);
  }

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre Plan Particulier de Sécurité et de Protection de la Santé.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">PPSPS</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${ppsps.titre}</p>
      ${ppsps.reference ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Référence : ${ppsps.reference}</p>` : ""}
      ${ppsps.nomOperation ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Opération : ${ppsps.nomOperation}</p>` : ""}
      ${ppsps.adresseChantier ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Adresse : ${ppsps.adresseChantier}</p>` : ""}
      <p style="margin:0 0 0;font-size:13px;color:#475569">Chantier : <strong>${ppsps.chantier.nom}</strong></p>
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `PPSPS — ${ppsps.titre} — SDA Rénovation`,
    html: emailLayout(`PPSPS — ${ppsps.titre}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}PPSPS — ${ppsps.titre}\nChantier : ${ppsps.chantier.nom}\n${ppsps.nomOperation ? `Opération : ${ppsps.nomOperation}\n` : ""}\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "ppsps", documentId: id, documentRef: String(ppsps.reference ?? ppsps.titre ?? id), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// DOE (Dossier des Ouvrages Exécutés)
// ---------------------------------------------------------------------------
export async function envoyerDoeParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const doe = await prisma.dOE.findUnique({
    where: { id },
    include: { chantier: { select: { nom: true } } },
  });
  const signataire = await getSignataire();

  if (!doe) return { ok: false, error: "DOE introuvable." };

  if (doe.statut !== "TRANSMIS") {
    await prisma.dOE.update({ where: { id }, data: { statut: "TRANSMIS" } });
    revalidatePath(`/doe/${id}`);
  }

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre Dossier des Ouvrages Exécutés.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">DOE — Dossier des Ouvrages Exécutés</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${doe.titre}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${doe.chantier.nom}</strong></p>
      ${doe.reference ? `<p style="margin:0 0 0;font-size:13px;color:#475569">Référence marché : ${doe.reference}</p>` : ""}
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `DOE — ${doe.titre} — SDA Rénovation`,
    html: emailLayout(`DOE — ${doe.titre}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}DOE — ${doe.titre}\nChantier : ${doe.chantier.nom}\n\nCordialement,\nSDA Rénovation`,
      cc,
      bcc,
  }, { type: "doe", documentId: id, documentRef: String(id), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Fiche technique
// ---------------------------------------------------------------------------
export async function envoyerFicheTechniqueParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const fiche = await prisma.ficheTechnique.findUnique({ where: { id } });
  const signataire = await getSignataire();

  if (!fiche) return { ok: false, error: "Fiche technique introuvable." };

  const categorieLabel: Record<string, string> = {
    PRODUIT: "Produit", MATERIAU: "Matériau", CONSOMMABLE: "Consommable", EQUIPEMENT: "Équipement",
  };

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous la fiche technique produit.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Fiche technique — ${categorieLabel[fiche.categorie] ?? fiche.categorie}</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${fiche.designation}</p>
      ${fiche.marque ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Marque : <strong>${fiche.marque}</strong></p>` : ""}
      ${fiche.reference ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Référence : <strong>${fiche.reference}</strong></p>` : ""}
      <p style="margin:0 0 0;font-size:13px;color:#475569">Corps d'état : ${fiche.corpsEtat}</p>
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Fiche technique — ${fiche.designation} — SDA Rénovation`,
    html: emailLayout(`Fiche technique — ${fiche.designation}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Fiche technique : ${fiche.designation}\n${fiche.marque ? `Marque : ${fiche.marque}\n` : ""}${fiche.reference ? `Référence : ${fiche.reference}\n` : ""}Corps d'état : ${fiche.corpsEtat}\n\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "fiche-technique", documentId: id, documentRef: String(fiche.designation ?? id), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Bon de réservation pompe
// ---------------------------------------------------------------------------
export async function envoyerBrpParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const brp = await prisma.bonReservationPompe.findUnique({
    where: { id },
    include: {
      fournisseur: { select: { nom: true, email: true } },
      chantier:    { select: { nom: true } },
    },
  });
  const signataire = await getSignataire();

  if (!brp) return { ok: false, error: "Bon de réservation pompe introuvable." };

  const nomChantier = brp.nomChantier ?? brp.chantier?.nom ?? null;

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre bon de réservation de pompe à béton.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Bon de réservation pompe</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${brp.numero}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Fournisseur : <strong>${brp.fournisseur.nom}</strong></p>
      ${nomChantier ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${nomChantier}</strong></p>` : ""}
      ${brp.dateReservation ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Date : <strong>${formatDate(brp.dateReservation)}</strong></p>` : ""}
      ${brp.heureArriveePompe ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Heure d'arrivée pompe : <strong>${brp.heureArriveePompe}</strong></p>` : ""}
      ${brp.cubagePrévu != null ? `<p style="margin:0 0 0;font-size:13px;color:#475569">Volume estimé : <strong>${brp.cubagePrévu} m³</strong></p>` : ""}
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Merci de bien vouloir confirmer la disponibilité. Contact : <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Réservation pompe ${brp.numero} — SDA Rénovation`,
    html: emailLayout(`Bon de réservation pompe N° ${brp.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Bon de réservation pompe ${brp.numero}\nFournisseur : ${brp.fournisseur.nom}\n${nomChantier ? `Chantier : ${nomChantier}\n` : ""}${brp.dateReservation ? `Date : ${formatDate(brp.dateReservation)}\n` : ""}\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "brp", documentId: id, documentRef: String(brp.numero), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// BC Fournitures bureau/entrepôt
// ---------------------------------------------------------------------------
export async function envoyerBcfParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const bcf = await prisma.bonCommandeFournitures.findUnique({
    where: { id },
    include: {
      fournisseur: { select: { nom: true, email: true } },
      lignes:      { take: 8, orderBy: { ordre: "asc" } },
    },
  });
  const signataire = await getSignataire();

  if (!bcf) return { ok: false, error: "Bon de commande fournitures introuvable." };

  const typeLabel: Record<string, string> = { BUREAU: "Bureau", ENTREPOT: "Entrepôt", MIXTE: "Mixte" };

  const lignesHtml = bcf.lignes
    .filter(l => l.designation)
    .map(l => `<tr>
      <td style="padding:4px 8px 4px 0;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9">${l.designation}</td>
      <td style="padding:4px 0;font-size:13px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9">${l.quantite} ${l.unite}</td>
      <td style="padding:4px 0 4px 8px;font-size:13px;color:#334155;text-align:right;white-space:nowrap;border-bottom:1px solid #f1f5f9">${formatEuros(l.totalHT)}</td>
    </tr>`)
    .join("");

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre bon de commande fournitures.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">BC Fournitures — ${typeLabel[bcf.type] ?? bcf.type}</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${bcf.numero}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#475569">Fournisseur : <strong>${bcf.fournisseur.nom}</strong></p>
      ${lignesHtml ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px"><tbody>${lignesHtml}</tbody></table>` : ""}
      <p style="margin:0;font-size:17px;font-weight:bold;color:#1e293b">Total HT : ${formatEuros(bcf.totalHT)}</p>
      <p style="margin:2px 0 0;font-size:13px;color:#64748b">Total TTC : ${formatEuros(bcf.totalTTC)}</p>
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Merci de bien vouloir accuser réception de cette commande. Contact : <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `BC Fournitures ${bcf.numero} — SDA Rénovation`,
    html: emailLayout(`BC Fournitures N° ${bcf.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}BC Fournitures ${bcf.numero}\nFournisseur : ${bcf.fournisseur.nom}\nTotal TTC : ${formatEuros(bcf.totalTTC)}\n\nCordialement,\nSDA Rénovation`,
      cc,
      bcc,
  }, { type: "bcf", documentId: id, documentRef: String(bcf.numero), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Fiche agrément produit
// ---------------------------------------------------------------------------
export async function envoyerAgrementProduitParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const fiche = await prisma.ficheAgrementProduit.findUnique({
    where: { id },
    include: { chantier: { select: { nom: true } } },
  });
  const signataire = await getSignataire();

  if (!fiche) return { ok: false, error: "Fiche d'agrément produit introuvable." };

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous la fiche d'agrément produit.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Fiche d'agrément produit</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${fiche.numero}</p>
      ${fiche.marque ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Marque : <strong>${fiche.marque}</strong></p>` : ""}
      ${fiche.typeModele ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Type / Modèle : ${fiche.typeModele}</p>` : ""}
      ${fiche.operation ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Opération : ${fiche.operation}</p>` : ""}
      ${fiche.chantier ? `<p style="margin:0 0 0;font-size:13px;color:#475569">Chantier : <strong>${fiche.chantier.nom}</strong></p>` : ""}
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Agrément produit ${fiche.numero} — SDA Rénovation`,
    html: emailLayout(`Agrément produit N° ${fiche.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Agrément produit ${fiche.numero}\n${fiche.marque ? `Marque : ${fiche.marque}\n` : ""}${fiche.chantier ? `Chantier : ${fiche.chantier.nom}\n` : ""}\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "agrement-produit", documentId: id, documentRef: String(fiche.numero), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Pré-dimensionnement
// ---------------------------------------------------------------------------
export async function envoyerPreDimParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const pdim = await prisma.preDimensionnement.findUnique({
    where: { id },
    include: { chantier: { select: { nom: true, reference: true } } },
  });
  const signataire = await getSignataire();

  if (!pdim) return { ok: false, error: "Pré-dimensionnement introuvable." };

  const typeElementLabel: Record<string, string> = { POUTRE: "Poutre", DALLE: "Dalle", POTEAU: "Poteau", DALLAGE: "Dallage" };
  const materiauLabel: Record<string, string>    = { BETON: "Béton", ACIER: "Acier", BOIS: "Bois" };

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous notre note de pré-dimensionnement structurel.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Pré-dimensionnement structurel</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${pdim.numero}</p>
      ${pdim.titre ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">${pdim.titre}</p>` : ""}
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Élément : <strong>${typeElementLabel[pdim.typeElement] ?? pdim.typeElement}</strong></p>
      <p style="margin:0 0 4px;font-size:13px;color:#475569">Matériau : <strong>${materiauLabel[pdim.materiau] ?? pdim.materiau}</strong></p>
      ${pdim.chantier ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${pdim.chantier.reference} — ${pdim.chantier.nom}</strong></p>` : ""}
      ${pdim.resultatLabel ? `<p style="margin:8px 0 0;font-size:15px;font-weight:bold;color:#1E2F6E">Résultat : ${pdim.resultatLabel}</p>` : ""}
    `)}
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:12px;color:#92400e">
      Note indicative de pré-dimensionnement — À contre-vérifier par un ingénieur structure indépendant avant tout usage réglementaire.
    </div>
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Pré-dimensionnement ${pdim.numero} — SDA Rénovation`,
    html: emailLayout(`Pré-dimensionnement N° ${pdim.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Pré-dimensionnement ${pdim.numero}\n${pdim.titre ? `${pdim.titre}\n` : ""}Élément : ${typeElementLabel[pdim.typeElement] ?? pdim.typeElement} — Matériau : ${materiauLabel[pdim.materiau] ?? pdim.materiau}\n${pdim.chantier ? `Chantier : ${pdim.chantier.reference} — ${pdim.chantier.nom}\n` : ""}${pdim.resultatLabel ? `Résultat : ${pdim.resultatLabel}\n` : ""}\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "pre-dim", documentId: id, documentRef: String(pdim.chantier?.reference ?? id), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Planning Gantt (par chantier)
// ---------------------------------------------------------------------------
export async function envoyerPlanningGanttParEmail(
  chantierId: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  const chantier = await prisma.chantier.findUnique({
    where: { id: chantierId },
    select: {
      nom:      true,
      reference: true,
      dateDebut: true,
      dateFin:   true,
      tachesGantt: {
        orderBy: { ordre: "asc" },
        take: 15,
        select: { nom: true, dateDebut: true, dateFin: true, statut: true },
      },
    },
  });
  const signataire = await getSignataire();

  if (!chantier) return { ok: false, error: "Chantier introuvable." };

  const statutGanttLabel: Record<string, string> = { A_FAIRE: "À faire", EN_COURS: "En cours", TERMINEE: "Terminée" };

  const tachesHtml = chantier.tachesGantt
    .map(t => `<tr>
      <td style="padding:5px 8px 5px 0;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9">${t.nom}</td>
      <td style="padding:5px 0;font-size:12px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9">${formatDate(t.dateDebut)}</td>
      <td style="padding:5px 0;font-size:12px;color:#475569;text-align:center;border-bottom:1px solid #f1f5f9">${formatDate(t.dateFin)}</td>
      <td style="padding:5px 0 5px 8px;font-size:12px;color:#475569;text-align:right;border-bottom:1px solid #f1f5f9">${statutGanttLabel[t.statut] ?? t.statut}</td>
    </tr>`)
    .join("");

  const enteteGantt = `<tr style="background:#f1f5f9">
    <th style="padding:6px 8px 6px 0;font-size:11px;color:#64748b;text-align:left;font-weight:700;text-transform:uppercase">Tâche</th>
    <th style="padding:6px 0;font-size:11px;color:#64748b;text-align:center;font-weight:700;text-transform:uppercase">Début</th>
    <th style="padding:6px 0;font-size:11px;color:#64748b;text-align:center;font-weight:700;text-transform:uppercase">Fin</th>
    <th style="padding:6px 0 6px 8px;font-size:11px;color:#64748b;text-align:right;font-weight:700;text-transform:uppercase">Statut</th>
  </tr>`;

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>` : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous le planning prévisionnel du chantier.</p>`}
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Planning Gantt</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${chantier.nom}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#475569">Référence : ${chantier.reference}${chantier.dateDebut ? ` · Début : ${formatDate(chantier.dateDebut)}` : ""}${chantier.dateFin ? ` · Fin prév. : ${formatDate(chantier.dateFin)}` : ""}</p>
      ${tachesHtml ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><thead>${enteteGantt}</thead><tbody>${tachesHtml}</tbody></table>` : ""}
    `)}
    <p style="margin:0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
    to,
    subject: customSubject || `Planning ${chantier.nom} — SDA Rénovation`,
    html: emailLayout(`Planning Gantt — ${chantier.nom}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Planning Gantt — ${chantier.nom} (${chantier.reference})\n${chantier.tachesGantt.map(t => `- ${t.nom} : ${formatDate(t.dateDebut)} → ${formatDate(t.dateFin)} (${statutGanttLabel[t.statut] ?? t.statut})`).join("\n")}\n\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "planning-gantt", documentId: chantierId, documentRef: String(chantier.reference ?? chantierId), sentBy: signataire?.name ?? "" });
}

// ---------------------------------------------------------------------------
// Procès-Verbal de Réception
// ---------------------------------------------------------------------------
export async function envoyerPvReceptionParEmail(
  id: string,
  _prev: unknown,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const to      = (formData.get("to") as string)?.trim();
  const message = (formData.get("message") as string) ?? "";
  const customSubject = (formData.get("subject") as string)?.trim() || undefined;
  const cc  = (formData.get("cc")  as string)?.trim() || undefined;
  const bcc = (formData.get("bcc") as string)?.trim() || undefined;

  if (!to) return { ok: false, error: "Adresse email destinataire manquante." };

  let pvr = await prisma.pvReception.findUnique({
    where: { id },
    include: { chantier: { select: { nom: true } } },
  });
  const signataire = await getSignataire();

  if (!pvr) return { ok: false, error: "PV de réception introuvable." };

  // Auto-générer le shareToken si absent (requis pour le lien de signature)
  if (!pvr.shareToken) {
    const { randomBytes } = await import("crypto");
    const tok    = randomBytes(24).toString("hex");
    const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    pvr = await prisma.pvReception.update({
      where: { id },
      data: { shareToken: tok, shareExpiry: expiry, statut: pvr.statut === "BROUILLON" ? "FINALISE" : pvr.statut },
      include: { chantier: { select: { nom: true } } },
    });
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/pv-reception/${id}`);
  }

  const shareUrl = `${APP_URL}/pv-public/${pvr.shareToken}`;

  const resultatLabel: Record<string, string> = {
    ACCEPTE:          "Réception prononcée sans réserve",
    ACCEPTE_RESERVES: "Réception prononcée avec réserves",
    REFUSE:           "Réception refusée",
  };

  const corps = `<p style="margin:0 0 16px;font-size:15px;color:#1e293b">Madame, Monsieur,</p>
    ${message
      ? `<p style="margin:0 0 20px;font-size:14px;color:#334155;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>`
      : `<p style="margin:0 0 20px;font-size:14px;color:#334155">Veuillez trouver ci-dessous le procès-verbal de réception de travaux. Nous vous invitons à le lire attentivement puis à <strong>apposer votre signature électronique</strong> pour le valider.</p>`
    }
    ${boiteDoc(`
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Procès-Verbal de Réception</p>
      <p style="margin:0 0 14px;font-size:24px;font-weight:bold;color:#1E2F6E">${pvr.numero}</p>
      ${pvr.objet ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Objet : <strong>${pvr.objet}</strong></p>` : ""}
      ${pvr.chantier ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Chantier : <strong>${pvr.chantier.nom}</strong></p>` : ""}
      ${pvr.dateReception ? `<p style="margin:0 0 4px;font-size:13px;color:#475569">Date de réception : <strong>${formatDate(pvr.dateReception)}</strong></p>` : ""}
      ${pvr.resultat ? `<p style="margin:0;font-size:13px;color:#475569">Résultat : <strong>${resultatLabel[pvr.resultat] ?? pvr.resultat}</strong></p>` : ""}
    `)}
    ${boutonCta(shareUrl, "✍️ Lire et signer le PV de réception")}
    <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;text-align:center">
      Une fois votre signature apposée, SDA Rénovation signera à son tour et vous recevrez le document final par email.
    </p>
    <p style="margin:20px 0 0;font-size:13px;color:#64748b">Pour toute question, contactez-nous à <a href="mailto:contact@sda-renovation.com" style="color:#6366f1">contact@sda-renovation.com</a>.</p>
    ${signature()}`;

  return sendAndLog({
    from: fromAddress(signataire),
    replyTo: signataire?.email,
    to,
    subject: customSubject || `✍️ PV de réception ${pvr.numero}${pvr.objet ? ` — ${pvr.objet}` : ""} — Votre signature est requise`,
    html: emailLayout(`Procès-Verbal de Réception N° ${pvr.numero}`, corps, signataire),
    text: `Madame, Monsieur,\n\n${message ? message + "\n\n" : ""}Veuillez lire et signer le PV de réception ${pvr.numero}${pvr.chantier ? ` — Chantier : ${pvr.chantier.nom}` : ""}.\n\nLien de signature : ${shareUrl}\n\nCordialement,\nSDA Rénovation`,
    cc,
    bcc,
  }, { type: "pv-reception", documentId: id, documentRef: String(pvr.numero), sentBy: signataire?.name ?? "" });
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

  const signataire = await getSignataire();

  return envoyerEmail({
    from: fromAddress(signataire),
      replyTo: signataire?.email,
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
