import { sanitizeRichText } from "@/lib/sanitize-html";

// Affichage en lecture d'un champ texte enrichi (HTML) produit par
// RichTextEditor — assainissement systématique avant rendu, y compris pour
// du contenu historique en texte brut (qui passe inchangé, sanitize étant
// idempotent sur du texte sans balises).
export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
