import { put, del, get } from "@vercel/blob";
import { randomBytes } from "node:crypto";
import path from "node:path";

// Stockage des fichiers uploadés via Vercel Blob — le système de fichiers
// des fonctions serverless Vercel est en lecture seule, on ne peut donc pas
// écrire dans /public en production comme en local.
//
// Les fichiers sont stockés en accès "private" : leur URL ne suffit pas à les
// télécharger, il faut le token du store. Le téléchargement passe donc par la
// route /api/fichiers, qui vérifie la session avant de servir le contenu.

export type FichierStocke = { url: string; nomFichier: string; taille: number };

export async function stockerFichier(file: File, dossier: string): Promise<FichierStocke> {
  const ext = path.extname(file.name);
  const nomFichier = `${randomBytes(8).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(`${dossier}/${nomFichier}`, buffer, {
    access: "private",
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

export async function recupererFluxFichier(url: string) {
  const { hostname } = new URL(url);
  if (!hostname.endsWith(".blob.vercel-storage.com")) return null;
  return get(url, { access: "private" });
}
