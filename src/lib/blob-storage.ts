import { put, del } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import path from "node:path";

// Stockage des fichiers uploadés via Vercel Blob — le système de fichiers
// des fonctions serverless Vercel est en lecture seule, on ne peut donc pas
// écrire dans /public en production comme en local.

export type FichierStocke = { url: string; nomFichier: string; taille: number };

export async function stockerFichier(file: File, dossier: string): Promise<FichierStocke> {
  const ext = path.extname(file.name);
  const nomFichier = `${randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`${dossier}/${nomFichier}`, buffer, {
    access: "public",
    contentType: file.type || undefined,
  });
  return { url: blob.url, nomFichier, taille: buffer.length };
}

export async function supprimerFichierStocke(url: string | null | undefined): Promise<void> {
  if (!url || !url.startsWith("http")) return;
  try {
    await del(url);
  } catch {
    // fichier déjà absent
  }
}
