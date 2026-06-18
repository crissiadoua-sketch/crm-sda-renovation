"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Collecte des statistiques CRM pour l'analyse
// ---------------------------------------------------------------------------

export async function collecterStatsCRM() {
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const finMoisPrecedent = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalClients,
    clientsActifs,
    totalChantiers,
    chantiersEnCours,
    chantiersTerminesMois,
    totalDevis,
    devisAcceptes,
    devisMois,
    totalFactures,
    facturesEnRetard,
    facturesMois,
    totalEncaisse,
    totalTaches,
    tachesTerminees,
    tachesEnRetardCount,
    totalDocuments,
    documentsOrphelins,
    users,
    chantiersAvecDetails,
    allDocuments,
    totalBonsCommande,
    totalSauvegardes,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.client.count({ where: { statut: "ACTIF" } }),
    prisma.chantier.count(),
    prisma.chantier.count({ where: { statut: "EN_COURS" } }),
    prisma.chantier.count({
      where: { statut: "TERMINE", updatedAt: { gte: debutMois } },
    }),
    prisma.devis.count(),
    prisma.devis.count({ where: { statut: "ACCEPTE" } }),
    prisma.devis.count({ where: { dateCreation: { gte: debutMois } } }),
    prisma.facture.count(),
    prisma.facture.count({ where: { statut: "EN_RETARD" } }),
    prisma.facture.count({ where: { dateEmission: { gte: debutMois } } }),
    prisma.paiement.aggregate({ _sum: { montant: true } }),
    prisma.tache.count(),
    prisma.tache.count({ where: { statut: "TERMINEE" } }),
    prisma.tache.count({
      where: {
        statut: { in: ["A_FAIRE", "EN_COURS"] },
        dateEcheance: { lt: now },
      },
    }),
    prisma.document.count(),
    prisma.document.count({
      where: {
        chantierId: null,
        clientId: null,
        devisId: null,
        factureId: null,
        fournisseurId: null,
      },
    }),
    prisma.user.findMany({
      include: {
        tachesCrees: { select: { statut: true, dateEcheance: true } },
        tachesAssignees: { select: { statut: true, dateEcheance: true } },
      },
    }),
    prisma.chantier.findMany({
      include: {
        devis: { select: { statut: true, type: true, totalTTC: true } },
        factures: { select: { statut: true, type: true, totalTTC: true, montantPaye: true } },
        checklistDocuments: { select: { statut: true } },
        sousTraitants: { select: { id: true } },
        contrats: { select: { statut: true } },
        evenements: { select: { id: true } },
      },
    }),
    prisma.document.findMany({ select: { nom: true, taille: true, type: true } }),
    prisma.bonCommande.count({ where: { createdAt: { gte: debutMois } } }),
    prisma.sauvegardeLog.count(),
  ]);

  // --- Doublons de documents --------------------------------------------------
  const docMap = new Map<string, number>();
  for (const d of allDocuments) {
    const key = `${d.nom}|${d.taille}|${d.type}`;
    docMap.set(key, (docMap.get(key) || 0) + 1);
  }
  const groupesDoublons = Array.from(docMap.entries())
    .filter(([, c]) => c > 1)
    .map(([key, count]) => ({ nom: key.split("|")[0], count }));
  const totalDoublons = groupesDoublons.reduce((sum, g) => sum + (g.count - 1), 0);

  // --- Analyse conformité processus ------------------------------------------
  const chantiersNonConformes: Array<{
    nom: string;
    statut: string;
    problemes: string[];
  }> = [];

  for (const c of chantiersAvecDetails.filter((ch) =>
    ["EN_COURS", "DEVIS_ENVOYE"].includes(ch.statut)
  )) {
    const problemes: string[] = [];

    if (!c.devis.some((d) => d.statut === "ACCEPTE")) {
      problemes.push("Aucun devis accepté");
    }
    if (c.statut === "EN_COURS" && c.factures.length === 0) {
      problemes.push("Aucune facture émise");
    }
    if (c.sousTraitants.length > 0 && c.contrats.length === 0) {
      problemes.push("Sous-traitants sans contrat");
    }
    if (c.evenements.length === 0) {
      problemes.push("Aucun événement planning");
    }
    const checklistOk = c.checklistDocuments.filter((d) =>
      ["VALIDE", "RECU"].includes(d.statut)
    ).length;
    const checklistTotal = c.checklistDocuments.length;
    const checklistPct =
      checklistTotal > 0 ? Math.round((checklistOk / checklistTotal) * 100) : 0;
    if (checklistTotal > 0 && checklistPct < 50) {
      problemes.push(`Checklist documents à ${checklistPct}%`);
    }

    if (problemes.length > 0) {
      chantiersNonConformes.push({ nom: c.nom, statut: c.statut, problemes });
    }
  }

  // --- Activité par utilisateur -----------------------------------------------
  const activiteParUser = users.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    tachesCrees: u.tachesCrees.length,
    tachesTerminees: u.tachesAssignees.filter((t) => t.statut === "TERMINEE").length,
    tachesEnCours: u.tachesAssignees.filter((t) => t.statut === "EN_COURS").length,
    tachesEnRetard: u.tachesAssignees.filter(
      (t) =>
        t.statut !== "TERMINEE" &&
        t.dateEcheance &&
        new Date(t.dateEcheance) < now
    ).length,
  }));

  // CA facturé ce mois
  const facturesDuMois = await prisma.facture.findMany({
    where: { dateEmission: { gte: debutMois } },
    select: { totalTTC: true, statut: true },
  });
  const caMoisTTC = facturesDuMois.reduce((s, f) => s + f.totalTTC, 0);

  return {
    collecteAt: now.toISOString(),
    periode: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    stats: {
      clients: { total: totalClients, actifs: clientsActifs },
      chantiers: {
        total: totalChantiers,
        enCours: chantiersEnCours,
        terminesMois: chantiersTerminesMois,
      },
      devis: { total: totalDevis, acceptes: devisAcceptes, mois: devisMois },
      factures: {
        total: totalFactures,
        enRetard: facturesEnRetard,
        mois: facturesMois,
        caMoisTTC,
        totalEncaisse: totalEncaisse._sum.montant ?? 0,
      },
      taches: {
        total: totalTaches,
        terminees: tachesTerminees,
        enRetard: tachesEnRetardCount,
      },
      documents: {
        total: totalDocuments,
        orphelins: documentsOrphelins,
        doublons: totalDoublons,
        groupesDoublons: groupesDoublons.slice(0, 10),
      },
      achats: { bonsCommandeMois: totalBonsCommande },
      sauvegardes: { total: totalSauvegardes },
    },
    conformite: {
      chantiersAnalyses: chantiersAvecDetails.filter((c) =>
        ["EN_COURS", "DEVIS_ENVOYE"].includes(c.statut)
      ).length,
      chantiersNonConformes,
    },
    activiteParUser,
  };
}

