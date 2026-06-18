/**
 * Bridge by Bankin — Client API
 * Paiement en ligne via liens de paiement (Payment Links v3)
 */

const BRIDGE_BASE_URL = "https://api.bridgeapi.io";
const BRIDGE_VERSION  = "2021-06-01";

function bridgeHeaders() {
  const clientId     = process.env.BRIDGE_CLIENT_ID;
  const clientSecret = process.env.BRIDGE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Credentials Bridge manquants (BRIDGE_CLIENT_ID / BRIDGE_CLIENT_SECRET)");
  }

  return {
    "Client-Id":      clientId,
    "Client-Secret":  clientSecret,
    "Bridge-Version": BRIDGE_VERSION,
    "Content-Type":   "application/json",
    "Accept":         "application/json",
  };
}

// ---------------------------------------------------------------------------
// Types Bridge
// ---------------------------------------------------------------------------

export interface BridgePaymentLink {
  id:           string;
  url:          string;
  status:       "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  amount:       number;
  currency:     string;
  label:        string;
  created_at:   string;
  updated_at:   string;
  expires_at?:  string;
  redirect_url?: string;
}

export interface BridgeCreatePaymentLinkParams {
  /** Montant en euros (ex: 1500.50) */
  montantEuros:   number;
  /** Libellé affiché au payeur — ex: "Facture FA-2024-001" */
  label:          string;
  /** Référence unique pour votre suivi — ex: "FA-2024-001" */
  endToEndId:     string;
  /** URL de redirection après paiement */
  redirectUrl?:   string;
  /** IBAN bénéficiaire (SDA Rénovation) */
  iban?:          string;
  /** Nom bénéficiaire */
  beneficiaryName?: string;
}

// ---------------------------------------------------------------------------
// Créer un lien de paiement
// ---------------------------------------------------------------------------

export async function creerLienPaiementBridge(
  params: BridgeCreatePaymentLinkParams
): Promise<BridgePaymentLink> {
  const body: Record<string, unknown> = {
    transactions: [
      {
        currency:     "EUR",
        label:        params.label,
        amount:       params.montantEuros,
        end_to_end_id: params.endToEndId,
        ...(params.iban && {
          beneficiary: {
            company_name: params.beneficiaryName ?? "SDA Rénovation",
            iban:         params.iban,
          },
        }),
      },
    ],
    ...(params.redirectUrl && { redirect_url: params.redirectUrl }),
  };

  const res = await fetch(`${BRIDGE_BASE_URL}/v3/payment/payment-links`, {
    method:  "POST",
    headers: bridgeHeaders(),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bridge API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<BridgePaymentLink>;
}

// ---------------------------------------------------------------------------
// Récupérer le statut d'un lien de paiement
// ---------------------------------------------------------------------------

export async function getLienPaiementBridge(linkId: string): Promise<BridgePaymentLink> {
  const res = await fetch(`${BRIDGE_BASE_URL}/v3/payment/payment-links/${linkId}`, {
    method:  "GET",
    headers: bridgeHeaders(),
    cache:   "no-store",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Bridge API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<BridgePaymentLink>;
}

// ---------------------------------------------------------------------------
// Supprimer / annuler un lien de paiement
// ---------------------------------------------------------------------------

export async function annulerLienPaiementBridge(linkId: string): Promise<void> {
  const res = await fetch(`${BRIDGE_BASE_URL}/v3/payment/payment-links/${linkId}`, {
    method:  "DELETE",
    headers: bridgeHeaders(),
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Bridge API error ${res.status}: ${err}`);
  }
}
