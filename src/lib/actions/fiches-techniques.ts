"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "fiches-techniques");

async function saveUpload(file: File, subfolder: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subfolder}/${filename}`;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function createFicheTechnique(formData: FormData): Promise<void> {
  const designation = emptyToNull(formData.get("designation"));
  if (!designation) throw new Error("La désignation est requise.");

  let fichierPdf: string | null = null;
  const file = formData.get("fichierPdf");
  if (file instanceof File && file.size > 0) {
    fichierPdf = await saveUpload(file, "fiches-techniques");
  }

  await prisma.ficheTechnique.create({
    data: {
      categorie: (formData.get("categorie") as string) || "PRODUIT",
      corpsEtat: (formData.get("corpsEtat") as string) || "AUTRE",
      designation,
      marque: emptyToNull(formData.get("marque")),
      reference: emptyToNull(formData.get("reference")),
      description: emptyToNull(formData.get("description")),
      normes: emptyToNull(formData.get("normes")),
      lienUrl: emptyToNull(formData.get("lienUrl")),
      fichierPdf,
      actif: true,
    },
  });

  revalidatePath("/fiches-techniques");
  redirect("/fiches-techniques");
}

export async function updateFicheTechnique(id: string, formData: FormData): Promise<void> {
  const designation = emptyToNull(formData.get("designation"));
  if (!designation) throw new Error("La désignation est requise.");

  // Handle new PDF upload
  const existing = await prisma.ficheTechnique.findUnique({ where: { id }, select: { fichierPdf: true } });

  let fichierPdf = existing?.fichierPdf ?? null;
  const file = formData.get("fichierPdf");
  if (file instanceof File && file.size > 0) {
    // Delete old file if exists
    if (existing?.fichierPdf) {
      const oldPath = path.join(process.cwd(), "public", existing.fichierPdf);
      try {
        await unlink(oldPath);
      } catch {
        /* fichier déjà absent */
      }
    }
    fichierPdf = await saveUpload(file, "fiches-techniques");
  }

  await prisma.ficheTechnique.update({
    where: { id },
    data: {
      categorie: (formData.get("categorie") as string) || "PRODUIT",
      corpsEtat: (formData.get("corpsEtat") as string) || "AUTRE",
      designation,
      marque: emptyToNull(formData.get("marque")),
      reference: emptyToNull(formData.get("reference")),
      description: emptyToNull(formData.get("description")),
      normes: emptyToNull(formData.get("normes")),
      lienUrl: emptyToNull(formData.get("lienUrl")),
      fichierPdf,
      actif: formData.get("actif") !== "false",
    },
  });

  revalidatePath("/fiches-techniques");
  revalidatePath(`/fiches-techniques/${id}`);
  redirect(`/fiches-techniques/${id}`);
}

export async function deleteFicheTechnique(id: string): Promise<void> {
  const fiche = await prisma.ficheTechnique.findUnique({ where: { id }, select: { fichierPdf: true } });

  if (fiche?.fichierPdf) {
    const filePath = path.join(process.cwd(), "public", fiche.fichierPdf);
    try {
      await unlink(filePath);
    } catch {
      /* fichier déjà absent */
    }
  }

  await prisma.ficheTechnique.delete({ where: { id } });

  revalidatePath("/fiches-techniques");
  redirect("/fiches-techniques");
}
