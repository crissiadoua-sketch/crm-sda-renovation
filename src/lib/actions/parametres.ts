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
