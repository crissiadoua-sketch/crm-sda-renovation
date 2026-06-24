const ALLOWED_TAGS = new Set(["b", "i", "u", "strong", "em", "span", "br", "p", "div", "font", "ul", "ol", "li"]);
const ALLOWED_STYLE_PROPS = ["color", "font-size", "font-family", "text-align", "text-decoration", "font-weight", "font-style", "list-style-type", "margin-left", "padding-left"];

function sanitizeStyleValue(style: string): string {
  return style
    .split(";")
    .map((decl) => decl.trim())
    .filter(Boolean)
    .filter((decl) => {
      const prop = decl.split(":")[0]?.trim().toLowerCase();
      return prop && ALLOWED_STYLE_PROPS.includes(prop);
    })
    .filter((decl) => !/url\s*\(|javascript:|expression\s*\(/i.test(decl))
    .join("; ");
}

// Assainit le HTML produit par RichTextEditor. Volontairement sans dépendance
// DOM (jsdom/dompurify) : les libs « isomorphic » de ce type se résolvent vers
// leur build navigateur quand bundlées côté Server Components par Next.js et
// plantent au runtime faute de `window` (même classe de bug que /ouvrages).
// Le contenu provient uniquement de notre propre éditeur (utilisateurs
// authentifiés), d'où une liste blanche stricte plutôt qu'un sanitizer DOM
// générique.
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";

  let out = html.replace(/<(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  out = out.replace(/<(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi, "");

  out = out.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagNameRaw: string, attrs: string) => {
    const tagName = tagNameRaw.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) return "";

    if (match.startsWith("</")) return `</${tagName}>`;

    const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i) ?? attrs.match(/style\s*=\s*'([^']*)'/i);
    const cleanStyle = styleMatch ? sanitizeStyleValue(styleMatch[1]) : "";
    const selfClosing = tagName === "br" ? " /" : "";
    return cleanStyle ? `<${tagName} style="${cleanStyle}"${selfClosing}>` : `<${tagName}${selfClosing}>`;
  });

  return out;
}
