import type React from "react";
import { sanitizeRichText } from "@/lib/sanitize-html";

// Affichage en lecture d'un champ texte enrichi (HTML) produit par
// RichTextEditor — assainissement systématique avant rendu, y compris pour
// du contenu historique en texte brut (qui passe inchangé, sanitize étant
// idempotent sur du texte sans balises).
export function RichText({ html, className, style }: { html: string | null | undefined; className?: string; style?: React.CSSProperties }) {
  return <span className={`rich-text-content ${className ?? ""}`} style={style} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}

