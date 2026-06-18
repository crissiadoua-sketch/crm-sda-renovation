import { NextRequest, NextResponse } from "next/server";
import { genererRapportMensuel } from "@/lib/actions/maintenance";

// Endpoint appelé par le script PowerShell mensuel automatique
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const secret = body?.secret;

    // Vérification basique pour éviter les appels non autorisés
    if (secret !== "crm-sda-renovation") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const result = await genererRapportMensuel();
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ ok: false, erreur: msg }, { status: 500 });
  }
}
