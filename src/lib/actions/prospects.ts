"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function creerProspect(formData: FormData): Promise<void> {
  const nom       = formData.get("nom") as string;
  const prenom    = (formData.get("prenom") as string) || null;
  const telephone = (formData.get("telephone") as string) || null;
  const email     = (formData.get("email") as string) || null;
  const source    = (formData.get("source") as string) || "AUTRE";
  const ville     = (formData.get("ville") as string) || null;
  const travaux   = (formData.get("travaux") as string) || null;
  const message   = (formData.get("message") as string) || null;

  await prisma.prospect.create({
    data: { nom, prenom, telephone, email, source, ville, travaux, message },
  });

  revalidatePath("/prospects");
}

export async function changerStatutProspect(id: string, formData: FormData): Promise<void> {
  const statut = formData.get("statut") as string;
  await prisma.prospect.update({ where: { id }, data: { statut } });
  revalidatePath("/prospects");
}

export async function supprimerProspect(id: string): Promise<void> {
  await prisma.prospect.delete({ where: { id } });
  revalidatePath("/prospects");
}

export async function convertirEnClient(id: string): Promise<void> {
  const prospect = await prisma.prospect.findUnique({ where: { id } });
  if (!prospect || prospect.clientId) return;

  // Génère une référence client
  const count = await prisma.client.count();
  const reference = `CLI-${String(count + 1).padStart(4, "0")}`;

  const client = await prisma.client.create({
    data: {
      reference,
      type:         "PARTICULIER",
      nom:          prospect.nom,
      prenom:       prospect.prenom,
      email:        prospect.email,
      telephone:    prospect.telephone,
      ville:        prospect.ville,
      source:       prospect.source,
      statut:       "ACTIF",
      notes:        prospect.message ?? undefined,
      raisonSociale: prospect.societe
        ? prospect.societe
        : `${prospect.prenom ? prospect.prenom + " " : ""}${prospect.nom}`,
    },
  });

  await prisma.prospect.update({
    where: { id },
    data: { statut: "GAGNE", clientId: client.id },
  });

  revalidatePath("/prospects");
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

// ---------------------------------------------------------------------------
// API endpoint — reçoit les leads du site web www.sda-renovation.com
// Utilisé par /api/leads
// ---------------------------------------------------------------------------

export async function creerProspectDepuisApi(data: {
  nom:         string;
  prenom?:     string;
  email?:      string;
  telephone?:  string;
  message?:    string;
  travaux?:    string;
  ville?:      string;
  codePostal?: string;
}): Promise<{ id: string }> {
  const prospect = await prisma.prospect.create({
    data: {
      nom:        data.nom,
      prenom:     data.prenom ?? null,
      email:      data.email ?? null,
      telephone:  data.telephone ?? null,
      message:    data.message ?? null,
      travaux:    data.travaux ?? null,
      ville:      data.ville ?? null,
      codePostal: data.codePostal ?? null,
      source:     "SITE_WEB",
    },
  });
  return { id: prospect.id };
}