// ---------------------------------------------------------------------------
// Génération rapport mensuel (avec Alba-Ayla si API key configurée)
// ---------------------------------------------------------------------------

export async function genererRapportMensuel(): Promise<{
  ok: boolean;
  id?: string;
  erreur?: string;
}> {
  const user = await getUser();
  const stats = await collecterStatsCRM();
  const periode = stats.periode;

  // Vérifier si un rapport existe déjà pour ce mois
  const existant = await prisma.rapportMensuel.findFirst({ where: { periode } });
  if (existant) {
    await prisma.rapportMensuel.delete({ where: { id: existant.id } });
  }

  let analyseIA: string | null = null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });

      const systemPrompt = `Tu es Alba-Ayla, l'IA de contrôle qualité du CRM de SAS SDA Rénovation (entreprise de rénovation BTP, Cugnaux 31270, Siren 988681672).
Tu génères des rapports mensuels professionnels en français à destination du Dirigeant.
Le rapport doit être structuré, concis et actionnable — maximum 800 mots.
Structure obligatoire :
1. **Synthèse du mois** (3-4 lignes)
2. **Activité commerciale** (devis, chantiers)
3. **Situation financière** (CA facturé, encaissements, retards)
4. **Conformité des processus** (chantiers non conformes, alertes)
5. **Activité par profil utilisateur**
6. **Alertes & Points d'attention** (liste puces)
7. **Recommandations** (2-3 actions prioritaires)`;

      const prompt = `Génère le rapport mensuel CRM pour la période ${periode} à partir de ces données :\n\n${JSON.stringify(stats, null, 2)}`;

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      if (response.content[0].type === "text") {
        analyseIA = response.content[0].text;
      }
    } catch (e) {
      console.error("Anthropic API error:", e);
      analyseIA = null;
    }
  }

  const rapport = await prisma.rapportMensuel.create({
    data: {
      periode,
      contenu: JSON.stringify(stats),
      analyseIA,
      genereParId: user.id,
    },
  });

  revalidatePath("/maintenance");
  revalidatePath("/maintenance/rapports");
  return { ok: true, id: rapport.id };
}

// ---------------------------------------------------------------------------
// Sauvegarde manuelle de la base de données
// ---------------------------------------------------------------------------

export async function declencherSauvegarde(): Promise<{
  ok: boolean;
  message: string;
  tailleMo?: number;
}> {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const backupDir = path.join(process.cwd(), "backups");
  const dateStr = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const backupPath = path.join(backupDir, `crm_backup_${dateStr}.db`);

  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.copyFileSync(dbPath, backupPath);

    const stats = fs.statSync(backupPath);
    const tailleMo = Math.round((stats.size / 1024 / 1024) * 100) / 100;

    // Nettoyage: garder les 20 dernières sauvegardes seulement
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("crm_backup_") && f.endsWith(".db"))
      .sort();
    if (files.length > 20) {
      for (const old of files.slice(0, files.length - 20)) {
        fs.unlinkSync(path.join(backupDir, old));
      }
    }

    await prisma.sauvegardeLog.create({
      data: {
        type: "MANUELLE",
        destination: backupPath,
        statut: "OK",
        message: `Sauvegarde réussie : ${backupPath}`,
        tailleMo,
      },
    });

    revalidatePath("/maintenance");
    return { ok: true, message: `Sauvegarde créée : crm_backup_${dateStr}.db`, tailleMo };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    await prisma.sauvegardeLog.create({
      data: {
        type: "MANUELLE",
        destination: backupPath,
        statut: "ERREUR",
        message: msg,
      },
    });
    revalidatePath("/maintenance");
    return { ok: false, message: msg };
  }
}

// ---------------------------------------------------------------------------
// Nettoyage des documents orphelins
// ---------------------------------------------------------------------------

export async function nettoyerDocumentsOrphelins(): Promise<{ supprimés: number }> {
  const result = await prisma.document.deleteMany({
    where: {
      chantierId: null,
      clientId: null,
      devisId: null,
      factureId: null,
      fournisseurId: null,
      nom: "",
    },
  });
  revalidatePath("/maintenance");
  return { supprimés: result.count };
}
