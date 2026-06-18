"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nextClientRef, calcInitiales, CLIENT_TYPES } from "@/lib/reference";

const clientSchema = z.object({
  type: z.enum(CLIENT_TYPES),
  civilite: z.string().optional(),
  nom: z.string().min(1, "Le nom est requis."),
  prenom: z.string().optional(),
  raisonSociale: z.string().optional(),
  siret: z.string().optional(),
  email: z.union([z.string().email("E-mail invalide."), z.literal("")]).optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  statut: z.enum(["ACTIF", "PROSPECT", "ARCHIVE"]),
  source: z.string().optional(),
  notes: z.string().optional(),
});

export type ClientState = {
  errors?: Record<string, string[]>;
} | undefined;

function parseClientForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return clientSchema.safeParse(raw);
}

function emptyToNull(value?: string) {
  return value && value.trim() !== "" ? value : null;
}

export async function createClient(_prevState: ClientState, formData: FormData): Promise<ClientState> {
  const validated = parseClientForm(formData);

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  // Toutes les références existantes pour ce type (PA-0001-JD, PA-0002-AB…)
  const existing = await prisma.client.findMany({
    where: { reference: { startsWith: data.type + "-" } },
    select: { reference: true },
  });
  const initiales = calcInitiales({
    prenom: data.prenom,
    nom: data.nom,
    raisonSociale: data.raisonSociale,
  });
  const reference = nextClientRef(data.type, existing.map((r) => r.reference ?? ""), initiales);

  const client = await prisma.client.create({
    data: {
      reference,
      type: data.type,
      civilite: emptyToNull(data.civilite),
      nom: data.nom,
      prenom: emptyToNull(data.prenom),
      raisonSociale: emptyToNull(data.raisonSociale),
      siret: emptyToNull(data.siret),
      email: emptyToNull(data.email),
      telephone: emptyToNull(data.telephone),
      adresse: emptyToNull(data.adresse),
      codePostal: emptyToNull(data.codePostal),
      ville: emptyToNull(data.ville),
      statut: data.statut,
      source: emptyToNull(data.source),
      notes: emptyToNull(data.notes),
    },
  });

  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(
  id: string,
  _prevState: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const validated = parseClientForm(formData);

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  await prisma.client.update({
    where: { id },
    data: {
      type: data.type,
      civilite: emptyToNull(data.civilite),
      nom: data.nom,
      prenom: emptyToNull(data.prenom),
      raisonSociale: emptyToNull(data.raisonSociale),
      siret: emptyToNull(data.siret),
      email: emptyToNull(data.email),
      telephone: emptyToNull(data.telephone),
      adresse: emptyToNull(data.adresse),
      codePostal: emptyToNull(data.codePostal),
      ville: emptyToNull(data.ville),
      statut: data.statut,
      source: emptyToNull(data.source),
      notes: emptyToNull(data.notes),
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  try {
    await prisma.client.delete({ where: { id } });
  } catch {
    redirect(`/clients/${id}?erreur=suppression`);
  }

  revalidatePath("/clients");
  redirect("/clients");
}
