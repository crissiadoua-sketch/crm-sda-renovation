import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["b", "i", "u", "strong", "em", "span", "br", "p"];
const ALLOWED_ATTR = ["style"];

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
