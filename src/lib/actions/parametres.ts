"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const parametresSchema = z.object({
  nomEntreprise: z.string().min(1, "Le nom de l'entreprise est requis."),
  siret: z.string().optional(),
  tvaIntracom: z.string().optional(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().optional(),
  siteWeb: z.string().optional(),
  logoUrl: z.string().optional(),
  nomBanque: z.string().optional(),
  domiciliation: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  tauxTvaDefaut: z.coerce.number().min(0).max(100),
  emailComptable: z.string().optional(),
  conditionsDevis: z.string().optional(),
  conditionsFacture: z.string().optional(),
});

export type ParametresState = { errors?: Record<string, string[]>; success?: boolean } | undefined;

export async function updateParametres(
  _prevState: ParametresState,
  formData: FormData,
): Promise<ParametresState> {
  const validated = parametresSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  await prisma.parametres.update({
    where: { id: "default" },
    data: {
      nomEntreprise: data.nomEntreprise,
      siret: data.siret ?? "",
      tvaIntracom: data.tvaIntracom ?? "",
      adresse: data.adresse ?? "",
      codePostal: data.codePostal ?? "",
      ville: data.ville ?? "",
      telephone: data.telephone ?? "",
      email: data.email ?? "",
      siteWeb: data.siteWeb ?? "",
      logoUrl: data.logoUrl ?? "",
      nomBanque: data.nomBanque ?? "",
      domiciliation: data.domiciliation ?? "",
      iban: data.iban ?? "",
      bic: data.bic ?? "",
      tauxTvaDefaut: data.tauxTvaDefaut,
      emailComptable: data.emailComptable ?? "",
      conditionsDevis: data.conditionsDevis ?? "",
      conditionsFacture: data.conditionsFacture ?? "",
    },
  });

  revalidatePath("/parametres");
  revalidatePath("/devis", "layout");

  return { success: true };
}

export async function regenerateLeadsApiKey() {
  await prisma.parametres.update({
    where: { id: "default" },
    data: { leadsApiKey: randomBytes(24).toString("hex") },
  });

  revalidatePath("/parametres");
}

const ligneCodeSchema = z.object({
  code: z.string().min(1),
  prefixe: z.string().min(1, "Le préfixe est requis."),
  prefixeAVenir: z.string().optional().transform((v) => v?.trim() || null),
  nbChiffres: z.coerce.number().int().min(1).max(6),
});

export type CodificationsState = { error?: string; success?: boolean } | undefined;

export async function updateCodifications(
  _prevState: CodificationsState,
  formData: FormData,
): Promise<CodificationsState> {
  const raw = formData.get("lignes");
  if (typeof raw !== "string") return { error: "Données invalides." };

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { error: "Données invalides." }; }

  const result = z.array(ligneCodeSchema).safeParse(parsed);
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Données invalides." };

  const anneeProchaine = new Date().getFullYear() + 1;

  for (const ligne of result.data) {
    const conf = await prisma.codification.findUnique({ where: { code: ligne.code } });
    if (!conf) continue;

    if (conf.geleLegalement) {
      // Codes soumis au gel légal (DEV, FAC) : on ne modifie jamais le préfixe
      // actif en cours d'exercice ; si un préfixeAVenir est fourni, on programme
      // le changement pour l'exercice suivant.
      await prisma.codification.update({
        where: { code: ligne.code },
        data: {
          nbChiffres: ligne.nbChiffres,
          prefixeAVenir: ligne.prefixeAVenir ?? null,
          anneeApplicationAVenir: ligne.prefixeAVenir ? anneeProchaine : null,
        },
      });
    } else {
      await prisma.codification.update({
        where: { code: ligne.code },
        data: {
          prefixe: ligne.prefixe,
          nbChiffres: ligne.nbChiffres,
          prefixeAVenir: null,
          anneeApplicationAVenir: null,
        },
      });
    }
  }

  revalidatePath("/parametres/codifications");
  return { success: true };
}
